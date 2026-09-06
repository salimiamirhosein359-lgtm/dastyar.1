#!/bin/bash
cd /var/www/dastyar/backend
node -e "
const tls = require('tls');
const PROXY_HOST = 'free-los-angeles-https-1.cloudburstcdn.com';
const PROXY_PORT = 443;
const PROXY_AUTH = 'Basic ' + Buffer.from('a2epfq5ugq0u:ptkx3fqg6v7n').toString('base64');

const proxySocket = tls.connect(PROXY_PORT, PROXY_HOST, {servername: PROXY_HOST, timeout: 15000}, () => {
  proxySocket.write('CONNECT api.duckduckgo.com:443 HTTP/1.1\r\nHost: api.duckduckgo.com:443\r\nProxy-Authorization: ' + PROXY_AUTH + '\r\nProxy-Connection: keep-alive\r\n\r\n');
});
let headerBuf = '';
proxySocket.on('data', (chunk) => {
  headerBuf += chunk.toString();
  if (headerBuf.includes('\r\n\r\n') && headerBuf.includes('200')) {
    proxySocket.removeAllListeners('data');
    const tlsSocket = tls.connect({socket: proxySocket, servername: 'api.duckduckgo.com', timeout: 15000}, () => {
      tlsSocket.write('GET /?q=hello&format=json&no_html=1&skip_disambig=1 HTTP/1.1\r\nHost: api.duckduckgo.com\r\nConnection: close\r\nAccept: application/json\r\nAccept-Encoding: identity\r\n\r\n');
    });
    let buf = '';
    tlsSocket.on('data', (c) => { buf += c.toString(); });
    tlsSocket.on('end', () => {
      const idx = buf.indexOf('\r\n\r\n');
      let body = idx >= 0 ? buf.substring(idx + 4) : buf;
      console.log('=== RAW (500) ===');
      console.log(body.substring(0, 500));
      console.log('=== LAST 100 ===');
      console.log(body.substring(body.length - 100));
      
      let decoded = '';
      let pos = 0;
      while (pos < body.length) {
        const m = body.substring(pos).match(/^([0-9a-fA-F]+)\r\n/);
        if (!m) { console.log('No chunk match at pos', pos, ':', body.substring(pos, pos+20)); break; }
        const size = parseInt(m[1], 16);
        if (size === 0) break;
        pos += m[0].length;
        decoded += body.substring(pos, pos + size);
        pos += size + 2;
      }
      console.log('=== DECODED (300) ===');
      console.log(decoded.substring(0, 300));
      try {
        const obj = JSON.parse(decoded);
        console.log('Parsed OK. AbstractText:', obj.AbstractText?.substring(0,100));
        console.log('RelatedTopics count:', obj.RelatedTopics?.length);
      } catch(e) {
        console.log('Parse error:', e.message);
      }
    });
  }
});
" 2>&1
