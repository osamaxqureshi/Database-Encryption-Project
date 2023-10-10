//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const { default: mongoose } = require("mongoose");
const encrypt = require("mongoose-encryption");
md5 = require("md5");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

const saltRounds = 10;
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user);
});
 
passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true,
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true });

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", passport.authenticate("google", { failureRedirect: "/login" }), function(req, res){
  res.redirect("/secrets");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});


//* Bcrypt /register route */
// app.post("/register", function (req, res) {
//   bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
//     const newUser = new User({
//       username: req.body.username,
//       password: hash,
//     });
//     newUser.save().then(function (success) {
//       if (success) {
//         res.render("secrets");
//       } else {
//         console.log(err);
//       }
//     });
//   });
// });

// * Bcrypt /login route */
// app.post("/login", function (req, res) {
//   const username = req.body.username;
//   const password = req.body.password;

//   User.findOne({ username: username }).then(function (foundUser) {
//     if (foundUser) {
//       bcrypt.compare(password, foundUser.password, function (err, result) {
//         if (result === true) {
//           res.render("secrets");
//         } else {
//           res.render("login");
//         }
//       });
//     }
//   });
// });

/** Passport /register route */
app.post("/register", function (req, res) {
  User.register(
    new User({ username: req.body.username }),
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.render("register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.render("secrets");
        });
      }
    }
  );
});

/** Passport /login route */
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.listen("3000", function () {
  console.log("Successfully running on port 3000");
});
