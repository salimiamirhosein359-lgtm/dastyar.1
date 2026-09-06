#!/bin/bash
cd /var/www/dastyar/backend
node -e "
const tls = require('tls');
const PROXY_HOST = 'free-los-angeles-https-1.cloudburstcdn.com';
const PROXY_AUTH = 'Basic ' + Buffer.from('a2epfq5ugq0u:ptkx3fqg6v7n').toString('base64');
const sock = tls.connect(443, PROXY_HOST, {servername: PROXY_HOST, timeout: 10000}, () => {
  sock.write('CONNECT api.groq.com:443 HTTP/1.1\r\nHost: api.groq.com:443\r\nProxy-Authorization: ' + PROXY_AUTH + '\r\nConnection: close\r\n\r\n');
});
let buf = '';
sock.on('data', d => { buf += d.toString(); if(buf.includes('200')){console.log('PROXY OK');sock.destroy();} });
sock.on('error', e => console.log('PROXY ERROR:', e.message));
sock.on('timeout', () => {sock.destroy();console.log('PROXY TIMEOUT');});
setTimeout(()=>{console.log('RESULT:',buf.substring(0,100));process.exit()}, 8000);
" 2>&1
