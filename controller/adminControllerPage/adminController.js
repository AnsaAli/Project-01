
const adminModel = require('../../models/userModel/userAuthenticationModel')
const{ Category,Product} = require('../../models/adminModel/categoryModel')
const bcrypt = require("bcrypt")
const sharp= require('sharp')

const loadAdminLogin= async (req,res)=>{
    try {
        res.render('adminLogin')
    } catch (error) {
       console.log('Error occurred while loading admin login page. ',error.message) 
    }
}

const verifyAdminLogin= async(req,res)=>{
    try {
        const {email, password}= req.body
          //console.log(req.body.password,'is the password') 
          //console.log(req.body.email,'is the email') 
        const userData= await adminModel.findOne({email})
            
        if(userData){
            const passwordMatch = await bcrypt.compare(password,userData.password)
            if(passwordMatch){
                if(userData.is_admin===1){
                    //console.log('inside the password login')
                    req.session.user_id= userData._id
                    res.redirect('/admin/dashboard')
                }else{
                    console.log('inside the no access')
                    res.render('adminLogin',{errorMessage:'No access!'})
                }
            }
            }else{
                console.log('Password/email is incorrect')
                res.render('adminLogin',{errorMessage:'Password/email is incorrect'})
            }
        
    } catch (error) {
        console.log('Error occurred while verifying the admin' ,error)
    }
}

const adminLogout=async (req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
        res.render('dashboard')
    }

}
//Dashboard
const loadDashboard= async(req,res)=>{
    try {
        //console.log('inside load dashboard page')
        const userData=await adminModel.findById({_id:req.session.user_id});
        res.render('dashboard',{admin:userData})
    } catch (error) {

        console.log('inside load dashboard error page',error.message)
    }
}
const loadUserProfile= async(req,res)=>{
    try {
      const userData= await adminModel.find({is_admin:0})
    //   const userData=await adminModel.findById({_id:req.session.user_id});
      userData.forEach(user=>{console.log(user.name)})
      if (userData.length > 0) {
        
        res.render('customerProfile', { userData });
    } else {
        
        res.render('customerProfile', { message: 'No users found' });
    }
    } catch (error) {

        console.log(error.message)
    }
}


userBlockUnblock = async (req, res) => {
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
    //   res.redirect('/admin/customerProfile');
      res.json({ logout: true });
    } catch (err) {
      console.error('Error toggling block status:', err);
      res.status(500).send('Internal Server Error');
    }
  };
  
const loadCategory= async(req,res)=>{
    try {
        const categories= await Category.find({ is_deleted: false })
        
        res.render('category', { categories });
    } catch (error) {
        console.log('Error wile loading category', error.message)
    }
}

const loadAddCategory= async(req,res)=>{
    try {
         res.render('addCategory')
    } catch (error) {
        console.log('Error while loading add category', error)
    }
}

const addCategory= async (req,res)=>{
    try {
        const { name, image, description } = req.body;
        const newCategory= new Category({name, image, description,is_deleted:false})
        await newCategory.save()
        //console.log(newCategory, 'Is the new category')
        res.redirect('/admin/category')
    } catch (error) {
        console.log('Error while adding category', error.message)
    }
}

const loadEditCategory= async (req,res)=>{
    try {
        const id= req.query._id;
        const categoryData= await Category.findById({_id:id});
        //console.log(categoryData.description)
        if(categoryData){
            res.render('editCategory',{category:categoryData})
        }else{
            console.log('Error while loading edit-category page with data')
            redirect('/admin/category')
        }
       
    } catch (error) {
        console.log('Error while loading the edit category page')
    }
}

const updateCategory =async(req,res)=>{
    try {
       await Category.findByIdAndUpdate({_id:req.body.id},{$set:{name:req.body.name,image:req.body.image,description:req.body.description}})
       res.redirect('/admin/category')
    } catch (error) {
        console.log('Error while editing category')
    }
}

const softDeleteCategory= async(req,res)=>{
    try {
        const category_id= req.params.id
        const category= await Category.findById( category_id);
        if(!category){
            return res.status(404).send ('Category not found');
        }

        //soft delete by setting is_deleted to true
        category.is_deleted= true;
        await category.save();
        res.redirect('/admin/category')
    } catch (error) {
        console.log('Error while deleting the category',error.message)
    }
}
const cropImage= async(imagePath,width,height)=>{
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
        console.log('Error while cropping the images',error.message)
    }
}

const loadAddProducts=async(req,res)=>{
    try {
        const products= await Product.find({})
        const categories= await Category.find({})
        res.render('addProducts',{ products: products,categories:categories })
    } catch (error) {
        console.log('Error while loading add product page',error.message)
    }
}


// 
const addProducts = async (req, res) => {
    try {
        console.log('Form can submit')
      const { name, category, description, quantity, total_price, offer_price } = req.body;
      console.log('details:', name, category, description, quantity);
    
      // Check if any images were uploaded
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No images uploaded');
      }
  
      const images = req.files.images.map(file => file.filename);
      console.log('uploaded images:', images);
  
      const croppedImages = await Promise.all(
        images.map(async imagePath => {
          // Perform image cropping
          const croppedImagePath = await cropImage(imagePath, 200, 200);
          return croppedImagePath;
        })
      );
  
      // Save the product to the database
      const newProduct = new Product({
        name,
        category,
        quantity,
        images: croppedImages,
        description,
        total_price,
        offer_price,
      });
  
      await newProduct.save();
      res.redirect('/admin/viewProducts');
    } catch (error) {
      console.log('Error adding product:', error);
      res.status(500).send('Error adding product');
    }
  };

const loadViewProducts = async (req, res) => {
    try {
        const products = await Product.find({ is_deleted: false });
        //console.log('Products:', products); 
        res.render('viewProduct', { products: products });
    } catch (error) {
        console.log('Error while loading view product page:', error.message);
        res.status(500).send('Error while loading view product page');
    }
};

const loadEditProduct= async(req,res)=>{
    try {
        const id= req.query._id;
        const products= await Product.findById({_id:id}).populate('category');
        const categories = await Category.find({})
        if(!products){
            console.log('Error while loading edit-category page with data')
            redirect('/admin/viewProducts')
        }else{
            res.render('editProduct',{products:products,categories:categories})
        }
       
    } catch (error) {
        console.log('Error while loading the edit product page', error.message)
    }
}


const updateProduct= async(req,res)=>{
    try {
        const { id,name, category, description,quantity, price } = req.body;
        let additionalImages = [];

        if (req.files && req.files.length>0){
            additionalImages = req.files.additionalImages.map(file => file.path);
        }

        const product = await Product.findByIdAndUpdate(
            {_id:id},
            { $set: { name, price, description,category,quantity },
              $addToSet: { image: { $each: additionalImages } }},
           {new:true}
        )

       res.redirect('/admin/viewProducts')
    } catch (error) {
        console.log('Error while updating the product',error.message)
    }
}
const deleteProduct= async(req,res)=>{
    try {
        const product_id = req.params.id;
        const product= await Product.findById(product_id)
        if(!product){
            return res.status(404).send('Product not found')
        }
        //soft delete
        product.is_deleted=  true;
        await product.save()
        res.redirect('/admin/viewProducts')
    } catch (error) {
        console.log('Error while deleting the product', error.message)
    }
}
module.exports={
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
    cropImage
}