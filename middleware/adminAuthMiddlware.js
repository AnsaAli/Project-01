const is_login = async (req,res,next)=>{
    try {
        if(req.session.user_id){
            
        }else{
            redirect('/admin')
        }
        next()
    } catch (error) {
        console.log(error.message)
    }
}
const is_logout = async (req,res,next)=>{
    try {
        if(req.session.user_id){
            res.redirect('/admin/home')
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