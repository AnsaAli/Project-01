
const { Category, Product } = require('../models/categoryModel');
const Review = require('../models/reviewModel');
const Address = require('../models/addressModel');
const Cart = require('../models/cartModel');
const CartItem = require('../models/cartItemModel');
const User = require('../models/userAuthenticationModel');
const shortid = require('shortid');
const { ObjectId } = require('mongodb');
const Order = require('../models/orderModel');
const OrderItem = require('../models/orderItemModel');
const PDFDocument = require('pdfkit');

const Razorpay = require('razorpay');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const razorpayinstance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY
});

const loadUserOrder = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;  // Current page number
        const limit = 3;  // Number of items per page

        // Total count of Order
        const count = await Order.countDocuments();
        const coupons = await Order.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: 1 });  // Sort by descending createdAt

        const orderPlaced = await Order.find({}).populate('shippingAddress').populate('orderItems').sort({ orderDate: -1 });
        res.render('userOrder',
            {
                orderPlaced,
                coupons: coupons,
                currentPage: page,
                totalPages: Math.ceil(count / limit)
            })
    } catch (error) {
        console.log('Error while loading user order page', error.message)
    }
}

const cancelOrder = async (req, res) => {
    try {
        console.log('=======================================cancelorder')
        const userId = req.session.user_id;
        const orderId = req.params.orderId;
        //console.log(orderId,'is the orderid')

        const order = await Order.findById(orderId).populate('orderItems');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.orderStatus = 'Cancelled';
        await order.save();

        //add product back to the database.
        await Promise.all(order.orderItems.map(async (element) => {
            try {
                console.log('ProductId: ', element.product_id);
                let product = await Product.findById(element.product_id);
                product.totalQuantity += (element.orderedWeight[0].weight) / 1000;
                await product.save();

                // Update user wallet
                if (order.paymentMethod === 'wallet' || order.paymentMethod === 'razorpay') {

                    const user = await User.findById(userId);
                    let existingWalletAmount = user.wallet;
                    console.log('existingWalletAmount: ', existingWalletAmount);
                    let productTotalAmount = order.finalPrice;
                    console.log('productTotalAmount: ', productTotalAmount);
                    existingWalletAmount += productTotalAmount;
                    console.log('existingWalletAmount: ', existingWalletAmount);

                    await User.findByIdAndUpdate(userId, {
                        wallet: existingWalletAmount,
                        $push: {
                            history: {
                                amount: productTotalAmount,
                                status: "credit",
                                timestamp: Date.now(),
                            },
                        },
                    });
                }
            } catch (error) {
                console.error('Error updating product quantity:', error);
            }
        }));

        res.status(200).json({ message: 'Order cancelled successfully', orderId: order._id });
    } catch (error) {
        console.log('Error occure while canceling the order', error.message)
    }
}

const loadConfirmOrder = async (req, res) => {
    try {
        const orderedProducts = await Order.find({});
        // .populate({
        //     path: 'product',
        //     model: 'Product'
        // });
        res.render('confirmOrder', { orderedProducts })
    } catch (error) {
        console.log('Error while loading loadConfirmOrder', error.message)
    }
}

const placeOrder = async (req, res) => {
    try {
        console.log('request body:', req.body);
        console.log('=============================================placeorder')
        const userId = req.session.user_id;
        console.log(userId, 'is the userId')

        const { items, weight, price, totalAmount, shippingAddress, payment_option, productIds } = req.body;
        console.log('items: ', items, 'weight: ', weight, 'price : ', price, 'totalAmount: ', totalAmount, 'shippingAddress: ', shippingAddress)
        console.log('payment_option: ', payment_option)
        console.log('productid : ', productIds);

        let orderStatus;
        if (payment_option === 'razorpay') {
            orderStatus = "Pending"
        } else if (payment_option === 'wallet') {
            orderStatus = "Pending"
        } else {
            if (totalAmount >= 1000) {
                return res.json({ errorMessage: 'Sorry, you cannot choose COD on and above 1000rs!' });
            }
            orderStatus = "Placed"
        }

        let orderId = shortid.generate();
        let customerOrderId = orderId;
        console.log('orderId in placeOrder: ', orderId)
        const order = new Order({
            order_id: orderId,
            user_id: userId,
            orderItems: [],
            discountAmount: 0,
            finalPrice: totalAmount,
            shippingAddress: shippingAddress,
            paymentMethod: payment_option,
            paymentStatus: payment_option,
            orderStatus: orderStatus
        });
        console.log('=================================78')
        await order.save();

        // const productIds = req.body.productId.map(productId => productId.trim());

        console.log('=================================80')

        if (items && weight && price) {
            console.log('=================================84')
            if (typeof items === 'string' && items.trim().length > 0) {
                console.log('single item order=================================101')
                // If only one item is being ordered
                const orderItem = new OrderItem({
                    user_id: userId,
                    product_id: productIds[0],
                    orderedWeight: [{
                        name: items,
                        weight: parseInt(weight),
                        price: parseFloat(price)
                    }],
                    totalPrice: totalAmount
                });
                console.log('orderItem:', orderItem)
                await orderItem.save();
                console.log(orderItem._id, 'orderItem._id=================================115');

                order.orderItems.push(orderItem._id);
            } else {
                console.log('multiple=================================80')
                for (let i = 0; i < items.length; i++) {
                    const orderItem = new OrderItem({
                        user_id: userId,
                        product_id: productIds[i],
                        orderedWeight: [{
                            name: items[i],
                            weight: parseInt(weight[i]),
                            price: parseFloat(price[i])
                        }],
                        totalPrice: totalAmount
                    });

                    await orderItem.save();
                    console.log(orderItem._id, 'orderItem._id=================================105');

                    order.orderItems.push(orderItem._id);
                }
            }
        }

        const saveorder = await order.save();

        console.log('=================================91')

        //update quantity in product collection.
        if (typeof items === 'string' && items.trim().length > 0) {
            let orderedWeight = weight;
            const ProductWeight = await Product.findById(productIds[0]);
            if (ProductWeight.totalQuantity > 0) {
                let weightInGrams = ProductWeight.totalQuantity * 1000;
                let updatedQuantity = (weightInGrams - orderedWeight) / 1000;
                console.log('updatedQuantity: ', updatedQuantity)
                await Product.updateMany({ _id: productIds[0] }, { totalQuantity: updatedQuantity });
            } else {
                console.log('No stock.')
            }

        } else {
            for (let i = 0; i <= items.length - 1; i++) {
                const orderWeight = weight[i];
                console.log('orderWeight: ', orderWeight)
                const ProductWeight = await Product.findById(productIds[i])
                console.log('ProductWeight.totalQuantity: ', ProductWeight.totalQuantity)
                if (ProductWeight.totalQuantity > 0) {
                    let weightInGrams = ProductWeight.totalQuantity * 1000;
                    let updatedQuantity = (weightInGrams - orderWeight) / 1000;
                    console.log('updatedQuantity: ', updatedQuantity)
                    await Product.updateMany({ _id: productIds[i] }, { totalQuantity: updatedQuantity });
                } else {
                    console.log('No stock.')
                }

            }
        }

        if (payment_option === 'COD') {
            console.log('=================================111 COD')
            await CartItem.deleteMany({ userId: userId })
            console.log('CartItem deleted================================91')
            await Cart.deleteOne({ userId: userId });
            console.log('Cart deleted================================91')
            console.log('Order placed successfully')
            res.json({ success: true });

        } else if (payment_option === 'razorpay') {

            const orderId = saveorder._id;
            console.log('orderId in razor pay===================200', orderId);
            const totalAmount = saveorder.finalPrice;
            console.log('totalAmount in razor pay =========202', totalAmount);

            var options = {
                amount: totalAmount * 100,
                currency: "INR",
                receipt: "" + orderId
            }

            await order.save()
            await CartItem.deleteMany({ userId: userId })
            console.log('CartItem deleted================================91')
            await Cart.deleteOne({ userId: userId });
            console.log('Cart deleted================================91')

            razorpayinstance.orders.create(options, function (err, order) {
                console.log('order================================211 razor', order);
                console.log('customerOrderId: ==========221', customerOrderId)
                res.json({ order, customerOrderId: customerOrderId });
            })
        } else if (payment_option === 'wallet') {
            console.log('inside wallet payment place order.')
            //wallet amount in user model
            const user = await User.findById(userId);
            // const cart = await Cart.findById(userId)
            let walletAmount = user.wallet;

            let paidAmount;//100   cart.totalPrice : 100
            let walletAmountBalance//0
            if (walletAmount >= totalAmount) {

                paidAmount = req.body.totalAmount;
                walletAmountBalance = walletAmount - paidAmount;
                console.log('walletAmount: ', walletAmount);
                console.log('walletAmountBalance: ', walletAmountBalance);

                await User.findByIdAndUpdate(userId, {
                    wallet: walletAmountBalance,
                    $push: {
                        history: {
                            amount: paidAmount,
                            status: "debit",
                            timestamp: Date.now(),
                        },
                    },
                });

                order.paymentStatus = 'Wallet Payment';
                order.paymentMethod = 'Wallet'
                order.orderStatus = 'Confirmed'
                console.log('=================================111 wallet')

                await CartItem.deleteMany({ userId: userId })
                console.log('CartItem deleted================================91 wallet')
                await Cart.deleteOne({ userId: userId });
                console.log('Cart deleted================================91 wallet')
                console.log('Order placed successfully using wallet');
                res.json({ success: 'wallet' });
            } else {
                console.log('There is no enough amount in the wallet.')
                res.json({ error: 'There is not enough amount in the wallet, Please add money to the wallet!' });
            }


        }
    } catch (error) {
        console.log('Error, while placing the order ', error)
    }
}

const paymentSuccess = async (req, res) => {
    try {
        console.log('==============================in paymentSuccess');
        console.log('==============================in paymentSuccess');
        console.log('==============================in paymentSuccess');


        const { paymentid, signature, orderId, customerOrderId } = req.body;
        console.log('paymentid : ', paymentid, 'signature: ', signature, 'orderId in paymentSuccess: ', orderId, 'customerOrderId: in paymentSuccess', customerOrderId);

        const { createHmac } = require("node:crypto");
        //   generated_signature = hmac_sha256(order_id + "|" + paymentid, RAZORPAY_SECRET_KEY);
        const hash = createHmac("sha256", RAZORPAY_SECRET_KEY)
            .update(orderId + "|" + paymentid)
            .digest("hex");

        console.log('hash : ', hash);


        if (hash === signature) {
            await Order.updateOne(
                { order_id: customerOrderId },
                { $set: { orderStatus: "Success", paymentStatus: "Paid By Razor Pay" } }
            );

            res.status(200).json({ success: true, message: "Payment successful" });
        } else {
            console.log("error");
            res.json({ success: false, message: "Invalid payment details" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const paymentFailed = async (req, res) => {
    try {
        console.log('==============================in paymentFailed');
        const { orderId, reason } = req.body;
        console.log('orderId: ', orderId, 'reason: ', reason);

        // Update order status to "Failed" in the database
        await Order.updateOne(
            { order_id: orderId },
            { $set: { orderStatus: "Failed", paymentStatus: "Failed", failureReason: reason } }
        );

        res.status(200).json({ success: true, message: "Order status updated to Failed" });
    } catch (error) {
        console.log('Error in paymentFailed', error)
    }
}

const retryPayment = async (req, res) => {
    try {
        const { orderId, finalPrice } = req.body;
        console.log('orderId: ', orderId);
      
        console.log('finalPrice: ', finalPrice);

        var options = {
            amount: finalPrice * 100,
            currency: "INR",
            receipt: "" + orderId
        }
      
        razorpayinstance.orders.create(options, function (err, order) {
            if (err) {
                console.error('Error creating Razorpay order:', err);
                return res.json({ success: false, error: 'Failed to create Razorpay order' });
            }
         
            console.error('order:', order);
            res.json({ success: true, order });
        });

    } catch (error) {
        console.log('Error in retryPayment', error)
    }
}

const verifyPaymentRetry = async (req, res) => {

    const { paymentid, razorpayorderid, signature, orderId } = req.body;

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', RAZORPAY_SECRET_KEY);
    hmac.update(razorpayorderid + '|' + paymentid);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === signature) {
        await Order.updateOne(
            { _id: orderId },
            { $set: { orderStatus: "Success", paymentStatus: "Paid By Online" } }
        );
        res.json({ success: true });
    } else {
        res.json({ success: false, error: 'Invalid payment signature' });
    }
};

const loadViewOrderDetails = async (req, res) => {
    try {
        const user_id = req.session.user_id;
        const order_id = req.query.orderId;

        let user_name = '';
        let loggedIn = false;
        if (user_id) {
            const user = await User.findById(user_id);
            if (user) {
                user_name = user.name;
                loggedIn = true;
            }
        }

        const orderPlaced = await Order.findById(order_id)
            .populate('shippingAddress')
            .populate('orderItems')
            .sort({ orderDate: -1 });

        if (!orderPlaced) {
            return res.status(404).send('Order not found');
        }


        // Save order details in session
        req.session.Orderdtls = [{
            order_id: orderPlaced.order_id,
            user_id: orderPlaced.user_id,
            orderDate: orderPlaced.orderDate,
            paymentMethod: orderPlaced.paymentMethod,
            finalPrice: orderPlaced.finalPrice,
            orderStatus: orderPlaced.orderStatus,
            shippingAddress: orderPlaced.shippingAddress,
            orderItems: orderPlaced.orderItems
        }];

        res.render('orderDetails', {
            user_id: user_id,
            user_name: user_name,
            orderPlaced
        });

    } catch (error) {
        console.log('Error in loadViewOrderDetails', error)
    }
}

const invoiceDownload = async (req, res) => {
    try {
        console.log('inside invoice download');
        const { Orderdtls } = req.session;
        console.log('Orderdtls: ', Orderdtls);

        const doc = new PDFDocument({ margin: 50 });
        const fileName = 'invoice.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        doc.pipe(res);

        // Document Title
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown(2);

        // Company Info
        doc.fontSize(12).text('GoEasy Shopping', { align: 'right' });
        doc.fontSize(12).text('SVRA', { align: 'right' });
        doc.fontSize(12).text('Ernakulam, Kerala, 1234', { align: 'right' });
        doc.fontSize(12).text('(000) 000-0000', { align: 'right' });
        doc.fontSize(12).text('goeasy@example.com', { align: 'right' });
        doc.moveDown(2);

        // Customer Info
        doc.fontSize(12).text(`Customer: ${Orderdtls[0].shippingAddress.address_customer_name}`, { align: 'left' });
        doc.fontSize(12).text(`Address: ${Orderdtls[0].shippingAddress.apartment_name}`, { align: 'left' });
        doc.fontSize(12).text(`${Orderdtls[0].shippingAddress.city}, ${Orderdtls[0].shippingAddress.district}`, { align: 'left' });
        doc.fontSize(12).text(`Phone: ${Orderdtls[0].shippingAddress.mobile_num}`, { align: 'left' });
        doc.moveDown(2);

        // Add a line under the headers
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        // Add a line under the headers
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(2);

        // Iterate through the orders
        for (const order of Orderdtls) {
            const user = await User.findById(order.user_id).select('name');
            const orderItems = order.orderItems;

            const productDetails = orderItems.map(item => item.orderedWeight.map(pdt => {
                let weightText = `${pdt.weight}g`;
                if (pdt.weight >= 1000) {
                    const kg = Math.floor(pdt.weight / 1000);
                    const grams = pdt.weight % 1000;
                    weightText = `${kg}kg${grams > 0 ? ` ${grams}g` : ''}`;
                }
                return `${pdt.name}: ${weightText}`;
            }).join('\n')).join('\n');

            const address = `${order.shippingAddress.address_customer_name}\n${order.shippingAddress.mobile_num}\n${order.shippingAddress.apartment_name}\n${order.shippingAddress.city}`;

            // Order details
            doc.fontSize(14).text('Order No:  ', { continued: true }).font('Helvetica-Bold').text(order.order_id);
            doc.font('Helvetica').fontSize(12).text('Date:  ', { continued: true }).font('Helvetica-Bold').text(new Date(order.orderDate).toLocaleDateString());
            doc.moveDown(0.5);

            // Product Details
            doc.font('Helvetica').fontSize(14).text('Product Details:  ').font('Helvetica-Bold');
            doc.font('Helvetica').fontSize(12).text(productDetails);
            doc.moveDown(2);

            // Amount
            doc.font('Helvetica').fontSize(12).text('Amount:', { continued: true }).font('Helvetica-Bold').text(`₹${order.finalPrice}Rs`);
            doc.moveDown(2);

            // Status
            doc.font('Helvetica').fontSize(12).text('Order Status:  ', { continued: true }).font('Helvetica-Bold').text(order.orderStatus);
            doc.moveDown(2);


        }

        doc.end();

    } catch (error) {
        console.log('Error in invoiceDownload:', error);
    }
};
//////////////////////////////////////////////////////////////////////////////////
module.exports = {
    loadUserOrder,
    loadConfirmOrder,
    placeOrder,
    cancelOrder,
    paymentSuccess,
    loadViewOrderDetails,
    invoiceDownload,
    paymentFailed,
    retryPayment,
    verifyPaymentRetry


}