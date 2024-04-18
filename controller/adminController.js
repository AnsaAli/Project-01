const { ObjectId } = require('mongodb');

const shortid = require('shortid');
const uniqueId = shortid.generate();
const UserAddress= require('../models/addressModel');
const adminModel = require('../models/userAuthenticationModel')
const { Category, Product } = require('../models/categoryModel')
const bcrypt = require("bcrypt")
const sharp = require('sharp')
const Order = require('../models/orderModel')
const User = require('../models/userAuthenticationModel');
const nodemon = require('nodemon');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dn6d0gspr',
    api_key: '841139655134895',
    api_secret: '_gG35Qz2WyuPdPh53Iges-oDSBQ'
});


function validateProductName(productName, existingNames) {
    const regexPattern = /^[a-zA-Z\s]+$/; 
    const trimmedName = productName.trim(); 

    // Check if the name meets the length requirement
    if (trimmedName.length < 3 || trimmedName.length > 50) {
        return false;
    }

    // Check if the name already exists
    if (existingNames.includes(trimmedName) && trimmedName !== "") {
        return false;
    }

    // Check if the name matches the regex pattern
    return regexPattern.test(trimmedName);
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
        //console.log('inside load dashboard page')
        const userData = await adminModel.findById({ _id: req.session.user_id });
        res.render('dashboard', { admin: userData })
    } catch (error) {

        console.log('inside load dashboard error page', error.message)
    }
}
const loadUserProfile = async (req, res) => {
    try {
        
        const userData = await User.find({ is_admin: 0 }).populate('address')
   
        if (userData.length > 0) {

            res.render('customerProfile', { userData });
        } else {

            res.render('customerProfile', { message: 'No users found' });
        }
    } catch (error) {

        console.log('error while loading loadUserProfile',error)
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
        let myQuery= Category.find({ is_deleted: false })
        const searchQuery= req.query.searchQuery;
        if (searchQuery && searchQuery.trim() !== '') {
           
            myQuery.where('name').regex(new RegExp(searchQuery, 'i'));
        }
        const categories = await myQuery

        res.render('category', { categories,searchQuery:searchQuery });
    } catch (error) {
        console.log('Error wile loading category', error.message)
    }
}

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
            return res.status(500).redirect('/admin/category?errorMessage=InvalidCategoryName');
        }
        console.log(name, description, '=========input values 137')

        // Check if the category already exists
        const existingCategory = await Category.findOne({ name })
        if (existingCategory) {
            return res.status(400).redirect('/admin/category?errorMessage=CategoryAlreadyExists');
        }
        const newCategory = new Category({ name, description, is_deleted: false })
        await newCategory.save()
        console.log(newCategory, 'Is the new category')
        // Redirect with success message
        res.redirect('/admin/category?successMessage=CategoryAddedSuccessfully');
    } catch (error) {
        console.log('Error while adding category', error.message)
        res.status(500).redirect('/admin/category?errorMessage=ServerError');
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

const cropImage = async (imagePath, width, height) => {
    try {
        // Construct the output path for the cropped image
        const outputPath = `${imagePath}-cropped`;

        // Crop the image using Sharp
        await sharp(imagePath)
            .resize(width, height, { fit: 'cover' })
            .toFile(outputPath);

        console.log('Image cropped successfully:', outputPath);
        return outputPath;
    } catch (error) {
        console.log('Error while cropping the images', error.message)
    }
}

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
        console.log('inside the add pro')
        const files = req.files;
        console.log(files, 'fies')

        const uploadedImages = [];

        for (const file of files) {
            try {
                // console.log('inside file loop')
                const result = await cloudinary.uploader.upload(file.path);
                console.log(result, 'is the result ')
                uploadedImages.push({
                    url: result.url,
                    public_id: result.public_id
                });
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
            }
        }
        console.log(uploadedImages, 'images ================================250 A addProducts')
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

        console.log(' ================================311')

         // Validate productName
        const existingProducts = await Product.find({}, 'productName');
        const existingNames = existingProducts.map(product => product.productName);
        if (!validateProductName(productName, existingNames)) {
            return res.render('addProducts', { errorMessage: 'Please add a valid product name!' });
        }

        console.log(' ================================315')

        if (totalQuantity < 0) {
            return res.render('addProducts', { errorMessage: 'Quantity must be greater than 0!' });

        }
        console.log(' ================================328')

        if (pricePer100g < 0) {
            return res.render('addProducts', { errorMessage: 'Price must be greater than 0!' });
        }
        console.log(' ================================323')

        if (offerPercentage < 0) {
            return res.render('addProducts', { errorMessage: 'Offer percentage must be greater than 0!' });
        }
        console.log(' ================================338')

        if (offerPercentage > 80) {
            return res.render('addProducts', { errorMessage: "Offer percentage can't be be greater than 80%!" });
        }
        console.log(' ================================343')

        if (offerPrice > totalPrice) {
            return res.render('addProducts', { errorMessage: "Offer price allways lesser than total price!" });

        }

        console.log('================================350 B addProducts')
       
        let price1g = (pricePer100g / 100).toFixed(2);
        let price250 = (price1g * 250).toFixed(2);
        let price500 = (price1g * 500).toFixed(2);
        let price1Kg =(price1g * 1000).toFixed(2);

        let offerprice100 = (pricePer100g - (pricePer100g * offerPercentage / 100)).toFixed(2);
        let offerprice250 = (price250 - (price250 * offerPercentage / 100)).toFixed(2);
        let offerprice500 =(price500 - (price500 * offerPercentage / 100)).toFixed(2);
        let offerprice1kg = (price1Kg - (price1Kg * offerPercentage / 100)).toFixed(2);


        console.log('================================890 C addProducts')

        //if product is exist
        const existingProduct = await Product.findOne({ productName })
        if (existingProduct) {
            return res.render('addProducts', {
                errorMessage: 'Product with the same name already exists',

            })
        }
        console.log('================================893 D addProducts')



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
            }
            ]
        });
        console.log('================================296 D addProducts')
        await newProduct.save();
        req.session.uploadedImages = uploadedImages
        console.log('================================299 E addProducts')
        return res.status(200).json({ success: true, redirectTo: '/admin/viewProducts' });
    } catch (error) {
        console.log('Error, in the catch addProducts=====302 :', error);
        res.status(500).json({ errorMessage: 'Error adding product' })
    }
}

const loadViewProducts = async (req, res) => {
    try {
        
       let query =  Product.find({is_deleted:false}).populate('category');
      
        // Handling sorting
        const sortby = req.query.sortby;
       
         if (sortby === 'totalQuantity') { query = query.sort({ totalQuantity: 1 });} 
        else if (sortby === 'offerPercentage') {query = query.sort({ offerPercentage: 1 });}

        const products = await query;
        //console.log('Products:', products); 
        res.render('viewProduct', { products: products});
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
        const product_id = req.params.id;
        const product = await Product.findById(product_id)
        if (!product) {
            return res.status(404).send('Product not found')
        }
        //soft delete
        product.is_deleted = true;
        await product.save()
        res.redirect('/admin/viewProducts')
    } catch (error) {
        console.log('Error while deleting the product', error.message)
    }
}

const loadViewSingleProducts= async(req,res)=>{
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

        res.render('OrderDetailsAdmin', { orderPlaced})
    } catch (error) {
        console.log('Error while loading order deatls page')
    }
}


const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        // console.log(orderId,'is the orderid')
        const order = await Order.findById(orderId).populate('user_id');
        // console.log(order,'is the order=======cancelOrder')
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.orderStatus = 'cancelled';
        await order.save();
        res.status(200).json({ message: 'Order cancelled successfully', orderId: order._id });
    } catch (error) {
        console.log('Error occure while canceling the order', error.message)
    }
}


const loadSingleOrderDetails= async(req,res)=>{
    try {
        const orderId= req.query._id;
        
        console.log(orderId,'==========orderId loadSingleOrderDetails')
        
        const orderDetails = await Order.findById({_id: orderId}).populate('shippingAddress').populate('orderItems').populate('user_id');
        // .populate('user_id shippingAddress')
        // .exec();
        res.render('singleOrderDetails',{ orderDetails})
    } catch (error) {
        console.log('Error occure while loading loadSingleOrderDetails', error)
    }
}


////////////////////////////exports\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

module.exports = {
    loadAdminLogin,
    verifyAdminLogin,
    adminLogout,
    loadDashboard,
    loadUserProfile,
    userBlockUnblock,
    loadCategory,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    updateCategory,
    softDeleteCategory,
    loadAddProducts,
    addProducts,
    loadViewProducts,
    loadEditProduct,
    updateProduct,
    deleteProduct,
    cropImage,
    loadOrderDetails,
    deleteImages,
    cancelOrder,
    loadViewSingleProducts,
    loadSingleOrderDetails
}