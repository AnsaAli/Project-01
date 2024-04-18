const mongoose = require('mongoose')
const Schema = mongoose.Schema

const orderItemSchema = new Schema({
   
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'UserAuth',
        require: true
    },
    product_id: {
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
        },
        price: {
            type: Number
        }
        
    }],
    totalPrice: {
        type: Number,
        required: true,
    }
})

const OrderItem = mongoose.model('OrderItem', orderItemSchema);

module.exports = OrderItem;