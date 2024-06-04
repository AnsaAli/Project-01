const is_login = async (req,res,next)=>{
    try {
        if(req.session.user_id){
            next()
        }else{
           return redirect('/admin')
        }
       
    } catch (error) {
        console.log(error.message)
    }
}
const is_logout = async (req,res,next)=>{
    try {
        if(req.session.user_id){
           return res.redirect('/admin/home')
        }
        next()
    } catch (error) {
        console.log(error.message)
    }
}

module.exports={
    is_login,
    is_logout

}