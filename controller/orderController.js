
const { Category, Product } = require('../models/categoryModel')
const Review = require('../models/reviewModel')
const Address = require('../models/addressModel')
const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const User = require('../models/userAuthenticationModel')
const shortid = require('shortid');
const { ObjectId } = require('mongodb')

const Order = require('../models/orderModel')
const OrderItem = require('../models/orderItemModel')


const loadUserOrder = async (req, res) => {
    try {
        const orderPlaced = await Order.find({}).populate('shippingAddress')
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
        //console.log(req.body)
        const userId = req.session.user_id;
        console.log(userId, 'is the userId')

        const { items, weight, price, totalAmount, shippingAddress } = req.body;
        console.log('items: ', items, 'weight: ', weight, 'price : ', price, 'totalAmount: ', totalAmount, 'shippingAddress: ', shippingAddress)
        // console.log(items, totalAmount, shippingAddress, 'is the datas')
        console.log('typeof items : ', typeof items, 'items.length: ', items.length);


        let orderId = shortid.generate();
        console.log('orderId: ', orderId)
        const order = new Order({
            order_id: orderId,
            user_id: userId,
            orderItems: [],
            discountAmount: 0,
            finalPrice: totalAmount,
            shippingAddress: shippingAddress,
            paymentMethod: 'Cash on delivery',
            paymentStatus: 'Cash on delivery',
            orderStatus: 'clientSideProcessing'
        });
        console.log('=================================78')

        await order.save();

        const productIds = req.body.productId.map(productId => productId.trim());
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

        await order.save();

        console.log('=================================91')

        //update quantity in product collection.
        for (const productId of productIds) {
            let orderItem = await OrderItem.findOne({ product_id: productId });
            let orderedWeight = orderItem.orderedWeight;
            console.log('orderedWeight: ', orderedWeight)
            for (const item of orderedWeight) {
                const orderWeight = item.weight;
                console.log('orderWeight: ', orderWeight)
                const ProductWeight = await Product.findById(productId)
                console.log('ProductWeight.totalQuantity: ', ProductWeight.totalQuantity)
                if (ProductWeight.totalQuantity > 0) {
                    let weightInGrams = ProductWeight.totalQuantity * 1000;
                    let updatedQuantity = (weightInGrams - orderWeight) / 1000;
                    console.log('updatedQuantity: ', updatedQuantity)
                    await Product.updateMany({ _id: productId }, { totalQuantity: updatedQuantity });
                } else {
                    console.log('No stock.')
                }
            }

        }

        // console.log('=================================111')
        await CartItem.deleteMany({ userId: userId })
        console.log('CartItem deleted================================91')
        await Cart.deleteOne({ userId: userId });
        console.log('Cart deleted================================91')
        console.log('Order placed successfully')
        res.redirect('/successOrder');

    } catch (error) {
        console.log('Error, while placing the order ', error)
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