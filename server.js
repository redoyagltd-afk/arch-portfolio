/**
 * ARK STUDIO — Local Studio Server
 * Pure Node.js (Zero npm dependencies)
 * 
 * Provides direct 1-click project saves, image uploads, and static serving.
 * Run with: node server.js
 * Or double-click: start-studio.bat
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '') safePath = '/dashboard.html';

  let filePath = path.join(ROOT_DIR, safePath);

  // If directory, look for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
    res.end('<h1>404 Not Found</h1><p><a href="/dashboard.html">Return to Dashboard</a></p>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

function handleApi(req, res, parsedUrl) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. GET /api/status
  if (parsedUrl.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'connected',
      studio: 'ARK STUDIO',
      port: PORT,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. POST /api/save-project
  if (parsedUrl.pathname === '/api/save-project' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { slug, html, cardHtml } = data;

        if (!slug || !html) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing slug or html content.' }));
          return;
        }

        const projectFilePath = path.join(ROOT_DIR, 'projects', `${slug}.html`);
        fs.writeFileSync(projectFilePath, html, 'utf8');

        // Optional update of index.html Selected Works grid
        if (cardHtml) {
          const indexPath = path.join(ROOT_DIR, 'index.html');
          if (fs.existsSync(indexPath)) {
            let indexHtml = fs.readFileSync(indexPath, 'utf8');
            const cardRegex = new RegExp(`href="projects/${slug}.html"`, 'i');
            
            // If project not in index.html, inject before closing </div class="project-grid">
            if (!cardRegex.test(indexHtml)) {
              const gridEndIndex = indexHtml.indexOf('</div>\r\n        </section>') !== -1
                ? indexHtml.indexOf('</div>\r\n        </section>')
                : indexHtml.indexOf('</div>\n        </section>');

              if (gridEndIndex !== -1) {
                const updatedIndex = indexHtml.slice(0, gridEndIndex) + 
                  `\n                ${cardHtml}\n            ` + 
                  indexHtml.slice(gridEndIndex);
                fs.writeFileSync(indexPath, updatedIndex, 'utf8');
              }
            }
          }
        }

        // Optional update of sitemap.xml
        const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
        if (fs.existsSync(sitemapPath)) {
          let sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
          const pageUrl = `https://arkstudio.arch/projects/${slug}.html`;
          if (!sitemapContent.includes(pageUrl)) {
            const closingTag = '</urlset>';
            const entry = `  <url>\n    <loc>${pageUrl}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
            sitemapContent = sitemapContent.replace(closingTag, entry + closingTag);
            fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Project saved successfully to projects/${slug}.html`,
          path: `projects/${slug}.html`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. POST /api/upload-image
  if (parsedUrl.pathname === '/api/upload-image' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { slug, filename, base64 } = data;

        if (!slug || !filename || !base64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing slug, filename, or base64 data.' }));
          return;
        }

        const projectImgDir = path.join(ROOT_DIR, 'images', 'projects', slug);
        if (!fs.existsSync(projectImgDir)) {
          fs.mkdirSync(projectImgDir, { recursive: true });
        }

        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const targetPath = path.join(projectImgDir, filename);

        fs.writeFileSync(targetPath, buffer);

        const publicPath = `images/projects/${slug}/${filename}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          publicPath: publicPath,
          message: `Image saved to ${publicPath}`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Fallback 404 for API
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname.startsWith('/api/')) {
    handleApi(req, res, parsedUrl);
  } else {
    serveStatic(req, res, parsedUrl.pathname);
  }
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  ARK STUDIO — Management Server Running`);
  console.log(`  URL: http://localhost:${PORT}/dashboard.html`);
  console.log(`  Press Ctrl + C to stop`);
  console.log(`===============================================`);
});
