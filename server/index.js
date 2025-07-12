const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("MongoDB Connected");
}).catch(err => console.log(err));

// Schemas
const LinkSchema = new mongoose.Schema({
    title: String,
    description: String,
    url: String,
    postedAt: { type: Date, default: Date.now }
});
const Link = mongoose.model("Link", LinkSchema);

// Dummy teacher credentials
const USER = {
    username: "teacher123",
    password: "secret123"
};

// Auth Route
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === USER.username && password === USER.password) {
        const token = jwt.sign({ user: username }, process.env.JWT_SECRET);
        res.json({ token });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// Middleware for protected routes
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.sendStatus(401);

    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Post a new link
app.post("/api/links", authMiddleware, async (req, res) => {
    const { title, description, url } = req.body;
    const newLink = new Link({ title, description, url });
    await newLink.save();
    res.json({ message: "Link posted" });
});

// Get all links (public)
app.get("/api/links", async (req, res) => {
    const links = await Link.find().sort({ postedAt: -1 });
    res.json(links);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
