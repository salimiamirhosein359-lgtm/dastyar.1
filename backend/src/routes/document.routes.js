const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { unzipSync } = require('zlib');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { uploadDocument, getDocuments, getDocument, deleteDocument, getDocumentStatus } = require('../controllers/document.controller');

router.use(authMiddleware);

const TEXT_EXTS = ['.txt', '.md', '.csv', '.json', '.js', '.ts', '.py', '.html', '.css', '.xml', '.yaml', '.yml', '.log', '.sql', '.sh', '.bat'];
const PDF_EXTS = ['.pdf'];
const DOC_EXTS = ['.doc'];
const DOCX_EXTS = ['.docx', '.pptx', '.xlsx'];
const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
const VIDEO_EXTS = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];

function getExt(filename) {
  return path.extname(filename).toLowerCase();
}

function extractTextFromDocx(buffer) {
  const tmpDir = path.join(os.tmpdir(), `docx-${Date.now()}`);
  const zipPath = path.join(tmpDir, 'file.zip');
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(zipPath, buffer);
    execSync(`unzip -o "${zipPath}" -d "${tmpDir}" 2>/dev/null`, { timeout: 10000 });
    const docPath = path.join(tmpDir, 'word', 'document.xml');
    if (fs.existsSync(docPath)) {
      let xml = fs.readFileSync(docPath, 'utf-8');
      xml = xml.replace(/<w:p[^>]*>/g, '\n');
      xml = xml.replace(/<[^>]+>/g, '');
      xml = xml.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#\d+;/g, '');
      xml = xml.replace(/\n{3,}/g, '\n\n').trim();
      return xml;
    }
    return '';
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function extractTextFromImage(buffer, filename) {
  const tmpFile = path.join(os.tmpdir(), `ocr-${Date.now()}${getExt(filename)}`);
  try {
    fs.writeFileSync(tmpFile, buffer);
    const result = execSync(`tesseract "${tmpFile}" stdout -l fas+eng --psm 3 2>/dev/null`, { timeout: 30000 });
    return result.toString('utf-8').trim();
  } catch {
    return `[تصویر: ${filename}]`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function getAudioInfo(buffer, filename) {
  const tmpFile = path.join(os.tmpdir(), `audio-${Date.now()}${getExt(filename)}`);
  try {
    fs.writeFileSync(tmpFile, buffer);
    const info = execSync(`ffprobe -v quiet -print_format json -show_format "${tmpFile}" 2>/dev/null`, { timeout: 10000 });
    const data = JSON.parse(info.toString('utf-8'));
    const dur = parseFloat(data.format?.duration || 0);
    const size = buffer.length;
    return `فایل صوتی: ${filename}\nفرمت: ${path.extname(filename)}\nمدت: ${Math.round(dur)} ثانیه\nحجم: ${(size / 1024).toFixed(1)} KB`;
  } catch {
    return `فایل صوتی: ${filename}`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

router.post('/upload-file', (req, res, next) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const fileName = decodeURIComponent(req.headers['x-filename'] || 'upload.bin');

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'فایل خالی است' });
    }
    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'فایل بیش از 20 مگابایت است' });
    }

    const ext = getExt(fileName);

    req.file = {
      buffer,
      originalname: fileName,
      mimetype: contentType,
      size: buffer.length
    };

    try {
      if (ext === '.pdf') {
        const tmpFile = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`);
        const txtFile = tmpFile.replace('.pdf', '.txt');
        try {
          fs.writeFileSync(tmpFile, buffer);
          execSync(`pdftotext "${tmpFile}" "${txtFile}"`, { timeout: 30000 });
          const text = fs.readFileSync(txtFile, 'utf-8');
          req.file.buffer = Buffer.from(text, 'utf-8');
          req.file.mimetype = 'text/plain';
        } finally {
          try { fs.unlinkSync(tmpFile); } catch {}
          try { fs.unlinkSync(txtFile); } catch {}
        }
        uploadDocument(req, res);

      } else if (DOC_EXTS.includes(ext)) {
        const tmpFile = path.join(os.tmpdir(), `upload-${Date.now()}.doc`);
        const txtFile = tmpFile.replace('.doc', '.txt');
        try {
          fs.writeFileSync(tmpFile, buffer);
          execSync(`antiword "${tmpFile}" > "${txtFile}" 2>/dev/null`, { timeout: 15000 });
          const text = fs.readFileSync(txtFile, 'utf-8');
          req.file.buffer = Buffer.from(text, 'utf-8');
          req.file.mimetype = 'text/plain';
        } catch {
          req.file.buffer = Buffer.from(`[فایل Word: ${fileName}]`, 'utf-8');
          req.file.mimetype = 'text/plain';
        } finally {
          try { fs.unlinkSync(tmpFile); } catch {}
          try { fs.unlinkSync(txtFile); } catch {}
        }
        uploadDocument(req, res);

      } else if (DOCX_EXTS.includes(ext)) {
        const text = extractTextFromDocx(buffer);
        req.file.buffer = Buffer.from(text || `[فایل Word: ${fileName}]`, 'utf-8');
        req.file.mimetype = 'text/plain';
        uploadDocument(req, res);

      } else if (IMG_EXTS.includes(ext)) {
        const text = extractTextFromImage(buffer, fileName);
        req.file.buffer = Buffer.from(text || `[تصویر: ${fileName}]`, 'utf-8');
        req.file.mimetype = 'text/plain';
        uploadDocument(req, res);

      } else if (AUDIO_EXTS.includes(ext)) {
        const text = getAudioInfo(buffer, fileName);
        req.file.buffer = Buffer.from(text, 'utf-8');
        req.file.mimetype = 'text/plain';
        uploadDocument(req, res);

      } else {
        uploadDocument(req, res);
      }
    } catch (err) {
      res.status(400).json({ error: 'خطا در پردازش فایل: ' + err.message });
    }
  });
  req.on('error', (err) => {
    res.status(500).json({ error: 'خطا در دریافت فایل' });
  });
});

router.post('/upload', express.raw({ type: 'text/*', limit: '20mb' }), (req, res, next) => {
  req.file = {
    buffer: req.body,
    originalname: req.headers['x-filename'] || 'upload.txt',
    mimetype: req.headers['content-type'] || 'text/plain',
    size: req.body.length
  };
  uploadDocument(req, res);
});

router.post('/upload-json', express.json({ limit: '20mb' }), (req, res, next) => {
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
