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
    } ,
    orderItems: [{
            type: Schema.Types.ObjectId,
            ref: 'OrderItem',
        }],
    discountAmount: {
        type: Number,
        default: 0
    },
    finalPrice: {
        type: Number,
    },
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
        required: true,

    }
})

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;