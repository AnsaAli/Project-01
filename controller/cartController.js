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
            cartItem.weight += weight;
        } else {
            // If the product does not exist, create a new cart item
            cartItem = new CartItem({
                productId: productId,
                weight: weight,
                price: price,
                quantity: 1
            });
        }
        // console.log(cartItem, '===============================38')

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
        cart.totalPrice += Math.ceil(price* cartItem.quantity);
      

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

        const user = await User.find({ user_id })
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
        console.log('inside  removeCartItem')
        const cartItemId = req.params.id;
        console.log(cartItemId, 'is the cartItemId')

        //find the cart item from the db
        const removedCartItem = await CartItem.findById(cartItemId);
        if (!removedCartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        // Find the user's cart
        const userId = req.session.user_id;
        const cart = await Cart.findOne({ userId });

        // Remove the cart item ID from the cart's cartItems array
        cart.cartItems.pull(cartItemId);

        // Subtract the removed item's price from the total price
        cart.totalPrice -= removedCartItem.price;

        // Save the updated cart to the database
        await cart.save();

        // Remove the cart item from the database
        await CartItem.findByIdAndDelete(cartItemId);

        res.redirect('/viewCartItems')
    } catch (error) {
        console.log('Error while removing the items from the cart', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const viewCartItems = async (req, res) => {
    try {
        const userId = req.session.user_id;
        console.log(userId, 'userId')
        const cartData = await Cart.findOne({ userId }).populate({
            path: 'cartItems',
            populate: {
                path: 'productId',
                model: 'Product'
            }
        });
        if (!cartData) {
            return res.render('viewCartItems', { cartData: null });
        }
        console.log(cartData,'cartData')
        res.render('viewCartItems', { cartData })
    } catch (error) {
        console.log('Error while loading the view cart items')
    }
}
module.exports = {
    addToCart,
    listCartItems,
    removeCartItem,
    viewCartItems
}