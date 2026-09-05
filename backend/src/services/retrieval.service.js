const { PrismaClient } = require('@prisma/client');
const { getEmbedding } = require('./embedding.service');
const logger = require('../config/logger');

const prisma = new PrismaClient();

async function hybridSearch(query, userId, topK = 5) {
  const queryEmbedding = await getEmbedding(query);

  const embeddingStr = '[' + queryEmbedding.join(',') + ']';

  const vectorResults = await prisma.$queryRawUnsafe(`
    SELECT d.id AS doc_id, d.title, d.file_name AS "fileName", d.file_type AS "fileType",
           c.id AS chunk_id, c.content AS chunk_content, c.chunk_index AS "chunkIndex",
           c.embedding <=> $1::vector AS similarity
    FROM "Chunk" c
    JOIN "Document" d ON c.document_id = d.id
    WHERE d.user_id = $2 AND d.status = 'ready'
    ORDER BY c.embedding <=> $1::vector
    LIMIT $3
  `, embeddingStr, userId, topK);

  const keywordResults = await prisma.$queryRawUnsafe(`
    SELECT d.id AS doc_id, d.title, d.file_name AS "fileName", d.file_type AS "fileType",
           c.id AS chunk_id, c.content AS chunk_content, c.chunk_index AS "chunkIndex",
           ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) AS rank
    FROM "Chunk" c
    JOIN "Document" d ON c.document_id = d.id
    WHERE d.user_id = $2 AND d.status = 'ready'
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $3
  `, query, userId, topK);

  const merged = new Map();
  const alpha = 0.7;

  for (const r of vectorResults) {
    merged.set(r.chunk_id, {
      chunkId: r.chunk_id,
      content: r.chunk_content,
      documentTitle: r.title,
      documentId: r.doc_id,
      fileName: r.fileName,
      fileType: r.fileType,
      chunkIndex: r.chunkIndex,
      score: alpha * (1 - r.similarity)
    });
  }

  for (const r of keywordResults) {
    const existing = merged.get(r.chunk_id);
    if (existing) {
      existing.score += (1 - alpha) * r.rank;
    } else {
      merged.set(r.chunk_id, {
        chunkId: r.chunk_id,
        content: r.chunk_content,
        documentTitle: r.title,
        documentId: r.doc_id,
        fileName: r.fileName,
        fileType: r.fileType,
        chunkIndex: r.chunkIndex,
        score: (1 - alpha) * r.rank
      });
    }
  }

  const results = Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}

async function searchByKeywords(query, userId, limit = 5) {
  return prisma.$queryRawUnsafe(`
    SELECT d.id AS doc_id, d.title, d.file_name AS "fileName",
           c.id AS chunk_id, c.content AS chunk_content, c.chunk_index AS "chunkIndex",
           ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) AS rank
    FROM "Chunk" c
    JOIN "Document" d ON c.document_id = d.id
    WHERE d.user_id = $2 AND d.status = 'ready'
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $3
  `, query, userId, limit);
}

module.exports = { hybridSearch, searchByKeywords };