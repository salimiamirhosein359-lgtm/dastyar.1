#!/bin/bash
cd /var/www/dastyar/backend
node -e "
const tls = require('tls');
const PROXY_HOST = 'free-los-angeles-https-1.cloudburstcdn.com';
const PROXY_PORT = 443;
const PROXY_AUTH = 'Basic ' + Buffer.from('a2epfq5ugq0u:ptkx3fqg6v7n').toString('base64');

function proxyRequest(hostname, path) {
  return new Promise((resolve, reject) => {
    const proxySocket = tls.connect(PROXY_PORT, PROXY_HOST, { servername: PROXY_HOST, timeout: 15000 }, () => {
      proxySocket.write([
        'CONNECT ' + hostname + ':443 HTTP/1.1',
        'Host: ' + hostname + ':443',
        'Proxy-Authorization: ' + PROXY_AUTH,
        'Proxy-Connection: keep-alive', '', '',
      ].join('\r\n'));
    });
    let headerBuf = '';
    const onProxyData = (chunk) => {
      headerBuf += chunk.toString();
      if (headerBuf.includes('\r\n\r\n') && headerBuf.includes('200')) {
        proxySocket.removeListener('data', onProxyData);
        const tlsSocket = tls.connect({ socket: proxySocket, servername: hostname, timeout: 15000 }, () => {
          tlsSocket.write('GET ' + path + ' HTTP/1.1\r\nHost: ' + hostname + '\r\nConnection: close\r\nUser-Agent: Mozilla/5.0\r\nAccept: application/json\r\nAccept-Encoding: identity\r\n\r\n');
        });
        let buf = '';
        tlsSocket.on('data', (c) => { buf += c.toString(); });
        tlsSocket.on('end', () => {
          const idx = buf.indexOf('\r\n\r\n');
          let body = idx >= 0 ? buf.substring(idx + 4) : buf;
          try {
            let decoded = '';
            let pos = 0;
            while (pos < body.length) {
              const m = body.substring(pos).match(/^([0-9a-fA-F]+)\r\n/);
              if (!m) break;
              const size = parseInt(m[1], 16);
              if (size === 0) break;
              pos += m[0].length;
              decoded += body.substring(pos, pos + size);
              pos += size + 2;
            }
            if (decoded) body = decoded;
          } catch {}
          try { resolve(JSON.parse(body)); } catch(e) { console.log('PARSE FAIL:', e.message, 'body type:', typeof body, 'len:', body.length); resolve(body); }
        });
        tlsSocket.on('error', (e) => { console.log('TLS ERROR:', e.message); reject(e); });
      } else if (headerBuf.includes('\r\n\r\n')) {
        proxySocket.removeListener('data', onProxyData);
        console.log('PROXY FAIL:', headerBuf.split('\r\n')[0]);
        reject(new Error('Proxy failed'));
      }
    };
    proxySocket.on('data', onProxyData);
    proxySocket.on('error', (e) => { console.log('SOCKET ERROR:', e.message); reject(e); });
    proxySocket.on('timeout', () => { proxySocket.destroy(); reject(new Error('timeout')); });
  });
}

(async () => {
  try {
    console.log('Starting request...');
    const data = await proxyRequest('api.duckduckgo.com', '/?q=hello&format=json&no_html=1&skip_disambig=1');
    console.log('Type:', typeof data);
    if (typeof data === 'object') {
      console.log('AbstractText:', data.AbstractText?.substring(0,80));
      console.log('RelatedTopics:', data.RelatedTopics?.length);
    }
  } catch(e) {
    console.log('CAUGHT:', e.message);
  }
})();
" 2>&1
