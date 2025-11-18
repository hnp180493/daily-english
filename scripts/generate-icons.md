# Generate Icons Guide

## Cách 1: Sử dụng Online Tool (Khuyến nghị)

1. Truy cập: https://realfavicongenerator.net/
2. Upload file `public/favicon.ico`
3. Chọn các options:
   - iOS: 180x180
   - Android Chrome: 192x192, 512x512
   - Windows Metro: 144x144
4. Generate và download
5. Copy các file vào thư mục `public/`:
   - `icon-192.png`
   - `icon-512.png`
   - `apple-touch-icon.png`

## Cách 2: Sử dụng ImageMagick (Command line)

```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Generate icons
magick convert public/favicon.ico -resize 192x192 public/icon-192.png
magick convert public/favicon.ico -resize 512x512 public/icon-512.png
```

## Cách 3: Sử dụng Node.js script

```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

## Cách 4: Tạo icon mới với Canva/Figma

### Design Guidelines
- **Size**: 512x512px (export cả 192x192)
- **Format**: PNG với transparent background
- **Content**: Logo "Daily English" hoặc chữ "DE"
- **Colors**: 
  - Primary: #4F46E5 (Indigo)
  - Secondary: #10B981 (Green)
  - Background: Transparent hoặc #1F2937 (Dark)

### Recommended Design
```
┌─────────────────┐
│                 │
│      📚         │
│   Daily         │
│   English       │
│                 │
└─────────────────┘
```

Hoặc đơn giản hơn:
```
┌─────────────────┐
│                 │
│                 │
│       DE        │
│                 │
│                 │
└─────────────────┘
```

## Sau khi có icons

1. Copy vào `public/`:
   - `icon-192.png`
   - `icon-512.png`

2. Verify trong browser:
   - Mở DevTools > Application > Manifest
   - Check icons hiển thị đúng

3. Test PWA:
   - Lighthouse > PWA audit
   - Check "Installable" criteria

## Temporary Solution

Nếu chưa có icon, tạm thời comment out trong `src/index.html`:

```html
<!-- <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png"> -->
<!-- <link rel="icon" type="image/png" sizes="512x512" href="icon-512.png"> -->
```

Và update `public/manifest.json`:

```json
"icons": [
  {
    "src": "/favicon.ico",
    "sizes": "48x48",
    "type": "image/x-icon"
  }
]
```
