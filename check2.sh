#!/bin/bash
cd /var/www/dastyar/backend
node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const doc = await p.document.findUnique({where:{id:'8bea41e8-07f4-4571-81ee-16445e09233c'}, select:{id:true, title:true, fileType:true, content:true}});
  console.log('FILE_TYPE:', doc.fileType);
  console.log('CONTENT_LENGTH:', doc.content?.length);
  console.log('CONTENT_FIRST_500:', doc.content?.substring(0, 500));
  
  const chunks = await p.chunk.findMany({where:{documentId:'8bea41e8-07f4-4571-81ee-16445e09233c'}, take:2, select:{content:true}});
  console.log('CHUNKS:', JSON.stringify(chunks.map(c => c.content?.substring(0, 200))));
  
  await p.\$disconnect();
})();
" 2>&1
