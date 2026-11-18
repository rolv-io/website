#!/usr/bin/env node
/**
 * Builds static documentation pages in website/docs/ from app/src/docs/*.md
 * and copies screenshots from app/public/docs/*.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from './vendor/marked.esm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const DOCS_SRC_DIR = path.resolve(ROOT_DIR, 'app/src/docs');
const DOCS_IMG_SRC_DIR = path.resolve(ROOT_DIR, 'app/public/docs');
const WEBSITE_DIR = path.resolve(__dirname, '..');
const DOCS_OUT_DIR = path.resolve(WEBSITE_DIR, 'docs');

const CLOUDFLARE_ANALYTICS = `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "22956b3c44774125b79b1c456a44252e"}'></script><!-- End Cloudflare Web Analytics -->`;

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" height="32" preserveAspectRatio="xMidYMid meet">
    <g transform="matrix(1.6794,0,0,2.27631,188.384,-1051.21)">
        <ellipse cx="192.698" cy="686.728" rx="304.871" ry="224.925" fill="none"/>
    </g>
    <g transform="matrix(7.99889,0,0,7.99889,112,64.3929)">
        <path d="M99.7,76.4L59.9,7.5C59.5,6.8 58.7,6.4 57.9,6.4L42,6.4C41.2,6.4 40.4,6.8 40,7.5L0.3,76.4C-0.1,77.1 -0.1,78 0.3,78.7L8.3,92.5C8.7,93.2 9.5,93.6 10.3,93.6L89.8,93.6C90.6,93.6 91.4,93.2 91.8,92.5L99.8,78.7C100.1,78 100.1,77.1 99.7,76.4ZM43.4,11L54,11L24.2,62.6C23.8,63.3 23.8,64.2 24.2,64.9C24.6,65.6 25.4,66 26.2,66L56.7,66L62,75.2L6.3,75.2L43.4,11ZM50,54.6L54,61.5L46,61.5L50,54.6ZM6.3,79.8L65.9,79.8C66.7,79.8 67.5,79.4 67.9,78.7C68.3,78 68.3,77.1 67.9,76.4L52.7,50L58,40.8L85.8,89L11.6,89L6.3,79.8ZM89.8,86.7L59.9,35.1C59.5,34.4 58.7,34 57.9,34C57.1,34 56.3,34.4 55.9,35.1L40.7,61.5L30.1,61.5L58,13.3L95.1,77.6L89.8,86.7Z" fill="#f8fafc" fill-rule="nonzero"/>
    </g>
</svg>`;

const DOCS = [
  { id: 'index', file: 'index.md', title: 'Welcome to rolv', navTitle: 'Overview', desc: 'Overview of rolv intelligent research companion.' },
  { id: 'getting-started', file: 'getting-started.md', title: 'Getting Started', navTitle: 'Getting Started', desc: 'Login, first chat session, and working directories.' },
  { id: 'chat-view', file: 'chat-view.md', title: 'Chat View', navTitle: 'Chat View', desc: 'Conversational AI, code execution, and attachments.' },
  { id: 'graph-view', file: 'graph-view.md', title: 'Graph View', navTitle: 'Graph View', desc: 'Visual DAG pipelines with compute and research nodes.' },
  { id: 'recipes', file: 'recipes.md', title: 'Recipes & Workflows', navTitle: 'Recipes', desc: 'Reusable pipeline templates, cloud library, and sync.' },
  { id: 'reviews', file: 'reviews.md', title: 'Community Reviews', navTitle: 'Reviews', desc: 'Review community contributions and improvements.' },
  { id: 'settings', file: 'settings.md', title: 'Settings & Compute', navTitle: 'Settings', desc: 'Token usage, SSH/SLURM remote compute, custom models.' },
  { id: 'troubleshooting', file: 'troubleshooting.md', title: 'Troubleshooting & Diagnostics', navTitle: 'Troubleshooting', desc: 'Common issues, diagnostics, and recovery.' }
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyImages() {
  if (!fs.existsSync(DOCS_IMG_SRC_DIR)) {
    console.log(`Warning: Images directory ${DOCS_IMG_SRC_DIR} not found.`);
    return;
  }
  const files = fs.readdirSync(DOCS_IMG_SRC_DIR);
  let count = 0;
  for (const f of files) {
    if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg') || f.endsWith('.webp')) {
      const src = path.join(DOCS_IMG_SRC_DIR, f);
      const dest = path.join(DOCS_OUT_DIR, f);
      fs.copyFileSync(src, dest);
      count++;
    }
  }
  console.log(`Copied ${count} images to ${DOCS_OUT_DIR}`);
}

function renderSidebar(currentId) {
  const items = DOCS.map(doc => {
    const activeClass = doc.id === currentId ? 'active' : '';
    const href = `${doc.id}.html`;
    return `<li><a href="${href}" class="docs-nav-link ${activeClass}">${doc.navTitle}</a></li>`;
  }).join('\n                ');

  return `
            <aside class="docs-sidebar">
                <div class="docs-sidebar-title">Documentation</div>
                <ul class="docs-nav-list">
                ${items}
                </ul>
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                    <a href="https://github.com/rolv-io/rolv-releases/releases/latest" class="btn btn-primary" style="display: block; text-align: center; font-size: 0.85rem; padding: 0.5rem 1rem;">
                        Download App
                    </a>
                </div>
            </aside>`;
}

function renderPagination(currentIndex) {
  const prev = currentIndex > 0 ? DOCS[currentIndex - 1] : null;
  const next = currentIndex < DOCS.length - 1 ? DOCS[currentIndex + 1] : null;

  const prevHtml = prev ? `
        <a href="${prev.id}.html" class="prev">
            <span class="label">&larr; Previous</span>
            <span class="title">${prev.navTitle}</span>
        </a>` : '<div></div>';

  const nextHtml = next ? `
        <a href="${next.id}.html" class="next">
            <span class="label">Next &rarr;</span>
            <span class="title">${next.navTitle}</span>
        </a>` : '<div></div>';

  return `
    <nav class="docs-pagination">
        ${prevHtml}
        ${nextHtml}
    </nav>`;
}

function processMarkdown(content) {
  // 1. Rewrite markdown links: e.g. [Link](getting-started.md) -> [Link](getting-started.html)
  let transformed = content.replace(/\[([^\]]+)\]\(([^)]+)\.md(#[^)]+)?\)/g, '[$1]($2.html$3)');

  // 2. Rewrite image paths: /docs/foo.png -> foo.png (so it works relative locally and on web)
  transformed = transformed.replace(/!\[([^\]]*)\]\(\/docs\/([^)]+)\)/g, '![$1]($2)');

  // 3. Convert markdown to HTML via marked
  let html = marked.parse(transformed);

  return html;
}

function buildDocPage(doc, index) {
  const srcPath = path.join(DOCS_SRC_DIR, doc.file);
  if (!fs.existsSync(srcPath)) {
    console.error(`Error: Source file ${srcPath} does not exist!`);
    return;
  }

  const rawMd = fs.readFileSync(srcPath, 'utf8');
  const contentHtml = processMarkdown(rawMd);
  const sidebarHtml = renderSidebar(doc.id);
  const paginationHtml = renderPagination(index);

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${doc.title} - rolv Documentation</title>
    <meta name="description" content="${doc.desc}">
    <link rel="canonical" href="https://rolv.io/docs/${doc.id}.html">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${doc.title} - rolv Documentation">
    <meta property="og:description" content="${doc.desc}">
    <meta property="og:url" content="https://rolv.io/docs/${doc.id}.html">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/x-icon" href="../favicon.ico">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="apple-touch-icon" href="../apple-touch-icon.png">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <div class="container">
        <!-- Navigation -->
        <nav>
            <a href="../index.html" class="logo" style="text-decoration: none;">
                ${LOGO_SVG}
                rolv
            </a>
            <div class="nav-links">
                <a href="../index.html">Home</a>
                <a href="index.html" style="color: var(--accent);">Docs</a>
                <a href="../blog/index.html">Blog</a>
                <a href="../contact.html">Contact</a>
            </div>
        </nav>

        <div class="docs-layout">
            ${sidebarHtml}

            <main class="docs-main">
                <article class="docs-content">
                    ${contentHtml}
                </article>

                <div class="docs-cta-box">
                    <div>
                        <h4 style="margin-bottom: 0.25rem;">Try rolv on your desktop</h4>
                        <p style="color: var(--text-secondary); margin-bottom: 0; font-size: 0.9rem;">
                            Execute these workflows locally or connect to your lab's HPC.
                        </p>
                    </div>
                    <a href="https://github.com/rolv-io/rolv-releases/releases/latest" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-size: 0.9rem;">
                        Download App
                    </a>
                </div>

                ${paginationHtml}
            </main>
        </div>

        <!-- Footer -->
        <footer>
            <div class="footer-content" style="justify-content: center;">
                <div class="footer-links" style="gap: 4rem;">
                    <a href="../index.html" style="color: var(--text-secondary); font-size: 0.9rem;">Home</a>
                    <a href="index.html" style="color: var(--text-primary); font-size: 0.9rem;">Docs</a>
                    <a href="../blog/index.html" style="color: var(--text-secondary); font-size: 0.9rem;">Blog</a>
                    <a href="../contact.html" style="color: var(--text-secondary); font-size: 0.9rem;">Contact</a>
                </div>
            </div>
            <p style="text-align: center; margin-top: 2rem; font-size: 0.85rem; color: var(--text-secondary);">
                &copy; 2026 rolv
            </p>
        </footer>
    </div>
    ${CLOUDFLARE_ANALYTICS}
</body>
</html>
`;

  const outPath = path.join(DOCS_OUT_DIR, `${doc.id}.html`);
  fs.writeFileSync(outPath, fullHtml, 'utf8');
  console.log(`Generated: docs/${doc.id}.html`);
}

function main() {
  console.log('Building documentation from app/src/docs to website/docs...');
  ensureDir(DOCS_OUT_DIR);
  copyImages();

  DOCS.forEach((doc, idx) => {
    buildDocPage(doc, idx);
  });

  console.log('Documentation build completed successfully!');
}

main();
