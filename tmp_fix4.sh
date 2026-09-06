#!/bin/bash
cd /var/www/dastyar/backend
echo "1. Cleaning npm cache..."
npm cache clean --force 2>&1
echo "2. Fixing registry..."
npm config set registry https://registry.npmjs.org 2>&1
echo "3. Installing @napi-rs/canvas..."
npm install @napi-rs/canvas 2>&1
echo "4. Testing pdf-parse..."
node -e "const pdfParse = require('pdf-parse'); console.log('pdf-parse loaded OK')" 2>&1
echo "5. Testing with empty buffer..."
node -e "
const pdfParse = require('pdf-parse');
const testBuf = Buffer.from('%PDF-1.4 test');
pdfParse(testBuf).then(d => console.log('parse OK')).catch(e => console.log('parse err:', e.message));
" 2>&1
echo "=== DONE ==="
