const express= require('express')
const admin_route= express()
const adminController= require('../controller/adminController')
const  {sessionSecret}  = require('../secret/secret')
const authMiddleware= require('../middleware/adminAuthMiddlware')
const salesController= require('../controller/salesController')
const uploadMiddleware= require('../middleware/multer');

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
admin_route.post('/customerProfile/:id/status/:action',authMiddleware.is_login,adminController.userBlockUnblock)

//category
admin_route.get('/category',authMiddleware.is_login,adminController.loadCategory)
admin_route.get('/addCategory',authMiddleware.is_login,adminController.loadAddCategory)
admin_route.post('/addCategory',authMiddleware.is_login,adminController.addCategory)
admin_route.get('/editCategory',authMiddleware.is_login,adminController.loadEditCategory)
admin_route.post('/editCategory',authMiddleware.is_login,adminController.updateCategory)
admin_route.post('/category/:id/delete',authMiddleware.is_login,adminController.softDeleteCategory)
admin_route.get('/findTopCategory',authMiddleware.is_login,adminController.getTopCategory);

admin_route.get('/addProducts',authMiddleware.is_login,adminController.loadAddProducts)
admin_route.post('/addProducts',uploadMiddleware,adminController.addProducts);
admin_route.get('/viewProducts',authMiddleware.is_login,adminController.loadViewProducts)
admin_route.get('/editProduct',authMiddleware.is_login,adminController.loadEditProduct)
admin_route.post('/editProduct',uploadMiddleware,adminController.updateProduct)
admin_route.post('/deleteProduct',authMiddleware.is_login,adminController.deleteProduct)
admin_route.get('/viewSingleProduct',authMiddleware.is_login,adminController.loadViewSingleProducts)
admin_route.post("/deleteImage/:productId/:imageId",authMiddleware.is_login, adminController.deleteImages);
admin_route.get('/findTop',authMiddleware.is_login,adminController.getTopOrderedProducts);

admin_route.get('/orders',authMiddleware.is_login,adminController.loadOrderDetails)
admin_route.delete('/cancelOrder/:orderId',authMiddleware.is_login, adminController.cancelOrder)
admin_route.get('/viewOrderDetails',authMiddleware.is_login,adminController.loadSingleOrderDetails)
admin_route.get('/review_return',authMiddleware.is_login,adminController.loadreturnProducts);
admin_route.post('/approve_return',authMiddleware.is_login,adminController.approveReturn);
admin_route.post('/approve_Order',authMiddleware.is_login,adminController.approveOrder);


/////coupons
admin_route.get('/coupon',authMiddleware.is_login,adminController.loadCoupons);
admin_route.get('/coupon/delete',authMiddleware.is_login, adminController.deleteCoupon);
admin_route.get('/edit', authMiddleware.is_login, adminController.loadeditCoupon);
admin_route.post('/edit', authMiddleware.is_login, adminController.editCoupon);
admin_route.get('/addcoupon',authMiddleware.is_login,adminController.loadaddCoupons)
admin_route.post('/addcoupon',authMiddleware.is_login,adminController.addCoupons);

//salesController
admin_route.get('/sales',authMiddleware.is_login,salesController.loadSales);
admin_route.get('/sales/download', authMiddleware.is_login, salesController.downloadSalesReport); 
admin_route.post('/dailyReport', authMiddleware.is_login, salesController.dailySales);
admin_route.get('/dailysales/download', authMiddleware.is_login, salesController.dailyDownload);
admin_route.post('/monthlyReport',  authMiddleware.is_login, salesController.monthlysales);
admin_route.get('/monthlysales/download',authMiddleware.is_login, salesController.monthlyDownload);
admin_route.post('/yearlyReport',authMiddleware.is_login, salesController.yearlyreport);


admin_route.get('/about', adminController.loadAbout); 

////////////////////////////////////////\\\\\\\\\\\\\\\\\\\

admin_route.get('*',(req,res)=>{
  res.redirect('/admin')
})
 ///////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

module.exports=admin_route