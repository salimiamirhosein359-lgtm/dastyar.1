#!/bin/bash
cd /var/www/dastyar/backend
node -e "
const {searchWeb} = require('./src/services/search.service');
(async () => {
  const r1 = await searchWeb('hello', 3);
  console.log('English:', r1.length, 'results');
  r1.forEach((x,i) => console.log('  ' + (i+1) + '.', x.title));
  
  const r2 = await searchWeb('artificial intelligence news', 3);
  console.log('AI news:', r2.length, 'results');
  r2.forEach((x,i) => console.log('  ' + (i+1) + '.', x.title));
})();
" 2>&1
