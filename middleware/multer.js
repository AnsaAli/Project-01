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

// Create multer upload instance
const upload = multer({ storage: storage });

// Custom file upload middleware
const uploadMiddleware = (req, res, next) => {
  console.log('===========uploadMiddleware 1')
  // Use multer upload instance
  upload.array('image', 12)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    console.log('===========uploadMiddleware 2')
    // Retrieve uploaded files
    const files = req.files;
    console.log('===========uploadMiddleware files 36: ', files);
    const errors = [];

    // Validate file types and sizes
    files.forEach((file) => {
      const allowedTypes = ['image/jpeg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      console.log('===========uploadMiddleware 3')

      if (!allowedTypes.includes(file.mimetype)) {
        console.log('Invalid file type in upload middleware')
        errors.push(`Invalid file type: ${file.originalname}`);
      }

      if (file.size > maxSize) {
        console.log('File too large in upload middleware')
        errors.push(`File too large: ${file.originalname}`);
      }
    });

    console.log('===========uploadMiddleware 4')
    // Handle validation errors
    if (errors.length > 0) {
      // Remove uploaded files
      files.forEach((file) => {
        fs.unlinkSync(file.path);
      });

      return res.status(400).json({ errors });
    }

    console.log('===========uploadMiddleware 5')
    // Attach files to the request object
    req.files = files;

    // Proceed to the next middleware or route handler
    next();
  });
};

module.exports = uploadMiddleware;
