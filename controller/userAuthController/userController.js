const UserAuth = require('../../models/userModel/userAuthenticationModel')
const Product= require('../../models/adminModel/categoryModel')
const bcrypt = require("bcrypt")
const nodemailer=require('nodemailer')

const seccurePassword= async(password)=>{
    try {
        // console.log(password +'Is the passwrd')
        const salt = await bcrypt.genSalt(10); // Use asynchronous version
        const passwordHash = await bcrypt.hash(password, salt);
        //console.log(passwordHash +'Is the passwrd')
        return passwordHash;
        
    } catch (error) {
       console.log(error.message) 
    }
}

/////////////OTP/////////

function generateOTP() {
    // Generate a random 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
}
const saveOtp= async (email,otp)=>{
    try {
        const user=await UserAuth.findOne({email:email})
        if(!user){
            throw new Error('User not found')
        }
        user.otp= otp
        await user.save()
        
    } catch (error) {
        throw new Error("Error saving OTP to database" +error.message)
    }
}
const sendOtp= async (email,otp)=>{
    try {
        const otpTimestamp = Date.now();
        const transporter= nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:'chinjuinbelfast@gmail.com',
                pass: 'pkprjnrryzjzfijw'
            }
        });
        const mailoptions={
            from:'chinjuinbelfast@gmail.com',
            to: email,
            subject: 'OTP for Email Verification',
            text: `Your OTP is: ${otp}, OTP is valid only for 5 minutes`
        }
        
        await transporter.sendMail(mailoptions)
        return otpTimestamp
        
    } catch (error) {
        throw new Error("Error sending OTP to database" +error.message)

    }
}



////////////////////signup///////

const loadRegister=async(req,res)=>{
    try {
        
        res.render('register')
    } catch (error) {
        console.log("Error occure while loading register page"+error.message)
    }
}

const registerUser= async(req,res)=>{
    try {
        
       
        const acceptTerms = req.body.TermsCondition === 'true'
        if (!acceptTerms) {
            return res.render('register', { errorMessage: 'Please accept the terms and policies.' });
        } 


        if(!req.body.password){
            throw new Error('Password is required.')
        }
        const spassword=await seccurePassword(req.body.password)
        const sconfirmpassword= await seccurePassword(req.body.confirmpassword)
        if(req.body.password !== req.body.confirmpassword){
            return res.render('register',{errorMessage:'Password is not matching'})
        }

         const existingUser = await UserAuth.findOne({email: req.body.email})
        if(existingUser){
            return res.render('register',{errorMessage:'Email already registered'})
        }
         
        const user= new UserAuth({
            name:req.body.name,
            email: req.body.email,
            password:spassword,
            is_admin:0
         })
       const userData=await user.save();
       if(userData){
                    const otp=generateOTP();
                    await saveOtp(req.body.email, otp)
                    const otpTimestamp = await sendOtp(req.body.email, otp);
                    const otpValidityPeriod = 5 * 60; // 5 minutes
                     return res.render('veryfyOtp',{successMessage:"You have successfully registered, please veryfy your Email",otpTimestamp,otpValidityPeriod})
                 }else{
                     throw new Error('Error occured while saving the user data')
                 }
         } catch (error) {
        console.log('Error occure while inserting the user data'+error)
    }
} 

const veryfyOtp= async (req,res)=>{
    try {
        const {email,otp}=req.body
        const user= await UserAuth.findOne({email:email, otp:otp})
        // console.log(email +'is the otp')
        // console.log(otp +'is the otp')
        // console.log('User found:', user);
        if(user){
            //console.log('user verified'+user.is_verified )
            user.is_verified = true;
            //clear the otp after successfull verification
            user.otp=null
            await user.save()
           //console.log('checking otp verified')
            res.render('login',{message:'OTP matched, user verified'})
        }else{
            // console.log('checking  resendotp page')
            res.render('resendOtp',{message:'Invalid OTP, please resend the OTP again.'})
        }
    } catch (error) {
        console.log('Error occured while verifying the otp;'+error.message)
    }
}

const resendOTP = async (req,res)=>{
    try {
        const {email}=req.body;
        const otp= generateOTP();
        const otpTimestamp = await sendOtp(email,otp);
        // Calculate remaining time for OTP validity
        const otpValidityPeriod = 5 * 60; // 5 minutes

        await saveOtp(email,otp);
        res.render('resendOtp',{message: "OTP resent successfully!", otpTimestamp, otpValidityPeriod })
        
    } catch (error) {
        console.log('Error occurred while resending the OTP, ' +error.message)
    }
}
const loadVerifyOtp= async(req,res)=>{
    try {
        res.render('veryfyOtp')
    } catch (error) {
        console.log('Error while loading verifyOtp page' +error.message)
    }
}

const loadresendOTP= async(req,res)=>{
    try {
        res.render('resendOtp')
    } catch (error) {
        console.log("Error occured while to the resendOTP page")
    }
}


//login
const loadLogin=async (req,res)=>{
    try {
       res.render('login')
    } catch (error) {
        console.log('Error while loging' +error.message)
    }
}

const verifyLogin=async (req,res)=>{
    try {
        const email= req.body.email
        const password= req.body.password
        //console.log('email and password'+email +password)
        const userdata= await UserAuth.findOne({email})
        //console.log(userdata._id +'is the id')
        //console.log( req.session.user_id+'is the user id')
        if(userdata){
            const passwrdCheck= await bcrypt.compare(password,userdata.password)
            
            if(passwrdCheck){
               if(userdata.is_verified=== 'false'){
                res.render('login',{message:'Please verify your email'})

               }else{
                 //console.log(req.session.user_id +'is the user id')
                 req.session.user_id= userdata._id
                 //console.log(req.session.user_id +'is the user id')
                  res.redirect('/home')
                 
               }
            }else{
                res.render('login',{message:'Incorrect password or email'})
            }
        }
    } catch (error) {
        console.log("Error occured while loging", error.message)
    }
}

const userLogout=async (req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/login')
    } catch (error) {
        console.log(error.message)
    }

}

const loadHome=async(req,res)=>{
    try {
        const user_id= req.session.user_id;
        let user_name='';
        if(user_id){
            const user= await UserAuth.findById(user_id);
            user_name=user.name;
        }
        const products= await Product.find().lean() //to fetch all products from the database
        products.forEach(product => {
            //console.log(product.name, 'is the product name'); 
        });
        res.render('home',{user_id,user_name,products});
    } catch (error) {
        console.log("Error occured while loading the home page")
    }
}

//forgot
const loadForget=async (req,res)=>{
    try {
        res.render('forgotPass')
    } catch (error) {
        console.log('Error occure while loading the forgot page' +error.message)
    }
}

const verifyForgetLogin=async (req,res)=>{
    try {
        const {email,password,confirmpassword}= req.body
        const existingEmail= await UserAuth.findOne({email})
        if(!existingEmail){
            return res.render('forgotPass',{errorMessage:'Email not found. Please enter a valid email.'})
        }

        if(password !== confirmpassword){
            return res.render('forgotPass',{errorMessage:'Password do not match.'})
        }

        existingEmail.password= await seccurePassword(password)
        await existingEmail.save()

        return res.redirect('/login')
    } catch (error) {
        console.log('Error occured while resetting the passowrd')
        return res.render('forgotPass',{errorMessage:'An error occurred while resetting the passwors. Pls,try'})
    }
}

//user profile\\
const loadUserProfile= async(req,res)=>{
    try {
        const userData = await UserAuth.findById(req.session.user_id);
        if(!userData){
            return res.render('home',{errorMessage:'Userprofile not found.'})
        }
        res.render('userProfile',{userData})
    } catch (error) {
        console.log("Error while loading user profile", error.message)
        res.render('home',{errorMessage:'Error while loading user profile.'})
        
    }
}

const loadViewProduct= async(req,res)=>{
    try {
        const product_id = req.params.id;
        console.log(product_id, 'is the pdt')
        const product = await Product.findById(product_id).lean();
        console.log(product.image, 'is the image')
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('viewProduct',{product})
    } catch (error) {
        console.log('Error while loding the view product page')
    }
}
const rating= async(req,res)=>{
    try {
        const productId = req.params.id;
    } catch (error) {
        console.log('Error while rating', error.message)
    }
}

module.exports={    
    loadRegister,
    registerUser,
    veryfyOtp,
    resendOTP,
    loadVerifyOtp,
    loadresendOTP,
    loadLogin,
    verifyLogin,
    loadHome,
    loadForget,
    verifyForgetLogin,
    loadUserProfile,
    userLogout,
    loadViewProduct,
    rating
}
