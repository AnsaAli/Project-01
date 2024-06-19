const multer = require('multer');
const fs = require('fs');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Custom file upload middleware
const uploadMiddleware = (req, res, next) => {
console.log('in uploadmiddleware')
  const uploadMultiple = upload.fields([{ name: 'image', maxCount: 12 }, { name: 'croppedImages', maxCount: 12 }]);

  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({ errorMessage: err.message });
    }

    const images = req.files.image || [];
    console.log('images in multer: ',images)
    const croppedImages = req.files.croppedImages || [];
    console.log('croppedImages in multer: ',croppedImages)
    const files = images.concat(croppedImages);

    console.log('files in uploadMiddleware: ', files);
    const errors = [];

    files.forEach((file) => {
      const allowedTypes = ['image/jpeg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`Invalid file type: ${file.originalname}`);
      }

      if (file.size > maxSize) {
        errors.push(`File too large: ${file.originalname}`);
      }
    });

    if (errors.length > 0) {
      files.forEach((file) => {
        fs.unlinkSync(file.path);
      });

      return res.status(400).json({ errors });
    }

    req.files = files;
    next();
  });
};

module.exports = uploadMiddleware;
