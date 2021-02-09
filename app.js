//jshint esversion:6
require('dotenv').config() //must be at the top
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// var md5 = require('md5');
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-Local-Mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const app = express();

//using.env
//console.log((process.env.SECRET));


//hash
// console.log(md5("123456"));

var HTTP_PORT = process.env.PORT || 8080;

// call this function after the http server starts listening for requests
function onHttpStart() {
    console.log("Express http server listening on: " + HTTP_PORT);
}

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));


//Initialize session
app.use(session({
    secret: "OurSecret.",
    resave: false,
    saveUninitialized: false

}));



//Initialize passport
app.use(passport.initialize());
app.use(passport.session());





mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true
});
mongoose.set("useCreateIndex", true);


mongoose.connection.on("error", err => {
    console.log('err', err)
});

mongoose.connection.on("connected", (err, res) => {
    console.log("mongoose is connected")
});

//object created by the mongoose schema class
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String

});

//hash and salt our passowrd and save our users into mongodb 
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//adding encrypt as a plugin
//can add multiple fields to encrypt by adding in enrties to the array
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());


//local authentication
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());



passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:8080/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }
));

app.get('/', function(req, res) {
    res.render(("home"))
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    });



app.get('/login', function(req, res) {
    res.render(("login"))
});


app.get('/register', function(req, res) {
    res.render(("register"))
});


app.get("/secrets", function(req, res) {
    // if (req.isAuthenticated()) {
    //     res.render("submit");
    // } else {
    //     res.redirect("/login");

    // }
    User.find({ "secret": { $ne: null } }, function(err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        }
    });
});




app.get("/submit", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");

    }
});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {

                foundUser.secret = submittedSecret;
                foundUser.save(function() {
                    res.redirect("/secrets");
                });
            }
        }

    });
});




// app.get("/submit", function(req, res) {
//     if (req.isAuthenticated()) {
//         res.render("submit");
//     } else {
//         res.redirect("/login");
//     }
// });

// app.post("/submit", function(req, res) {
//     const submittedSecret = req.body.secret;

//     //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
//     // console.log(req.user.id);

//     User.findById(req.user.id, function(err, foundUser) {
//         if (err) {
//             console.log(err);
//         } else {
//             if (foundUser) {
//                 foundUser.secret = submittedSecret;
//                 foundUser.save(function() {
//                     res.redirect("/secrets");
//                 });
//             }
//         }
//     });
// });

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});


app.post('/register',
    function(req, res) {
        // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        //     // Store hash in your password DB.
        //     const newUser = new User({
        //         email: req.body.username,
        //         // password: req.body.password
        //         // password: md5(req.body.password)
        //         password: hash
        //     });
        //     //will encrypt the field when using save
        //     newUser.save(function(err) {
        //         if (err) {
        //             console.log(err);
        //         } else {
        //             res.render("secrets");
        //         }
        //     });
        // });
        User.register({ username: req.body.username }, req.body.password, function(err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function() {
                    res.redirect("/secrets");
                });
            }
        });

    });






app.post("/login", function(req, res) {
    // const username = req.body.username;
    // const password = (req.body.password);
    // //will decrypt the field when using findone
    // User.findOne({ email: username }, function(err, foundUser) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         if (foundUser) {
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                 if (result === true) {
    //                     res.render("secrets");
    //                 }
    //             });


    //         }
    //     }

    // });
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });


    req.login(user, function(err) {
        if (err) {
            console.log(err);

        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        }
    });
});

// setup http server to listen on HTTP_PORT
app.listen(HTTP_PORT, onHttpStart);



//login with email and password...
//find one user name and if match with password then render to main page which is secret page

//implement bcrypt with salting with 10 rounds of salting
//passport-local-mongoose will salt and hash