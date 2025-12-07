const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - Request: ${req.url}`);

  if (req.url === '/tokyo-night-test.zip') {
    const themePath = '/tmp/tokyo-night-test.zip';

    if (!fs.existsSync(themePath)) {
      res.writeHead(404);
      res.end('Theme file not found');
      return;
    }

    const stat = fs.statSync(themePath);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="tokyo-night-test.zip"'
    });

    const readStream = fs.createReadStream(themePath);
    readStream.pipe(res);

    readStream.on('end', () => {
      console.log('✅ File sent successfully');
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 8888;
server.listen(PORT, () => {
  console.log(`✅ Test server running at http://localhost:${PORT}`);
  console.log(`   Test URL: http://localhost:${PORT}/tokyo-night-test.zip`);
  console.log('\nPress Ctrl+C to stop the server');
});
