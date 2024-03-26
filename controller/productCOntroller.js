const User= require('../models/userAuthenticationModel')
const {Category,Product}= require('../models/categoryModel')
const Review= require('../models/reviewModel')


const loadHome=async(req,res)=>{
    try {
       
        const user_id= req.session.user_id;
        let user_name='';
        let loggedIn= false;

        if(user_id){
            const user= await User.findById(user_id);
            if(user){
                user_name=user.name;
                loggedIn = true;
            }
        }
        let products= await Product.find().lean().populate('category')

        // Sorting logic based on query parameter
        const sortParam = req.query.sort;
        if (sortParam === 'low_to_high') {
            products= products.sort((a, b) => a.total_price - b.total_price);
        } else if (sortParam === 'high_to_low') {
            products= products.sort((a, b) => b.total_price - a.total_price);
        }

        //  prices and offer prices for 250g quantity only
        products.forEach(product => {
            product.prices = {
                '250g': product.total_price * (250 / product.quantity)
            };

            product.offerPrices = {
                '250g': product.offer_price * (250 / product.quantity)
            };
        });


         
        res.render('home',{
            user_id: user_id,
            user_name :  user_name,
            products : products,
            loggedIn: loggedIn,
           
        });
    } catch (error) {
        console.log("Error occured while loading the home page")
        res.status(500).send('Internal Server Error')
    }
}

const loadViewProduct= async(req,res)=>{
    try {
        const product_id = req.params.id;
        //console.log(product_id, 'is the pdt')
        const product = await Product.findById(product_id).lean().populate('category');
        // console.log(product.image, 'is the image')
        if (!product) {
            return res.status(404).send('Product not found');
        }


        // Calculate prices and offer prices for 250g quantity only
        products.forEach(product => {
            product.prices = {
                '250g': product.total_price * (250 / product.quantity)
            };

            product.offerPrices = {
                '250g': product.offer_price * (250 / product.quantity)
            };
        });


        res.render('viewProduct',{product});

    } catch (error) {
        console.log('Error while loding the view product page')
        res.status(500).send('Internal Server Error');
    }
}

const rating= async(req,res)=>{
    try {
        const productId = req.params.id;
    } catch (error) {
        console.log('Error while rating', error.message)
    }
}


module.exports={
    loadViewProduct,
    loadHome,
    rating
}