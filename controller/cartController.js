const mongoose = require('mongoose')
const User = require('../models/userAuthenticationModel')
const { Product } = require('../models/categoryModel')
const Cart = require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const Order = require('../models/orderModel')

const addToCart = async (req, res) => {
    try {
        const { productId, weight, price, priceAfterDiscount, productName, pricePer100g, totalQuantity } = req.body;
        const userId = req.session.user_id;
        // console.log(userId, 'is the userId addToCart');
        // console.log('productId=========:', productId);
        // console.log('Weight:', weight); //250
        // console.log('price:', price);//32.5
        // console.log('productName:', productName);
        console.log('priceAfterDiscount:', priceAfterDiscount);
        // console.log('pricePer100g:', pricePer100g); // 100g=12.61 => 1g=12.61/100
        // console.log('type of pricePer100g:', typeof(pricePer100g));
        // console.log('totalQuantity:', totalQuantity);

        let priceper1g = (pricePer100g / 100);
        //  console.log('priceper1g:',priceper1g);
        let cart = await Cart.findOne({ userId: userId }).populate('cartItems');
        // Check if the product already exists in the cart
        let cartItem = await CartItem.findOne({ productId: productId }).populate('productId');


        if (cartItem) {
            cartItem.userAddedWeight.push(weight);
            cartItem.quantity += 1;
            cartItem.weight += weight;
            cartItem.price = priceAfterDiscount;
            cartItem.subtotal = (priceper1g * cartItem.weight).toFixed(2);
            // console.log('  cartItem.subtotal, if cartItemcartItem is true  : ', cartItem.subtotal)
            await cartItem.save();
        } else {
            // If the product does not exist, create a new cart item
            let cartUser = await Cart.findOne({ userId: userId });
            cartItem = new CartItem({
                productId: productId,
                userId:userId,
                weight: weight,
                price: priceAfterDiscount,
                subtotal: priceAfterDiscount,
                quantity: 1
            });
            cartItem.userAddedWeight.push(weight);
            // cartItem.subtotal = price;//13
            // console.log('  cartItem.subtotal, if cartItem is false  : ', cartItem.subtotal)

            if (!cartUser) {
                cart = new Cart({
                    userId: userId,
                    cartItems: [cartItem._id]
                })
            } else {
                cart.cartItems.push(cartItem._id);
            };

            await cartItem.save();
            await cart.save();
        }

        // Calculate total price
        const updatedCart = await Cart.findById(cart._id).populate('cartItems');
        let totalPrice = 0;
        updatedCart.cartItems.forEach(item => {
            totalPrice += item.subtotal
            console.log('totalPrice of item: ', totalPrice);
        });

        updatedCart.totalPrice = totalPrice.toFixed();
        console.log('updatedCart:=========78', updatedCart)
        await updatedCart.save();

        res.status(200).json({ message: 'Product added to cart successfully' });


    } catch (error) {
        console.log('Error while loading add to cart', error);
        return res.status(500)
            .set('Error-Message', 'Internal server error')
            .json({ error: 'Internal server error' });
    }
};

const updateQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user_id;
        const product_id = productId.trim();
        // console.log('productId:', productId)
        let productData = await Product.findById(product_id)
        let priceper1g = (productData.weightOptions[0].priceAfterDiscount/100);

        let cart = await Cart.findOne({ userId: userId }).populate('cartItems');
        let cartItem = await CartItem.findOne({ productId: product_id }).populate('productId');
        //let priceper1g = (cartItem.price/cartItem.weight)*(cartItem.quantity); 
        console.log('cartItem.price: ',cartItem.price)
        console.log('cartItem.weight: ',cartItem.weight)
        console.log('priceper1g: ',priceper1g)

        if (!cartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        let length = cartItem.userAddedWeight.length;
       
        if (action === 'increment') {
            // Check if there's enough quantity
        if ((cartItem.productId.totalQuantity) * 1000 <= cartItem.weight) {
            console.log('cartItem.productId.totalQuantity: ',cartItem.productId.totalQuantity)
            console.log('cartItem.weight: ',cartItem.weight);
            return res.status(404).json({
                error: `${cartItem.productId.productName} has only ${cartItem.productId.totalQuantity}kg available in stock.`,
                cartItem
            });
        }
            //user can't add more than 5kg
            if(cartItem.weight >= 5000){
                return res.status(404).json({ error: "Max allowed weight is 5kg/product, please reduce the weight to within limit. Cannot proceed with checkout." });
            }
          
            if (cartItem) {
                cartItem.quantity += 1;
                console.log('increment  cartItem.quantity: ',  cartItem.quantity)
                cartItem.weight += cartItem.userAddedWeight[cartItem.userAddedWeight.length - 1];
                console.log('increment cartItem.weight: ',  cartItem.weight)
                cartItem.userAddedWeight.push(cartItem.userAddedWeight[length - 1]); //user added weight need to push
                cartItem.subtotal = ((priceper1g * cartItem.weight)).toFixed(2);
                console.log('increment cartItem.subtotal: ',    cartItem.subtotal)

            }
        } else if (action === 'decrement') {
            if (cartItem.quantity > 1) {
                cartItem.quantity -= 1;
                console.log('  cartItem.quantity: decrement ',  cartItem.quantity)
                cartItem.weight -= cartItem.userAddedWeight[length - 1];
                console.log('decrement cartItem.weight: ',  cartItem.weight)
                cartItem.subtotal = (priceper1g * cartItem.weight).toFixed(2);
                console.log('decrement cartItem.subtotal: ',    cartItem.subtotal)
                cartItem.userAddedWeight.pop();
                // console.log(' cartItem.weight: decrement', cartItem.weight);
            }
        }
        // Save the updated cart to the database
        await cartItem.save();
        // Calculate subtotal
        //const subtotal = cartItem.weight/100 * cartItem.price;

        // Update the corresponding cart item in the cart
        cart.cartItems.forEach(item => {
            if (item._id.toString() === cartItem._id.toString()) {
                item.quantity = cartItem.quantity;
                item.weight = cartItem.weight;

            }
        });

        await cart.save();
        // console.log('=========== cartItem.quantity:', cartItem.quantity, 'cartItem.weight:', cartItem.weight)

        // Calculate total price
        const updatedCart = await Cart.findById(cart._id).populate('cartItems');
        let totalPrice = 0;
        updatedCart.cartItems.forEach(item => {
            console.log('item.subtotal: ', item.subtotal);
            totalPrice += item.subtotal
            console.log('totalPrice of item: ', totalPrice);
        });

        updatedCart.totalPrice = totalPrice.toFixed(2);
         console.log('updatedCart.totalPrice:==================158', updatedCart.totalPrice)
        await updatedCart.save();
        // console.log('updatedCart.totalPrice:', updatedCart.totalPrice)
        res.status(200).json({ message: 'Quantity updated successfully', quantity: cartItem.quantity, weight: cartItem.weight, subtotal: cartItem.subtotal, totalPrice: updatedCart.totalPrice });
    } catch (error) {
        console.log('Error while updating quantity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const cartItemId = req.params.id;
        const userId = req.session.user_id;
       
        const cart = await Cart.findOne({ userId }).populate('cartItems');
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        // Find the cart item to be removed
        const cartItemToRemove = cart.cartItems.find(item => item._id.toString() === cartItemId);
        if (!cartItemToRemove) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        
        // subtract  price from the total price
        cart.totalPrice = (cart.totalPrice- cartItemToRemove.subtotal).toFixed(2);

        // Remove cart item from cart's cartItems
        cart.cartItems.pull(cartItemId);

        await cart.save();

        // Remove the cart item from the database
        await CartItem.findByIdAndDelete(cartItemId);

        // If cart is empty, delete the cart
        if (cart.cartItems.length === 0) {
            await Cart.deleteOne({ userId });
        }

        res.redirect('/viewCartItems');
    } catch (error) {
        console.log('Error while removing the items from the cart', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const viewCartItems = async (req, res) => {
    try {
        const userId = req.session.user_id;
        // console.log(userId, 'userId')
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
        // console.log(cartData, 'cartData viewCartItems')
        res.render('viewCartItems', { cartData })
    } catch (error) {
        console.log('Error while loading the view cart items')
    }
}

module.exports = {
    addToCart,
    // listCartItems,
    removeCartItem,
    viewCartItems,
    updateQuantity
}