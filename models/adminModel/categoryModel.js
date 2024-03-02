const mongoose= require('mongoose')

const categorySchema= new mongoose.Schema({
    name:{
        type: String,
        require:true,
    },
    image: [{
        type: String
    }],
    
    description:{ 
       type: String
    },

   price:{
        type: Number,
        require: true
    },
    quantity:{
        type: Number,
        default: 0,
    },
    category:{
        type: String
    },
    is_product:{
        type: Boolean,
        default:false
    }
    ,
    is_deleted:{
        type: Boolean,
        default: false
    },
    ratings: [{ type: Number }]
},{timestamps: true});

module.exports= mongoose.model('Category',categorySchema)