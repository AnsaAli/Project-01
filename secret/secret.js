const session=require('express-session')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy

function sessionSecret() {
    return session({
        secret: 'thisismysecretname', 
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } 
    });
}

passport.use(new GoogleStrategy({
    clientID: '556258179414-nhdprcpdb2dsrrip351kqn3ma6e92r2d.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    // Authenticate user or create new user based on profile data
    return done(null, profile);
  }
));

// Serialize and deserialize user
passport.serializeUser(function(user, done) {
    done(null, user);
  })

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  })

module.exports={sessionSecret,passport}