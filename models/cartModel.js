const mongoose = require("mongoose");
const Schema = mongoose.Schema
const ObjectId= Schema.ObjectId;

const cartSchema = new mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: 'UserAuth', //ref to the user model
        required: true
    },
    cartItems: [{
        type: ObjectId,
        ref: 'CartItem' //ref to the cartItem model
    }],
    totalPrice: {
        type: Number,
        default: 0
    }
},{
    timestamps: true,
  })

  console.log('in cart')
module.exports = mongoose.model('Cart', cartSchema);