#!/bin/bash
cd /var/www/dastyar/backend
npm ls pdf-parse 2>&1
node -e "try { require('pdf-parse'); console.log('pdf-parse OK') } catch(e) { console.log('pdf-parse FAIL:', e.message) }" 2>&1
