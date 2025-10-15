const express = require('express');
const multer = require('multer');
const { Client } = require('basic-ftp');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config.json');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// FTP client helper
async function createFtpClient() {
  const client = new Client();
  client.ftp.verbose = false;
  await client.access({
    host: config.ftp.host,
    port: config.ftp.port,
    user: config.ftp.user,
    password: config.ftp.password,
    secure: config.ftp.secure
  });
  return client;
}

// Upload file to FTP
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const client = new Client();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    await client.access({
      host: config.ftp.host,
      port: config.ftp.port,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure
    });

    const localFilePath = req.file.path;
    const remoteFilePath = req.file.originalname;

    await client.uploadFrom(localFilePath, remoteFilePath);
    
    // Clean up local file after upload
    await fs.unlink(localFilePath);

    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload file', 
      details: error.message 
    });
  } finally {
    client.close();
  }
});

// List files in FTP directory
app.get('/api/files', async (req, res) => {
  const client = new Client();
  try {
    await client.access({
      host: config.ftp.host,
      port: config.ftp.port,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure
    });

    const files = await client.list();
    const fileList = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type === 2 ? 'directory' : 'file',
      modifiedAt: file.modifiedAt
    }));

    res.json({ success: true, files: fileList });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ 
      error: 'Failed to list files', 
      details: error.message 
    });
  } finally {
    client.close();
  }
});

// Download file from FTP
app.get('/api/download/:filename', async (req, res) => {
  const client = new Client();
  const filename = req.params.filename;
  const localFilePath = path.join(uploadsDir, `download_${Date.now()}_${filename}`);

  try {
    await client.access({
      host: config.ftp.host,
      port: config.ftp.port,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure
    });

    await client.downloadTo(localFilePath, filename);

    res.download(localFilePath, filename, async (err) => {
      // Clean up the temporary file after download
      try {
        await fs.unlink(localFilePath);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }

      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Failed to download file', 
      details: error.message 
    });
  } finally {
    client.close();
  }
});

// Delete file from FTP
app.delete('/api/delete/:filename', async (req, res) => {
  const client = new Client();
  try {
    await client.access({
      host: config.ftp.host,
      port: config.ftp.port,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure
    });

    await client.remove(req.params.filename);

    res.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file', 
      details: error.message 
    });
  } finally {
    client.close();
  }
});

const PORT = config.server.port || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`FTP Server: ${config.ftp.host}:${config.ftp.port}`);
});
