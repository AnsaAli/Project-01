const express=require('express')
const user_route= express()
const session= require('express-session')
const { sessionSecret, passport } = require('../secret/secret')
const userAuthenticationController= require('../controller/userAuthController/userController')

// user_route.use(secret())
user_route.use(sessionSecret())

const authMiddleware= require('../middleware/authMiddleware')

user_route.set('view engine','ejs')
user_route.set('views','./views/users')

const bodyParser= require('body-parser')
user_route.use(bodyParser.json())
user_route.use(bodyParser.urlencoded({extended:true}))

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

// Route for initiating Google authentication
user_route.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// Callback route after Google authentication
user_route.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/login',
        successRedirect: '/home' 
    })
);
////logout///
// user_route.post('/logout',authMiddleware.is_login,userAuthenticationController.userLogout)  
user_route.post('/logout',authMiddleware.is_login, async(req,res)=>{
    if(req.query.logout){
        await userAuthenticationController.userLogout(req,res)
    }else{
        res.redirect('/register')
    }
}) 

user_route.get('/home',authMiddleware.is_login,userAuthenticationController.loadHome)

user_route.get('/userProfile',authMiddleware.is_login, userAuthenticationController.loadUserProfile)
user_route.get("/editUser",authMiddleware.is_login, userAuthenticationController.loadUserEditProfile)
user_route.post("/editUser", userAuthenticationController.userEditProfile)

user_route.get('/addData',authMiddleware.is_login, userAuthenticationController.loadAddProfile)
user_route.post('/addData', userAuthenticationController.addProfile)
user_route.post('/addData/:id/deleteAddress/:addressId', userAuthenticationController.deleteAddress)

user_route.get('/viewProduct/:id',authMiddleware.is_login, userAuthenticationController.loadViewProduct)

user_route.post('/product/:id/rate',userAuthenticationController.rating)  


module.exports= user_route