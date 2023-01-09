/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
var cookieParser = require("cookie-parser")
const bodyParser = require("body-parser");
const passport = require('passport');
const connectEnsureLogin = require('connect-ensure-login');
const session = require('express-session');
const flash = require("connect-flash");
const path = require("path");
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { Todo,User } = require("./models");

app.use(flash());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended:false}));
app.use(cookieParser("some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "my-super-secret-key-213444395894534",
  cookie: {
    maxAge: 24*60*60*1000,
  },
}));

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, {
              //if password is not correct
              message: "Invalid Email id or password",
            });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Invalid Email id (or) password" });
  });
}));

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null,user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
  .then(user => {
    done(null,user)
  })
  .catch(error => {
    done(error, null)
  })
});
app.get("/", async (request, response) => {
  var bul = false;
  if (request.user) {
    bul = true;
  }
  response.render("index", {
    title: "Todo Application",
    loginStatus: bul,
    csrfToken: request.csrfToken(),
  });
});

app.get("/todos", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const loggedInUser= request.user.id;
  const allTodo = await Todo.getTodos(loggedInUser);
  const dueToday = await Todo.dueToday(loggedInUser);
  const overdue = await Todo.overdue(loggedInUser);
  const dueLater = await Todo.dueLater(loggedInUser);
  const completedItems=await Todo.completedItems(loggedInUser);
  if (request.accepts("html")) {
    response.render("todos", {
      overdue,
      allTodo,
      dueToday,
      dueLater,
      completedItems,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.json({ allTodo, dueToday, dueLater, overdue });
  }
} );

app.get("/signup",(request,response) => {
response.render("signup", {title: "Signup", csrfToken: request.csrfToken()})
});
app.get("/login", (request,response) => {
  response.render("login", { title: "Login",csrfToken: request.csrfToken()});
})
app.post("/users", async (request, response) => {
  if (request.body.firstName.length == 0) {
    request.flash("error", "First name Required!!");
    return response.redirect("/signup");
  } else if (request.body.email.length == 0) {
    request.flash("error", "Email Required!!");
    return response.redirect("/signup");
  } else if (request.body.password.length == 0) {
    request.flash("error", "Password Required!!");
    return response.redirect("/signup");
  }
  console.log("creating new User", request.body);
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: request.body.firstname,
      lastName: request.body.lastname,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/todos");
      } else {
        request.flash("success", "Sign up is successfull");
        response.redirect("/todos");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "Email already Existing..");
    return response.redirect("/signup");
  }
});
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/todos");
  }
);


app.get("/signout", (request,response,next) => {
  request.logout((err) => {
    if (err) { return next(err); }
    response.redirect("/");
})
})

//app.get("/todos", connectEnsureLogin.ensureLoggedIn(), async function (_request, response) {
  //console.log("Processing list of all Todos ...");
  // FILL IN YOUR CODE HERE

  // First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
  // Then, we have to respond with all Todos, like:
  // response.send(todos)
  //try {
    //const todos = await Todo.findAll();
    //return response.send(todos);
  //} catch (error) {
    //console.log(error);
    //return response.status(422).send(error);
  //}
//});

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});
app.post("/todos", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  if (request.body.title.length < 5) {
    request.flash("error", "your title should be atleast 5 characters");
    return response.redirect("/todos");
  }
  if (request.body.dueDate.length==0) {
    request.flash("error", "select a due date!!!");
    return response.redirect("/todos");
  }
  console.log("creating new todo", request.body);
  try {
     await Todo.addTodo({
       title: request.body.title,
       dueDate: request.body.dueDate,
       userId: request.user.id
    });
    return response.redirect("/todos");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id/", connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  const loggedInUser = request.user.id;
  try {
    const todo = await Todo.findByPk(request.params.id);
    const updatedTodo = await todo.setCompletionStatus(
      request.body.completed, 
      loggedInUser
    );
    console.log("the checkkk....", updatedTodo);
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});
app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Todo with ID: ", request.params.id);
    // FILL IN YOUR CODE HERE
    try {
      const res = await Todo.remove(request.params.id, request.user.id);
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
    // First, we should query our database to delete a Todo by ID and then we have to respond back with true/false
    // based on whether the Todo was deleted or not.
  }
);


module.exports = app;