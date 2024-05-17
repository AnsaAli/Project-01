
const session = require('express-session');


function sessionSecret() {
    return session({
        secret: 'thisismysecretname', 
        resave: false,
        saveUninitialized: true
      
    });
}



module.exports={sessionSecret}