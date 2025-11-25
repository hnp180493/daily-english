const fs = require('fs');
const path = require('path');

// Read the built index.html as template
const distPath = path.join(__dirname, '../dist/daily-english/browser');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.html not found. Run build first!');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Routes to generate static pages for
const routes = [
  { path: 'about', title: 'Về Daily English - Học tiếng Anh miễn phí với AI' },
  { path: 'exercises', title: 'Bài tập tiếng Anh - Daily English' },
  { path: 'guide', title: 'Hướng dẫn sử dụng - Daily English' },
  { path: 'learning-path', title: 'Lộ trình học tập - Daily English' },
  { path: 'dashboard', title: 'Bảng điều khiển - Daily English' },
];

console.log('Generating static pages for SEO...\n');

routes.forEach(route => {
  // Create directory if needed
  const routeDir = path.join(distPath, route.path);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }

  // Modify index.html with route-specific title
  let html = indexHtml.replace(
    /<title>.*?<\/title>/,
    `<title>${route.title}</title>`
  );

  // Add canonical URL
  const canonicalUrl = `https://dailyenglish.qzz.io/${route.path}`;
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${canonicalUrl}">\n</head>`
  );

  // Write to route/index.html
  const outputPath = path.join(routeDir, 'index.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  
  console.log(`✅ Created /${route.path}/index.html`);
});

console.log('\n✅ Static pages generated successfully!');
console.log('📝 Google can now crawl these pages without JavaScript');
