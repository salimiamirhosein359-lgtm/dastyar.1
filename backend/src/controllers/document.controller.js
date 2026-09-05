const { PrismaClient } = require('@prisma/client');
const { processDocument, embedChunks } = require('../services/document.service');
const logger = require('../config/logger');

const prisma = new PrismaClient();

async function uploadDocument(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const userId = req.user.id;
    let content = '';

    if (file.mimetype === 'application/pdf') {
      content = file.buffer.toString('latin1');
    } else if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
      content = file.buffer.toString('utf-8');
    } else {
      content = file.buffer.toString('utf-8');
    }

    const document = await prisma.document.create({
      data: {
        userId,
        title: file.originalname,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        content,
        status: 'processing'
      }
    });

    const processWithRetry = async (docId, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await processDocument(docId);
          await embedChunks(docId);
          return;
        } catch (err) {
          logger.error(`Document ${docId} processing attempt ${attempt}/${retries} failed: ${err.message}`);
          if (attempt === retries) {
            await prisma.document.update({ where: { id: docId }, data: { status: 'error' } });
          } else {
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }
      }
    };
    processWithRetry(document.id).catch(err => logger.error('Document processing failed:', err.message));

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: document.status
      }
    });
  } catch (error) {
    logger.error('Upload error:', error.message);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}

async function getDocuments(req, res) {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        status: true,
        chunkCount: true,
        createdAt: true
      }
    });

    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

async function getDocument(req, res) {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        status: true,
        chunkCount: true,
        content: true,
        createdAt: true,
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: { id: true, content: true, chunkIndex: true, tokenCount: true }
        }
      }
    });

    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json({ document });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
}

async function deleteDocument(req, res) {
  try {
    await prisma.document.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
}

async function getDocumentStatus(req, res) {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true, status: true, chunkCount: true }
    });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json({ status: document.status, chunkCount: document.chunkCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check status' });
  }
}

module.exports = { uploadDocument, getDocuments, getDocument, deleteDocument, getDocumentStatus };