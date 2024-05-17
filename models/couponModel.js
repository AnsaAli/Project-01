const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    discountType: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed'], 
        default: 'fixed' 
    },
    discountAmount: {
        type: Number,
        required: true
    },
    minCartAmount: {
        type: Number,
        required: true
    },
    maxDiscountAmount: {
        type: Number
    },
    user: {
        type: Array,
        ref: "UserAuth",
        default: []
    },
    maxUsers: {
        type: Number
    },
    status: {
        type: Boolean,
        default: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    }
});

const couponModel = mongoose.model("Coupon", couponSchema);
module.exports = couponModel;
