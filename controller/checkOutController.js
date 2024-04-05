
const Address= require('../models/addressModel')
const Cart= require('../models/cartModel')
const CartItem = require('../models/cartItemModel')
const {ObjectId}= require('mongodb')
const Order=require('../models/orderModel')
const {Product}= require('../models/categoryModel')
const User= require('../models/userAuthenticationModel')
const { isValidObjectId } = require('mongoose')

const loadcheckOut= async(req,res)=>{
    try {
        const user_id = req.session.user_id
        console.log(user_id ,'========user_id ')
        // const user_id = req.session.user_id;
        // const user_id_ObjectId = mongoose.Types.ObjectId(user_id)
        console.log(isValidObjectId(user_id) ,'is the valid')
        // mongodb.createFromHexString(user_id)
        // _id: ObjectId.createFromHexString(user_id)
        const existingAddress= await Address.find({})
        console.log(existingAddress,'is the existingAddress')

        const cart = await Cart.findOne({ userId: ObjectId.createFromHexString(user_id) }).populate({
            path: 'cartItems',
            populate: {
                path: 'productId',
                model: 'Product'
            }
        })
        //console.log(typeof cart, 'is the type of cart')
        // console.log(Array.isArray(cart), 'checking if the cart is array or not')
        //  console.log(cart.cartItems[0].productId,'is the items in the cart')
        
        if (!cart) {
           
            console.log('No cart found for user:', user_id);
            res.status(404).send('No cart found for user');
            return;
        }
         res.render('checkOutPge',{user_id,existingAddress,cart})
      
     
        
    } catch (error) {
        console.log('Error while loading checkout page.',error.message);
        res.status(500).send('Internal Server Error')
    }
}

module.exports={
    loadcheckOut
  
}