const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { uploadDocument, getDocuments, getDocument, deleteDocument, getDocumentStatus } = require('../controllers/document.controller');

router.use(authMiddleware);

router.post('/upload-file', express.raw({ type: '*/*', limit: '20mb' }), (req, res, next) => {
  const contentType = req.headers['content-type'] || 'text/plain';
  const fileName = req.headers['x-filename'] || 'upload.txt';
  req.file = {
    buffer: req.body,
    originalname: fileName,
    mimetype: contentType,
    size: req.body.length
  };

  if (fileName.endsWith('.pdf')) {
    try {
      const pdfParse = require('pdf-parse');
      pdfParse(req.body).then(data => {
        req.file.buffer = Buffer.from(data.text, 'utf-8');
        req.file.mimetype = 'text/plain';
        uploadDocument(req, res);
      }).catch(err => {
        res.status(400).json({ error: 'خطا در خواندن PDF: ' + err.message });
      });
    } catch {
      res.status(400).json({ error: 'پشتیبانی PDF نصب نیست. pdf-parse را نصب کنید.' });
    }
  } else {
    uploadDocument(req, res);
  }
});

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