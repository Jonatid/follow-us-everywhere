# Codex Task: Add QR Code Components to Follow Us Everywhere (FUSE101) Frontend

## Overview
I need you to add QR code functionality to the FUSE101 React frontend. This includes:
1. A utility file for exporting QR codes
2. A reusable QR card component
3. A display mode selector component
4. A business dashboard QR management page
5. A public business profile page with optional QR display

The frontend lives in `frontend/src/` and uses React (.jsx files). It already has:
- `frontend/src/components/AdminLayout.jsx`
- `frontend/src/pages/admin/` — all admin pages
- `frontend/src/pages/Landing.jsx`
- `frontend/src/styles/` — admin.css, landing.css
- `frontend/src/utils/adminApi.js`, `documentUrl.js`

---

## Task 1: Create `frontend/src/pages/business/utils/qrExport.js`

Create a utility file with 4 exported functions. Use ES module syntax (export/import):

### `downloadQRPng(businessName)`
- Finds canvas element with id `qr-code-canvas` using `document.querySelector('#qr-code-canvas canvas')`
- Creates a new canvas with 20px padding on all sides plus 40px footer height
- Draws white background, copies QR canvas, adds text "Follow Us Everywhere · FUSE101" in `#003594` bold 11px centered at the bottom
- Downloads as `{businessName-slugified}-qr-code.png`

### `downloadQRPdf(businessName, slug)`
- Finds canvas element, gets dataUrl
- Opens a new browser window with a styled print page showing: yellow badge "✦ Follow Us Everywhere ✦", business name, QR image (200x200), landing URL (`fuse101.com/qr/${slug}`), "Powered by FUSE101" footer
- Colors: blue `#003594`, yellow `#FDD001`
- Auto-triggers `window.print()` then `window.close()` on load

### `copyQRLink(slug)`
- Copies `https://fuse101.com/qr/${slug}` to clipboard using `navigator.clipboard.writeText()`
- Returns `Promise<boolean>` — true if success, false if error

### `getEmbedCode(slug, mode)`
- Returns iframe embed string:
```
<iframe
  src="https://fuse101.com/qr/${slug}?mode=${mode}"
  width="300"
  height="500"
  frameborder="0"
  style="border-radius:20px;border:none;"
></iframe>
```

---

## Task 2: Create `frontend/src/pages/business/components/QrCard.jsx`

A reusable React component that renders a branded QR code card.

### Props:
- `businessName` (string)
- `slug` (string) — used to build `https://fuse101.com/qr/${slug}`
- `size` (number, default 180) — QR pixel size
- `compact` (boolean, default false) — hides the top badge when true

### QR Generation:
Implement a pure JS QR matrix generator (no external libraries) as an internal function `buildQRMatrix(text)`. It must:
- Return a 29x29 boolean 2D array
- Add finder patterns at corners (0,0), (0,22), (22,0)
- Add timing patterns on row 6 and col 6
- Add alignment pattern centered at (22,22)
- Set dark module at (8,21)
- Fill data bytes from text (charCodeAt, max 40 chars, padded to 44 bytes with 0b11101100/0b00010001)
- Apply mask pattern 0: XOR data modules where (row+col) % 2 === 0

### Internal `QrCanvas` component:
- Uses `useRef` and `useEffect` to draw matrix on a `<canvas>` element
- Scale = `Math.floor(size / 29)`
- Draws `fgColor` (#003594) squares for true cells on white background

### Card wrapper:
- White background, `border: 3px solid #FDD001`, rounded corners
- When not compact: show yellow badge div "✦ Follow Us Everywhere ✦" above canvas
- Business name below canvas in `#8A9DC0`
- Wrap the entire card in `<div id="qr-code-canvas">` so export utils can find the canvas

---

## Task 3: Create `frontend/src/pages/business/components/QrDisplayModeSelector.jsx`

A React component for selecting the QR widget display mode.

### Props:
- `value` (string) — current mode: 'minimal' | 'branded' | 'full' | 'custom'
- `onChange` (function) — called with new mode string

### Modes to display (2x2 grid):
- `minimal` — "Just the QR code"
- `branded` — "QR + name + branding"
- `full` — "QR + all links listed"
- `custom` — "You choose each element"

### Styling:
- Selected: `background: rgba(253,208,1,0.15)`, `border: 2px solid #FDD001`
- Unselected: `background: #F4F7FF`, `border: 2px solid #E8EDF8`
- Label font: 13px, bold, `#003594`
- Description font: 11px, `#8A9DC0`

---

## Task 4: Create `frontend/src/pages/business/BusinessQrPage.jsx`

The QR management page inside the business owner dashboard.

### Props:
- `businessName` (string)
- `slug` (string)

### Layout: Two columns (flex row, wraps on mobile)

**Left column — QR Card + actions:**
- Render `<QrCard businessName={businessName} slug={slug} size={200} />`
- Three action buttons in a row: "⬇ PNG", "📄 PDF", "🔗 Link" (or "✓ Copied!" for 2s after click)
- URL display box showing `https://fuse101.com/qr/${slug}` in muted text

**Right column — Controls:**
- `<QrDisplayModeSelector>` with state
- "Show/Hide Embed Code" toggle button — when shown, displays the embed code pre block with a "Copy" button (turns "Copied!" for 2s)
- "How it works" info card: 5 numbered steps with yellow circle step numbers
- "Scan Analytics" teaser card: 3 rows (Total Scans, This Week, Top Device) with italic muted notes — "Full analytics dashboard coming soon" footer

### Colors: Use `#003594` blue, `#FDD001` yellow, `#F4F7FF` off-white, `#E8EDF8` light gray, `#8A9DC0` mid gray

---

## Task 5: Create `frontend/src/pages/public/PublicBusinessProfile.jsx`

The public-facing business profile page.

### Props:
- `businessName` (string, default "Your Business")
- `slug` (string)
- `tagline` (string)
- `category` (string)
- `logoUrl` (string or null)
- `qrEnabled` (boolean, default false) — business chooses to show QR
- `socialLinks` (array of `{ platform, url, icon }`)

### Sections (top to bottom):

**1. Hero header** (blue `#003594` background):
- Dot pattern background (radial-gradient, 4% opacity)
- Logo: if `logoUrl` show `<img>` with yellow border; otherwise show first letter in yellow square
- Yellow badge "✦ Follow Us Everywhere ✦"
- Business name in white, tagline in yellow-tinted, category pill

**2. Social links** (white background):
- List of social link cards (off-white background, blue border on hover)
- Always add FUSE101 profile link at bottom with yellow background: "View Full FUSE101 Profile" linking to `https://fuse101.com/${slug}`

**3. QR Code section** (only rendered if `qrEnabled === true`):
- Collapsible section — collapsed by default
- Expand trigger: a card row with a QR icon, "Scan to Follow Us" title, "Tap to show/hide QR code" subtitle, and a ↓ chevron that rotates 180° when open
- When expanded: render `<QrCard businessName={businessName} slug={slug} size={160} compact />` with "Scan with your phone camera to connect" text below
- Animate expanded content with a fadeUp keyframe animation

**4. Footer:**
- "Powered by FUSE101 · Follow Us Everywhere" in muted gray

---

## Task 6: Register the new business route in `frontend/src/App.js`

Add a route for the business QR page. Look at how existing routes are defined in App.js and follow the same pattern. Add:
- Path: `/business/qr` or `/dashboard/qr` — whichever matches the existing business dashboard route pattern
- Component: `BusinessQrPage`

Do NOT change any existing routes.

---

## Important Constraints
- Use only React hooks already available (useState, useEffect, useRef) — no new npm packages
- Use inline styles throughout — do NOT create new CSS files
- Follow ES module syntax (import/export) matching existing .jsx files
- Do NOT modify any existing files except `App.js` (route addition only)
- Do NOT add any external QR code libraries — the QR is generated with the pure JS implementation in QrCard.jsx
- The `qrEnabled` flag on `PublicBusinessProfile` must gate the entire QR section — if false, render nothing for QR

---

## File Placement Summary
```
frontend/src/
├── pages/
│   ├── business/
│   │   ├── BusinessQrPage.jsx                  ← NEW
│   │   ├── components/
│   │   │   ├── QrCard.jsx                      ← NEW
│   │   │   └── QrDisplayModeSelector.jsx        ← NEW
│   │   └── utils/
│   │       └── qrExport.js                     ← NEW
│   └── public/
│       └── PublicBusinessProfile.jsx            ← NEW
└── App.js                                       ← EDIT (1 route added)
```

---

## Verification Checklist
After implementation confirm:
1. `frontend/src/pages/business/BusinessQrPage.jsx` exists and exports default component
2. `frontend/src/pages/business/components/QrCard.jsx` exists and exports default component
3. `frontend/src/pages/business/components/QrDisplayModeSelector.jsx` exists and exports default component
4. `frontend/src/pages/business/utils/qrExport.js` exists and exports 4 named functions
5. `frontend/src/pages/public/PublicBusinessProfile.jsx` exists and exports default component
6. `frontend/src/App.js` contains a new route for BusinessQrPage
7. No new npm packages were added to package.json
8. No existing files were modified except App.js
