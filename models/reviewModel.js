const mongoose= require('mongoose')
const Schema= mongoose.Schema

const reviewSchema= new Schema({
    product:{
        type:Schema.Types.ObjectId,
        ref:'Product',
        require:true
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:'UserAuth',
        require:true
    },
    rating:{
        type:Number,
        require:true
    },
    reviewTitle:{
        type:String,
        require:true
    },
    comment:{
        type:String,
        require:true
    }
})

module.exports= mongoose.model('Review',reviewSchema)