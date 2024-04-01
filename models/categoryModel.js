const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
       
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
        required: true,
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
    pricePer100g: {
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
        max: 80
    },
    offerPrice: {
        type: Number,
        
       
    },
    weightOptions: [{
        weight: {
            type: Number,
            
        },
        weightPrice: {
            type: Number,
           
           
        },
        priceAfterDiscount: {
            type: Number,
          
           
        }
    }],
    images:[{
        url: String, 
        public_id: String, 
    }],
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