const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const User = require('../models/userAuthenticationModel')
const { Category, Product } = require('../models/categoryModel')
const UserAddress = require('../models/addressModel')
const bcrypt = require("bcrypt")
const nodemailer = require('nodemailer');
const couponModel = require('../models/couponModel')
const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');

const seccurePassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10); // Use asynchronous version
        const passwordHash = await bcrypt.hash(password, salt);
        return passwordHash;

    } catch (error) {
        console.log(error.message)
    }
}

/////////////OTP/////////

function generateOTP() {
    console.log('======================in generateOTP')
    // Generate a random 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendOtp = async (email, otp) => {
    try {
        console.log('======================in sendOtp')
        const email = req.body.email;
        const newOtp = generateOTP();
        await sendOtp(email, newOtp);
        // Calculate OTP expiration time
        const otpValidityPeriod = 1 * 60; // 5 minutes in seconds
        const expiresAt = new Date(Date.now() + otpValidityPeriod * 1000);
        // Save OTP to database with expiration time
        await saveOtp(email, newOtp, expiresAt);
        res.json({
            success: true,
            successMessage: "Please verify your Email to complete the registration within 1 minutes"
        });
    } catch (error) {
        throw new Error("Error sending OTP to database" + error.message)

    }
}

const saveOtp = async (email, otp, expiresAt) => {
    try {
        console.log('======================in saveOtp')
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

// Function to expire OTP after 5 minutes\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
const expireOtp = async (email) => {
    try {
        await User.updateOne({ email: email }, { $set: { otp: null, otp_expiry: null } });
        console.log('OTP expired successfully');
    } catch (error) {
        console.error('Error occurred while expiring OTP:', error);
    }
}

const loadresendOTP = async (req, res) => {
    try {
        res.render('resendOtp')
    } catch (error) {
        console.log("Error occured while to the resendOTP page")
    }
}

// Function to save OTP and schedule its deletion
const deleteOtp = async (email, otp, expiresAt) => {
    try {
        // Update user record with new OTP and expiration time
        await User.findOneAndUpdate(
            { email: email },
            { otp: otp, otp_expiry: expiresAt }
        );

        // Schedule a job to clear the OTP after the validity period
        schedule.scheduleJob(expiresAt, async () => {
            await expireOtp(email);
        });

        console.log(`OTP saved and scheduled for deletion for user ${email}`);
    } catch (error) {
        console.error(`Error saving OTP for user ${email}:`, error);
        throw error;
    }
};

const resendOTP = async (req, res) => {
    try {
        console.log('=========================in resendOTP ')
        const { email } = req.body;
        console.log('email: ', email)
        const otp = generateOTP();

        // Calculate OTP expiration time
        const otpValidityPeriod = 1 * 60; // 5 minutes in seconds
        const expiresAt = new Date(Date.now() + otpValidityPeriod * 1000);
        // Save OTP to database with expiration time
        await deleteOtp(email, otp, expiresAt);

        const userData = await User.findOne({ email: email })
        // res.render('veryfyOtp',{successMessage: "OTP resent successfully!", otpTimestamp, otpValidityPeriod })
        // res.redirect('/veryfyOtp' + email);
        return res.render('veryfyOtp', {
            userData,
            successMessage: "Please verify your Email to complete the registration within 1 minutes",

        })

    } catch (error) {
        console.log('Error occurred while resending the OTP, ' + error.message)
        res.render('error')
    }
}

const sendOtpAgain = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'chinjuinbelfast@gmail.com',
                pass: 'pkprjnrryzjzfijw'
            }
        });

        const mailoptions = {
            from: 'chinjuinbelfast@gmail.com',
            to: email,
            subject: 'OTP for Email Verification',
            text: `Your OTP is: ${otp}, OTP is valid only for 5 minutes`
        };

        await transporter.sendMail(mailoptions);
    } catch (error) {
        throw new Error("Error sending OTP email: " + error.message);
    }
};

const sendOtpToEmail = async (req, res) => {
    try {
        console.log('===================in sendOtpToEmail ')
        const email = req.body.email;
        const newOtp = generateOTP();

        // Calculate OTP expiration time
        const otpValidityPeriod = 1 * 60; // 5 minutes in seconds
        const expiresAt = new Date(Date.now() + otpValidityPeriod * 1000);

        // Save OTP to database with expiration time
        await saveOtp(email, newOtp, expiresAt);

        // Send OTP email
        await sendOtpAgain(email, newOtp);

        res.json({
            success: true,
            successMessage: "Please verify your Email to complete the registration within 1 minutes"
        });
    } catch (error) {
        console.log('Error resentOtp in verifyEmail sendOtpToEmail', error)
    }
}

const loadVerifyOtp = async (req, res) => {
    try {
        console.log('==================in loadVerifyOtp: ')

        const { email } = req.query
        console.log('email: ', email)
        const userData = await User.findOne({ email: email })
        if (userData) {
            console.log(userData, 'is the data')
            res.render('verifyOtp', { userData: userData })
        } else {
            console.log('not found')
            res.render('verifyOtp', { userData: null })
        }
        // res.render('veryfyOtp')
    } catch (error) {
        console.log('Error while loading verifyOtp page' + error.message)
    }
}

const verifyOtp = async (req, res) => {
    try {
        console.log('==================in verifyOtp: ')
        const { email, otp } = req.body;
        console.log('otp: ', otp)
        console.log('email: ', email);

        if (!email || !otp) {
            return res.status(400).json({ errorMessage: "Email and OTP are required." });
        }
        const user = await User.findOne({ email: email, otp: otp });
        console.log('==================218');
        if (user) {
            user.is_verified = true;
            user.otp = null
            await user.save()
            console.log('checking otp verified')
            return res.status(400).json({ success: true, successMessage: 'OTP matched, user verified' });

        } else {
            // console.log('checking  resendotp page')
            return res.status(400).json({ success: false, errorMessage: 'Invalid OTP, Please resend OTP!' });
        }
    } catch (error) {
        console.log('Error occured while verifying the otp;' + error.message)
        return res.status(500).json({ errorMessage: 'An error occurred while verifying the OTP.' });
    }
}

////////////////////signup\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadRegister = async (req, res) => {
    try {

        res.render('register')
    } catch (error) {
        console.log("Error occure while loading register page" + error.message)
    }
}

function generateShortUUID() {
    const uuid = uuidv4();
    return uuid.slice(0, 6);
}

const registerUser = async (req, res) => {
    try {
        //regular expression for to check the inputs
        const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)?$/;
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        const referrral = req.body.referral;
        req.session.refferal = referrral;

        if (!req.body.name || !req.body.password || !req.body.email) {
            return res.render('register', { errorMessage: 'All fields are mandatory!' })
        }

        if ((req.body.password).length < 6) {
            return res.render('register', { errorMessage: 'Password must be minimum of 6 charactors.' })
        }
        if (!passwordRegex.test(req.body.password)) {
            return res.render('register', { errorMessage: 'Password must be minimum of 8 characters,one capital letter and atleast one special charactor.' });
        }
        if (!nameRegex.test(req.body.name)) {
            return res.render('register', { errorMessage: 'Name may not include numbers or special characters.' });
        }
        if (!emailRegex.test(req.body.email)) {
            return res.render('register', { errorMessage: 'Please add a valid email ID' });
        }
        const spassword = await seccurePassword(req.body.password)
        const sconfirmpassword = await seccurePassword(req.body.confirmpassword)
        if (req.body.password !== req.body.confirmpassword) {
            return res.render('register', { errorMessage: 'Password is not matching' })
        }

        const existingUser = await User.findOne({ email: req.body.email })
        if (existingUser) {
            return res.render('register', { errorMessage: 'Email already registered,Please verify your email by clicking resend OTP' })
        }
        let code = generateShortUUID();
        console.log('code========================: ', code)
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: spassword,
            is_admin: 0,
            referralCode: code
        })
        const userData = await user.save();

        if (userData) {
            const otp = generateOTP();
            const otpTimestamp = new Date();
            otpTimestamp.setMinutes(otpTimestamp.getMinutes() + 5)
            await saveOtp(req.body.email, otp, otpTimestamp);

            //to make otp null after 5 minutes
            setTimeout(async () => {
                await expireOtp(req.body.email)
            }, 1 * 60 * 1000)

            return res.render('veryfyOtp', {
                userData,
                successMessage: "Please verify your Email to complete the registration within 1 minutes",
                otpTimestamp
            })
        } else {
            throw new Error('Error occurred while saving the user data');
        }

    } catch (error) {
        console.log('Error occure while inserting the user data' + error)
        return res.render('register', { errorMessage: 'An error occurred. Please try again later.' });
    }
}

////////////////////// user login\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadLogin = async (req, res) => {
    try {
        console.log('loadLogin================================')
        const user_id = req.session.user_id
        if (user_id) {
            return res.redirect('/home')
        }

        res.render('login')
    } catch (error) {

        console.log('Error while loading login page' + error.message);
        res.status(500).send('Internal Server Error');
    }
}

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email
        const password = req.body.password
        //console.log('email and password'+email +password)
        const userdata = await User.findOne({ email })
        const referral = req.session.refferal;
        console.log('referral from the user, in verify login: ',referral)
        //console.log(userdata._id,userdata.email,userdata.password +'is the id')
        if (userdata) {
            if (!userdata.is_blocked) {
                const passwrdCheck = await bcrypt.compare(password, userdata.password);
                if (passwrdCheck) {
                    if (userdata.is_verified === false) {
                        res.render('login', { successMessage: 'Please verify your email' });
                    } else {
                        req.session.user_id = userdata._id;
                        const userId = req.session.user_id;

                        if (referral && !userdata.is_referralUsed) {
                            const referralOwner = await User.findOne({ referralCode: referral });
                            // console.log('referralOwner: ',referralOwner)
                            if (referralOwner) {
                                await User.findByIdAndUpdate(referralOwner._id, {
                                    $inc: { wallet: 100 },
                                    $push: {
                                        history: {
                                            amount: 100,
                                            status: 'Referral Bonus',
                                            timestamp: new Date()
                                        }
                                    }
                                });

                                await User.findByIdAndUpdate(userId, {
                                    $inc: { wallet: 100 },
                                    $push: {
                                        history: {
                                            amount: 100,
                                            status: 'Join Bonus',
                                            timestamp: new Date()
                                        }
                                    },
                                    is_referralUsed: true
                                });
                            }
                           res.render('home', { successMessage: '100 rupees added to your wallet!' })
                        }
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

const loadverifyGoogleSignin = async (req, res) => {
    try {
        let profile = req.session.passport.user._json;
        console.log(profile, 'req.user==========')

        const email = profile.email;
        if (profile.email_verified) {
            //req.session.user_id=profile.sub;
            const userData = await User.findOne({ email });
            if (!userData) {
                const user = new User({
                    name: profile.name,
                    email: profile.email,
                    password: 'dummyPassword',
                    is_admin: 0,
                    is_blocked: false,
                    is_verified: profile.email_verified,
                    is_deleted: false
                })
                await user.save();
                req.session.user_id = user._id
            } else {
                req.session.user_id = userData.id;
            }
            res.redirect('/home');
        } else {
            res.render('login', { errorMessage: 'Gmail is not verified.' });
        }

    } catch (error) {
        console.log('Error while verify google sign in', error)
    }
}

const userLogout = async (req, res) => {
    try {
        console.log('=====================================in userLogout')
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
            } else {
                res.redirect('/login');
            }
        });
    } catch (error) {
        console.log(error.message)
        res.status(500).send('Internal Server Error');
    }

}

////////////////////// user forgot login\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadForget = async (req, res) => {
    try {
        res.render('forgotPass')
    } catch (error) {
        console.log('Error occure while loading the forgot page' + error.message)
    }
}

const verifyForgetLogin = async (req, res) => {
    try {
        const { email, password, confirmpassword } = req.body
        const existingEmail = await User.findOne({ email })
        if (!existingEmail) {
            return res.render('forgotPass', { errorMessage: 'Email not found. Please enter a valid email.' })
        }

        if (password !== confirmpassword) {
            return res.render('forgotPass', { errorMessage: 'Password do not match.' })
        }

        existingEmail.password = await seccurePassword(password)
        await existingEmail.save()

        return res.redirect('/login')
    } catch (error) {
        console.log('Error occured while resetting the passowrd')
        return res.render('forgotPass', { errorMessage: 'An error occurred while resetting the passwors. Pls,try' })
    }
}

////////////////////// user profile\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadUserProfile = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user_id).populate('address')
        if (!userData) {
            return res.render('home', { errorMessage: 'Userprofile not found.' })
        }

        res.render('userProfile', { userData: userData })
    } catch (error) {
        console.log("Error while loading user profile", error.message)
        res.render('home', { errorMessage: 'Error while loading user profile.' })

    }
}

const loadUserEditAddress = async (req, res) => {
    try {
        // console.log( '========')
        const index = req.params.index;
        const userData = await User.findById(req.session.user_id).populate('address');

        if (!userData || !userData.address[index]) {
            return res.render('editUserProfile', { errorMessage: 'Address not found' });
        }

        const addressData = userData.address[index];
        //  console.log(addressData,'is the addressData')

        res.render('editUserProfile', { userData: userData, addressData: addressData, index: index });
    } catch (error) {
        console.log('Error while loading the edit user profile page.', error.message)

    }
}

const updateUserAddress = async (req, res) => {
    try {
        console.log('========================================updateUserAddress')
        const { index } = req.params;
        console.log(index, 'is the index')
        const {
            house_num,
            address_customer_name,
            mobile_num,
            apartment_name,
            city,
            landmark,
            address_type,
            district,
            pincode } = req.body;

        const userId = req.session.user_id;

        console.log(userId, 's the id')

        const user = await User.findById(userId).populate('address');
        if (!user || !user.address[index]) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // Update the address fields
        const addressToUpdate = user.address[index];
        addressToUpdate.house_num = house_num;
        addressToUpdate.address_customer_name = address_customer_name;
        addressToUpdate.apartment_name = apartment_name;
        addressToUpdate.city = city;
        addressToUpdate.mobile_num = mobile_num;
        addressToUpdate.landmark = landmark;
        addressToUpdate.address_type = address_type;
        addressToUpdate.district = district;
        addressToUpdate.pincode = pincode;

        const userData = await addressToUpdate.save();
        //  req.session.user=user;
        //  console.log(userData.address, '===============505')
        return res.redirect('/userProfile');


    } catch (error) {
        console.log('Error while updating user address', error)
        res.status(500).json({ error: 'Internal server error' });
    }
}

const loadAddProfile = async (req, res) => {
    try {
        //console.log('Inside the add profile page')
        res.render('addData')
    } catch (error) {
        console.log('Error while loadinf user add profile', error.message)
    }
}

const addProfile = async (req, res) => {
    try {
        const { house_num,
            address_customer_name,
            mobile_num,
            apartment_name,
            city, landmark, address_type,
            district,
            pincode } = req.body;

        const user_id = req.session.user_id

        console.log(user_id, 'is the user id==========1')

        const user_image = req.file ? req.file.path : '';

        const existingUser = await User.findById({ _id: user_id }).populate('address');
        // console.log(existingUser.address,'is the user id=======2')

        if (!existingUser) {
            return res.status(404).json({ errorMessage: 'User not found, Please complete your registration.' })
        }

        console.log('==========3')
        const existingAddress = existingUser.address.find(addr => (
            addr.address_customer_name === address_customer_name &&
            addr.house_num === house_num &&
            addr.address_type === address_type &&
            addr.apartment_name === apartment_name &&
            addr.city === city &&
            addr.landmark === landmark &&
            addr.district === district &&
            addr.pincode === pincode &&
            addr.mobile_num === mobile_num
        ));
        console.log('==========4')

        if (existingAddress) {
            return res.status(400).json({ error: 'Address already exists' });
        }
        console.log('==========5')
        //creating new address
        const newAddress = new UserAddress({
            user_id: existingUser._id,
            address_customer_name: address_customer_name,
            address_type: address_type,
            house_num: house_num,
            apartment_name: apartment_name,
            city: city,
            landmark: landmark,
            district: district,
            pincode: pincode,
            mobile_num: mobile_num
        })
        // existingUser.address.push(newAddress);
        await newAddress.save();
        console.log('==========5')
        // Update UserAuth  with the new address reference
        existingUser.address.push(newAddress._id);
        await existingUser.save();

        console.log('==========6')

        res.render('userProfile', {
            userData: existingUser,
            successMessage: 'User data added successfully'
        })

    } catch (error) {
        console.log('Error while adding the user address in addProfile function', error)
        res.status(500).json({ error: 'Internal server error' });
    }
}

const deleteAddress = async (req, res) => {
    try {
        const { index } = req.params;
        // console.log(index,'==========is the index')
        const userId = req.session.user_id;

        const user = await User.findById(userId).populate('address');
        if (!user || !user.address[index]) {
            return res.status(404).json({ error: 'Address not found' });
        }

        user.address[index] = null;
        user.is_deleted == true;
        await user.save();
        console.log('Address deleted successfully');
        return res.redirect('/userProfile');

    } catch (error) {
        console.log('Error While deleting user address', error)
        res.status(500).json({ error: 'Internal server error' });
    }
}

const loadChngePassword = async (req, res) => {
    try {

        const userId = req.session.user_id;
        // console.log(userId, 'is the userId')
        const userData = await User.findById(userId)
        // console.log(userData, 'is the userData===========632')
        res.render('changePassword', { userData })
    } catch (error) {
        console.log('Error while loading change password page', error.message)
    }
}

const chngePassword = async (req, res) => {
    try {
        // console.log('============21')
        const { epassword, password, confirmpassword } = req.body;
        const userId = req.session.user_id
        // console.log(userId, 'is the userId============1')
        const user = await User.findById(userId);

        //    console.log(user,'is the user============646')
        // console.log(spassword,'existing passowrd from the body')
        if (user) {
            // console.log(userId, 'is the userId============22222')
            const passwordCheck = await bcrypt.compare(epassword, user.password);
            if (passwordCheck) {
                // console.log(passwordCheck, 'is the ============3333')
                if (password !== confirmpassword) {
                    return res.render('changePassword', { errorMessage: 'Password is not matching.' })

                } else {
                    user.password = await seccurePassword(password)
                    await user.save();
                    // console.log(userId, 'is the userId============77777')
                    // return res.render('myProfile',{successMessageMessage:'Password successfully changed.'})
                    res.redirect('/userProfile')
                }

            } else {
                console.log(userId, 'is the userId============88888')
                return res.render('changePassword', { errorMessage: 'Please enter your existing password' })
            }
        } else {
            console.log(userId, 'is the userId============99999')
            return res.render('changePassword', { errorMessage: 'Email not found,please register' })
        }


    } catch (error) {
        console.log('Error while changing the password', error)
        return res.render('changePassword', { errorMessage: 'An error occurred while changing the password' });
    }

}
//////////////////////////////////////////////////////

const loadChangeMyProfile = async (req, res) => {
    try {
        const { name, mobile } = req.query;
        console.log('type off mobile', typeof (mobile))
        res.render('changeMyProfile', { name, mobile });
    } catch (error) {
        console.log('Error while editing the name and the phone in loadChangeMyProfile', error)
    }
}

const changeMyProfile = async (req, res) => {
    try {
        console.log('in changeMyProfile=================');
        const { username, mobile } = req.body;
        console.log('type off mobile', typeof (mobile))
        const userId = ObjectId.createFromHexString(req.session.user_id);

        console.log('in changeMyProfile=================1');

        // Update user profile
        await User.findByIdAndUpdate(userId, {
            name: username
        }, { new: true });

        // Find and update the user's address
        const user = await User.findById(userId).populate('address');
        if (user && user.address.length > 0) {
            const addressId = user.address[0]._id;
            await UserAddress.findByIdAndUpdate(addressId, {
                mobile_num: mobile
            }, { new: true });
        }

        res.redirect('/myProfile')
    } catch (error) {
        console.log('Error in changeMyProfile', error)
    }
}

//////////////////////////////////////////////////////


const loadMyProfile = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user_id).populate('address')
        res.render('myProfile', { userData: userData })
    } catch (error) {
        console.log('Error while loading my profile page')
    }
}

////////////////////////

const applyCoupon = async (req, res) => {
    try {
        console.log('===================================applyCoupon 1')
        const code = req.body.code;
        // console.log('code======: ', code)
        const amount = Number(req.body.amount);
        // console.log('amount=====: ', amount);
        const userId = req.session.user_id;
        let discAmount = 0;
        const couponData = await couponModel.findOne({ code: code });
        console.log('couponData: ', couponData)
        if (couponData) {
            const userUsedCoupon = couponData.user.includes(userId);
            if (!userUsedCoupon) {
                await couponModel.findOneAndUpdate({ _id: couponData._id }, { $push: { user: userId } });
            }
            // console.log('===================================applyCoupon 2')
            if (amount < couponData.discountAmount) {
                return res.json({ amount: true });
            }
            if (couponData.maxUsers <= 0) {
                return res.json({ limit: true });
            }
            console.log('===================================applyCoupon 3')

            if (couponData.status == false) {
                return res.json({ status: true });
            }
            console.log('===================================applyCoupon 4')

            if (couponData.expiryDate <= new Date()) {
                return res.json({ date: true });
            }
            console.log('===================================applyCoupon 5')

            if (couponData.minCartAmount >= amount) {
                return res.json({ cartAmount: true });
            }
            else {
                console.log('===================================applyCoupon else 6')

                await couponModel.findByIdAndUpdate({ _id: couponData._id }, { $push: { user: req.session.user_id } });
                await couponModel.findByIdAndUpdate({ _id: couponData._id }, { $inc: { maxUsers: -1 } });

                if (couponData.discountType == "percentage") {
                    const perAmount = (amount * couponData.discountAmount) / 100;
                    // const discountAmount = (amount * couponData.maxDiscountAmount) / 100;
                    console.log('perAmount ===================================applyCoupon: ', perAmount)
                    if (perAmount > couponData?.maxDiscountAmount) {
                        discAmount = couponData.maxDiscountAmount;
                        console.log('if case  discAmount:===================================applyCoupon750', discAmount)
                    } else {
                        discAmount = perAmount;
                        console.log('else case  discAmount===================================applyCoupon753: ', discAmount)
                    }

                } else if (couponData.discountType == "fixed") {
                    discAmount = couponData.discountAmount
                    console.log('===================================applyCoupon couponData.discountType == "fixed": discAmount', discAmount)
                }
                const disTotal = Math.round(amount - discAmount);
                console.log('discAmount : ', discAmount);
                console.log('disTotal : ', disTotal);

                return res.json({ amountOkey: true, discAmount, disTotal });

            }

        } else {
            res.json({ invalid: true });
        }

    } catch (error) {
        console.log('Error whilw applying coupon', error)
    }
}

async function fetchCart(userId) {
    try {
        const cart = await Cart.findOne({ user: userId }).populate('cartItems.productId');

        if (!cart) {
            return { totalPrice: 0, cartItems: [] };
        }

        // Calculate total price of the cart
        let totalPrice = 0;
        totalPrice = cart.totalPrice;

        return { totalPrice: totalPrice, cartItems: cart.cartItems };
    } catch (error) {
        console.error('Error fetching cart:', error);
        return { totalPrice: 0, cartItems: [] };
    }
}

const removeCoupon = async (req, res) => {
    try {
        const code = req.body.code;
        const userId = req.session.user_id;

        const couponData = await couponModel.findOne({ code: code });

        if (couponData && couponData.user.includes(userId)) {
            // Remove the user from the coupon's applied list
            await couponModel.findByIdAndUpdate({ _id: couponData._id }, { $pull: { user: userId } });
            // Increment maxUsers since the coupon is no longer applied by this user
            await couponModel.findByIdAndUpdate({ _id: couponData._id }, { $inc: { maxUsers: 1 } });

            // Fetch the updated cart total amount
            const cart = await fetchCart(userId);
            const totalAmount = cart.totalPrice || 0; // Get the total price from the cart

            return res.json({ success: true, totalAmount: totalAmount });
        } else {
            return res.status(400).json({ error: "Coupon not found or not applied" });
        }
    } catch (error) {
        console.error('Error while removing coupon:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const addReferralRupees = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const user = await User.findById(userId);
        if (user.is_referralUsed) {
            return res.status(400).json({ errormessage: 'Referral code has already been used' });
        }
        await User.findByIdAndUpdate(userId, {
            $inc: { wallet: 100 },
            $push: {
                history: {
                    amount: 100,
                    status: 'Referral Bonus',
                    timestamp: new Date()
                }
            },
            is_referralUsed: true
        });
        res.status(200).json({ message: '100 rupees added to your wallet' });
    } catch (error) {
        console.log('Error while using referral code', error)
    }
}

//////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

module.exports = {
    loadRegister,
    registerUser,
    verifyOtp,
    resendOTP,
    sendOtpToEmail,
    loadVerifyOtp,
    loadresendOTP,
    loadLogin,
    verifyLogin,
    loadverifyGoogleSignin,
    loadForget,
    verifyForgetLogin,
    loadUserProfile,
    userLogout,
    loadUserEditAddress,
    loadAddProfile,
    addProfile,
    loadChangeMyProfile,
    changeMyProfile,
    updateUserAddress,
    deleteAddress,
    loadChngePassword,
    chngePassword,
    loadMyProfile,
    applyCoupon,
    removeCoupon,
    addReferralRupees
}
