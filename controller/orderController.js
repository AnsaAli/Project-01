
const { Category, Product } = require('../models/categoryModel')
const Review = require('../models/reviewModel')
const Address = require('../models/addressModel')
const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const User = require('../models/userAuthenticationModel')
const { v4: uuidv4 } = require('uuid')

const Order = require('../models/orderModel')


const loadUserOrder = async (req, res) => {
    try {
        const orderPlaced= await Order.find({})
        res.render('userOrder',{orderPlaced})
    } catch (error) {
        console.log('Error while loading user order page', error.message)
    }
}
const cancelOrder= async(req,res)=>{
    try {
        const orderId = req.params.orderId;
        //console.log(orderId,'is the orderid')
        const order = await Order.findById(orderId);
        if(!order){
            return res.status(404).json({ message: 'Order not found' });
        }
        order.orderStatus = 'cancelled';
        await order.save();
        res.status(200).json({ message: 'Order cancelled successfully', orderId: order._id });
    } catch (error) {
        console.log('Error occure while canceling the order', error.message)
    }
}
const loadConfirmOrder= async(req,res)=>{
    try {
        const orderedProducts= await Order.find({}).populate({
            path: 'items',
            populate: {
                path: 'product',
                model: 'Product' 
            }
        });
        res.render('confirmOrder',{orderedProducts})
    } catch (error) {
        console.log('Error while loading the place order page', error.message)
    }
}
const placeOrder = async (req, res) => {
    try {
         //console.log(req.body)
         
        const { userId, items, totalPrice, shippingAddress,paymentStatus } = req.body;
        const order_id= uuidv4()
        
        // Create a new order document
        const order = new Order({
            order_id:order_id,
            user_id: userId,
            items: items,
            totalPrice: totalPrice,
            shippingAddress: shippingAddress,
            paymentMethod: 'Cash on delevery',
            paymentStatus: 'Cash on delevery',
            orderStatus: 'clientSideProcessing'
        })
        await order.save();

        // const userCart = await Cart.findOne({ user_id: userId }).populate('items')
        const userCart= await Cart.findOneAndUpdate(
            { user_id: userId },
            { $set: { items: [] } }
        )
        //console.log(userCart.items,'after removing the items from the cart')

        console.log('Order placed successfully')
        res.redirect('/successOrder')
    } catch (error) {
        console.log('Error, while placing the order ', error.message)
    }
}

// calculate finalPrice- no discount applied
function calculateFinalPrice(totalAmount) {
    return totalAmount;
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