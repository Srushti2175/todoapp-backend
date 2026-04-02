// ==========================================
// 1. IMPORTING LIBRARIES
// ==========================================
const express = require('express'); // Imports the Express framework
const cors = require('cors');       // Imports CORS (allows frontend to connect)
require("dotenv").config();       // Imports the dotenv package
const mongoose = require('mongoose'); // IMPORT MONGOOSE
const bcrypt = require('bcrypt'); // IMPORT BCRYPT
const jwt = require('jsonwebtoken'); // IMPORT JWT
const verifyToken = require('./auth.middleware'); // IMPORT AUTH MIDDLEWARE

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
// NEW: DEFINE OUR USER BLUEPRINT (SCHEMA) => authentication schema
// ==========================================
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // unique means two people can't use the same email
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// ==========================================
// NEW: DEFINE OUR DATA BLUEPRINT (SCHEMA) => todo schema
// ==========================================
// We tell MongoDB exactly what a Todo should look like
const TodoSchema = new mongoose.Schema({
    text: { type: String, required: true }, // The task text is required
    done: { type: Boolean, default: false }, // By default, done is false

    // NEW LINE ADDED: Links this Todo to a specific User
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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
// USER AUTHENTICATION ROUTES
// ==========================================

// POST: Register (Signup) a new user
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body; // Extract user details from the request

        // 1. Hash the password! (10 means scramble it 10 times for safety)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Create the new user with the hashed password instead of the real one
        const newUser = new User({
            name: name,
            email: email,
            password: hashedPassword
        });

        // 3. Save the user to the database
        await newUser.save();
        res.status(201).json({ message: "User created successfully!" });

    } catch (error) {
        // If there's an error (like an email that already exists), send an error message
        res.status(400).json({ error: "Could not create user. Email might already exist." });
    }
});

// POST: Login an existing user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if a user with this email exists in the database
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ error: "User not found!" });
        }

        // 2. Compare the password they typed with the hashed one in the database
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ error: "Incorrect password!" });
        }

        // 3. Keep the user logged in using a JWT (The yellow wristband!)
        // We pack their hidden userId inside the token. Valid for 1 hour.
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 4. Send the token back to the frontend
        res.json({ message: "Login successful!", token: token });

    } catch (error) {
        res.status(500).json({ error: "Something went wrong during login." });
    }
});

// ==========================================
// OUR REAL API ROUTES (CRUD)
// ==========================================

// // 1. GET: Fetch all todos from database
// app.get('/api/todos', async (req, res) => {
//     const todos = await Todo.find(); // Find all todos in the DB
//     res.json(todos);
// });

// 1. GET: Fetch only THIS user's todos (PROTECTED)
app.get('/api/todos', verifyToken, async (req, res) => {
    try {
        // Find todos WHERE the userId matches the logged-in user's ID
        const todos = await Todo.find({ userId: req.user.id });
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch todos" });
    }
});

// // 2. POST: Add a new todo to the database
// app.post('/api/todos', async (req, res) => {
//     const newTodo = new Todo({
//         text: req.body.text
//     });
//     const savedTodo = await newTodo.save(); // Save to DB!
//     res.status(201).json(savedTodo);
// });

// 2. POST: Add a new todo (PROTECTED)
app.post('/api/todos', verifyToken, async (req, res) => {
    try {
        // We create a new todo, but now we also pass the userId!
        const newTodo = new Todo({
            text: req.body.text,
            userId: req.user.id // <--- The bouncer (verifyToken) gave us this ID!
        });
        
        const savedTodo = await newTodo.save(); // Save to DB!
        res.status(201).json(savedTodo);
    } catch (error) {
        res.status(500).json({ error: "Failed to create todo" });
    }
});

// // 3. DELETE: Delete a todo from the database
// app.delete('/api/todos/:id', async (req, res) => {
//     // MongoDB generates an automatic ID for us called _id
//     await Todo.findByIdAndDelete(req.params.id);
//     res.json({ message: "Deleted successfully" });
// });

// 3. DELETE: Delete a todo (PROTECTED + only the OWNER can delete)
app.delete('/api/todos/:id', verifyToken, async (req, res) => {
    try {
        // Find the todo first
        const todo = await Todo.findById(req.params.id);
        if (!todo) {
            return res.status(404).json({ error: "Todo not found!" });
        }

        // Check: does the logged-in user own this todo?
        if (todo.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: "You are not allowed to delete this todo!" });
        }

        // Now delete it safely
        await Todo.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete todo" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
