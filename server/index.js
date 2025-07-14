const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const AWS = require('aws-sdk');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const S3_BUCKET = process.env.AWS_BUCKET_NAME;

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log(err));

// Schemas
const LinkSchema = new mongoose.Schema({
  title: String,
  description: String,
  url: String,        // Optional: for external link
  fileUrl: String,    // Optional: for uploaded S3 file
  domain: String,
  postedAt: { type: Date, default: Date.now },
});
const Link = mongoose.model('Link', LinkSchema);

const DomainSchema = new mongoose.Schema({
  name: { type: String, unique: true },
});
const Domain = mongoose.model('Domain', DomainSchema);

// Dummy teacher credentials
const USER = { username: 'teacher123', password: 'secret123' };

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

// Auth Middleware
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

// CRUD: Links

// Create
app.post('/api/links', authMiddleware, async (req, res) => {
  const { title, description, url, fileUrl, domain } = req.body;
  const newLink = new Link({ title, description, url, fileUrl, domain });
  await newLink.save();
  res.json({ message: 'Link posted' });
});

// Read (public)
app.get('/api/links', async (req, res) => {
  const links = await Link.find().sort({ postedAt: -1 });
  res.json(links);
});

// Update
app.put('/api/links/:id', authMiddleware, async (req, res) => {
  const { title, description, url, fileUrl, domain } = req.body;
  await Link.findByIdAndUpdate(req.params.id, { title, description, url, fileUrl, domain });
  res.json({ message: 'Link updated' });
});

// Delete
app.delete('/api/links/:id', authMiddleware, async (req, res) => {
  const link = await Link.findById(req.params.id);
  if (!link) return res.status(404).json({ message: 'Post not found' });

  const s3UrlPrefix = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  const fileUrl = link.fileUrl;

  if (fileUrl && fileUrl.startsWith(s3UrlPrefix)) {
    const key = decodeURIComponent(fileUrl.substring(s3UrlPrefix.length));
    const deleteParams = { Bucket: S3_BUCKET, Key: key };

    try {
      await s3.deleteObject(deleteParams).promise();
      console.log("S3 file deleted:", key);
    } catch (err) {
      console.error("Error deleting S3 file:", err.message);
    }
  }

  await Link.findByIdAndDelete(req.params.id);
  res.json({ message: 'Link and associated file deleted (if applicable)' });
});

// CRUD: Domains

// Read
app.get('/api/domains', async (req, res) => {
  const domains = await Domain.find();
  res.json(domains);
});

// Create
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

// Update
app.put('/api/domains/:id', authMiddleware, async (req, res) => {
  const { name } = req.body;
  await Domain.findByIdAndUpdate(req.params.id, { name });
  res.json({ message: 'Domain updated' });
});

// Delete domain + all related links + files
app.delete('/api/domains/:id', authMiddleware, async (req, res) => {
  const domainToDelete = await Domain.findById(req.params.id);
  if (!domainToDelete) return res.status(404).json({ message: 'Domain not found' });

  const domainName = domainToDelete.name;
  const links = await Link.find({ domain: domainName });

  const s3UrlPrefix = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  for (const link of links) {
    if (link.fileUrl && link.fileUrl.startsWith(s3UrlPrefix)) {
      const key = decodeURIComponent(link.fileUrl.substring(s3UrlPrefix.length));
      try {
        await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();
        console.log("Deleted file:", key);
      } catch (err) {
        console.error("Error deleting domain file from S3:", err.message);
      }
    }
  }

  await Link.deleteMany({ domain: domainName });
  await Domain.findByIdAndDelete(req.params.id);
  res.json({ message: 'Domain and related posts/files deleted' });
});

// S3 Upload
app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const fileName = `${Date.now()}_${req.file.originalname}`;
  const params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    // ACL: 'public-read',
  };

  try {
    const result = await s3.upload(params).promise();
    res.json({ url: result.Location });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ message: 'S3 upload failed', error: err.message });
  }
});

// S3 Download (stream)
app.get('/api/download/:filename', async (req, res) => {
  const filename = req.params.filename;

  const params = {
    Bucket: S3_BUCKET,
    Key: filename
  };

  try {
    const fileStream = s3.getObject(params).createReadStream();
    fileStream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
