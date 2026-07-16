const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5501;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Strip query strings or hashes
    filePath = filePath.split('?')[0].split('#')[0];

    // Decode URI component (handles spaces in file paths)
    try {
        filePath = decodeURIComponent(filePath);
    } catch (e) {
        // Keep original path if decoding fails
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // If it has no extension, try appending .html (e.g. /about -> /about.html)
                if (!extname) {
                    const fallbackPath = filePath + '.html';
                    fs.readFile(fallbackPath, (fallbackError, fallbackContent) => {
                        if (!fallbackError) {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(fallbackContent, 'utf-8');
                        } else {
                            serve404(res);
                        }
                    });
                } else {
                    serve404(res);
                }
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}\n`);
            }
        } else {
            const headers = { 'Content-Type': contentType };
            if (extname === '.js' || extname === '.css' || ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(extname)) {
                headers['Cache-Control'] = 'public, max-age=31536000, immutable';
            }
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

function serve404(res) {
    fs.readFile('./404.html', (err, content) => {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(content || '404 Not Found', 'utf-8');
    });
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press Ctrl+C to stop the server.');
});
