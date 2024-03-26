const session=require('express-session')


function sessionSecret() {
    return session({
        secret: 'thisismysecretname', 
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } 
    });
}


module.exports={sessionSecret}