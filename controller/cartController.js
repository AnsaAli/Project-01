const mongoose = require('mongoose')
const User = require('../models/userAuthenticationModel')
const { Product } = require('../models/categoryModel')
const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const Order = require('../models/orderModel')


const addToCart = async (req, res) => {
    try {
        const { productId, weight, price, productName } = req.body;

        const userId = req.session.user_id;
        console.log(userId, 'is the userId');

        console.log('Product ID:', productId);
        console.log('Weight:', weight);
        console.log('Price:', price);
        console.log('Product Name:', productName);

        // Check if the product already exists in the cart
        let cartItem = await CartItem.findOne({ productId: productId });
        console.log('===============================23')
        if (cartItem) {
            // If the product exists, update its quantity
            cartItem.quantity += 1;
        } else {
            // If the product does not exist, create a new cart item
            cartItem = new CartItem({
                productId: productId,
                weight: weight,
                price: price,
                quantity: 1
            });
        }
        console.log(cartItem, '===============================38')

        // Save the updated/new cart item to the database
        const savedCartItem = await cartItem.save();

        // Get the user's cart
        let cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            // If the user does not have a cart, create a new cart
            cart = new Cart({ userId: userId });
        }
        console.log('===============================50')

        // Push the ID of the saved cart item to the cart's cartItems array
        cart.cartItems.push(savedCartItem._id);

        // Calculate and update the total price of the cart
        cart.totalPrice += price;

        // Save the updated cart to the database
        const savedCart = await cart.save();
        console.log('===============================60')

        // Return success response
        res.status(200).json({ message: 'Product added to cart successfully', cart: savedCart });


    } catch (error) {
        console.log('Error while loading add to cart', error);
        return res.status(500)
            .set('Error-Message', 'Internal server error')
            .json({ error: 'Internal server error' });
    }
};

const listCartItems = async (req, res) => {
    try {
        console.log('in listCartItems function')
        const user_id = req.session.user_id
        console.log(user_id, '===========is user_id')

        const user = await User.find({  user_id})
        console.log(user, '===========is user')

        // const userCart = await Cart.findById({ user_id })

        // // console.log(userCart,'===========is userCart')

        // if (!userCart) {
        //     return res.status(404).json({ error: 'Cart not found' })
        // }

        // const cartItems = userCart.cartItems.map(cartItem => ({
        //     _id: cartItem._id,
        //     product: {
        //         _id: cartItem.product._id,
        //         name: cartItem.product.productName,
        //         price: cartItem.price,
        //         images: cartItem.product.images
        //     },
        //     quantity: cartItem.quantity
        // }));
        // console.log(cartItems, '===========is cartItems')
        res.status(200).json({ cartItems });
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


module.exports = {
    addToCart,
    listCartItems,
    removeCartItem
}