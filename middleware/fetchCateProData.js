const { Category, Product } = require('../models/categoryModel')

const fetchDataMiddleware = async (req, res, next) => {
    try {
        const categories = await Category.find({})
        const products = await Product.find().populate('category');

        //setting the categorie and product 
        res.locals.categories = categories;
        res.locals.products = products;

        // Check if user is logged in
        if (req.session.user_id) {
            // Add user ID and name to locals
            res.locals.user_id = req.session.user_id;
            res.locals.user_name = req.session.user_name;
        } else {
            // If user is not logged in, set user_id to null
            res.locals.user_id = null;
            res.locals.user_name = null;
        }

        next()
    } catch (error) {
        console.log('Error while fetching the categories and product in the featchCateProData middleware', error)
        res.locals.categories = [];
        res.locals.products = [];
        next();

    }
}

module.exports=fetchDataMiddleware;