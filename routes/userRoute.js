const express=require('express')
const user_route= express()
const session= require('express-session')
const { sessionSecret, passport } = require('../secret/secret')
const authMiddleware= require('../middleware/authMiddleware')
const fetchDataMiddleware= require('../middleware/fetchCateProData')

const userAuthenticationController= require('../controller/userController')
const productController= require('../controller/productCOntroller')
const cartContrller= require('../controller/cartController')
const orderController= require('../controller/orderController')
const checkOutController= require('../controller/checkOutController')

// user_route.use(secret())
user_route.use(sessionSecret())


user_route.set('view engine','ejs')
user_route.set('views','./views/users')

// const bodyParser= require('body-parser')
user_route.use(express.json())
user_route.use(express.urlencoded({extended:true}))

user_route.use(fetchDataMiddleware)

                  ////signup\\\\\\

//to load the register page
user_route.get('/register',authMiddleware.is_logout,userAuthenticationController.loadRegister)
//to register the user
user_route.post('/register',userAuthenticationController.registerUser)



user_route.get('/existingEmailVerification',userAuthenticationController.loadExistingEmailVerification)
user_route.post('/existingEmailVerification',userAuthenticationController.existingEmailVerification)

user_route.get('/existingEmailVerifyOTP',userAuthenticationController.loadexistingEmailVerifyOTP)
user_route.post('/existingEmailVerifyOTP',userAuthenticationController.existingEmailVerifyOTP)

//to load resend otp
user_route.get('/resendOtp', userAuthenticationController.loadresendOTP)
user_route.post('/resendOtp', userAuthenticationController.resendOTP)
//load verifyOtp
user_route.get('/veryfyOtp', userAuthenticationController.loadVerifyOtp)
user_route.post('/veryfyOtp', userAuthenticationController.veryfyOtp)

                       ////forgotPassword\\\
user_route.get('/forgotPass', userAuthenticationController.loadForget)   
user_route.post('/forgotPass', userAuthenticationController.verifyForgetLogin)                        

                       ////Login\\\\\\
user_route.get('/login',authMiddleware.is_logout,userAuthenticationController.loadLogin)    
user_route.post('/login',userAuthenticationController.verifyLogin)  

////logout///
user_route.post('/logout',authMiddleware.is_login,userAuthenticationController.userLogout)  
user_route.post('/logout',authMiddleware.is_login, async(req,res)=>{
    if(req.query.logout){
        await userAuthenticationController.userLogout(req,res)
    }else{
        res.redirect('/register')
    }
}) 


user_route.get('/userProfile',authMiddleware.is_login, userAuthenticationController.loadUserProfile)
user_route.get('/myProfile',authMiddleware.is_login, userAuthenticationController.loadMyProfile)

user_route.get("/editAddress/:index", userAuthenticationController.loadUserEditAddress);
user_route.post("/editAddress/:index" ,userAuthenticationController.updateUserAddress);


user_route.get('/changePassword',authMiddleware.is_login, userAuthenticationController.loadChngePassword)
user_route.post('/changePassword', userAuthenticationController.chngePassword)

user_route.get('/addData',authMiddleware.is_login, userAuthenticationController.loadAddProfile)
user_route.post('/addData', userAuthenticationController.addProfile)

user_route.get('/delete/:index', userAuthenticationController.deleteAddress)


user_route.get('/home',authMiddleware.is_login, productController.loadHome)
user_route.get('/viewProduct',authMiddleware.is_login, productController.loadViewProduct)
user_route.post('/product/:id/rate',productController.rating) 

//add to cart

user_route.post('/addToCart',cartContrller.addToCart)

user_route.get('/listCartItems',cartContrller.listCartItems)

user_route.get('/viewCartItems',cartContrller.viewCartItems)

user_route.get('/removeCartItem/:id',cartContrller.removeCartItem)

//order
user_route.get('/order',authMiddleware.is_login, orderController.loadUserOrder)
user_route.get('/successOrder',authMiddleware.is_login,orderController.loadConfirmOrder)
user_route.post('/placeOrder', orderController.placeOrder)
user_route.delete('/cancelOrder/:orderId', orderController.cancelOrder)
user_route.get('/trackOrder',authMiddleware.is_login, orderController.loadTrackOrder)

//checkout
user_route.get('/checkOut',authMiddleware.is_login, checkOutController.loadcheckOut)

module.exports= user_route