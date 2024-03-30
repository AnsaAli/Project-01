
const adminModel = require('../models/userAuthenticationModel')
const { Category, Product } = require('../models/categoryModel')
const bcrypt = require("bcrypt")
const sharp = require('sharp')
const Order = require('../models/orderModel')
const User = require('../models/userAuthenticationModel')
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: 'dn6d0gspr',
    api_key: '841139655134895',
    api_secret: '_gG35Qz2WyuPdPh53Iges-oDSBQ'
});


function validate(name) {
    const regexPattern = /^(?=.*[a-zA-Z])[a-zA-Z\s]{3,}$/;
    return regexPattern.test(name);
}



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
//Dashboard
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
        const userData = await adminModel.find({ is_admin: 0 })
        //   const userData=await adminModel.findById({_id:req.session.user_id});
        userData.forEach(user => { console.log(user.name) })
        if (userData.length > 0) {

            res.render('customerProfile', { userData });
        } else {

            res.render('customerProfile', { message: 'No users found' });
        }
    } catch (error) {

        console.log(error.message)
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

const loadCategory = async (req, res) => {
    try {
        const categories = await Category.find({ is_deleted: false })

        res.render('category', { categories });
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
        if (!validate(name)) {
            return res.status(500).redirect('/admin/category?error=ProductNameInvalid');
        }
        console.log(name, description, '=========input values 137')


        //if category already exist
        const existingCategory = await Category.findOne({ name })
        if (existingCategory) {
            return res.status(400).redirect('/admin/category?error=CategoryAlreadyExists');
        }
        const newCategory = new Category({ name, description, is_deleted: false })
        await newCategory.save()
        console.log(newCategory, 'Is the new category')
        // Redirect with success message
        res.redirect('/admin/category?success=CategoryAddedSuccessfully');
    } catch (error) {
        console.log('Error while adding category', error.message)
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


// 
const addProducts = async (req, res) => {

    try {
        // console.log('inside the add pro')
        const files = req.files;
        console.log(files,'fies')
        
        const uploadedImages = [];

        for (const file of files) {
            // console.log('inside file loop')
            const result = await cloudinary.uploader.upload(file.path);
            // console.log(result, 'is the result ')
            uploadedImages.push(result.url); // Store the secure URL of the uploaded image
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

        } = req.body;
        if (!validate(productName)) {
            return res.render('addProducts', { errorMessage: 'Please add a valid product name!' });
        }
        if (totalQuantity < 0) {
            return res.render('addProducts', { errorMessage: 'Quantity must be greater than 0!' });

        }
        if (pricePer100g < 0) {
            return res.render('addProducts', { errorMessage: 'Price must be greater than 0!' });
        }
        if (offerPercentage < 0) {
            return res.render('addProducts', { errorMessage: 'Offer percentage must be greater than 0!' });
        }
        if (offerPercentage > 80) {
            return res.render('addProducts', { errorMessage: "Offer percentage can't be be greater than 80%!" });
        }
        if (offerPrice > totalPrice) {
            return res.render('addProducts', { errorMessage: "Offer price allways lesser than total price!" });

        }

        console.log('================================270 B addProducts')
        //100g= 5 
        let price1g = pricePer100g / 100;
        let price250 = price1g * 250;
        let price500 = price1g * 500
        let price1Kg = price1g * 1000;

        let offerprice100 = pricePer100g - (pricePer100g * offerPercentage / 100)
        let offerprice250 = price250 - (price250 * offerPercentage / 100)
        let offerprice500 = price500 - (price500 * offerPercentage / 100)
        let offerprice1kg = price1Kg - (price1Kg * offerPercentage / 100)


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
};

const loadViewProducts = async (req, res) => {
    try {
        const products = await Product.find({ is_deleted: false }).populate('category');
        //console.log('Products:', products); 
        res.render('viewProduct', { products: products });
    } catch (error) {
        console.log('Error while loading view product page:', error.message);
        res.status(500).send('Error while loading view product page');
    }
};

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
        const totalQuantity = req.body.totalQuantity;
        const pricePer100g = req.body.pricePer100g;
        const totalPrice = req.body.totalPrice;
        const offerPercentage = req.body.offerPercentage;
        const offerPrice = req.body.offerPrice;

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
            { $set: { 
                productName, 
                category, 
                description, 
                totalQuantity, 
                pricePer100g, 
                totalPrice, 
                offerPercentage, 
                offerPrice,
                weightOptions:[{
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
             } },
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

const loadOrderDetails = async (req, res) => {
    try {

        const orderDetails = await Order.find({}).populate('user_id')

        res.render('OrderDetailsAdmin', { orderDetails })
    } catch (error) {
        console.log('Error while loading order deatls page')
    }
}

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
    loadOrderDetails
}