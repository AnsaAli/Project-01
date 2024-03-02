const mongoose=require('mongoose')

// Declare the Schema of the Mongo model
const userAuthenticationSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        //index:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        index:true,
    },
    password:{
        type:String,
        required:true,
    },
    is_admin:{
        type:Number,
        require:true,
    },
    is_blocked:{
        type:Number,
        default:0
    },
    is_verified:{
        type:Boolean,
        default:false
    },
    otp:{
        type:String,
    },
    otp_expiry:{
        type: Date
    },
    accept_terms: {
        type: Boolean,
        required: true,
        default: false,
    }
},{timestamps: true});

//Export the model
module.exports = mongoose.model('UserAuth',userAuthenticationSchema)

//UserAuth is name of the collection in db