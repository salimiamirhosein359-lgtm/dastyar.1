#!/bin/bash
cd /var/www/dastyar/backend
npm install pdfjs-dist@3.11.174 --registry https://registry.npmjs.org --force 2>&1
echo "---CHECK---"
node -e "const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js'); console.log('pdfjs-dist OK')" 2>&1
