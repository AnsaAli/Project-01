const mongoose = require('mongoose')
const User = require('../models/userAuthenticationModel')
const { Product } = require('../models/categoryModel')
const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const Order = require('../models/orderModel')


const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.body.product_id;
        let quantity = req.body.quantity || 1; // Default quantity is 1

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404)
                .set('Error-Message', 'Product not found')
                .json({ error: 'Product not found' });
        }

        // Validate quantity
        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return res.status(400)
                .set('Error-Message', 'Invalid quantity')
                .json({ error: 'Invalid quantity' });
        }

        // if the requested quantity exceeds the maximum allowed per person
        if (quantity > product.max_quantity_per_person) {
            return res.status(400)
                .set('Error-Message', 'Exceeded maximum quantity per person')
                .json({ error: 'Exceeded maximum quantity per person' });
        }

        let userCart = await Cart.findOne({ user_id: userId }).populate('items');
        if (!userCart) {
            userCart = await Cart.create({ user_id: userId, items: [] });
        }

        const existingCartItem = userCart.items.find(item => item.product.toString() === productId);

        const availableStock = product.stock - (existingCartItem ? existingCartItem.quantity : 0);
        if (availableStock <= 0) {
            return res.status(400)
                .set('Error-Message', 'Product out of stock')
                .json({ error: 'Product out of stock',isOutOfStock: true });
        } else if (quantity > availableStock) {
            quantity = availableStock;
        }

        if (existingCartItem) {
            existingCartItem.quantity += quantity;
            await existingCartItem.save();
            return res.status(200).json({ message: 'Quantity updated in cart', cartItem: existingCartItem });
        } else {
            const cartItem = await CartItem.create({
                cart_id: userCart._id,
                product: productId,
                quantity: quantity,
                price: product.offer_price
            });

            userCart.items.push(cartItem._id);
            await userCart.save();

            return res.status(200)
                .json({ success: true, message: 'Product added to cart successfully', cartItem });
        }
    } catch (error) {
        console.log('Error while loading add to cart', error.message);
        return res.status(500)
            .set('Error-Message', 'Internal server error')
            .json({ error: 'Internal server error' });
    }
};

const listCartItems = async (req, res) => {
    try {
        const user_id = req.session.user_id
        const userCart = await Cart.findOne({ user_id: user_id }).populate({
            path: 'items',
            populate: {
                path: 'product',
                model: 'Product',
                select: 'name category images'
            }
        })
        if (!userCart) {
            return res.status(404).json({ error: 'Cart not found' })
        }
        res.status(200).json({ cartItem: userCart.items })
    } catch (error) {
        console.log('Error while listing the cart items')
        res.status(500).json({ error: 'Internal server error' });
    }
}

const removeCartItem = async (req, res) => {
    try {
        console.log('inside the controoler, removeCartItem')
        const productId = req.params.product_id
        //console.log(productId,'is the product id params')

        //find the cart item from the db
        const cartItem = await CartItem.findOneAndDelete({ product_id: productId });
        if (!cartItem) {
            return res.status(404).json({ error: 'Cart Item not found' });
        }

        //recalte the total amount
        const total_price = await calculateTotalPriceOfCart();
        console.log('inside the controoler,after calculateTotalPriceOfCart')
        //if removed
        res.json({ message: 'Cart item removed successfully', total_price })


    } catch (error) {
        console.log('Error while removing the items from the cart', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const calculateTotalPriceOfCart = async () => {
    try {
        //aggregation to calculate the total price
        const totalPriceAggregate = await CartItem.aggregate([
            {
                $group: {
                    _id: null,
                    total_price: { $sum: { $multiply: ['$price', '$quantity'] } }
                }
            }
        ])

        //total price from the aggreagte result
        const total_price = totalPriceAggregate.length > 0 ? totalPriceAggregate[0].total_price : 0;
        return total_price;

    } catch (error) {
        console.log('Error while finding the total price in the calculateTotalPriceOfCart()', error.message)
    }

}

module.exports = {
    addToCart,
    listCartItems,
    removeCartItem
}