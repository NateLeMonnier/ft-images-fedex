import { readdir, readFile, writeFile } from 'fs/promises'
import { join, extname } from 'path'
import exifr from 'exifr'

const PHOTOS_DIR = 'public/photos'
const OUTPUT = 'src/data/photoMetadata.json'
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.tiff', '.webp'])

function parseDateFromFilename(filename) {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) return null
  const [, year, month, day] = match
  const d = new Date(`${year}-${month}-${day}`)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

function formatExifDate(d) {
  if (!d) return null
  if (d instanceof Date) return d.toISOString().split('T')[0]
  const match = String(d).match(/(\d{4})[:\-](\d{2})[:\-](\d{2})/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

async function extractForFile(personId, filename, filepath) {
  const entry = { date: null, location: null, description: null }

  try {
    const buffer = await readFile(filepath)
    const exif = await exifr.parse(buffer, {
      pick: [
        'DateTimeOriginal', 'CreateDate', 'ModifyDate',
        'ImageDescription', 'UserComment', 'XPComment', 'XPSubject', 'XPTitle',
        'GPSLatitude', 'GPSLongitude',
        'City', 'State', 'Country', 'Location', 'Sub-location',
      ],
    })

    if (exif) {
      entry.date = formatExifDate(exif.DateTimeOriginal)
        || formatExifDate(exif.CreateDate)
        || null

      // Skip dates that match the unzip timestamp (2026-05-18)
      if (entry.date && entry.date.startsWith('2026-')) entry.date = null

      entry.description = exif.ImageDescription
        || exif.UserComment
        || exif.XPComment
        || exif.XPTitle
        || exif.XPSubject
        || null

      const locParts = [exif.City, exif.State, exif.Country, exif.Location, exif['Sub-location']].filter(Boolean)
      if (locParts.length) entry.location = locParts.join(', ')

      if (!entry.location && exif.GPSLatitude && exif.GPSLongitude) {
        entry.location = `${exif.GPSLatitude.toFixed(4)}, ${exif.GPSLongitude.toFixed(4)}`
      }
    }
  } catch {
    // EXIF extraction failed — fall through to filename parsing
  }

  if (!entry.date) {
    entry.date = parseDateFromFilename(filename)
  }

  return entry
}

async function main() {
  const metadata = {}
  const personDirs = await readdir(PHOTOS_DIR)

  for (const personId of personDirs) {
    const personPath = join(PHOTOS_DIR, personId)
    let files
    try {
      files = await readdir(personPath)
    } catch {
      continue
    }

    for (const filename of files) {
      const ext = extname(filename).toLowerCase()
      if (!IMAGE_EXTS.has(ext)) continue

      const key = `${personId}/${filename}`
      const filepath = join(personPath, filename)
      metadata[key] = await extractForFile(personId, filename, filepath)
    }
  }

  await writeFile(OUTPUT, JSON.stringify(metadata, null, 2) + '\n')
  const count = Object.keys(metadata).length
  const withDates = Object.values(metadata).filter(m => m.date).length
  const withDesc = Object.values(metadata).filter(m => m.description).length
  const withLoc = Object.values(metadata).filter(m => m.location).length
  console.log(`Extracted metadata for ${count} photos: ${withDates} dates, ${withLoc} locations, ${withDesc} descriptions`)
}

main()
