import exifr from 'exifr'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase'

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|tiff?|bmp|heic|heif)$/i
const MAX_DIMENSION = 2048
const MAX_SIZE_MB = 2
const COMPRESSION_QUALITY = 0.85

async function extractExif(file) {
  try {
    const data = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'ImageWidth', 'ImageHeight', 'GPSLatitude', 'GPSLongitude'],
    })
    if (!data) return {}

    let date = null
    const raw = data.DateTimeOriginal || data.CreateDate
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      const y = raw.getFullYear()
      if (y > 1800 && y < 2030) {
        const mm = String(raw.getMonth() + 1).padStart(2, '0')
        const dd = String(raw.getDate()).padStart(2, '0')
        date = `${y}-${mm}-${dd}`
      }
    }

    const model = [data.Make, data.Model].filter(Boolean).join(' ').trim() || null

    return {
      date,
      camera_model: model,
      width: data.ImageWidth || null,
      height: data.ImageHeight || null,
    }
  } catch {
    return {}
  }
}

function parseDateFromFilename(filename) {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})[-_]/)
  if (!match) return null
  const [, y, m, d] = match
  const year = parseInt(y, 10)
  if (year < 1800 || year > 2030) return null
  return `${y}-${m}-${d}`
}

function buildSidecarMap(allFiles) {
  const map = new Map()
  const jsonFiles = Array.from(allFiles).filter(f =>
    f.name.endsWith('.json') || f.name.endsWith('.JSON')
  )

  for (const jsonFile of jsonFiles) {
    // Google Takeout naming: "IMG_1234.jpg.json" or "IMG_1234.jpg.supplemental-metadata.json"
    let imageFilename = null
    if (jsonFile.name.endsWith('.supplemental-metadata.json')) {
      imageFilename = jsonFile.name.replace('.supplemental-metadata.json', '')
    } else if (jsonFile.name.match(/\.(jpe?g|png|gif|webp|tiff?|bmp|heic|heif)\.json$/i)) {
      imageFilename = jsonFile.name.replace(/\.json$/i, '')
    }
    if (imageFilename) {
      map.set(imageFilename.toLowerCase(), jsonFile)
    }
  }
  return map
}

async function parseSidecar(jsonFile) {
  try {
    const text = await jsonFile.text()
    const data = JSON.parse(text)
    const result = {}

    if (data.description) {
      result.description = data.description
    }

    if (data.photoTakenTime?.timestamp) {
      const ts = parseInt(data.photoTakenTime.timestamp, 10)
      if (!isNaN(ts)) {
        const d = new Date(ts * 1000)
        const y = d.getUTCFullYear()
        if (y > 1800 && y < 2030) {
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
          const dd = String(d.getUTCDate()).padStart(2, '0')
          result.date = `${y}-${mm}-${dd}`
        }
      }
    }

    if (data.geoData?.latitude && data.geoData?.longitude) {
      const lat = data.geoData.latitude
      const lng = data.geoData.longitude
      if (lat !== 0 || lng !== 0) {
        result.location = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      }
    }

    return result
  } catch {
    return {}
  }
}

async function getDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({ width: null, height: null })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

async function compressFile(file) {
  if (file.size < 500 * 1024) return file

  try {
    return await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_DIMENSION,
      initialQuality: COMPRESSION_QUALITY,
      useWebWorker: true,
      fileType: 'image/jpeg',
    })
  } catch {
    return file
  }
}

export async function uploadPhotos(files, personId, onProgress) {
  const allFiles = Array.from(files)
  const imageFiles = allFiles.filter(f => IMAGE_EXTENSIONS.test(f.name))
  const sidecarMap = buildSidecarMap(allFiles)
  const results = { uploaded: 0, linked: 0, errors: [] }

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i]
    onProgress?.({ current: i + 1, total: imageFiles.length, filename: file.name })

    try {
      const { data: existing } = await supabase
        .from('photos')
        .select('id')
        .eq('filename', file.name)
        .maybeSingle()

      if (existing) {
        await supabase.from('photo_people').upsert({
          photo_id: existing.id,
          person_id: personId,
        })

        const sidecarFile = sidecarMap.get(file.name.toLowerCase())
        if (sidecarFile) {
          const sidecar = await parseSidecar(sidecarFile)
          const updates = {}
          if (sidecar.date) updates.date = sidecar.date
          if (sidecar.description) updates.description = sidecar.description
          if (sidecar.location) updates.location = sidecar.location
          if (Object.keys(updates).length > 0) {
            await supabase.from('photos').update(updates).eq('id', existing.id)
            results.repaired = (results.repaired || 0) + 1
          }
        }

        results.linked++
        continue
      }

      const sidecarFile = sidecarMap.get(file.name.toLowerCase())
      const [exif, dims, sidecar] = await Promise.all([
        extractExif(file),
        getDimensions(file),
        sidecarFile ? parseSidecar(sidecarFile) : Promise.resolve({}),
      ])

      const compressed = await compressFile(file)

      const storagePath = `photos/${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath, compressed, { upsert: true })

      if (uploadError) {
        results.errors.push({ filename: file.name, error: uploadError.message })
        continue
      }

      // Priority: sidecar (user-entered) > EXIF > filename
      const date = sidecar.date || exif.date || parseDateFromFilename(file.name)
      const description = sidecar.description || null
      const location = sidecar.location || null

      const { data: photo, error: insertError } = await supabase
        .from('photos')
        .insert({
          filename: file.name,
          storage_path: storagePath,
          date,
          location,
          description,
          width: exif.width || dims.width,
          height: exif.height || dims.height,
          camera_model: exif.camera_model,
        })
        .select('id')
        .single()

      if (insertError) {
        results.errors.push({ filename: file.name, error: insertError.message })
        continue
      }

      await supabase.from('photo_people').insert({
        photo_id: photo.id,
        person_id: personId,
      })

      results.uploaded++
    } catch (err) {
      results.errors.push({ filename: file.name, error: err.message })
    }
  }

  return results
}
