import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import exifr from 'exifr'

const SUPABASE_URL = 'https://zamzxdxznfjfxhxyqswt.supabase.co'
const SUPABASE_KEY = 'sb_publishable_VtMwzenKUD3H6DdibFPBvg_TNlhqz7k'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PHOTO_DIR = resolve('public/photos/john-gurney-brown-jr')
const PERSON_ID = 'john-gurney-brown-jr'
const METADATA_PATH = resolve('src/data/photoMetadata.json')

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|tiff?|bmp)$/i

function parseDateFromFilename(filename) {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})[-_]/)
  if (!match) return null
  const [, y, m, d] = match
  const year = parseInt(y, 10)
  if (year < 1900 || year > 2024) return null
  return `${y}-${m}-${d}`
}

async function extractExif(filePath) {
  try {
    const buffer = readFileSync(filePath)
    const data = await exifr.parse(buffer, {
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'ImageWidth', 'ImageHeight'],
    })
    if (!data) return {}

    let date = null
    const raw = data.DateTimeOriginal || data.CreateDate
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      const y = raw.getFullYear()
      if (y > 1900 && y < 2025) {
        const mm = String(raw.getMonth() + 1).padStart(2, '0')
        const dd = String(raw.getDate()).padStart(2, '0')
        date = `${y}-${mm}-${dd}`
      }
    }

    return {
      date,
      camera_model: [data.Make, data.Model].filter(Boolean).join(' ').trim() || null,
      width: data.ImageWidth || null,
      height: data.ImageHeight || null,
    }
  } catch {
    return {}
  }
}

async function migrate() {
  const existingMeta = JSON.parse(readFileSync(METADATA_PATH, 'utf-8'))
  const files = readdirSync(PHOTO_DIR).filter(f => IMAGE_EXT.test(f))

  console.log(`Found ${files.length} photos to migrate\n`)

  let uploaded = 0
  let errors = 0

  for (const filename of files) {
    const filePath = join(PHOTO_DIR, filename)
    const fileBuffer = readFileSync(filePath)
    const storagePath = `photos/${filename}`
    const metaKey = `${PERSON_ID}/${filename}`

    process.stdout.write(`  ${filename} ... `)

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, fileBuffer, {
        upsert: true,
        contentType: filename.match(/\.png$/i) ? 'image/png' : 'image/jpeg',
      })

    if (uploadError) {
      console.log(`UPLOAD FAILED: ${uploadError.message}`)
      errors++
      continue
    }

    const exif = await extractExif(filePath)
    const savedMeta = existingMeta[metaKey] || {}
    const date = savedMeta.date || exif.date || parseDateFromFilename(filename)

    const { data: photo, error: insertError } = await supabase
      .from('photos')
      .upsert({
        filename,
        storage_path: storagePath,
        date,
        location: savedMeta.location || null,
        description: savedMeta.description || null,
        width: exif.width,
        height: exif.height,
        camera_model: exif.camera_model,
      }, { onConflict: 'filename' })
      .select('id')
      .single()

    if (insertError) {
      console.log(`INSERT FAILED: ${insertError.message}`)
      errors++
      continue
    }

    const { error: linkError } = await supabase
      .from('photo_people')
      .upsert({ photo_id: photo.id, person_id: PERSON_ID })

    if (linkError) {
      console.log(`LINK FAILED: ${linkError.message}`)
      errors++
      continue
    }

    console.log('OK')
    uploaded++
  }

  // Migrate any metadata saved in the old photo_metadata Supabase table
  const { data: oldMeta } = await supabase.from('photo_metadata').select('*')
  if (oldMeta && oldMeta.length > 0) {
    console.log(`\nMigrating ${oldMeta.length} entries from old photo_metadata table...`)
    for (const row of oldMeta) {
      const fn = row.photo_key.split('/').pop()
      await supabase
        .from('photos')
        .update({
          date: row.date,
          location: row.location,
          description: row.description,
        })
        .eq('filename', fn)
    }
    console.log('Done.')
  }

  console.log(`\nMigration complete: ${uploaded} uploaded, ${errors} errors`)
}

migrate().catch(console.error)
