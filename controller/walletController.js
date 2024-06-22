const User = require('../models/userAuthenticationModel');
const { Product } = require('../models/categoryModel');
const Razorpay = require('razorpay');
const Coupon = require('../models/couponModel');

///////////////////\\\\\\\\\\\\\\\\\\\\\
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const razorpayinstance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY
});

/////////////////////////////\\\\\\\\\\\\\\\\\\\

const loadwallet = async (req, res) => {
    try {
        console.log('=========================in loadwallet')
        const userId = req.session.user_id;
        const user = await User.findById(userId);
        user.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.render('loadWallet', { user, req: req })
    } catch (error) {
        console.log('Error while loading loadwallet', error)
    }
}

const addMoneyWallet = async (req, res) => {
    try {
        console.log('================in addMoneyWallet============')
        const amount = req.body.amount;
        console.log('amount: ', amount)
        // Generate a unique order ID for each transaction
        const orderId = generateUniqueOrderId();
        const generatedOrder = await generateOrderRazorpay(orderId, amount);
        res.json({ razorpayOrder: generatedOrder, status: true, amount: amount });
    } catch (error) {
        console.log(
            "Error hapence in the wallet ctrl in the funtion  addMoneyWallet",
            error
        );
        res.status(500).json({ error: "Internal server error" });
    }
};

const verifyPayment = async (req, res) => {
    try {
        console.log('in varifyPayment==================');
        verifyOrderPayment(req.body)
        console.log('in varifyPayment==================1');
        res.json({ status: true });
    } catch (error) {
        console.log('Error in varifyPayment', error)
    }
}

const updateWalletField = async (req, res) => {
    try {
        console.log('in updateWalletField===========')
        const amount = parseFloat(req.body.amount);
        console.log('amount: ', req.body.amount)
        const userId = req.session.user_id;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { wallet: amount },
                $push: {
                    history: {
                        amount: amount,
                        status: "credit",
                        timestamp: Date.now(),
                    },
                },
            },
            { new: true }
        );

        console.log("Updated user data:", user);

        if (user) {
            res.json({ status: true });
        } else {
            res.json({ err: "user is not foundd" });
        }

    } catch (error) {
        console.log('Error in updateWalletField', error)
    }
}

// const useWalletAmount = async (req, res) => {
//     try {
//         const { total, wallet } = req.body;
//         console.log('total: ', total, 'wallet: ', wallet);
//         const userId = req.session.user_id;

//         let newTotal;
//         let remainingWallet;

//         if (total <= wallet) {
//             console.log('in if case')
//             // If total amount is less than or equal to wallet amount, use wallet completely
//             newTotal = 0;
//             remainingWallet = wallet - total;
//             console.log('total <= wallet remainingWallet: ',remainingWallet)
//         } else {
//             console.log('in else case')
//             // If total amount is greater than wallet amount, use wallet partially
//             newTotal = total - wallet;
//             console.log('newTotal ',newTotal)
//             remainingWallet = 0; // Wallet amount will be fully used
//         }

//         // Update user's wallet balance
//         await User.findByIdAndUpdate(userId, {
//             wallet: remainingWallet,
//             $push: {
//                 history: {
//                     amount: remainingWallet > 0 ? -total : -wallet, // negative for debit
//                     status: "debit",
//                     timestamp: Date.now(),
//                 },
//             },
//         });
//         console.log('newTotal: ', newTotal)
//         res.json({
//             status: true,
//             sum: newTotal,
//         });

//     } catch (error) {
//         console.log('Error in useWalletAmount', error);
//         res.status(500).json({ status: false, error: "An error occurred while using wallet amount." });
//     }
// };

//////////////////////////////\\\\\\\\\\\\\\\\

function generateUniqueOrderId() {
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 15);
    return `order_${timestamp}_${uniqueId}`;
}

const generateOrderRazorpay = (orderId, total) => {
    return new Promise((resolve, reject) => {
        const options = {
            amount: total * 100, // amount in the smallest currency unit
            currency: "INR",
            receipt: String(orderId),
        };
        razorpayinstance.orders.create(options, function (err, order) {
            if (err) {
                console.log("failed");
                console.log(err);
                reject(err);
            } else {
                console.log("Order Generated RazorPAY: " + JSON.stringify(order));
                resolve(order);
            }
        });
    });
};

const verifyOrderPayment = (details) => {
    console.log('=================verifyOrderPayment')
    console.log("DETAILS : " + JSON.stringify(details));
    return new Promise((resolve, reject) => {
        const crypto = require('crypto');
        let hmac = crypto.createHmac('sha256', RAZORPAY_SECRET_KEY)
        hmac.update(details.razorpay_order_id + '|' + details.razorpay_payment_id);
        hmac = hmac.digest('hex');
        if (hmac == details.razorpay_signature) {
            console.log("Verify SUCCESS");
            resolve();
        } else {
            console.log("Verify FAILED");
            reject();
        }
    })
};


//////////////////////////////\\\\\\\\\\\\\\\\\
module.exports = {
    loadwallet,
    addMoneyWallet,
    verifyPayment,
    updateWalletField
}