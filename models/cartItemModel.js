const mongoose = require('mongoose');


const cartItemSchema = new mongoose.Schema({
    cart_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart', // Ref to the cart model
        required: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // Ref to the Product model
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        default: 1, // Default quantity is 1
    },
    price: {
        type: Number,
        required: true,
    }
});

// Pre-save to update the price based on the product
cartItemSchema.pre('save', async function(next) {
    try {
        const product = await mongoose.model('Product').findById(this.product);
        if (!product) {
            throw new Error('Associated product not found');
        }
        this.price = product.offer_price; // Update price with the offer price of the product
        next();
    } catch (error) {
        next(error);
    }
});


module.exports = mongoose.model('CartItem', cartItemSchema);