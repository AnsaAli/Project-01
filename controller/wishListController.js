const { Product } = require('../models/categoryModel');
const Wishlist = require('../models/wishlistModel');
const User = require('../models/userAuthenticationModel');
const Cart = require('../models/cartModel');
const CartItem = require('../models/cartItemModel');



const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        console.log('userId: ', userId)
        const product = req.body;
        const productId = product.productId;
        console.log('productId: ', productId)

        const productData = await Product.findOne({ _id: productId })
        console.log('productData:', productData);
        if (!productData) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let wishlist = await Wishlist.findOne({ userId: userId });
        if (!wishlist) {
            console.log('============================22')
            wishlist = new Wishlist({
                userId: userId,
                products: productData._id
            });
            await wishlist.save();

        } else {
            console.log('============================31')

            wishlist.products.push(productData._id);
            await wishlist.save();
        }

        res.json({ status: true }); //send res

    } catch (error) {
        console.log('error while adding the product to wishlist', error)
    }
}

const viewWishList = async (req, res) => {
    try {
        const wishListData = await Wishlist.find({});
        console.log('wishListData: ', wishListData)

        // Iterate over each wishlist document and populate its products field
        for (const wishlist of wishListData) {
            await wishlist.populate('products')
        }

        res.render('viewWishList', { wishListData })
    } catch (error) {
        console.log('error while loading view wish list products, viewWishList', error)
    }
}

const addWishToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        // console.log('userId: ', userId)
        const { productId, productWeight, weightPrice, priceAfterDiscount, productName, priceAfterDiscount100g, totalQuantity } = req.body;
        // console.log('productId: ', productId);
        // console.log('productWeight: ', productWeight);
        // console.log('weightPrice: ', weightPrice);
        // console.log('priceAfterDiscount: ', priceAfterDiscount);
        // console.log('productName: ', productName);
        // console.log('priceAfterDiscount100g: ', priceAfterDiscount100g);
        // console.log('totalQuantity: ', totalQuantity);

        let priceper1g = (priceAfterDiscount100g / 100);
        console.group('priceper1g: ', priceper1g);

        let cart = await Cart.findOne({ userId: userId }).populate('cartItems');
        let cartItem = await CartItem.findOne({ productId: productId }).populate('productId');

        if (cartItem) {
            cartItem.userAddedWeight.push(productWeight);
            cartItem.quantity += 1;
            cartItem.weight += productWeight;
            cartItem.price = priceAfterDiscount;
            cartItem.subtotal = (priceper1g * cartItem.weight).toFixed(2);
            // console.log('  cartItem.subtotal, if cartItemcartItem is true  : ', cartItem.subtotal)
            await cartItem.save();
        } else {
            // If the product does not exist, create a new cart item
            let cartUser = await Cart.findOne({ userId: userId });
            cartItem = new CartItem({
                productId: productId,
                userId: userId,
                weight: productWeight,
                price: priceAfterDiscount,
                subtotal: priceAfterDiscount,
                quantity: 1
            });
            cartItem.userAddedWeight.push(productWeight);
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

        // Remove the product from the wishlist
        await Wishlist.findOneAndUpdate(
            { userId: userId },
            { $pull: { products: productId } }
        );
        res.status(200).json({ success: true, message: 'Product added to cart successfully' });

    } catch (error) {
        console.log('Error while adding wish to cart in addWishToCart', error)
    }
}

const removeWishItem = async (req, res) => {
    try {
        console.log('in removeWishItem')
        const wishListId = req.params.id;
        console.log('wishListId: ', wishListId)

        const productIdToRemove = req.query.productId;
        console.log('productIdToRemove: ', productIdToRemove)

        const updatedWishlist = await Wishlist.findByIdAndUpdate(
            wishListId,
            { $pull: { products: productIdToRemove } },
            { new: true }
        );

        if (!updatedWishlist) {
            return res.status(404).json({ error: 'Wishlist item not found' });
        }

        res.redirect('/wishlistProducts');
    } catch (error) {

    }
}

/////////////////////////////////////////////////////////////////////////////

module.exports = {
    addToWishlist,
    viewWishList,
    addWishToCart,
    removeWishItem
}