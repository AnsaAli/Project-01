const mongoose = require('mongoose');
const Schema = mongoose.Schema
const ObjectId= Schema.ObjectId;



const cartItemSchema = new mongoose.Schema({

    productId: {
        type: ObjectId,
        ref: 'Product', // Ref to the Product model
        required: true,
    },
    userAddedWeight: {
        type: Array,
        required: true,
    },
    weight: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        default: 1
    }

}, {
    timestamps: true,
});


module.exports = mongoose.model('CartItem', cartItemSchema);