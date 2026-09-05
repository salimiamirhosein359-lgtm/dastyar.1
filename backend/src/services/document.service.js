const { PrismaClient } = require('@prisma/client');
const { getEmbedding } = require('./embedding.service');
const logger = require('../config/logger');
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient();

function chunkText(text, maxTokens = 512, overlap = 0.15) {
  if (!text || text.trim().length === 0) return [];

  let chunks = [];
  const paragraphs = text.split(/\n\s*\n/);

  if (paragraphs.length > 1) {
    let currentChunk = '';
    let currentTokens = 0;

    for (const para of paragraphs) {
      const paraTokens = Math.ceil(para.split(/\s+/).length * 1.3);
      if (currentTokens + paraTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        const overlapWords = Math.floor(currentChunk.split(/\s+/).length * overlap);
        const words = currentChunk.split(/\s+/);
        currentChunk = words.slice(-overlapWords).join(' ') + '\n\n' + para;
        currentTokens = Math.ceil(currentChunk.split(/\s+/).length * 1.3);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
        currentTokens += paraTokens;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
  }

  if (chunks.length <= 1 && text.length > maxTokens * 5) {
    const sentences = text.split(/(?<=[.!?؟])\s+/);
    chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const sentenceTokens = Math.ceil(sentence.split(/\s+/).length * 1.3);
      if (sentenceTokens > maxTokens) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = '';
        const words = sentence.split(/\s+/);
        for (let i = 0; i < words.length; i += Math.floor(maxTokens / 1.3)) {
          chunks.push(words.slice(i, i + Math.floor(maxTokens / 1.3)).join(' '));
        }
      } else if (Math.ceil(currentChunk.split(/\s+/).length * 1.3) + sentenceTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        const overlapWords = Math.floor(currentChunk.split(/\s+/).length * overlap);
        const prevWords = currentChunk.split(/\s+/);
        currentChunk = prevWords.slice(-overlapWords).join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0) {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i += Math.floor(maxTokens / 1.3)) {
      chunks.push(words.slice(i, i + Math.floor(maxTokens / 1.3)).join(' '));
    }
  }

  return chunks;
}

async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function processDocument(documentId) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    let text = doc.content || '';

    if (doc.fileType === 'application/pdf') {
      try {
        const { PrismaClient } = require('@prisma/client');
        const tempPrisma = new PrismaClient();
        const rawDoc = await tempPrisma.$queryRawUnsafe(
          `SELECT content FROM "Document" WHERE id = $1`, documentId
        );
        if (rawDoc && rawDoc[0] && rawDoc[0].content) {
          const pdfBuffer = Buffer.from(rawDoc[0].content, 'latin1');
          text = await parsePdf(pdfBuffer);
        }
        await tempPrisma.$disconnect();
      } catch (pdfErr) {
        logger.error(`PDF parsing failed for ${documentId}: ${pdfErr.message}`);
      }
    }

    if (!text || text.trim().length === 0) {
      text = doc.content || '';
    }

    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      const tokenCount = Math.ceil(chunkContent.split(/\s+/).length * 1.3);

      await prisma.chunk.create({
        data: {
          documentId,
          content: chunkContent,
          chunkIndex: i,
          tokenCount
        }
      });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'ready', chunkCount: chunks.length }
    });

    logger.info(`Document ${documentId} processed: ${chunks.length} chunks`);
    return chunks.length;
  } catch (error) {
    logger.error('Document processing error:', error.message);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'error' }
    });
    throw error;
  }
}

async function embedChunks(documentId) {
  const chunks = await prisma.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' }
  });

  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await Promise.all(
      batch.map(c => getEmbedding(c.content))
    );

    for (let j = 0; j < batch.length; j++) {
      const arrStr = '[' + embeddings[j].join(',') + ']';
      await prisma.$executeRawUnsafe(
        `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
        arrStr, batch[j].id
      );
    }

    logger.info(`Embedded chunks ${i}-${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
  }

  logger.info(`All chunks embedded for document ${documentId}`);
}

module.exports = { chunkText, processDocument, embedChunks, parsePdf };
