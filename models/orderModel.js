const mongoose = require('mongoose')
const Schema = mongoose.Schema

const orderSchema = new Schema({
    order_id: {
        type: String,
        unique: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'UserAuth',
        require: true
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        require: true
    },
    orderedWeight: [{
        name: {
            type: String,
        },
        weight: {
            type: Number
        }
    }],
    cartItems:{
        type: Schema.Types.ObjectId,
        ref: 'CartItem',
    }
    ,
    totalPrice: {
        type: Number,
        require: true
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    stockLeft: {
        type: Number,
      
    }
    ,
    shippingAddress: {
        type: Schema.Types.ObjectId,
        ref: 'UserAddress',
        require: true
    },
    paymentMethod: {
        type: String,
        require: true

    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    paymentStatus: {
        type: String,
        require: true

    },
    orderStatus: {
        type: String,
        enum: ['clientSideProcessing', 'shipmentProcessing', 'shipped', 'delivered', 'cancelled'],
        default: 'clientSideProcessing',
        required: true,

    }
})

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;