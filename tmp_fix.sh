#!/bin/bash
cd /var/www/dastyar/backend
npm install pdf-parse@1.1.1 2>&1
node -e "try { const p = require('pdf-parse'); console.log('pdf-parse OK, version:', typeof p) } catch(e) { console.log('pdf-parse FAIL:', e.message) }" 2>&1
