
const { Category, Product } = require('../models/categoryModel')
const Review = require('../models/reviewModel')
const Address = require('../models/addressModel')
const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const User = require('../models/userAuthenticationModel')
const shortid = require('shortid');
const { ObjectId } = require('mongodb')


const Order = require('../models/orderModel')


const loadUserOrder = async (req, res) => {
    try {
        const orderPlaced = await Order.find({})
        res.render('userOrder', { orderPlaced })
    } catch (error) {
        console.log('Error while loading user order page', error.message)
    }
}
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        //console.log(orderId,'is the orderid')
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.orderStatus = 'cancelled';
        await order.save();
        res.status(200).json({ message: 'Order cancelled successfully', orderId: order._id });
    } catch (error) {
        console.log('Error occure while canceling the order', error.message)
    }
}
const loadConfirmOrder = async (req, res) => {
    try {
        const orderedProducts = await Order.find({}).populate({
            path: 'product',
            model: 'Product'

        });
        res.render('confirmOrder', { orderedProducts })
    } catch (error) {
        console.log('Error while loading the place order page', error.message)
    }
}
const placeOrder = async (req, res) => {
    try {
        //console.log(req.body)
        const userId = req.session.user_id;
        console.log(userId, 'is the userId')
        const { items, weight, totalAmount, shippingAddress } = req.body;
        console.log(items, totalAmount, shippingAddress, 'is the datas')

        const order_id = shortid.generate();

        let orderedWeight;
        if (Array.isArray(items)) {
            // If items is an array, map it to orderedWeight
            orderedWeight = items.map((itemName, index) => ({
                name: itemName,
                weight: weight[index] 
            }));
        } else {
            // If only one product is ordered, create an array with a single object
            orderedWeight = [{
                name: items,
                weight: weight
            }];
        }

        // const cartItem= await CartItem.findById({userId})
        // Create a new order document
        const order = new Order({
            order_id: order_id,
            user_id: userId,
            items: items,
            totalPrice: totalAmount,
            orderedWeight: orderedWeight,
            shippingAddress: shippingAddress,
            paymentMethod: 'Cash on delevery',
            paymentStatus: 'Cash on delevery',
            orderStatus: 'clientSideProcessing'
        })
        await order.save();

        // await Cart.updateOne(
        //     {
        //         _id: ObjectId.createFromHexString(userId)
        //     },
        //     { $pull: { cartItems: {} } }
        // );
        await Cart.updateOne(
            { userId: userId }, 
            { $set: { cartItems: [], totalPrice: 0 } } 
        );


        //console.log(userCart.items,'after removing the items from the cart')

        console.log('Order placed successfully')
        res.redirect('/successOrder')
    } catch (error) {
        console.log('Error, while placing the order ', error.message)
    }
}



const loadTrackOrder = async (req, res) => {
    try {
        res.render('trackOrder')
    } catch (error) {
        console.log('Error while loading track order page', error.message)
    }
}


module.exports = {
    loadUserOrder,
    loadTrackOrder,
    loadConfirmOrder,
    placeOrder,
    cancelOrder

}