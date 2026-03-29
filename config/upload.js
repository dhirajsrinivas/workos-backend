const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const wsDir = path.join(uploadDir, `ws_${req.params.id}`);
    if (!fs.existsSync(wsDir)) fs.mkdirSync(wsDir, { recursive: true });
    cb(null, wsDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['text/plain'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || ext === '.txt') {
    cb(null, true);
  } else {
    cb(new Error('Only .txt files are allowed.'), false);
  }
};

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB) || 5;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

module.exports = { upload };
