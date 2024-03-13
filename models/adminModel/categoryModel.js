const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema= new Schema({
    name:{
        type: String,
        require:true,
    },
    image: {
        type: String,
        require: true
    },
    
    description:{ 
       type: String
    },
    is_deleted:{
        type: Boolean,
        default: false
    },
    is_featured:{
        type:Boolean,
        default:false
    }
},{timestamps: true});

const Category= mongoose.model('Category',categorySchema)

const productSchema= new Schema({
    name:{
        type: String,
        require:true
    },
    description:{
        type:String
    },
    total_price:{
        type:Number,
        required:true
    },
    onOffer: {
        type: Boolean,
        default: false
    },
    offer_price:{
        type:Number,
        required:true
    },
    category:{
        type: Schema.Types.ObjectId,
        ref:'Category'
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    images: {
        type: Object,
        default: {} 
    },
    is_deleted:{
        type: Boolean,
        default: false
    }
})

const Product= mongoose.model('Product',productSchema)

module.exports={
    Category,
    Product}