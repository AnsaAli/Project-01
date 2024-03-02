const express= require('express');
const dbConnect = require('./config/dbConnect');
const app=express();
const dotenv=require('dotenv').config()
const PORT=process.env.PORT || 3000
dbConnect();

const user_route=require('./routes/userRoute')
app.use('/',user_route)
app.use(express.static(__dirname + '/views/public'))

const admin_route= require('./routes/adminRoute')
app.use('/admin',admin_route)
app.use('/images', express.static(__dirname + '/views/public/adinAssets/img'));


app.listen(PORT,()=>{
    console.log(`App is running ${PORT}`)
})