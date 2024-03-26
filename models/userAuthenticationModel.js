    const mongoose=require('mongoose')
    const Schema = mongoose.Schema
  

    // Declare the Schema of the Mongo model
    const userAuthenticationSchema = new Schema({
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
            default:false
        },
        is_verified:{
            type:Boolean,
            default:false
        },
        is_deleted:{
            type: Boolean,
            default: false
        },
        otp:{
            type:String,
        },
        otp_expiry:{
            type: Date
        }, 
        user_image: {
            type: String 
        },
         user_mobile:{
            type: String,
           
        },
        is_blocked:{
            type:Boolean,
            default:false

        },
        address: [{
            type:Schema.Types.ObjectId,
            ref:'UserAddress'
        }],
        cart:{
            type: Schema.Types.ObjectId,
            ref:'Cart'
        },
        orders:{
            type:Schema.Types.ObjectId,
            ref:'Order'
        }
    },{timestamps: true});

   
    module.exports = mongoose.model('UserAuth',userAuthenticationSchema)