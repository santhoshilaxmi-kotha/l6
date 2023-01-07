/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
var cookieParser = require("cookie-parser")
const { Todo } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended:false}));
app.use(cookieParser("some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.get("/", async (request, response) => {
  const allTodo = await Todo.getTodos();
  const dueToday = await Todo.dueToday();
  const overdue = await Todo.overdue();
  const dueLater = await Todo.dueLater();
  const completedItems=await Todo.completedItems();

  if (request.accepts("html")) {
    response.render("index", {
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
});

app.get("/", function (request, response) {
  response.send("Hello World");
});

app.get("/todos", async function (_request, response) {
  console.log("Processing list of all Todos ...");
  // FILL IN YOUR CODE HERE

  // First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
  // Then, we have to respond with all Todos, like:
  // response.send(todos)
  try {
    const todos = await Todo.findAll();
    return response.send(todos);
  } catch (error) {
    console.log(error);
    return response.status(422).send(error);
  }
});

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos", async (request, response) => {
  console.log("CREATING A TODO",request.body);
  try {
     await Todo.addTodo({
       title: request.body.title,
       dueDate: request.body.dueDate,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id/", async function (request, response) {
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.setCompletionStatus(
      request.body.completed, 
    );
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  console.log("We have to delete a Todo with ID: ", request.params.id);
  // FILL IN YOUR CODE HERE

  // First, we have to query our database to delete a Todo by ID.
  // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
  // response.send(true)
  // 
  try{
    await Todo.remove(request.params.id);
    return  response.json({success: true});
  } catch(error){
    return response.status(422).json(error);
  }
});

module.exports = app;