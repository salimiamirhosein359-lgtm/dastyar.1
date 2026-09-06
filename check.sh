#!/bin/bash
cd /var/www/dastyar/backend
node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const docs = await p.document.findMany({take:5, select:{id:true, title:true, userId:true, status:true}});
  console.log('DOCS:', JSON.stringify(docs, null, 2));
  const users = await p.user.findMany({select:{id:true, email:true}});
  console.log('USERS:', JSON.stringify(users, null, 2));
  await p.\$disconnect();
})();
" 2>&1
