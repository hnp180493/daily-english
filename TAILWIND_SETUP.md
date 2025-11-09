# Tailwind CSS Setup Guide

## ✅ Installation Complete

Tailwind CSS v3 đã được tích hợp thành công vào project Angular này.

## 📦 Packages Installed

- `tailwindcss@3` - Tailwind CSS framework
- `postcss` - CSS processor
- `autoprefixer` - Auto-prefix CSS properties

## 📁 Configuration Files

### 1. `tailwind.config.js`
```javascript
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        secondary: '#10B981',
        dark: '#1F2937',
        'dark-lighter': '#374151',
      },
    },
  },
  plugins: [],
}
```

### 2. `postcss.config.js`
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 3. `src/styles.scss`
Tailwind directives đã được thêm vào đầu file:
```scss
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 🎨 Usage Examples

### Basic Utility Classes
```html
<!-- Spacing -->
<div class="p-4 m-2">Content</div>

<!-- Colors -->
<div class="bg-primary text-white">Primary Button</div>
<div class="bg-secondary text-white">Secondary Button</div>

<!-- Flexbox -->
<div class="flex items-center justify-between">
  <span>Left</span>
  <span>Right</span>
</div>

<!-- Grid -->
<div class="grid grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Typography -->
<h1 class="text-3xl font-bold">Heading</h1>
<p class="text-gray-600 text-sm">Small text</p>

<!-- Responsive Design -->
<div class="w-full md:w-1/2 lg:w-1/3">
  Responsive width
</div>
```

### Custom Colors
Project đã có sẵn custom colors:
```html
<div class="bg-primary">Primary color (#4F46E5)</div>
<div class="bg-secondary">Secondary color (#10B981)</div>
<div class="bg-dark">Dark background (#1F2937)</div>
<div class="bg-dark-lighter">Lighter dark (#374151)</div>
```

## 🔧 Customization

### Adding Custom Colors
Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      'custom-blue': '#1E40AF',
      'custom-green': '#059669',
    },
  },
}
```

### Adding Custom Spacing
```javascript
theme: {
  extend: {
    spacing: {
      '128': '32rem',
      '144': '36rem',
    },
  },
}
```

### Adding Custom Fonts
```javascript
theme: {
  extend: {
    fontFamily: {
      'custom': ['Inter', 'sans-serif'],
    },
  },
}
```

## 📚 Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [Tailwind Play (Online Editor)](https://play.tailwindcss.com/)

## 🚀 Development

Server đã chạy tại: http://localhost:4200/

Tailwind sẽ tự động:
- Scan tất cả file `.html` và `.ts` trong `src/`
- Generate CSS cho các class được sử dụng
- Hot reload khi có thay đổi

## ⚠️ Important Notes

1. **Purging**: Tailwind tự động loại bỏ CSS không sử dụng trong production build
2. **Dynamic Classes**: Tránh tạo class names động:
   ```html
   <!-- ❌ Bad -->
   <div [class]="'text-' + color">

   <!-- ✅ Good -->
   <div [class.text-red-500]="color === 'red'">
   ```
3. **Component Styles**: Có thể dùng Tailwind trong component SCSS files
