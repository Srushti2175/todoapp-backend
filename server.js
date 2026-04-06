// ==========================================
// 1. IMPORTING LIBRARIES
// ==========================================
const express = require('express');
const cors = require('cors');
require("dotenv").config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('./auth.middleware');

// ==========================================
// 2. CONFIGURING THE APP
// ==========================================
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// 3. DATABASE MODELS
// ==========================================
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('✅ Connected to MongoDB!'))
    .catch((err) => console.error('❌ Failed to connect to MongoDB', err));

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

const TodoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Todo = mongoose.model('Todo', TodoSchema);

// ==========================================
// 4. AUTH ROUTES
// ==========================================

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User created!" }); 
    } catch (error) {
        res.status(400).json({ error: "Signup failed!" });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid credentials!" });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token }); 
    } catch (error) {
        res.status(500).json({ error: "Login error!" });
    }
});

// ==========================================
// 5. TODO ROUTES (CRUD)
// ==========================================

// Get all
app.get('/api/todos', verifyToken, async (req, res) => {
    try {
        const todos = await Todo.find({ userId: req.user.id });
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: "Fetch error" });
    }
});

// Add new
app.post('/api/todos', verifyToken, async (req, res) => {
    try {
        const newTodo = new Todo({ text: req.body.text, userId: req.user.id });
        const savedTodo = await newTodo.save();
        res.status(201).json(savedTodo);
    } catch (error) {
        res.status(500).json({ error: "Add error" });
    }
});

// Delete
app.delete('/api/todos/:id', verifyToken, async (req, res) => {
    try {
        await Todo.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ error: "Delete error" });
    }
});

// Toggle Done (History Logic)
app.put('/api/todos/:id', verifyToken, async (req, res) => {
    try {
        const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
        if (!todo) return res.status(404).json({ error: "Not found" });

        todo.done = !todo.done;
        todo.completedAt = todo.done ? new Date() : null;
        await todo.save();
        res.json(todo);
    } catch (error) {
        res.status(500).json({ error: "Update error" });
    }
});

// ==========================================
// 6. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
