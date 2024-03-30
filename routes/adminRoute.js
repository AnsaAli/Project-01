const express= require('express')
const admin_route= express()
// const path = require('path')
const adminController= require('../controller/adminController')
const  {sessionSecret}  = require('../secret/secret')
const authMiddleware= require('../middleware/adminAuthMiddlware')

const multer= require('multer')
const fs = require('fs');
const path = require('path');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, '/uploads')
//     },
//     filename: function (req, file, cb) {
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//       cb(null, file.fieldname + '-' + uniqueSuffix)
//     }
//   })
  
//   const upload = multer({
//     storage: storage,
//     limits: { fileSize: 1024 * 1024 } 
//   });

// const upload = multer({dest:"uploads/"});


// Configure multer storage and file name
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
    upload.array('image', 5)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
  console.log('===========uploadMiddleware 2')
      // Retrieve uploaded files
      const files = req.files;
      const errors = [];
  
      // Validate file types and sizes
      files.forEach((file) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        console.log('===========uploadMiddleware 3')

        if (!allowedTypes.includes(file.mimetype)) {
          errors.push(`Invalid file type: ${file.originalname}`);
        }
  
        if (file.size > maxSize) {
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

admin_route.set('view engine','ejs')
admin_route.set('views','./views/admin')

admin_route.use(express.json())
admin_route.use(express.urlencoded({extended:true}))

admin_route.use(sessionSecret())


//loginpage\\
admin_route.get('/',authMiddleware.is_logout, adminController.loadAdminLogin)
admin_route.post('/', adminController.verifyAdminLogin)

admin_route.get('/logout',authMiddleware.is_login,adminController.adminLogout)

admin_route.get('/dashboard',authMiddleware.is_login,adminController.loadDashboard)

admin_route.get('/customerProfile',authMiddleware.is_login,adminController.loadUserProfile)
admin_route.post('/customerProfile/:id/status/:action',adminController.userBlockUnblock)

//category
admin_route.get('/category',authMiddleware.is_login,adminController.loadCategory)
admin_route.get('/addCategory',authMiddleware.is_login,adminController.loadAddCategory)
admin_route.post('/addCategory',adminController.addCategory)
admin_route.get('/editCategory',authMiddleware.is_login,adminController.loadEditCategory)
admin_route.post('/editCategory',adminController.updateCategory)
admin_route.post('/category/:id/delete',adminController.softDeleteCategory)

admin_route.get('/addProducts',authMiddleware.is_login,adminController.loadAddProducts)
admin_route.post('/addProducts',uploadMiddleware,adminController.addProducts)

// admin_route.post('/deleteImages',adminController.deleteImage)


admin_route.get('/viewProducts',authMiddleware.is_login,adminController.loadViewProducts)
admin_route.get('/editProduct',authMiddleware.is_login,adminController.loadEditProduct)
admin_route.post('/editProduct',upload.array('image', 12),adminController.updateProduct)
admin_route.post('/viewProducts/:id/deleteProduct',adminController.deleteProduct)

admin_route.get('/orders',authMiddleware.is_login,adminController.loadOrderDetails)

admin_route.get('*',(req,res)=>{
    res.redirect('/admin')
})
module.exports=admin_route