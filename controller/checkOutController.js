
const Address = require('../models/addressModel')
const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const { ObjectId } = require('mongodb')
const Order = require('../models/orderModel')
const OrderItem = require('../models/orderItemModel')
const { Product } = require('../models/categoryModel')
const User = require('../models/userAuthenticationModel')
const { isValidObjectId } = require('mongoose')


const loadcheckOut = async (req, res) => {
    try {
        const user_id = req.session.user_id;
        console.log(user_id, '========user_id ');
        const user = await User.findById(user_id);
        // Fetch existing address
        const existingAddress = await Address.find({});

        // Fetch cart details and populate cart items with products
        const cart = await Cart.findOne({ userId: ObjectId.createFromHexString(user_id) }).populate({
            path: 'cartItems',
            populate: {
                path: 'productId',
                model: 'Product'
            }
        });

        // If no cart found, return 404
        if (!cart) {
            console.log('No cart found for user:', user_id);
            res.status(404).send('No cart found for user');
            return;
        }

        // Calculate total weight in grams
        cart.cartItems.forEach(cartItem => {
            console.log('cartItem.weight', cartItem.weight)
            // If total weight exceeds 5000g, 
            if (cartItem.weight > 5000) {
                return res.render('viewCartItems', { error: 'Max allowed weight is 5kg/product, please reduce the weight to within limit. Cannot proceed with checkout.', cartData: cart });
            }
        });

        //to show user available quantity left.
        await Promise.all(cart.cartItems.map(async (element) => {
            try {
                console.log('ProductId: ', element.productId);
                let product = await Product.findById(element.productId);
                console.log('product.totalQuantity: ', product.totalQuantity, 'element.weight: ', element.weight)
                if ((product.totalQuantity) * 1000 < element.weight) {
                    return res.render('viewCartItems', { error: `${product.productName} has only ${product.totalQuantity}kg available in stock.`, cartData: cart });
                }
            } catch (error) {
                console.error('Error updating product quantity:', error);
            }
        }));

        // Render the checkout page with user details, existing address, and cart
        res.render('checkOutPge', { user_id, existingAddress, cart, user });

    } catch (error) {
        console.log('Error while loading checkout page.', error.message);
        res.status(500).send('Internal Server Error')
    }
}


module.exports = {
    loadcheckOut

}