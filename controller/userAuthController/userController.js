const  User = require('../../models/userModel/userAuthenticationModel')
const{ Category,Product} = require('../../models/adminModel/categoryModel')
const bcrypt = require("bcrypt")
const passport= require('passport')
const nodemailer=require('nodemailer')
const session = require('express-session')

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
// const saveOtp= async (email,otp)=>{
//     try {
//         const user=await User.findOne({email:email})
//         if(!user){
//             throw new Error('User not found')
//         }
//         user.otp= otp
//         await user.save()
        
//     } catch (error) {
//         throw new Error("Error saving OTP to database" +error.message)
//     }
// }
const saveOtp = async (email, otp, expiresAt) => {
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            throw new Error('User not found');
        }
        user.otp = otp;
        // Save expiration timestamp along with OTP
        user.otp_expires_at = expiresAt; 
        await user.save();
    } catch (error) {
        throw new Error("Error saving OTP to database" + error.message);
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
         //regular expression for to check the inputs
        const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)?$/;
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if(!req.body.name ||!req.body.password || !req.body.email){
            return res.render('register',{errorMessage:'All fields are mandatory!'})
        }
        
        if((req.body.password).length <6){
            return res.render('register',{errorMessage:'Password must be minimum of 6 charactors.'})
        }
        // if (!passwordRegex.test(req.body.password)) {
        //     return res.render('register', { errorMessage: 'Password must be minimum of 8 characters,one capital letter and atleast one special charactor.'});
        // }
        if (!nameRegex.test(req.body.name)) {
            return res.render('register', { errorMessage: 'Name may not include numbers or special characters.' });
        }
        if (!emailRegex.test(req.body.email)) {
            return res.render('register', { errorMessage: 'Please add a valid email ID' });
        }
        const spassword=await seccurePassword(req.body.password)
        const sconfirmpassword= await seccurePassword(req.body.confirmpassword)
        if(req.body.password !== req.body.confirmpassword){
            return res.render('register',{errorMessage:'Password is not matching'})
        }

         const existingUser = await User.findOne({email: req.body.email})
        if(existingUser){
            return res.render('register',{errorMessage:'Email already registered,Please verify your email by clicking resend OTP'})
        }
         
        const user= new User({
            name:req.body.name,
            email: req.body.email,
            password:spassword,
            is_admin:0
         })
       const userData=await user.save();
   
            if(userData){
                const otp= generateOTP();
                const otpTimestamp = new Date();
                otpTimestamp.setMinutes(otpTimestamp.getMinutes() +5)
                await saveOtp(req.body.email,otp,otpTimestamp);

                //to make otp null after 5 minutes
                setTimeout(async()=>{
                    await  expireOtp(req.body.email)
                }, 5*60*1000)

                return res.render('veryfyOtp',{
                    userData,
                    successMessage:"Please verify your Email to complete the registration within 5 minutes",
                    otpTimestamp
                })
            }else{
                throw new Error('Error occurred while saving the user data');
            }

         } catch (error) {
        console.log('Error occure while inserting the user data'+error)
        return res.render('register', { errorMessage: 'An error occurred. Please try again later.' });
    }
} 

// Function to expire OTP after 5 minutes
const expireOtp = async (email) => {
    try {
        await User.updateOne({ email: email }, { $set: { otp: null, otp_expires_at: null } });
        console.log('OTP expired successfully');
    } catch (error) {
        console.error('Error occurred while expiring OTP:', error);
    }
}



const loadExistingEmailVerification=async (req,res)=>{
    try {
        res.render('verifyEmail')
    } catch (error) {
        console.log('Error while loading exixsting email verify', error.message)
    }
 
}

const existingEmailVerification = async (req, res) => {
    try {
        const {email}=req.body;
        
        const otp= generateOTP();
        const otpTimestamp = await sendOtp(email,otp);
        req.session.userData = { email, otp, otpTimestamp };
        // Calculate remaining time for OTP validity.............
        const otpValidityPeriod = 5 * 60; 
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + otpValidityPeriod); 

        const userData=await saveOtp(email,otp,expiresAt);
        // res.render('veryfyOtp',{successMessage: "OTP resent successfully!", otpTimestamp, otpValidityPeriod })
        // res.redirect('/veryfyOtp' + email);
        res.redirect('/existingEmailVerifyOTP');
    } catch (error) {
        console.log('Error while verifying the existing email with sending OTP', error.message);
        return res.render('verifyEmail', { errorMessage: 'An error occurred. Please try again later.' });
    }
}
const loadexistingEmailVerifyOTP= async(req,res)=>{
     try {
        const userData = req.session.userData
        //console.log(userData._id,'is the id while loading existing email')
        if (userData) {
            res.render('verifyEmailOtp', { userData });
        } else {
            res.render('verifyEmail', { errorMessage: 'User data not found. Please try again.' });
        }
        
     } catch (error) {
        console.log('Error while loading the existing email otp verify page', error.message)
        res.render('verifyEmail', { errorMessage: 'An error occurred. Please try again later.' });
     }
}
const existingEmailVerifyOTP= async(req,res)=>{
    try {
        const { email, otp } = req.body;
        //console.log(req.body.otp, 'is the otp')
        const userData = await User.findOne({ email }); 
        //console.log(userData.otp,'is the otp userdata')
        
        if (!userData || userData.otp !== otp) {
            return res.render('verifyEmail', { errorMessage: 'Invalid OTP or email address.' });
        }
        userData.is_verified = true;
        userData.otp = null;
        await userData.save();
             // OTP verification successful
             res.render('login', { successMessage: 'OTP matched, user verified' })
         
    } catch (error) {
        console.log('Error while verify otp existing email page',error.message)
        res.render('verifyEmail', { errorMessage: 'An error occurred. Please try again later.' })
    }

}
const loadresendOTP= async(req,res)=>{
    try {
        res.render('resendOtp')
    } catch (error) {
        console.log("Error occured while to the resendOTP page")
    }
}
const resendOTP = async (req,res)=>{
    try {
        const {email}=req.body;
        
        const otp= generateOTP();
        const otpTimestamp = await sendOtp(email,otp);
        // Calculate remaining time for OTP validity.............
        const otpValidityPeriod = 5 * 60; 
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + otpValidityPeriod); 

        const userData=await saveOtp(email,otp,expiresAt);
        // res.render('veryfyOtp',{successMessage: "OTP resent successfully!", otpTimestamp, otpValidityPeriod })
        // res.redirect('/veryfyOtp' + email);
        return res.render('veryfyOtp',{
            userData,
            successMessage:"Please verify your Email to complete the registration within 5 minutes",
            otpTimestamp
        })
        
    } catch (error) {
        console.log('Error occurred while resending the OTP, ' +error.message)
    }
}


const loadVerifyOtp= async(req,res)=>{
    try {
        const { email } = req.query
       
        const userData= await User.findOne({email:email})
        if(userData){
            console.log(userData,'is the data')
            res.render('verifyOtp', { userData: userData })
        }else{
            console.log('not found')
            res.render('verifyOtp', { userData: null })
        }
        // res.render('veryfyOtp')
    } catch (error) {
        console.log('Error while loading verifyOtp page' +error.message)
    }
}

const veryfyOtp= async (req,res)=>{
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ errorMessage: "Email and OTP are required." });
        }
        const user = await User.findOne({ email: email, otp: otp });
        //console.log(email +'is the email')
        //console.log(otp +'is the otp')
        
        if(user){
            user.is_verified = true;
            user.otp=null
            await user.save()
           //console.log('checking otp verified')
            res.render('login',{successMessage:'OTP matched, user verified'})
        }else{
            // console.log('checking  resendotp page')
            res.render('resendOtp',{errorMessage:'Invalid OTP, please resend the OTP again.'})
        }
    } catch (error) {
        console.log('Error occured while verifying the otp;'+error.message)
        return res.status(500).json({ errorMessage: 'An error occurred while verifying the OTP.' });
    }
}


            //login
const loadLogin=async (req,res)=>{
    try {
       res.render('login')
    } catch (error) {
        console.log('Error while loading login page' +error.message)
    }
}

const verifyLogin=async (req,res)=>{
    try {
        const email= req.body.email
        const password= req.body.password
        //console.log('email and password'+email +password)
        const userdata= await User.findOne({email})
       
        //console.log(userdata._id,userdata.email,userdata.password +'is the id')
        if (userdata) {
            
            if (!userdata.is_blocked) {
                const passwrdCheck = await bcrypt.compare(password, userdata.password);
                if (passwrdCheck) {
                    if (userdata.is_verified === false) {
                        res.render('login', { successMessage: 'Please verify your email' });
                    } else {
                        req.session.user_id = userdata._id;
                        res.redirect('/home');
                    }
                } else {
                    res.render('login', { errorMessage: 'Incorrect password or email' });
                }
            } else {
                res.render('login', { errorMessage: 'Your account is blocked. Please contact the administrator.' });
            }
        } else {
            res.render('login', { errorMessage: 'User not found. Please check your email.' });
        }
    } catch (error) {
        console.log("Error occured while verify login user", error.message)
    }
}

// Handle Google OAuth callback
const googleCallback = (req, res) => {
   
};

const userLogout=async (req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/login')
    } catch (error) {
        console.log(error.message)
        res.status(500).send('Internal Server Error');
    }

}

const loadHome=async(req,res)=>{
    try {
        const user_id= req.session.user_id;
        let user_name='';
        let loggedIn= false;

        if(user_id){
            const user= await User.findById(user_id);
            if(user){
                user_name=user.name;
                loggedIn = true;
            }
        }
        const products= await Product.find().lean().populate('category')
        res.render('home',{
            user_id: user_id,
            user_name :  user_name,
            products : products,
            loggedIn: loggedIn
        });
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
        const existingEmail= await User.findOne({email})
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
//user profile\\
const loadUserProfile= async(req,res)=>{
    try {
        const userData = await User.findById(req.session.user_id);
        if(!userData){
            return res.render('home',{errorMessage:'Userprofile not found.'})
        }
        res.render('userProfile',{userData: userData})
    } catch (error) {
        console.log("Error while loading user profile", error.message)
        res.render('home',{errorMessage:'Error while loading user profile.'})
        
    }
}
const loadUserEditProfile= async(req,res)=>{
    try {
        const userData = await User.findById(req.session.user_id);
        if(!userData){
            return res.render('userProfile',{errorMessage:'User address is not found.'})
        }
        res.render('editUserProfile',{userData})
    } catch (error) {
        console.log('Error while loading the edit user profile page.', error.message)
      
    }
}

const userEditProfile= async(req,res)=>{
    try {
        const { id,mobilenumber, house_num, apartment_name,city, district,pinCode } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'User ID is missing in the request' });
        }
        const userData= await User.findByIdAndUpdate(
            {_id:id},
            {$set:{mobilenumber, house_num, apartment_name,city, district,pinCode}},
            {new:true}
            )
        res.redirect('/userProfile')
    } catch (error) {
        console.log('Error while updating user address',error.message)
    }
}
const loadAddProfile= async(req,res)=>{
    try {
        //console.log('Inside the add profile page')
        res.render('addData')
    } catch (error) {
        console.log('Error while loadinf user add profile', error.message)
    }
}
const addProfile= async(req,res)=>{
    try {
        const { house_num, apartment_name, city, district, pinCode, mobilenumber } = req.body;     
        //console.log(req.body.house_num,req.body.apartment_name,req.body.city,req.body.district,req.body.pinCode,req.body.mobilenumber)
        const user_id= req.session.user_id
        const user_image = req.file ? req.file.path : '';
        const existingUser = await User.findById({ _id: user_id });
       
        const existingAddress = existingUser.address.find(addr => (
            addr.house_num === house_num &&
            addr.apartment_name === apartment_name &&
            addr.city === city &&
            addr.district === district &&
            addr.pinCode === pinCode &&
            addr.mobilenumber === mobilenumber
        ));
        if (existingAddress) {
            return res.status(400).json({ error: 'Address already exists' });
        }

        existingUser.address.push({ house_num, apartment_name, city, district, pinCode, mobilenumber });
        existingUser.user_image = user_image;
        const userData = await existingUser.save();
        //console.log(userData);
        res.render('userProfile', {
            userData,
            successMessage: 'User data added successfully'
        })

    } catch (error) {
        console.log('Error while adding the user address', error.message)
        res.status(500).json({ error: 'Internal server error' });
    }
}
const deleteAddress=async(req,res)=>{
    try {
        const user_id = req.params.id;
        const address_id = req.body.addressId;
        const deleteAddress= await User.updateOne(
            {_id:user_id},
            {$pull:{address:{_id:address_id}}}
        )
        
        res.redirect('/userProfile')
        
    } catch (error) {
        console.log('Error While deleting user address',error.message)
        res.status(500).json({ error: 'Internal server error' });
    }
}



module.exports={    
    loadRegister,
    registerUser,
    veryfyOtp,
    loadExistingEmailVerification,
    existingEmailVerification,
    loadexistingEmailVerifyOTP,
    existingEmailVerifyOTP,
    resendOTP,
    loadVerifyOtp,
    loadresendOTP,
    loadLogin,
    verifyLogin,
    googleCallback,
    loadHome,
    loadForget,
    verifyForgetLogin,
    loadUserProfile,
    userLogout,
    loadViewProduct,
    rating,
    loadUserEditProfile,
    loadAddProfile,
    addProfile,
    userEditProfile,
    deleteAddress
}
