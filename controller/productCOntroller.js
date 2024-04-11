const User= require('../models/userAuthenticationModel')
const {Category,Product}= require('../models/categoryModel')
const Review= require('../models/reviewModel')


const loadHome = async (req, res) => {
    try {
        const user_id = req.session.user_id;
        let user_name = '';
      
        if (user_id) {
            const user = await User.findById(user_id);
            if (user) {
                user_name = user.name;
                loggedIn = true;
            }
        }

        let products = await Product.find().lean().populate('category');

        res.render('home', {
            user_id: user_id,
            user_name: user_name,
            products: products,
            loggedIn: loggedIn,
        });
    } catch (error) {
        console.log("Error occurred while loading the home page");
        res.status(500).send('Internal Server Error');
    }
}

const loadAllProducts= async (req, res) => {
    try {
        const user_id = req.session.user_id;
        let user_name = '';
      
        if (user_id) {
            const user = await User.findById(user_id);
            if (user) {
                user_name = user.name;
                loggedIn = true;
            }
        }

        let myQuery =  Product.find({}).lean().populate('category');

        const searchQuery= req.query.searchQuery;
        console.log('searchQuerys: ',searchQuery)
        if (searchQuery && searchQuery.trim() !== '') {
           
            myQuery.where('productName').regex(new RegExp(searchQuery, 'i'));
        }

        let products = await myQuery;

        res.render('allProducts', {
            user_id: user_id,
            user_name: user_name,
            products: products,
            loggedIn: loggedIn,
            searchQuery:searchQuery
        });
    } catch (error) {
        console.log("Error occurred while loading loadAllProducts", error);
        res.status(500).send('Internal Server Error');
    }
}

const loadViewProduct= async(req,res)=>{
    try {
        const user_id = req.session.user_id;
        let user_name = '';
      
        if (user_id) {
            const user = await User.findById(user_id);
            if (user) {
                user_name = user.name;
                loggedIn = true;
            }
        }

        const productId = req.query.productId;
        console.log(productId, 'is the pdt')

        let products = await Product.find()
        const productData = await Product.findById(productId).lean().populate('category');

        // // console.log(product.image, 'is the image')
        if (!products) {
            return res.status(404).send('Product not found');
        }

        res.render('viewProduct',{
            user_id: user_id,
            user_name: user_name,
            productData: productData,
            products:products,
            loggedIn: loggedIn,
        });

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
    rating,
    loadAllProducts
}