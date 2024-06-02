const User = require('../models/userAuthenticationModel')
const { Category, Product } = require('../models/categoryModel')
const Review = require('../models/reviewModel')
const session= require('express-session')


const loadHome = async (req, res) => {
    try {
        console.log('req.session.user_id ================loadHome', req.session.user_id );
        const user_id = req.session.user_id;
        let user_name = '';
        let loggedIn = false;

        if (user_id) {
            const user = await User.findById(user_id);
            if (user) {
                user_name = user.name;
                loggedIn = true;
            }
        }

       
        let products = await Product.find().lean().populate('category');

        // Organize products by category
        const categorizedProducts = {};
        products.forEach(product => {
            const categoryName = product.category.name;
            if (!categorizedProducts[categoryName]) {
                categorizedProducts[categoryName] = [];
            }
            categorizedProducts[categoryName].push(product);
        });

        res.render('home', {
            user_id: user_id,
            user_name: user_name,
            products: products,
            categorizedProducts: categorizedProducts,
            loggedIn: loggedIn,
        });
        
    } catch (error) {
        console.log("Error occurred while loading the home page");
        res.status(500).send('Internal Server Error');
    }
}

const loadAllProducts = async (req, res) => {
    try {
      console.log('req.session.user_id ================loadAllProducts', req.session.user_id);
  
      const user_id = req.session.user_id;
      let user_name = '';
      let loggedIn = false;
      const categoryId = req.query.category;
      const sortby = req.query.sortby;
      const searchQuery = req.query.searchQuery;
      const page = parseInt(req.query.page) || 1;
  
      if (user_id) {
        const user = await User.findById(user_id);
        if (user) {
          user_name = user.name;
          loggedIn = true;
        }
      }
  
      // Pagination
      const perPage = 6; // number of products per page
      const skip = (page - 1) * perPage;
  
      let myQuery = Product.find({});
  
      // Apply category filter
      if (categoryId) {
        myQuery = myQuery.where('category').equals(categoryId);
      }
  
      // Apply search filter
      if (searchQuery && searchQuery.trim() !== '') {
        myQuery = myQuery.where('productName').regex(new RegExp(searchQuery, 'i'));
      }
  
      // Apply sorting
      if (sortby === 'lowerPrice') {
        myQuery = myQuery.where('totalQuantity').gt(0).sort({ 'weightOptions.priceAfterDiscount': 1 });
      } else if (sortby === 'higherPrice') {
        myQuery = myQuery.where('totalQuantity').gt(0).sort({ 'weightOptions.priceAfterDiscount': -1 });
      } else if (sortby === 'onOffer') {
        myQuery = myQuery.where({ $and: [{ 'offerPercentage': { $gt: 0 } }, { 'totalQuantity': { $gt: 0 } }] });
      }
  
      myQuery = myQuery.lean().populate('category').skip(skip).limit(perPage);
  
      const products = await myQuery.exec();
  
      // Count total products for pagination
      const totalProducts = await Product.countDocuments(myQuery.getQuery());
      const totalPages = Math.ceil(totalProducts / perPage);
  
      res.render('allProducts', {
        user_id: user_id,
        user_name: user_name,
        products: products,
        loggedIn: loggedIn,
        searchQuery: searchQuery,
        currentPage: page,
        perPage: perPage,
        totalPages: totalPages,
      });
    } catch (error) {
      console.log("Error occurred while loading loadAllProducts", error);
      res.status(500).send('Internal Server Error');
    }
  }
  

const loadViewProduct = async (req, res) => {
    try {
        console.log('in loadViewProduct=======')
        const user_id = req.session.user_id;
        let user_name = '';
        let loggedIn = false;
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

        res.render('viewProduct', {
            user_id: user_id,
            user_name: user_name,
            productData: productData,
            products: products,
            loggedIn: loggedIn,
        });

    } catch (error) {
        console.log('Error while loding the view product page')
        res.status(500).send('Internal Server Error');
    }
}


module.exports = {
    loadViewProduct,
    loadHome,
    loadAllProducts
}