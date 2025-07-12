const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(
cors({
origin: '*',
methods: ['GET', 'POST', 'PUT', 'DELETE'],
})
);

// MongoDB connection
mongoose
.connect(process.env.MONGO_URI)
.then(() => {
console.log('MongoDB Connected');
})
.catch((err) => console.log(err));

// Schemas
const LinkSchema = new mongoose.Schema({
title: String,
description: String,
url: String,
domain: String, // ⬅️ New field
postedAt: { type: Date, default: Date.now },
});
const Link = mongoose.model('Link', LinkSchema);

const DomainSchema = new mongoose.Schema({
name: { type: String, unique: true },
});
const Domain = mongoose.model('Domain', DomainSchema);

// Dummy teacher credentials
const USER = {
username: 'teacher123',
password: 'secret123',
};

// Auth Route
app.post('/api/login', (req, res) => {
const { username, password } = req.body;
if (username === USER.username && password === USER.password) {
const token = jwt.sign({ user: username }, process.env.JWT_SECRET);
res.json({ token });
} else {
res.status(401).json({ message: 'Invalid credentials' });
}
});

// Middleware for protected routes
function authMiddleware(req, res, next) {
const authHeader = req.headers.authorization;
if (!authHeader) return res.sendStatus(401);

const token = authHeader.split(' ')[1];
jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
if (err) return res.sendStatus(403);
req.user = user;
next();
});
}

// POST CRUD

// CREATE
app.post('/api/links', authMiddleware, async (req, res) => {
const { title, description, url, domain } = req.body;
const newLink = new Link({ title, description, url, domain });
await newLink.save();
res.json({ message: 'Link posted' });
});

// READ (Public)
app.get('/api/links', async (req, res) => {
const links = await Link.find().sort({ postedAt: -1 });
res.json(links);
});

// UPDATE
app.put('/api/links/:id', authMiddleware, async (req, res) => {
const { title, description, url, domain } = req.body;
await Link.findByIdAndUpdate(req.params.id, {
title,
description,
url,
domain,
});
res.json({ message: 'Link updated' });
});

// DELETE
app.delete('/api/links/:id', authMiddleware, async (req, res) => {
await Link.findByIdAndDelete(req.params.id);
res.json({ message: 'Link deleted' });
});

// DOMAIN CRUD

// Get all domains (public)
app.get('/api/domains', async (req, res) => {
const domains = await Domain.find();
res.json(domains);
});

// Create domain
app.post('/api/domains', authMiddleware, async (req, res) => {
const { name } = req.body;
if (!name) return res.status(400).json({ message: 'Name is required' });

try {
const newDomain = new Domain({ name });
await newDomain.save();
res.json({ message: 'Domain created' });
} catch (err) {
res.status(400).json({ message: 'Domain already exists or error' });
}
});

// Update domain
app.put('/api/domains/:id', authMiddleware, async (req, res) => {
const { name } = req.body;
await Domain.findByIdAndUpdate(req.params.id, { name });
res.json({ message: 'Domain updated' });
});

// Delete domain
app.delete('/api/domains/:id', authMiddleware, async (req, res) => {
await Domain.findByIdAndDelete(req.params.id);
res.json({ message: 'Domain deleted' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port ${PORT}'));