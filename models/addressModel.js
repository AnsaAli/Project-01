const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId= Schema.ObjectId;

const addressSchema= new Schema({
    user_id:{
        type:ObjectId,
        ref:'UserAuth',
        require:true
    },
    address_customer_name:{
        type:String,
        require:true
    },
    address_type:{
        type: String,
        required:true
    },
    mobile_num:{
        type:String,
        require:true
    },
    pincode:{
        type:String,
        require:true
    },
    house_num:{
        type:String,
        require:true
    },
    apartment_name:{
        type:String,
    
    },
    city:{
        type:String,
        require:true
    },
    landmark:{
        type:String,
        require:true
    },
    district:{
        type:String,
        require:true
    },
    is_deleted: {
        type: Boolean,
        required: true,
        default: false
    }

},{timestamps:true})

console.log('Address')
module.exports= mongoose.model('UserAddress',addressSchema)