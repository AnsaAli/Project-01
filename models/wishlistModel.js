const mongoose = require("mongoose");
const Schema = mongoose.Schema
const ObjectId= Schema.ObjectId;


const wishListSchema = new mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: 'UserAuth', 
        required: true
    },
    products: [{
        type: ObjectId,
        ref: 'Product' 
    }]
},{
    timestamps: true,
  })

module.exports = mongoose.model('Wishlist', wishListSchema);