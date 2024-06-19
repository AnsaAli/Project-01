const { ObjectId } = require('mongodb');
const couponModel = require('../models/couponModel');
const shortid = require('shortid');
const uniqueId = shortid.generate();
const UserAddress = require('../models/addressModel');
const adminModel = require('../models/userAuthenticationModel');
const { Category, Product } = require('../models/categoryModel');
const bcrypt = require("bcrypt");
const sharp = require('sharp');
const Order = require('../models/orderModel');
const OrderItems = require('../models/orderItemModel');
const User = require('../models/userAuthenticationModel');
const cloudinary = require('cloudinary').v2;


cloudinary.config({
    cloud_name: 'dn6d0gspr',
    api_key: '841139655134895',
    api_secret: '_gG35Qz2WyuPdPh53Iges-oDSBQ'
});


function validateProductName(productName, existingNames) {
    const regexPattern = /^[a-zA-Z\s]+$/;
    const trimmedName = productName.trim().toLowerCase();

    // Check if the name meets the length requirement
    if (trimmedName.length < 3 || trimmedName.length > 50) {
        return false;
    }

    // Check if the name already exists (case-insensitive check)
    if (existingNames.some(name => name.toLowerCase() === trimmedName) && trimmedName !== "") {
        return false;
    }

    // Check if the name matches the regex pattern
    return regexPattern.test(productName);
}

function validateProductNameAlone(productName) {
    const regexPattern = /^[a-zA-Z\s]+$/;


    // Check if the name meets the length requirement
    if (trimmedName.length < 3 || trimmedName.length > 50) {
        return false;
    }

    // Check if the name matches the regex pattern
    return regexPattern.test(productName);
}


//////////////////////admin login logout\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadAdminLogin = async (req, res) => {
    try {
        res.render('adminLogin')
    } catch (error) {
        console.log('Error occurred while loading admin login page. ', error.message)
    }
}

const verifyAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        //console.log(req.body.password,'is the password') 
        //console.log(req.body.email,'is the email') 
        const userData = await adminModel.findOne({ email })

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password)
            if (passwordMatch) {
                if (userData.is_admin === 1) {
                    //console.log('inside the password login')
                    req.session.user_id = userData._id
                    res.redirect('/admin/dashboard')
                } else {
                    console.log('inside the no access')
                    res.render('adminLogin', { errorMessage: 'No access!' })
                }
            }
        } else {
            console.log('Password/email is incorrect')
            res.render('adminLogin', { errorMessage: 'Password/email is incorrect' })
        }

    } catch (error) {
        console.log('Error occurred while verifying the admin', error)
    }
}

const adminLogout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
        res.render('dashboard')
    }

}

////////////////////////////admin pages\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadDashboard = async (req, res) => {
    try {
        console.log('inside load dashboard page===========================??????????')
        const userData = await adminModel.findById({ _id: req.session.user_id });
        const total = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ["cancelled", "Return Approved"] } // Exclude "cancelled" and "returned" statuses
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$finalPrice" } // Sum the finalPrice field
                }
            }
        ]);
        console.log('total: ', total);

        const user_count = await User.find({ is_admin: 0 }).count();
        const order_count = await Order.find({}).count();
        const product_count = await Product.find({}).count();
        const category_count = await Category.find({}).count();
        const return_count = await Order.find({ orderStatus: 'Return Approved' }).count();
        console.log('return_count: ', return_count);

        const payment = await Order.aggregate([
            {
                $group: {
                    _id: "$paymentMethod",
                    totalPayment: { $count: {} }
                }
            }
        ]);

        console.log('payment: ', payment);

        const year = new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const startOfMonth = new Date(year, new Date().getMonth(), 1);

        let salesByYear = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: startOfYear },
                    orderStatus: { $nin: ["cancelled", "Return Approved"] }
                }
            },
            {
                $group: {
                    _id: { $month: "$orderDate" },
                    total: { $sum: "$finalPrice" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('salesByYear: ', salesByYear);

        // Initialize an empty array to store the sales data for each month
        let sales = [];
        for (let i = 1; i <= 12; i++) {
            let found = false;
            for (let k = 0; k < salesByYear.length; k++) {
                if (parseInt(salesByYear[k]._id) === i) {
                    sales.push(salesByYear[k]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                sales.push({ _id: i.toString().padStart(2, '0'), total: 0 });
            }
        }

        let salesData = sales.map(sale => sale.total);
        console.log('salesData: ', salesData);

        let salesByDay = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: startOfMonth },
                    orderStatus: { $nin: ["cancelled", "Return Approved"] }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$orderDate" },
                    total: { $sum: "$finalPrice" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('salesByDay: ', salesByDay);

        // Initialize an empty array to store the sales data for each day of the current month
        let dailySales = [];
        let daysInMonth = new Date(year, new Date().getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            let found = false;
            for (let k = 0; k < salesByDay.length; k++) {
                if (parseInt(salesByDay[k]._id) === i) {
                    dailySales.push(salesByDay[k]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                dailySales.push({ _id: i.toString().padStart(2, '0'), total: 0 });
            }
        }

        let dailySalesData = dailySales.map(sale => sale.total);

        //top selling products
        const topProducts = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: "$orderItemDetails" },
            { $unwind: "$orderItemDetails.orderedWeight" },
            {
                $group: {
                    _id: "$orderItemDetails.product_id",
                    count: { $sum: "$orderItemDetails.orderedWeight.weight" }
                }
            },
            { $sort: { count: -1 } },

            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: "$categoryDetails" }
        ]);

        //top selling categories
        const topCategories = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: "$orderItemDetails" },
            { $unwind: "$orderItemDetails.orderedWeight" }, // Unwind the orderedWeight array
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItemDetails.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: "$category" },
            {
                $group: {
                    _id: '$category._id',
                    name: { $first: '$category.name' },
                    totalQuantityOrdered: { $sum: "$orderItemDetails.orderedWeight.weight" } // Sum weights
                }
            },
            { $sort: { totalQuantityOrdered: -1 } },

        ]);

        res.render('dashboard', {
            admin: userData,
            total,
            user_count,
            order_count,
            product_count,
            return_count,
            category_count,
            payment,
            month: salesData,
            daily: dailySalesData,
            topProducts,
            topCategories
        });

    } catch (error) {
        console.log('inside load dashboard error page', error.message);
    }
}


const loadUserProfile = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;  // Current page number
        const limit = 3;  // Number of items per page

        // Total count of users
        const count = await User.countDocuments();
        const coupons = await User.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: 1 });  // Sort by descending createdAt

        const userData = await User.find({ is_admin: 0 }).populate('address')

        if (userData.length > 0) {

            res.render('customerProfile',
                {
                    userData,
                    coupons: coupons,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit)
                });
        } else {

            res.render('customerProfile', { message: 'No users found' });
        }
    } catch (error) {

        console.log('error while loading loadUserProfile', error)
    }
}

const userBlockUnblock = async (req, res) => {
    try {
        const user_id = req.params.id;
        const user = await adminModel.findById(user_id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        //   user.is_blocked = user.is_blocked === 1 ? 0 : 1; 
        //console.log('blocked or unblocked?',user.is_blocked  )
        user.is_blocked = !user.is_blocked;
        await user.save();
        res.redirect('/admin/customerProfile');
        //   res.json({ logout: true });
    } catch (err) {
        console.error('Error toggling block status:', err);
        res.status(500).send('Internal Server Error');
    }
};

////////////////////////////categories\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadCategory = async (req, res) => {
    try {
        let myQuery = Category.find({ is_deleted: false })
        const searchQuery = req.query.searchQuery;
        if (searchQuery && searchQuery.trim() !== '') {

            myQuery.where('name').regex(new RegExp(searchQuery, 'i'));
        }
        const categories = await myQuery

        res.render('category', { categories, searchQuery: searchQuery });
    } catch (error) {
        console.log('Error wile loading category', error.message)
    }
}

const getTopCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 3;
        const skip = (page - 1) * pageSize;

        // Total count of categories
        const totalCountQuery = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: "$orderItemDetails" },
            { $unwind: "$orderItemDetails.orderedWeight" }, // Unwind the orderedWeight array
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItemDetails.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: "$category" },
            {
                $group: {
                    _id: '$category._id'
                }
            },
            { $count: "count" }
        ]);
        const totalCount = totalCountQuery.length > 0 ? totalCountQuery[0].count : 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        const topCategories = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: "$orderItemDetails" },
            { $unwind: "$orderItemDetails.orderedWeight" }, // Unwind the orderedWeight array
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItemDetails.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: "$category" },
            {
                $group: {
                    _id: '$category._id',
                    name: { $first: '$category.name' },
                    totalQuantityOrdered: { $sum: "$orderItemDetails.orderedWeight.weight" } // Sum weights
                }
            },
            { $sort: { totalQuantityOrdered: -1 } },
            { $skip: skip },
            { $limit: pageSize }
        ]);
        console.log('topCategories.totalQuantityOrdered: ', topCategories.totalQuantityOrdered)
        res.render('topCategories', {
            categories: topCategories,
            currentPage: page,
            pageSize: pageSize,
            totalPages: totalPages
        });
    } catch (error) {
        console.log('Error in getTopCategory', error);
        res.status(500).send('Internal Server Error');
    }
};


const loadAddCategory = async (req, res) => {
    try {
        res.render('addCategory')
    } catch (error) {
        console.log('Error while loading add category', error)
    }
}

const addCategory = async (req, res) => {
    try {
        console.log('============== 135')
        const { name, description } = req.body;

        const existingCategories = await Category.find({}, 'name');
        const existingNames = existingCategories.map(category => category.name);

        if (!validateProductName(name, existingNames)) {
            return res.status(500).redirect('/admin/addCategory?error=InvalidCategoryName');
        }
        console.log(name, description, '=========input values 137')

        // Check if the category already exists
        const existingCategory = await Category.findOne({ name })
        if (existingCategory) {
            return res.status(400).redirect('/admin/addCategory?error=CategoryAlreadyExists');
        }
        const newCategory = new Category({ name, description, is_deleted: false })
        await newCategory.save()
        console.log(newCategory, 'Is the new category')
        // Redirect with success message
        res.redirect('/admin/addCategory?success=CategoryAddedSuccessfully');
    } catch (error) {
        console.log('Error while adding category', error.message)
        res.status(500).redirect('/admin/addCategory?error=ServerError');
        // Handle errors appropriately
    }
}

const loadEditCategory = async (req, res) => {
    try {
        const id = req.query._id;
        const categoryData = await Category.findById({ _id: id });
        //console.log(categoryData.description)
        if (categoryData) {
            res.render('editCategory', { category: categoryData })
        } else {
            console.log('Error while loading edit-category page with data')
            res.redirect('/admin/category')
        }

    } catch (error) {
        console.log('Error while loading the edit category page')
    }
}

const updateCategory = async (req, res) => {
    try {
        const { id, name, image, description } = req.body;

        //update
        await Category.findByIdAndUpdate({ _id: req.body.id }, { $set: { name: req.body.name, image: req.body.image, description: req.body.description } })

        res.redirect('/admin/category')
    } catch (error) {
        console.log('Error while editing category')
    }
}

const softDeleteCategory = async (req, res) => {
    try {
        const category_id = req.params.id
        const category = await Category.findById(category_id);
        if (!category) {
            return res.status(404).send('Category not found');
        }

        //soft delete by setting is_deleted to true
        category.is_deleted = true;
        await category.save();
        res.redirect('/admin/category')
    } catch (error) {
        console.log('Error while deleting the category', error.message)
    }
}

////////////////////////////products\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


const getTopOrderedProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 3;
        const skip = (page - 1) * pageSize;

        // Total count of products
        const totalCountQuery = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: "$orderItemDetails" },
            { $group: { _id: "$orderItemDetails.product_id" } },
            { $count: "count" }
        ]);
        const totalCount = totalCountQuery.length > 0 ? totalCountQuery[0].count : 0;

        // Top products aggregation pipeline
        const topProducts = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: "$orderItemDetails" },
            { $unwind: "$orderItemDetails.orderedWeight" },
            {
                $group: {
                    _id: "$orderItemDetails.product_id",
                    count: { $sum: "$orderItemDetails.orderedWeight.weight" }
                }
            },
            { $sort: { count: -1 } },
            {
                $skip: skip
            },
            {
                $limit: pageSize
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: "$categoryDetails" }
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.render('topProducts', {
            products: topProducts,
            currentPage: page,
            pageSize: pageSize,
            totalPages: totalPages
        });

    } catch (error) {
        console.log('Error in getTopOrderedProducts', error);
        res.status(500).send('Internal Server Error');
    }
};


const loadAddProducts = async (req, res) => {
    try {
        const id = req.query._id;
        const products = await Product.find({})
        const categories = await Category.find({})


        res.render('addProducts', { products: products, categories: categories })
    } catch (error) {
        console.log('Error while loading add product page', error.message)
    }
}

const addProducts = async (req, res) => {
    try {
        console.log('inside the addProducts===============');
        const files = req.files;

        const uploadedImages = [];

        for (const file of files) {
            try {
                const result = await cloudinary.uploader.upload(file.path);
                console.log(result, 'is the result');
                uploadedImages.push({
                    url: result.url,
                    public_id: result.public_id
                });
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
                return res.status(500).json({ error: 'UploadFailed', message: 'Failed to upload image to Cloudinary' });
            }
        }
        console.log('images ================================250 A addProducts', uploadedImages);

        const {
            productName,
            category,
            description,
            totalQuantity,
            pricePer100g,
            totalPrice,
            offerPercentage,
            offerPrice,
            nutritionalInfo,
            recipies
        } = req.body;

        const existingProduct = await Product.findOne({ productName: { $regex: new RegExp(`^${productName}$`, 'i') } });
        if (existingProduct) {
            return res.status(400).json({ error: 'ProductAlreadyExists', message: 'Product name already exists' });
        }


        let price1g = (pricePer100g / 100);
        let price100g = (price1g * 100);
        let price250 = (price1g * 250);
        let price500 = (price1g * 500);
        let price1Kg = (price1g * 1000);

        let offerprice100 = price100g - (price100g * offerPercentage / 100);
        let offerprice250 = price250 - (price250 * offerPercentage / 100);
        let offerprice500 = price500 - (price500 * offerPercentage / 100);
        let offerprice1kg = price1Kg - (price1Kg * offerPercentage / 100);

        // Save the product to the database
        const newProduct = new Product({
            productName: productName,
            description: description,
            category: category,
            totalQuantity: totalQuantity,
            pricePer100g: pricePer100g,
            totalPrice: totalPrice,
            offerPercentage: offerPercentage,
            offerPrice: offerPrice,
            images: uploadedImages,
            nutritionalInfo: nutritionalInfo,
            recipies: recipies,
            weightOptions: [
                {
                    weight: 100,
                    weightPrice: pricePer100g,
                    priceAfterDiscount: offerprice100
                },
                {
                    weight: 250,
                    weightPrice: price250,
                    priceAfterDiscount: offerprice250
                },
                {
                    weight: 500,
                    weightPrice: price500,
                    priceAfterDiscount: offerprice500
                },
                {
                    weight: 1000,
                    weightPrice: price1Kg,
                    priceAfterDiscount: offerprice1kg
                }
            ]
        });
        await newProduct.save();

        return res.status(200).json({ success: true, message: 'Product added successfully.' });

    } catch (error) {
        console.log('Error, in the catch addProducts=====302 :', error);

        return res.status(400).json({ error: 'NotAddedProduct', message: 'Not able to add this now! Try again later' });
    }
};


const loadViewProducts = async (req, res) => {
    try {

        let query = Product.find({ is_deleted: false }).populate('category');

        // Handling sorting
        const sortby = req.query.sortby;

        if (sortby === 'totalQuantity') { query = query.sort({ totalQuantity: 1 }); }
        else if (sortby === 'offerPercentage') { query = query.sort({ offerPercentage: 1 }); }

        const products = await query;
        //console.log('Products:', products); 
        res.render('viewProduct', { products: products });
    } catch (error) {
        console.log('Error while loading view product page:', error.message);
        res.status(500).send('Error while loading view product page');
    }
}

const loadEditProduct = async (req, res) => {
    try {
        const id = req.query._id;
        console.log(id, '===============id 308')
        const products = await Product.findById({ _id: id }).populate('category');
        const categories = await Category.find({})
        if (!products) {
            console.log('Error while loading edit-category page with data')
            redirect('/admin/viewProducts')
        } else {
            res.render('editProduct', { products: products, categories: categories })
        }

    } catch (error) {
        console.log('Error while loading the edit product page', error)
    }
}

const updateProduct = async (req, res) => {
    try {
        console.log('inside the update product')

        const id = req.body.id;
        const productName = req.body.productName;
        const category = req.body.category;
        const description = req.body.description;
        const nutritionalInfo = req.body.nutritionalInfo;
        const recipies = req.body.recipies;
        const totalQuantity = req.body.totalQuantity;
        const pricePer100g = req.body.pricePer100g;
        const totalPrice = req.body.totalPrice;
        const offerPercentage = req.body.offerPercentage;
        const offerPrice = req.body.offerPrice;
        const files = req.files;

        const existingProduct = await Product.findById(id);

        const uploadedImages = [];
        for (const file of files) {
            try {
                const result = await cloudinary.uploader.upload(file.path);
                uploadedImages.push({
                    url: result.url,
                    public_id: result.public_id
                });
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
            }
        }

        // Concatenate the existing images with the newly uploaded images
        const combinedImages = existingProduct.images.concat(uploadedImages);

        console.log(id,
            productName,
            category,
            description,
            totalQuantity,
            pricePer100g,
            totalPrice,
            offerPercentage,
            offerPrice
        )

        let price1g = pricePer100g / 100;
        let price250 = price1g * 250;
        let price500 = price1g * 500
        let price1Kg = price1g * 1000;

        let offerprice100 = pricePer100g - (pricePer100g * offerPercentage / 100)
        let offerprice250 = price250 - (price250 * offerPercentage / 100)
        let offerprice500 = price500 - (price500 * offerPercentage / 100)
        let offerprice1kg = price1Kg - (price1Kg * offerPercentage / 100)


        const product = await Product.findByIdAndUpdate(
            id,
            {
                $set: {
                    productName,
                    category,
                    description,
                    totalQuantity,
                    pricePer100g,
                    totalPrice,
                    offerPercentage,
                    offerPrice,
                    nutritionalInfo,
                    recipies,
                    images: combinedImages,
                    weightOptions: [{
                        weight: 100,
                        weightPrice: pricePer100g,
                        priceAfterDiscount: offerprice100
                    },
                    {
                        weight: 250,
                        weightPrice: price250,
                        priceAfterDiscount: offerprice250
                    },
                    {
                        weight: 500,
                        weightPrice: price500,
                        priceAfterDiscount: offerprice500
                    },
                    {
                        weight: 1000,
                        weightPrice: price1Kg,
                        priceAfterDiscount: offerprice1kg

                    }]
                }
            },
            { new: true }
        )

        res.redirect('/admin/viewProducts')
    } catch (error) {
        console.log('Error while updating the product', error)
    }
}

const deleteProduct = async (req, res) => {
    try {
        console.log('deleteProduct ==============')
        const product_id = req.body.proId;
        console.log('product_id', product_id)
        const product = await Product.findById(product_id)
        console.log(' product.productName: ', product.productName)
        if (!product) {
            return res.status(404).send('Product not found')
        }
        console.log('=====================841')
        try {
            console.log('before product.is_deleted', product.is_deleted)
            //soft delete
            product.is_deleted = true;
            console.log('after product.is_deleted', product.is_deleted)
            const pr = await product.save()
            console.log('after saved to the db product.is_deleted', pr.is_deleted)
            res.redirect('/admin/viewProducts')
        } catch (error) {
            console.log('not able to deleteProduct')
        }
    } catch (error) {
        console.log('Error while deleting the product', error)
    }
}

const loadViewSingleProducts = async (req, res) => {
    try {
        const id = req.query._id;
        console.log(id, '===============id 611 loadViewSingleProducts')

        const products = await Product.findById({ _id: id }).populate('category');
        console.log(products.productName, '===============products  loadViewSingleProducts')

        const categories = await Category.find({})

        if (!products) {
            console.log('Error while loading edit-category page with data')
            redirect('/admin/viewProducts')
        } else {
            console.log('=================622')
            res.render('singleProduct', { products: products, categories: categories })
        }


    } catch (error) {
        console.log('Error occure while viewing single product in loadViewSingleProducts', error)
    }
}

const deleteImages = async (req, res) => {
    try {
        console.log('========inside the deletion')

        // console.log(req,'==============505')
        const imageId = req.params.imageId; // Get image ID
        console.log(imageId, 'image id')
        console.log(typeof (imageId), ' typpe of image id')
        const productId = (req.params.productId).trim();
        console.log(productId, 'product id=====')
        console.log(productId.length, 'length of product id=====')
        console.log(productId.length, 'length of product id=====')
        console.log(ObjectId.isValid(productId), 'valid  product id=====')


        try {
            await Product.updateOne(
                { _id: ObjectId.createFromHexString(productId) },
                { $pull: { images: { public_id: imageId } } }
            );

            console.log('Image deleted successfully');
            res.status(200).json({ deletedImageId: imageId });

        } catch (error) {
            console.log("Error can't delete", error);
            res.status(500).json({ error: "Error while deleting the image" });
        }
    } catch (error) {
        console.log('Error while deleting the image', error)
        res.status(500).send('Error while deleting the image');
    }
}

////////////////////////////order\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadOrderDetails = async (req, res) => {
    try {
        const orderPlaced = await Order.find({}).populate('shippingAddress').populate('orderItems').populate('user_id');

        res.render('OrderDetailsAdmin', { orderPlaced })
    } catch (error) {
        console.log('Error while loading order deatls page')
    }
}


const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        // console.log(orderId,'is the orderid')
        const order = await Order.findById(orderId).populate('user_id').populate('orderItems');
        // console.log(order,'is the order=======cancelOrder')
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.orderStatus = 'cancelled';
        await order.save();

        await Promise.all(order.orderItems.map(async (element) => {
            try {
                console.log('ProductId: ', element.product_id);
                let product = await Product.findById(element.product_id);
                product.totalQuantity += (element.orderedWeight[0].weight) / 1000;
                await product.save();
            } catch (error) {
                console.error('Error updating product quantity:', error);
            }
        }));


        res.status(200).json({ message: 'Order cancelled successfully', orderId: order._id });
    } catch (error) {
        console.log('Error occure while canceling the order', error.message)
    }
}

const loadSingleOrderDetails = async (req, res) => {
    try {
        const orderId = req.query._id;
        console.log(orderId, '==========orderId loadSingleOrderDetails');

        const orderDetails = await Order.findById({ _id: orderId })
            .populate('shippingAddress')
            .populate({
                path: 'orderItems',
                populate: {
                    path: 'product_id',
                    model: 'Product'
                }
            })
            .populate('user_id');

        res.render('singleOrderDetails', { orderDetails });
    } catch (error) {
        console.log('Error occurred while loading loadSingleOrderDetails', error);
    }
}

const loadreturnProducts = async (req, res) => {
    try {
        console.log('in loadreturnProducts===========');
        const orderId = req.query.orderId;
        console.log('orderId: ', orderId);
        const items = await Order.findOne({ order_id: orderId }).populate('orderItems');
        console.log('items.id: ', items._id);
        // Filter orderItems with return_query
        const returnItems = items.orderItems.filter(item => item.return_query);

        res.render('return-product', { items: { ...items.toObject(), orderItems: returnItems } });

    } catch (error) {
        console.log('Error in loadreturnProducts', error)
    }
}

const approveReturn = async (req, res) => {
    try {
        console.log('in approveReturn===========');
        const { orderId, itemId } = req.body;
        console.log('orderId: ', orderId);
        console.log('itemId: ', itemId);

        // Find the order
        const returnProduct = await Order.findOne({ order_id: orderId }).populate('user_id').populate('orderItems');

        if (!returnProduct) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the specific OrderItem
        const item = await OrderItems.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Update item status
        item.is_returned = true;
        await item.save();

        // Update user's wallet and history
        const amount = item.orderedWeight[0].price;
        const user = returnProduct.user_id;

        user.wallet += amount;
        user.history.push({
            amount: amount,
            status: 'Return amount',
            timestamp: new Date()
        });

        // Deduct the amount from the order
        returnProduct.finalPrice -= amount;

        // Check if all items are returned
        const allReturned = returnProduct.orderItems.every(item => item.is_returned);
        if (allReturned) {
            returnProduct.orderStatus = 'Return Approved';
        } else {
            returnProduct.orderStatus = 'Partial Return Approved';
        }

        await user.save();
        await returnProduct.save();

        res.json({ success: true, message: 'Return approved successfully' });
    } catch (error) {
        console.log('Error in approveReturn', error);
        res.status(500).json({ success: false, message: 'Failed to approve return' });
    }
};


const approveOrder = async (req, res) => {
    try {
        console.log('inside approveOrder=============')
        const orderId = req.body.orderId;
        console.log('orderId: ', orderId);

        await Order.findByIdAndUpdate(orderId, {
            orderStatus: 'Confirmed'
        });

        res.redirect('/admin/orders');
    } catch (error) {
        console.log('Error in approveOrder', error);
        res.status(500).send('An error occurred while approving the order.');
    }
}

/////////////////////////////////////coupons\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadCoupons = async (req, res) => {
    try {
        console.log('in view coupon');

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;  // Current page number
        const limit = 3;  // Number of items per page

        // Total count of coupons
        const count = await couponModel.countDocuments();

        const coupons = await couponModel.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });  // Sort by descending createdAt


        const couponData = await couponModel.find({})
        res.render('viewCoupon',
            {
                message: couponData,
                coupons: coupons,
                currentPage: page,
                totalPages: Math.ceil(count / limit)
            })
    } catch (error) {
        console.log('Error while loading viewCoupons page: ', error)
    }
}

const loadaddCoupons = async (req, res) => {
    try {
        const yourValidationErrorValue = true;
        res.render('loadAddCoupon', { validationError: yourValidationErrorValue })
    } catch (error) {

    }
}

const addCoupons = async (req, res) => {
    try {
        console.log('==============================addCoupon');
        const { code, discountType, discountAmount, amount, cartamount, expirydate, couponcount } = req.body;

        console.log('Coupon code:', code);
        console.log('Coupon req.body.discountType:', discountType);
        console.log('Coupon req.body.discountAmount,:', discountAmount);
        console.log('Coupon req.body.amount:', amount);
        console.log('Coupon req.body.cartamount:', cartamount);
        console.log('Coupon req.body.expirydate:', expirydate);
        console.log('Coupon req.body.couponcount:', couponcount);

        const existingCoupon = await couponModel.findOne({ code });
        if (existingCoupon) {
            console.log('coupon exist');
            return res.status(400).json({ success: false, message: 'Coupon code exists!' });
        }

        const newCoupon = new couponModel({
            code,
            discountType,
            discountAmount,
            maxDiscountAmount: amount,
            minCartAmount: cartamount,
            expiryDate: expirydate,
            maxUsers: couponcount
        });

        const couponData = await newCoupon.save();
        if (couponData) {
            return res.json({ success: true, message: 'Coupon added successfully!' });
        } else {
            return res.json({ success: false, message: 'Failed to add coupon!' });
        }
    } catch (error) {
        console.error('Error while adding coupon:', error);
        res.render('page-error-404');
    }
};


const deleteCoupon = async (req, res) => {
    try {
        console.log('===================deleteCoupon');
        const id = req.query.id
        await couponModel.deleteOne({ _id: id });
        res.redirect('/admin/coupon');
    } catch (error) {
        console.log('Error while loading deleteCoupon', error);
        res.render('page-error-404')
    }
}

const loadeditCoupon = async (req, res) => {
    try {
        console.log('in editloadeditCoupon ==========================');
        const id = req.query.id
        const couponData = await couponModel.findById({ _id: id })
        console.log(couponData);
        res.render("editCoupon", { couponData })
    } catch (error) {
        console.log('Error while editing the coupon editCoupon', error);
        res.render('page-error-404')
    }
}

const editCoupon = async (req, res) => {
    try {
        const id = req.body.id;
        const couponData = await couponModel.findById({ _id: id })
        console.log(couponData);
        console.log('in editCoupon =================');

        console.log('req.body.discountType: ', req.body.discountType)
        if (req.body.discountType === 'fixed') {
            await couponModel.updateMany({ _id: id }, {
                $set: {
                    code: req.body.code,
                    discountType: req.body.discountType,
                    discountAmount: req.body.discountAmount,
                    maxCartAmount: req.body.cartamount,
                    expiryDate: req.body.expirydate,
                    maxUsers: req.body.couponcount
                }

            });

        } else {
            await couponModel.updateMany({ _id: id }, {
                $set: {
                    code: req.body.code,
                    discountType: req.body.discountType,
                    discountAmount: req.body.discountAmount,
                    maxDiscountAmount: req.body.amount,
                    maxCartAmount: req.body.cartamount,
                    expiryDate: req.body.expirydate,
                    maxUsers: req.body.couponcount
                }

            });
        }


        res.redirect('/admin/coupon');

    } catch (error) {
        console.log('Error while editing coupons in editCoupon', error);
        res.render('page-error-404')

    }
}
/////////////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\

////////////////////////////exports\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


module.exports = {
    loadAdminLogin,
    verifyAdminLogin,
    adminLogout,
    loadDashboard,
    loadUserProfile,
    userBlockUnblock,
    loadCategory,
    getTopCategory,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    updateCategory,
    softDeleteCategory,
    loadAddProducts,
    getTopOrderedProducts,
    addProducts,
    loadViewProducts,
    loadEditProduct,
    updateProduct,
    deleteProduct,
    loadOrderDetails,
    approveReturn,
    deleteImages,
    cancelOrder,
    approveOrder,
    loadViewSingleProducts,
    loadSingleOrderDetails,
    loadreturnProducts,
    loadCoupons,
    loadaddCoupons,
    addCoupons,
    deleteCoupon,
    loadeditCoupon,
    editCoupon,

}