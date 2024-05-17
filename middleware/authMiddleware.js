const is_login = async (req,res,next)=>{
    try {
        if(req.session.user_id){
            console.log('in if is_login,: ================',req.session.user_id);
            next();
        }else{
            console.log('in else A=========================================' )
           return res.redirect('/login')
        }
      
    } catch (error) {
        console.log(error.message)
    }
}
const is_logout = async (req,res,next)=>{
    try {
        if(req.session.user_id){
            return res.redirect('/home')
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