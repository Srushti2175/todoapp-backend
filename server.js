// ==========================================
// 1. IMPORTING LIBRARIES
// ==========================================
const express = require('express'); // Imports the Express framework
const cors = require('cors');       // Imports CORS (allows frontend to connect)
require("dotenv").config();       // Imports the dotenv package
const mongoose = require('mongoose'); // IMPORT MONGOOSE

// ==========================================
// 2. CONFIGURING THE APP
// ==========================================
const app = express();  // Creates our server app
const PORT = 3000;      // The "door" our server will listen on

// Middleware (Helpers)
app.use(cors());        // Apply CORS security rule
app.use(express.json());// Tells the server to understand JSON data

// // ==========================================
// // 3. FAKE DATABASE
// // ==========================================
// // We'll store our data in an array for now. (Later we'll use a real database!)
// let todos = [];
// let nextId = 1;

// ==========================================
// NEW: CONNECT TO MONGODB
// ==========================================
// This connects to your local computer's MongoDB and creates a database named "todoapp"
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.error('❌ Failed to connect to MongoDB', err));

// ==========================================
// NEW: DEFINE OUR DATA BLUEPRINT (SCHEMA)
// ==========================================
// We tell MongoDB exactly what a Todo should look like
const TodoSchema = new mongoose.Schema({
    text: { type: String, required: true }, // The task text is required
    done: { type: Boolean, default: false } // By default, done is false
});

// Create the model
const Todo = mongoose.model('Todo', TodoSchema);


// // ==========================================
// // 4. API ROUTES (The Waiters)
// // ==========================================

// // Our first API! When someone makes a GET request to /api/test, send a message.
// app.get('/api/test', (req, res) => {
//     // req = Request (what the client asked for)
//     // res = Response (what we send back)
    
//     // Send a simple JSON message!
//     res.json({ message: "Hello! The server is working perfectly 🚀" });
// });

// // A route to get all todos
// app.get('/api/todos', (req, res) => {
//     res.json(todos);
// });

// // ==========================================
// // 5. STARTING THE SERVER
// // ==========================================
// // Tell the server to start listening for requests
// app.listen(PORT, () => {
//     console.log(`✅ Server is running on http://localhost:${PORT}`);
// });

// ==========================================
// OUR REAL API ROUTES (CRUD)
// ==========================================

// 1. GET: Fetch all todos from database
app.get('/api/todos', async (req, res) => {
    const todos = await Todo.find(); // Find all todos in the DB
    res.json(todos);
});

// 2. POST: Add a new todo to the database
app.post('/api/todos', async (req, res) => {
    const newTodo = new Todo({
        text: req.body.text
    });
    const savedTodo = await newTodo.save(); // Save to DB!
    res.status(201).json(savedTodo);
});

// 3. DELETE: Delete a todo from the database
app.delete('/api/todos/:id', async (req, res) => {
    // MongoDB generates an automatic ID for us called _id
    await Todo.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
