const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuth', //ref to the user model
        required: true
    },
    items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CartItem' //ref to the cartItem model
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Cart', cartSchema);