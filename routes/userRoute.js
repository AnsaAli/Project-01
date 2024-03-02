const express=require('express')
const user_route= express()
const session= require('express-session')
const userAuthenticationController= require('../controller/userAuthController/userController')


const secret= require('../secret/secret')
user_route.use(secret())

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

//load verifyOtp
user_route.get('/veryfyOtp', userAuthenticationController.loadVerifyOtp)
//verify otp
user_route.post('/veryfyOtp', userAuthenticationController.veryfyOtp)

//to load resend otp
user_route.get('/resendOtp', userAuthenticationController.loadresendOTP)
//to resend the otp
user_route.post('/resendOtp', userAuthenticationController.resendOTP)

                       ////forgotPassword\\\
user_route.get('/forgotPass', userAuthenticationController.loadForget)   
user_route.post('/forgotPass', userAuthenticationController.verifyForgetLogin)                        

                       ////Login\\\\\\
user_route.get('/login',authMiddleware.is_logout,userAuthenticationController.loadLogin)    
user_route.post('/login',userAuthenticationController.verifyLogin)  

                    ////logout///
user_route.get('/logout',authMiddleware.is_login,userAuthenticationController.userLogout)  

user_route.get('/home',authMiddleware.is_login,userAuthenticationController.loadHome)

user_route.get('/userProfile',authMiddleware.is_login, userAuthenticationController.loadUserProfile)

user_route.get('/viewProduct/:id',authMiddleware.is_login, userAuthenticationController.loadViewProduct)

user_route.post('/product/:id/rate',userAuthenticationController.rating)  


module.exports= user_route