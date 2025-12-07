const http = require('http');

http.get('http://localhost:8888/tokyo-night-test.zip', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Content-Length:', res.headers['content-length']);
  console.log('✅ Server is responding correctly');
  res.resume();
}).on('error', (err) => {
  console.error('❌ Error:', err.message);
});
