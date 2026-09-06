#!/bin/bash
cd /var/www/dastyar/backend
npm install pdf2json 2>&1
node -e "const PDFParser = require('pdf2json'); const p = new PDFParser(); console.log('pdf2json OK, loaded')" 2>&1
