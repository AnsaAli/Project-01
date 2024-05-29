const express=require('express');
const user_route= express();
const { sessionSecret } = require('../secret/secret');
const logPassport= require('../secret/passportGoogle');
const authMiddleware= require('../middleware/authMiddleware');
const fetchDataMiddleware= require('../middleware/fetchCateProData');
const userAuthenticationController= require('../controller/userController');
const productController= require('../controller/productCOntroller');
const cartContrller= require('../controller/cartController');
const orderController= require('../controller/orderController');
const checkOutController= require('../controller/checkOutController');
const wishlistController= require('../controller/wishListController');
const passport= require('passport');
const walletController=  require('../controller/walletController');
const nocache= require('nocache')
// user_route.use(secret())
user_route.use(sessionSecret())

user_route.set('view engine','ejs')
user_route.set('views','./views/users')

// const bodyParser= require('body-parser')
user_route.use(express.json())
user_route.use(express.urlencoded({extended:true}))

user_route.use(nocache());

user_route.use(fetchDataMiddleware)

//auth
user_route.get('/auth/google',passport.authenticate('google',{scope: ['email','profile']}))
//auth call back
user_route.get('/auth/google/callback', passport.authenticate('google',{
    successRedirect:'/verifyGoogle'
}))

user_route.get('/verifyGoogle',userAuthenticationController.loadverifyGoogleSignin)
user_route.get('/register',authMiddleware.is_logout,userAuthenticationController.loadRegister)
user_route.post('/register',userAuthenticationController.registerUser)
user_route.get('/existingEmailVerification',userAuthenticationController.loadExistingEmailVerification)
user_route.post('/existingEmailVerification',userAuthenticationController.existingEmailVerification)
user_route.get('/existingEmailVerifyOTP',userAuthenticationController.loadexistingEmailVerifyOTP)
user_route.post('/existingEmailVerifyOTP',userAuthenticationController.existingEmailVerifyOTP)
user_route.get('/resendOtp', userAuthenticationController.loadresendOTP);
user_route.post('/resendOtp', userAuthenticationController.resendOTP);
user_route.post('/resendOtpVerify', userAuthenticationController.sendOtpToEmail);
user_route.get('/veryfyOtp', userAuthenticationController.loadVerifyOtp)
user_route.post('/veryfyOtp', userAuthenticationController.verifyOtp)
user_route.get('/forgotPass', userAuthenticationController.loadForget)   
user_route.post('/forgotPass', userAuthenticationController.verifyForgetLogin)   
user_route.get('/login',authMiddleware.is_logout,userAuthenticationController.loadLogin)    
user_route.post('/login',userAuthenticationController.verifyLogin)  
user_route.post('/logout',authMiddleware.is_login,userAuthenticationController.userLogout)  
user_route.post('/logout',authMiddleware.is_login, async(req,res)=>{if(req.query.logout){await userAuthenticationController.userLogout(req,res)}else{res.redirect('/register')}}) 

user_route.get('/',productController.loadHome);    

user_route.get('/userProfile',authMiddleware.is_login, userAuthenticationController.loadUserProfile)
user_route.get('/myProfile',authMiddleware.is_login, userAuthenticationController.loadMyProfile)

user_route.get("/editAddress/:index", userAuthenticationController.loadUserEditAddress);
user_route.post("/editAddress/:index" ,userAuthenticationController.updateUserAddress);

user_route.get('/changePassword',authMiddleware.is_login, userAuthenticationController.loadChngePassword)
user_route.post('/changePassword', userAuthenticationController.chngePassword)

user_route.get('/changeMyProfile',authMiddleware.is_login, userAuthenticationController.loadChangeMyProfile);
user_route.post('/changeMyProfile',authMiddleware.is_login, userAuthenticationController.changeMyProfile)

user_route.get('/addData',authMiddleware.is_login, userAuthenticationController.loadAddProfile)
user_route.post('/addData', userAuthenticationController.addProfile)
user_route.get('/delete/:index', userAuthenticationController.deleteAddress)

user_route.get('/home',nocache(),authMiddleware.is_login, productController.loadHome)
user_route.get('/viewProduct',authMiddleware.is_login, productController.loadViewProduct)
user_route.get('/allProducts',authMiddleware.is_login, productController.loadAllProducts)

user_route.post('/addToCart',authMiddleware.is_login,cartContrller.addToCart)
user_route.post('/updateQuantity',authMiddleware.is_login,cartContrller.updateQuantity)
user_route.get('/viewCartItems',authMiddleware.is_login,cartContrller.viewCartItems)
user_route.get('/removeCartItem/:id',authMiddleware.is_login,cartContrller.removeCartItem)

user_route.post('/wishlist',authMiddleware.is_login,wishlistController.addToWishlist)
user_route.get('/wishlistProducts',authMiddleware.is_login,wishlistController.viewWishList)
user_route.post('/wishToCart',authMiddleware.is_login,wishlistController.addWishToCart)
user_route.get('/removeWishItem/:id',authMiddleware.is_login,wishlistController.removeWishItem)

user_route.get('/order',authMiddleware.is_login, orderController.loadUserOrder)
user_route.get('/successOrder',authMiddleware.is_login,orderController.loadConfirmOrder)
user_route.post('/placeOrder',authMiddleware.is_login, orderController.placeOrder)
user_route.delete('/cancelOrder/:orderId',authMiddleware.is_login, orderController.cancelOrder);

user_route.get('/wallet',authMiddleware.is_login, walletController.loadwallet);
user_route.post('/addMoneyWallet',authMiddleware.is_login, walletController.addMoneyWallet);
user_route.post("/verifyPayment",authMiddleware.is_login, walletController.verifyPayment);
user_route.post("/updateWalletField",authMiddleware.is_login, walletController.updateWalletField);
// user_route.post("/useWallet",authMiddleware.is_login, walletController.useWalletAmount);



user_route.post('/applyCoupon',authMiddleware.is_login,userAuthenticationController.applyCoupon);
user_route.post('/removeCoupon',authMiddleware.is_login,userAuthenticationController.removeCoupon)
user_route.post('/paymentSuccess',authMiddleware.is_login, orderController.paymentSuccess);

user_route.get('/checkOut',authMiddleware.is_login, checkOutController.loadcheckOut);

/////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

module.exports= user_route