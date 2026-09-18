import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
  }
};

// Field name "evidence" — up to 5 images, 5MB each (matches client validation).
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

export const uploadComplaintEvidence = upload.array('evidence', 5);

// Wrap multer so file-filter/size errors are returned as JSON 400s instead of
// raw HTML MulterErrors.
export const handleComplaintUpload = (req, res, next) => {
  uploadComplaintEvidence(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
};

export default handleComplaintUpload;
