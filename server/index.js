// server/index.js
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const AWS      = require('aws-sdk');
const path     = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));

/* ======================  AWS S3  ====================== */
const s3 = new AWS.S3({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region:          process.env.AWS_REGION,
});
const S3_BUCKET = process.env.AWS_BUCKET_NAME;

/* --------------- Multer (memory) ---------------- */
const upload = multer({ storage: multer.memoryStorage() });

/* ====================== Mongo ====================== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(console.error);

/* ====================== Schemas ====================== */
const Link = mongoose.model('Link', new mongoose.Schema({
  title: String,
  description: String,
  url: String,      // external URL
  fileUrl: String,  // uploaded file on S3
  domain: String,
  postedAt: { type: Date, default: Date.now },
}));

const Domain = mongoose.model('Domain', new mongoose.Schema({
  name: { type: String, unique: true },
}));

/* ====================== Auth ====================== */
const USER = { username: 'teacher123', password: 'secret123' };

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === USER.username && password === USER.password) {
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET);
    res.json({ token });
  } else res.status(401).json({ message: 'Invalid credentials' });
});

function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr) return res.sendStatus(401);
  const token = hdr.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/* ====================== LINK (post) CRUD ====================== */
app.get('/api/links', async (_req, res) => {
  const links = await Link.find().sort({ postedAt: -1 });
  res.json(links);
});

app.post('/api/links', authMiddleware, async (req, res) => {
  const { title, description, url, fileUrl, domain } = req.body;
  try {
    const link = new Link({ title, description, url, fileUrl, domain });
    await link.save();
    res.json({ message: 'Link created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating link' });
  }
});

app.put('/api/links/:id', authMiddleware, async (req, res) => {
  const { title, description, url, fileUrl, domain } = req.body;

  try {
    const existing = await Link.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Link not found' });

    const deleteFromS3 = async (fileUrl) => {
      if (!fileUrl) return;
      const u = new URL(fileUrl);
      const hostMatchesBucket = u.hostname.startsWith(`${S3_BUCKET}.s3`);
      if (hostMatchesBucket) {
        const key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
        await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();
        console.log('Old S3 file deleted:', key);
      }
    };

    if (existing.fileUrl && existing.fileUrl !== fileUrl) {
      await deleteFromS3(existing.fileUrl);
    }

    await Link.findByIdAndUpdate(req.params.id, { title, description, url, fileUrl, domain });
    res.json({ message: 'Link updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating link' });
  }
});


app.delete('/api/links/:id', authMiddleware, async (req, res) => {
  const link = await Link.findById(req.params.id);
  if (!link) return res.status(404).json({ message: 'Post not found' });

  try {
    const deleteFromS3 = async (fileUrl) => {
      const u = new URL(fileUrl);
      const hostMatchesBucket = u.hostname.startsWith(`${S3_BUCKET}.s3`);
      if (hostMatchesBucket) {
        const key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
        await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();
        console.log('S3 file deleted:', key);
      }
    };

    if (link.fileUrl) await deleteFromS3(link.fileUrl);
    await Link.findByIdAndDelete(req.params.id);
    res.json({ message: 'Link (and file if present) deleted' });
  } catch (err) {
    console.warn('S3 cleanup failed:', err.message);
    await Link.findByIdAndDelete(req.params.id);
    res.json({ message: 'Link deleted with warning' });
  }
});

/* ====================== DOMAIN CRUD ====================== */
app.get('/api/domains', async (_req, res) => {
  res.json(await Domain.find());
});

app.post('/api/domains', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  try {
    await new Domain({ name }).save();
    res.json({ message: 'Domain created' });
  } catch {
    res.status(400).json({ message: 'Domain exists or error' });
  }
});

app.put('/api/domains/:id', authMiddleware, async (req, res) => {
  await Domain.findByIdAndUpdate(req.params.id, { name: req.body.name });
  res.json({ message: 'Domain updated' });
});

app.delete('/api/domains/:id', authMiddleware, async (req, res) => {
  const dom = await Domain.findById(req.params.id);
  if (!dom) return res.status(404).json({ message: 'Domain not found' });

  try {
    // Find all links with that domain
    const links = await Link.find({ domain: dom.name });

    // Delete associated S3 files (if any)
    for (const link of links) {
      if (link.fileUrl) {
        const u = new URL(link.fileUrl);
        const hostMatchesBucket = u.hostname.startsWith(`${S3_BUCKET}.s3`);
        if (hostMatchesBucket) {
          const key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
          try {
            await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();
            console.log('Deleted S3 file:', key);
          } catch (s3Err) {
            console.warn(`Failed to delete S3 object: ${key}`, s3Err.message);
          }
        }
      }
    }

    // Delete the posts (links) from DB
    await Link.deleteMany({ domain: dom.name });

    // Finally, delete the domain
    await Domain.findByIdAndDelete(req.params.id);

    res.json({ message: 'Domain and all related posts deleted' });

  } catch (err) {
    console.error('Error deleting domain and posts:', err);
    res.status(500).json({ message: 'Error deleting domain and its posts' });
  }
});

/* ============ S3 Upload & Download ============ */
app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const safe = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const Key  = `${Date.now()}_${safe}`;

  try {
    const { Location } = await s3.upload({
      Bucket: S3_BUCKET, Key,
      Body: req.file.buffer, ContentType: req.file.mimetype,
    }).promise();
    res.json({ url: Location });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ message: 'S3 upload failed' });
  }
});

app.get('/api/download/:filename', async (req, res) => {
  const params = { Bucket: S3_BUCKET, Key: req.params.filename };
  try {
    s3.getObject(params).createReadStream().pipe(res);
  } catch {
    res.status(500).json({ message: 'Download error' });
  }
});

/* ====================== START ====================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
