const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: {
        type: String,
        require: true,
    },
    image: {
        type: String,
        require: true
    },

    description: {
        type: String
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    is_featured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema)

const productSchema = new Schema({
    productName: {
        type: String,
        require: true
    },
    description: {
        type: String
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category'
    },
    totalQuantity: {
        type: Number,
        required: true,
    
    },
    totalPrice: {
        type: Number,
        required: true,
       
    },
    offerPercentage: {
        type: Number,
        min: 0,
        max: 100
    },
    offerPrice: {
        type: Number,
        required: true,
       
    },
    weightOptions: [{
        weight: {
            type: Number,
            required: true
        },
        weightPrice: {
            type: Number,
            required: true,
           
        },
        priceAfterDiscount: {
            type: Number,
            required: true,
           
        }
    }],
    images: {
        type: Array,

    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    reviews: {
        type: Schema.Types.ObjectId,
        ref: 'Review'
    }
})

const Product = mongoose.model('Product', productSchema)

module.exports = {
    Category,
    Product
}