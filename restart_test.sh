#!/bin/bash
cd /var/www/dastyar/backend
pm2 delete dastyar-backend 2>/dev/null
pm2 start src/index.js --name dastyar-backend --max-memory-restart 300M
sleep 3
node -e "
const {searchWeb} = require('./src/services/search.service');
(async () => {
  try {
    const r = await searchWeb('hello', 3);
    console.log('Results:', r.length);
    r.forEach((x,i) => console.log((i+1)+'.', x.title));
  } catch(e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
  }
})();
" 2>&1
