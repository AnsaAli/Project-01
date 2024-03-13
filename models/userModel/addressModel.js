const mongoose = require('mongoose')
const ObjectId= Schema.ObjectId;

const addressSchema= new mongoose.Schema({
    user_id:{
        type:ObjectId,
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
        type:Number,
        require:true
    },
    house_num:{
        type:Number,
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
    locality:{
        type:String,
        require:true
    },
    delete: {
        type: Boolean,
        required: true,
        default: false
    }

},{timestamps:true})

module.exports= mongoose.model('User_Address',addressSchema)