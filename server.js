const express = require('express');
const multer = require('multer');
const { Client } = require('basic-ftp');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config.json');
const archiver = require('archiver');

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
app.post('/api/upload', upload.array('files', 50), async (req, res) => {
  const client = new Client();
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    await client.access({
      host: config.ftp.host,
      port: config.ftp.port,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure
    });

    const uploadedFiles = [];

    for (const file of req.files) {
      const localFilePath = file.path;
      const filename = file.originalname;
      
      // Extract folder name: filename.split('-')[-1].split('.')[0]
      const parts = filename.split('-');
      const lastPart = parts[parts.length - 1];
      const folderName = lastPart.split('.')[0];
      
      // Create directory if it doesn't exist
      try {
        await client.ensureDir(folderName);
      } catch (err) {
        console.log(`Directory ${folderName} might already exist`);
      }
      
      // Upload to folder
      const remoteFilePath = `${folderName}/${filename}`;
      await client.uploadFrom(localFilePath, remoteFilePath);
      
      // Clean up local file after upload
      await fs.unlink(localFilePath);
      
      uploadedFiles.push({ filename, folder: folderName });
    }

    res.json({ 
      success: true, 
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload files', 
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

    const folder = req.query.folder || '/';
    
    // Change to the specified directory
    if (folder !== '/') {
      await client.cd(folder);
    }

    const files = await client.list();
    const fileList = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type === 2 ? 'directory' : 'file',
      modifiedAt: file.modifiedAt
    }));

    res.json({ success: true, files: fileList, currentFolder: folder });
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

// List directories only
app.get('/api/directories', async (req, res) => {
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
    const directories = files
      .filter(file => file.type === 2)
      .map(file => ({ name: file.name }));

    res.json({ success: true, directories });
  } catch (error) {
    console.error('List directories error:', error);
    res.status(500).json({ 
      error: 'Failed to list directories', 
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
  const folder = req.query.folder || '';
  const remotePath = folder ? `${folder}/${filename}` : filename;
  const localFilePath = path.join(uploadsDir, `download_${Date.now()}_${filename}`);

  try {
    await client.access({
      host: config.ftp.host,
      port: config.ftp.port,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure
    });

    await client.downloadTo(localFilePath, remotePath);

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

// Download multiple files as ZIP
app.post('/api/download-multiple', async (req, res) => {
  const client = new Client();
  const { files, folder } = req.body;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files specified' });
  }

  const tempFiles = [];
  
  try {
    await client.access({
      host: config.ftp.host,
      port: config.ftp.port,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure
    });

    // Download all files
    for (const filename of files) {
      const remotePath = folder ? `${folder}/${filename}` : filename;
      const localFilePath = path.join(uploadsDir, `temp_${Date.now()}_${filename}`);
      await client.downloadTo(localFilePath, remotePath);
      tempFiles.push({ local: localFilePath, name: filename });
    }

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment('files.zip');
    archive.pipe(res);

    // Add files to archive
    for (const file of tempFiles) {
      archive.file(file.local, { name: file.name });
    }

    await archive.finalize();

    // Clean up temp files after sending
    res.on('finish', async () => {
      for (const file of tempFiles) {
        try {
          await fs.unlink(file.local);
        } catch (err) {
          console.error('Error cleaning up temp file:', err);
        }
      }
    });

  } catch (error) {
    console.error('Download multiple error:', error);
    // Clean up any downloaded files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file.local);
      } catch (err) {
        console.error('Error cleaning up temp file:', err);
      }
    }
    res.status(500).json({ 
      error: 'Failed to download files', 
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
