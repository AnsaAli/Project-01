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
        console.log(userId, 'is the userId addToCart');

        console.log('Product ID:', productId);
        console.log('Weight:', weight);
        console.log('Price:', price);
        console.log('Product Name:', productName);

        let cart = await Cart.findOne({ userId: userId }).populate('cartItems');

        // Check if the product already exists in the cart
        let cartItem = await CartItem.findOne({ productId: productId });

        if (cartItem) {
            // If the product exists, update its quantity
            cartItem.quantity += 1;
            cartItem.weight += weight;
            console.log(' cartItem.quantity: ', cartItem.quantity, '&  cartItem.weight :', cartItem.weight)
            await cartItem.save();
        } else {
            // If the product does not exist, create a new cart item
            let cartUser = await Cart.findOne({ userId: userId });
            cartItem = new CartItem({
                productId: productId,
                weight: weight,
                price: price,
                quantity: 1
            });

            if(!cartUser){
                cart = new Cart({
                    userId: userId,
                    cartItems: cartItem,
                    totalPrice: cartItem.price
                })
                console.log(cart,'=================after new cart========45')
            } else {
                console.log(cart,'=================before push=======1')
                cart.cartItems.push(cartItem._id);
            }
            
            await cartItem.save();
           
            console.log(cart,'=================after push========2')
            const savedCart = await cart.save();
            console.log(cart,'=================after savedCart========3')
        }

        res.status(200).json({ message: 'Product added to cart successfully' });


    } catch (error) {
        console.log('Error while loading add to cart', error);
        return res.status(500)
            .set('Error-Message', 'Internal server error')
            .json({ error: 'Internal server error' });
    }
};

// const listCartItems = async (req, res) => {
//     try {
//         console.log('in listCartItems function')
//         const user_id = req.session.user_id
//         console.log(user_id, '===========is user_id listCartItems')

//         const user = await User.find({ user_id })
//         console.log(user, '===========is user listCartItems')


//         res.status(200).json({ cartItems });
//     } catch (error) {
//         console.log('Error while listing the cart items', error)
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }

const removeCartItem = async (req, res) => {
    try {
        console.log('inside  removeCartItem')
        const cartItemId = req.params.id;
        console.log(cartItemId, 'is the cartItemId removeCartItem')

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
        console.log(cartData, 'cartData viewCartItems')
        res.render('viewCartItems', { cartData })
    } catch (error) {
        console.log('Error while loading the view cart items')
    }
}
module.exports = {
    addToCart,
    // listCartItems,
    removeCartItem,
    viewCartItems
}