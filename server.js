const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const posts = {};

function createPostId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateDraftCaption(theme, filename) {
  const fileLabel = filename ? path.basename(filename, path.extname(filename)).replace(/[_-]/g, ' ') : 'premium property';
  return `Discover this premium ${theme.toLowerCase()} listing inspired by ${fileLabel}. Professionally staged and ready for market, with Company License: C-001702 | Agent License: A-987654 | Property ID: PROP-00234. Edit this caption for your Facebook audience before sharing.`;
}

app.post('/api/upload-asset', upload.single('asset'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an image or video asset.' });
  }

  const assetUrl = `/uploads/${req.file.filename}`;
  const theme = req.body.theme || 'Property Spotlight';
  const draftCaption = generateDraftCaption(theme, req.file.originalname);

  return res.json({ assetUrl, draftCaption, filename: req.file.originalname });
});

app.post('/api/create-post', (req, res) => {
  const { theme, caption, assetUrl } = req.body;
  if (!theme || !caption || !assetUrl || typeof caption !== 'string' || caption.trim().length === 0) {
    return res.status(400).json({ error: 'Theme, caption, and uploaded asset are required.' });
  }

  const postId = createPostId();
  const normalizedCaption = caption.trim();
  posts[postId] = {
    id: postId,
    theme,
    caption: normalizedCaption,
    assetUrl,
    createdAt: new Date().toISOString()
  };

  return res.json({ postId });
});

app.get('/post/:id', (req, res) => {
  const { id } = req.params;
  const post = posts[id];

  if (!post) {
    return res.status(404).send('<h1>Post not found</h1><p>The shared post could not be found.</p>');
  }

  const hostUrl = `${req.protocol}://${req.get('host')}`;
  const postUrl = `${hostUrl}/post/${encodeURIComponent(id)}`;
  const cleanTitle = `Share Preview • ${post.theme}`;
  const description = post.caption;
  const isVideo = /\.(mp4|mov|webm|mkv)$/i.test(post.assetUrl || '');
  const ogImageUrl = isVideo
    ? `https://via.placeholder.com/1200x630.png?text=Video+Preview` 
    : `${hostUrl}${post.assetUrl}`;

  const assetPreview = isVideo
    ? `<video controls class="preview-media"><source src="${hostUrl}${post.assetUrl}" type="video/mp4">Your browser does not support video preview.</video>`
    : `<div class="preview-image" style="background-image: url('${ogImageUrl}')"></div>`;

  res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${cleanTitle}</title>
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${cleanTitle}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:url" content="${postUrl}" />
    <meta property="og:site_name" content="Facebook Custom Media Creator" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanTitle}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        background: #f4f6f8;
        color: #1f2937;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
      }
      .preview-card {
        max-width: 760px;
        width: 100%;
        padding: 28px;
        border-radius: 18px;
        background: white;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
      }
      .preview-card h1 {
        margin-top: 0;
      }
      .preview-image,
      .preview-media {
        width: 100%;
        max-height: 380px;
        border-radius: 14px;
        margin: 24px 0;
        object-fit: cover;
      }
      .preview-image {
        min-height: 220px;
        background-position: center;
        background-size: cover;
      }
    </style>
  </head>
  <body>
    <div class="preview-card">
      <h1>${cleanTitle}</h1>
      <p>${description}</p>
      ${assetPreview}
      <p><strong>Template</strong>: ${post.theme}</p>
      <p><strong>Post URL</strong>: <a href="${postUrl}">${postUrl}</a></p>
    </div>
  </body>
</html>`);
});

app.listen(port, () => {
  console.log(`Facebook Custom Media Creator backend running on http://localhost:${port}`);
});
