const fs = require('fs');
const path = require('path');

// Read exercises from JSON file
const exercisesPath = path.join(__dirname, '../public/data/exercises/all-exercises.json');
const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));

const baseUrl = 'https://dailyenglish.qzz.io';
const today = new Date().toISOString().split('T')[0];

/**
 * Convert text to SEO-friendly slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate SEO-friendly URL slug for exercise
 */
function generateExerciseSlug(title, level, id) {
  const titleSlug = slugify(title);
  const levelSlug = slugify(level);
  const idSlug = id.replace('ex-', '');
  
  return `${titleSlug}-${levelSlug}-${idSlug}`;
}

// Static pages
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/about', priority: '0.9', changefreq: 'monthly' },
  { url: '/exercises', priority: '0.9', changefreq: 'weekly' },
  { url: '/guide', priority: '0.8', changefreq: 'weekly' },
  { url: '/dashboard', priority: '0.7', changefreq: 'weekly' },
  { url: '/favorites', priority: '0.6', changefreq: 'weekly' },
  { url: '/achievements', priority: '0.6', changefreq: 'weekly' },
  { url: '/review-queue', priority: '0.7', changefreq: 'daily' },
  { url: '/error-patterns', priority: '0.6', changefreq: 'weekly' },
  { url: '/learning-path', priority: '0.8', changefreq: 'weekly' },
  { url: '/dictation', priority: '0.7', changefreq: 'weekly' },
];

// Generate sitemap XML
let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Add static pages
staticPages.forEach(page => {
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
  sitemap += `    <lastmod>${today}</lastmod>\n`;
  sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
  sitemap += `    <priority>${page.priority}</priority>\n`;
  sitemap += `  </url>\n`;
});

// Add exercise pages with SEO-friendly slugs
exercises.forEach(exercise => {
  const slug = generateExerciseSlug(exercise.title, exercise.level, exercise.id);
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${baseUrl}/exercise/${slug}</loc>\n`;
  sitemap += `    <lastmod>${today}</lastmod>\n`;
  sitemap += `    <changefreq>monthly</changefreq>\n`;
  sitemap += `    <priority>0.8</priority>\n`;
  sitemap += `  </url>\n`;
});

sitemap += '</urlset>';

// Write sitemap to public folder
const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(sitemapPath, sitemap, 'utf-8');

console.log(`✅ Sitemap generated with ${exercises.length} exercises + ${staticPages.length} static pages`);
console.log(`📝 Total URLs: ${exercises.length + staticPages.length}`);
console.log(`📍 Saved to: ${sitemapPath}`);
