# PhotoTree QA Test Plan

## 1. Family Data Integrity

The family tree data originates from a GEDCOM file and is stored in family.json. If relationships or person records are corrupted, every downstream feature breaks: the tree layout, person pages, photo assignments, and metadata associations.

### 1.1 Person record completeness

Open family.json and verify all 33 people have the required fields: id, name, gender, birthDate, birthLocation, deathDate (nullable), notes, and photos array.

For each person, confirm the id follows the naming convention (lowercase-hyphenated full name) and matches the corresponding folder name in public/photos/.

### 1.2 Relationship consistency

Verify all 39 relationships reference valid person IDs on both sides (personAId and personBId must exist in the people array).

For parent relationships: confirm personAId is the parent and personBId is the child. Spot-check three known parent-child pairs:
- john-gurney-brown-sr is parent of john-gurney-brown-jr
- john-gurney-brown-jr is parent of larry-fred-brown
- larry-fred-brown is parent of laryn-david-brown

For spouse relationships: confirm both people exist and the relationship is not duplicated in reverse.

### 1.3 No orphaned records

Every person should appear in at least one relationship (either as personAId or personBId). Flag any person with zero relationships as a potential data error.

Every person ID referenced in a relationship must exist in the people array.

### 1.4 Tree rendering cross-check

Navigate to the home page. Right-click a person and set them as pivot. Verify:
- Their parents appear to the left (ancestor side)
- Their children appear to the right (descendant side)
- Their spouse appears in the same column
- No unexpected people appear in the tree (wrong relationships would surface here)

Repeat for three different pivot people across different generations.


## 2. Photo Upload and Count Verification

When photos are added for a person, the number of files on disk must match the count displayed in the person page header and the number of tiles in the photo grid.

### 2.1 File count matches family.json

For john-gurney-brown-jr (the only person with real photos), count the image files in public/photos/john-gurney-brown-jr/ (exclude placeholder.svg if still present). Compare to the length of the photos array in family.json.

Expected: 17 photos.

### 2.2 Grid tile count matches data

Open http://localhost:5173/person/john-gurney-brown-jr. Count the tiles in the photo grid. Compare to:
- The "N photos" count in the header meta line
- The photos array length in family.json

All three numbers must match.

### 2.3 New upload verification

To test a new upload:
1. Count images in the source zip file before extraction
2. Run the upload process (unzip to public/photos/[person-id]/, update family.json)
3. Verify the file count in the folder matches the source zip
4. Verify the photos array in family.json has entries for every new file
5. Refresh the person page and confirm the grid tile count and header count updated

### 2.4 No broken images

On the person page, visually confirm every grid tile renders an image (no broken image icons). Open browser dev tools Network tab and filter for 404 responses on image requests.


## 3. Photo Date Logic

Photos with EXIF or filename-derived dates that fall after the person's death date are assumed to be scan dates, not original photo dates. The date field should show empty for these photos.

### 3.1 Scan date suppression

John Gurney Brown Jr. died 30 July 1995.

Open his person page and click on a photo with a known EXIF/filename date after 1995 (the 2005 and 2013 dated photos). Verify the Date field in the lightbox is empty.

Test photos:
- 20050530-DSC05589.JPG (extracted date: 2005-05-30) -- date should be empty
- 20050530-DSC05590.JPG (extracted date: 2005-05-30) -- date should be empty
- 20131123-Mom17-18.jpg (extracted date: 2013-11-23) -- date should be empty
- All 20131123-* photos -- date should be empty

### 3.2 Valid dates pass through

For a person who is still alive (deathDate is null), all photo dates should display normally regardless of how recent they are.

For a person with a death date, any photo dated before that death date should display the date in "DD Monthname YYYY" format.

### 3.3 Date format verification

Dates stored in "YYYY-MM-DD" format (from EXIF extraction) should display as "DD Monthname YYYY" in the lightbox. For example, "2005-05-30" should display as "30 May 2005".

Dates entered manually by the user in any other format should display as typed.

### 3.4 Edge cases

Photo with no date at all (null in metadata): Date field should show empty with placeholder text.

Photo with date exactly matching the death date: should display (not suppressed).

Person with no death date: all photo dates display normally.


## 4. Data Persistence (Supabase)

User-contributed data must persist across browser sessions, different browsers, and different users. All editable data is stored in Supabase, not localStorage.

### 4.1 Photo metadata persistence

1. Open a photo in the lightbox
2. Enter a date, location, and description
3. Click Save and confirm the "Saved" indicator appears
4. Close the browser entirely
5. Reopen the same page -- the entered data should still be there

### 4.2 Cross-browser persistence

1. Enter photo metadata in Chrome
2. Open the same person page in Safari (or another browser)
3. Click the same photo -- the metadata entered in Chrome should appear

### 4.3 Profile photo persistence

1. Open a person page with multiple photos
2. Click a photo that is not the current profile photo
3. Click "Set as profile photo"
4. Refresh the page -- the profile circle in the header should show the newly selected photo
5. Open in a different browser -- same profile photo should appear

### 4.4 Person override persistence

1. Click Edit on a person page
2. Change the birth date or notes
3. Save and refresh -- changes should persist
4. Open in a different browser -- same changes should appear

### 4.5 Supabase direct verification

Open the Supabase dashboard. Navigate to Table Editor.
- photo_metadata table should contain rows for every photo that has been edited
- person_overrides table should contain rows for every person whose profile photo or bio has been edited
- Verify the data matches what appears in the UI


## 5. Lightbox Navigation

### 5.1 Previous and next buttons

Open a person page with multiple photos. Click the first photo.
- "Previous" button should be disabled (grayed out)
- "Next" button should be active
- Click Next -- the next photo in the grid should appear
- Footer should show "Photo 2 of N"

Navigate to the last photo:
- "Next" button should be disabled
- "Previous" button should be active

### 5.2 Keyboard navigation

With the lightbox open and no input field focused:
- Right arrow key advances to the next photo
- Left arrow key goes to the previous photo
- Escape key closes the lightbox

With cursor in the date, location, or description field:
- Arrow keys should move the text cursor, not navigate photos
- Escape should still close the lightbox

### 5.3 Photo counter accuracy

The "Photo N of M" counter in the footer should match:
- N: the position of the current photo in the grid (left to right, top to bottom)
- M: the total photo count shown in the person page header


## 6. Profile Photo Selection

### 6.1 Default behavior

When no profile photo has been explicitly set, the first photo in the photos array should appear as the profile circle in the header.

### 6.2 Selection via lightbox

Click a non-primary photo. In the lightbox, click "Set as profile photo." The header profile circle should update immediately without a page refresh.

### 6.3 Current profile indicator

Open the lightbox for the photo that is currently the profile photo. Instead of a "Set as profile photo" button, it should show the text "This is the profile photo" in olive color.

### 6.4 Independence from sort order

The profile photo selection is stored as a primaryPhoto field, not as array position. If the photos array is reordered in family.json, the selected profile photo should remain the same.


## 7. Design Spec Compliance

### 7.1 Typography

- Person name in header: Playfair Display, weight 500, 22pt, Brown Red (#A43032)
- Meta line (years, photo count): warm gray (#8B8580), photo count in olive (#828700)
- Bio card labels: warm gray, values in warm dark (#4A413A)
- Back link and Edit button: Inter (or system sans-serif)

### 7.2 Color palette

- Page background: white (#FFFFFF)
- Body text: warm dark (#4A413A)
- Borders: #E5E1D9
- Photo placeholder: #F3F1EC
- Profile photo button and links: Brown Red (#A43032)

### 7.3 Layout

- Profile photo: 78px circle, centered
- Bio card: top-right corner, approximately 200px wide, 0.5px border, 8px corner radius
- Photo grid: 8 columns on desktop, 4px gap, square aspect ratio tiles
- Back link: top-left, plain text with left arrow
- Lightbox backdrop: rgba(74, 65, 58, 0.45)

### 7.4 Lightbox layout

- White modal, 8px corners, 640px max width
- Photo at original aspect ratio, max 55vh height
- Editable fields below photo: Date and Location side by side, Description full width
- Save button: pill-shaped, Brown Red when changes exist, muted when clean
- Tagged people with 40px circular avatar thumbnails
- Footer navigation separated by thin divider


## 8. Edge Cases and Error Handling

### 8.1 Person with no photos

Navigate to a person who has only placeholder.svg. The grid should show the placeholder. The header should show "1 photo" (or handle gracefully if placeholders are excluded).

### 8.2 Person not found

Navigate to /person/nonexistent-id. Should show "No record found" message with a link back to the tree.

### 8.3 Supabase unavailable

If the Supabase connection fails (wrong URL, network down), the page should still load with base data from family.json. Edits will fail silently. Confirm the page does not crash or show a blank screen.

### 8.4 Special characters in filenames

Photos with spaces in filenames (like "John Jr. portrait.jpeg" and "Scan 6a.jpeg") should load correctly in both the grid and lightbox.

### 8.5 Concurrent edits

Two users edit the same photo's metadata simultaneously. The last save wins. Neither user should see an error.
