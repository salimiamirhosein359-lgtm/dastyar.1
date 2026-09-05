const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { uploadDocument, getDocuments, getDocument, deleteDocument, getDocumentStatus } = require('../controllers/document.controller');

router.use(authMiddleware);

router.post('/upload', express.raw({ type: 'text/*', limit: '10mb' }), (req, res, next) => {
  req.file = {
    buffer: req.body,
    originalname: req.headers['x-filename'] || 'upload.txt',
    mimetype: req.headers['content-type'] || 'text/plain',
    size: req.body.length
  };
  uploadDocument(req, res);
});

router.post('/upload-json', express.json({ limit: '10mb' }), (req, res, next) => {
  const { content, fileName, fileType } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  req.file = {
    buffer: Buffer.from(content, 'utf-8'),
    originalname: fileName || 'upload.txt',
    mimetype: fileType || 'text/plain',
    size: Buffer.byteLength(content, 'utf-8')
  };
  uploadDocument(req, res);
});

router.get('/', getDocuments);
router.get('/:id', getDocument);
router.get('/:id/status', getDocumentStatus);
router.delete('/:id', deleteDocument);

module.exports = router;