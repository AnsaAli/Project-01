const express= require('express')
const admin_route= express()
const multer= require('multer')
const path = require('path')
const imageStore= require('../middleware/imageStorage')
const adminController= require('../controller/adminControllerPage/adminController')
const bodyParser= require('body-parser')
const { sessionSecret, passport } = require('../secret/secret')
const authMiddleware= require('../middleware/adminAuthMiddlware')

admin_route.set('view engine','ejs')
admin_route.set('views','./views/admin')

admin_route.use(bodyParser.json())
admin_route.use(bodyParser.urlencoded({extended:true}))

admin_route.use(sessionSecret())

const storage=imageStore
const upload = multer({storage:storage})
// const storage =multer.diskStorage({
//     destination: function(req,file,cb){
//       cb(null,path.join(__dirname,'../views/public/adinAssets/img'))
//     },
//     filename:function(req,file,cb){
//       const name= Date.now()+ '-'+file.originalname;
//       cb(null,name)
//     }
// })
// const upload = multer({storage:storage})


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
admin_route.post('/addProducts',upload.array('images', 5),adminController.addProducts)

admin_route.get('/viewProducts',authMiddleware.is_login,adminController.loadViewProducts)

admin_route.get('/editProduct',authMiddleware.is_login,adminController.loadEditProduct)
admin_route.post('/editProduct',upload.array('additionalImages', 5),adminController.updateProduct)
admin_route.post('/viewProducts/:id/deleteProduct',adminController.deleteProduct)

admin_route.get('*',(req,res)=>{
    res.redirect('/admin')
})
module.exports=admin_route