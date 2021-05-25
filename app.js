require('dotenv').config()
const express = require("express");
const http = require("http");
var path = require("path");
const _ = require("lodash");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate")
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var expressLayouts = require('express-ejs-layouts');
const bodyParser = require("body-parser")
const app = express();
const ejs = require("ejs");


//view engine setup

app.set('view engine', 'ejs');

//static folder
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
//routes
// app.use(Router);

//Session initialization
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}))

//passport-plugins
app.use(passport.initialize());
app.use(passport.session());

//mongoose connection
 mongoose.connect("mongodb+srv://book1234:book2021@cluster0.y2gry.mongodb.net/test", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, ()=>
 console.log('db connected'),);
mongoose.set('useCreateIndex', true);


//Schema Define
const bookSchema = new mongoose.Schema({
  booktitle: String,
  genre: String,
  bookauthor: String,
  url: String,
  language: String,
  link: String,
  bookContent: String
})

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  Mybook: [bookSchema]
});

userSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("User", userSchema);
const Book = new mongoose.model("Book", bookSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


// <!-- Google Auth -->
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://shielded-crag-73381.herokuapp.com/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOne( {googleId : profile.id}, function( err, foundUser ){
    if( !err ){                                                          //Check for any errors
        if( foundUser ){                                          // Check for if we found any users
            return cb( null, foundUser );                  //Will return the foundUser
        }else {                                                        //Create a new User
            const newUser = new User({
                googleId : profile.id
            });
            newUser.save( function( err ){
                if(!err){
                    return cb(null, newUser);                //return newUser
                }
            });
        }
    }else{
        console.log( err );
    }
});
  }
));

//routes
function isLoggedIn(req,res,next){
  if(req.isAuthenticated())return next();
  res.redirect('/signin')
}
function isLoggedOut(req,res,next){
  if(!req.isAuthenticated())return next();
  res.redirect('/')
}

// <!-- Google login route -->
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/home',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/home");
    });


app.get("/", function(req, res) {
  res.render("register");
})

//Register Route
app.post("/register", function(req, res) {
  console.log(req.body.username);
  console.log(req.body.password);
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/")
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/home")
      })
    }
  })
});

//Sign in Route
app.get("/signin", function(req, res) {
  res.render("signin");
})

app.post("/signin", function(req, res) {
  //console.log(req.body.username);
  //console.log(req.body.password);
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);

    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/home");
      })
    }
});
 });
app.get('/logout',(req,res)=>{
  req.session.destroy();
  res.redirect('/');
})

// <!-- Category Route -->
app.get("/home/category/:genre", function(req, res) {
if (req.isAuthenticated()) {
  const list = _.capitalize([req.params.genre]);
  Book.find({genre: list}, function(err, found) {
    res.render("catogory", {newListItem: found, new: list})
  })
}
else {
  res.redirect("/signin")
}

})

//home route
app.get("/home",isLoggedIn, function(req, res) {
  if (req.isAuthenticated()) {
    Book.find({}, function(err, foundList) {
      if(err) {
          res.send(err)
      }
      else {
        res.render("home", {newListItem: foundList})
      }

    })

  } else {
    res.redirect("/signin")
  }
})

// <!-- addbook route -->
app.get("/addbook", function(req, res) {
  if (req.isAuthenticated()) {
  console.log(req.user.id);
  console.log(req.user.email);
  res.render("addbook")
}
else {
  res.render("signin")
}
})



app.post("/addbook", function(req, res) {
  if (req.isAuthenticated()) {
    console.log(req.body.title);
    console.log(req.body.author);
    console.log(req.body.content);

    const genre = _.capitalize(req.body.genre);
    const title = req.body.title;
    const author = req.body.author;
    const content = req.body.content;
    const image = req.body.image;
    const link = req.body.link;
    const lan = req.body.language;
    console.log(genre);

      const book1 = new Book ({
        genre: genre,
        booktitle: req.body.title,
        bookauthor: req.body.author,
        url: req.body.image,
        language: req.body.language,
        link: req.body.link,
        bookContent: req.body.content
      })
      book1.save();
      res.redirect("/home");
  }

   else {
    res.redirect("/signin")
  }

})

//  <!-- View Book Route -->

app.get("/home/:id", function(req, res) {
  if (req.isAuthenticated()) {
    console.log(req.user.id);
const name = req.params.id;
Book.findOne({booktitle: name}, function(err, found) {
   res.render("viewpage", {img: found.url, title: found.booktitle, author: found.bookauthor, genre: found.genre, content: found.bookContent, link: found.link})
})
  }
  else {
    res.redirect("/signin")
  }
})



// <!-- My Book Route -->

app.get("/home/mybooks/:title", function(req, res) {
 if (req.isAuthenticated()) {
   console.log(req.params.title);
   console.log(req.user.id);
   User.findOne({_id: req.user.id}, function(err, found) {
     if (err) {
        res.send(err);
     }
     else {
       Book.findOne({booktitle: req.params.title}, function(err, foundList) {
      if (err) {
        res.send(err);
      }
      else {
      const book1 = new Book({
        booktitle: foundList.booktitle,
        genre: foundList.genre,
        bookauthor: foundList.bookauthor,
        url: foundList.url,
        language: foundList.language,
        link: foundList.link,
        bookContent: foundList.bookContent
       })
       found.Mybook.push(book1);
       found.save();
       res.render("mybook", {newListItem: found.Mybook});
       }
       })
     }
   })
  }
  else {
    res.send("/signin")
  }
})

app.get("/mybook", function(req, res) {
  if (req.isAuthenticated()) {
    User.findOne({_id: req.user.id}, function(err, found) {
      res.render("mybook", {newListItem: found.Mybook})
    })
  }
  else {
    res.redirect("/signin")
  }

})

// <!-- Search Route -->
app.post("/home", function(req, res) {
  if (req.isAuthenticated()) {
    const search = _.startCase(_.toLower(req.body.search));
    console.log(search);
    Book.find({booktitle: search}, function(err, foundList) {
      if (err) {
        res.send(err);
      }
      else {
        console.log(foundList);
        res.render("searchbook", {newListItem: foundList})
      }
    })
  }
else {
  res.send("/signin");
}
})

//listening port setup
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
