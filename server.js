const express = require('express');
const multer = require('multer');
const { Client: SMB2Client } = require('node-smb2');
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

// Parse SMB share to get host and share name
function parseSMBShare(shareString) {
  // shareString format: //192.168.8.4/Ocean
  const match = shareString.match(/^\/\/([^\/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid SMB share format: ${shareString}`);
  }
  return {
    host: match[1],
    shareName: match[2]
  };
}

// SMB connection helper - returns connected tree
async function getSMBTree() {
  const { host, shareName } = parseSMBShare(config.smb.share);
  
  const client = new SMB2Client(host);
  const session = await client.authenticate({
    domain: config.smb.domain || 'WORKGROUP',
    username: config.smb.user,
    password: config.smb.password
  });
  const tree = await session.connectTree(shareName);
  
  return tree;
}

// Helper to get full remote path
function getRemotePath(relativePath) {
  const basePath = config.smb.path || '';
  if (!relativePath || relativePath === '/' || relativePath === '') {
    return basePath;
  }
  // Use forward slashes for SMB paths
  const cleanBasePath = basePath.replace(/\\/g, '/');
  const cleanRelativePath = relativePath.replace(/\\/g, '/');
  return cleanBasePath + (cleanRelativePath.startsWith('/') ? '' : '/') + cleanRelativePath;
}

// Upload file to SMB
app.post('/api/upload', upload.array('files', 50), async (req, res) => {
  let tree = null;
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    tree = await getSMBTree();
    const uploadedFiles = [];

    for (const file of req.files) {
      const localFilePath = file.path;
      const filename = file.originalname;
      
      // Extract folder name: filename.split('-')[-1].split('.')[0]
      const parts = filename.split('-');
      const lastPart = parts[parts.length - 1];
      const folderName = lastPart.split('.')[0];
      
      // Check if directory exists before creating
      const remoteFolderPath = getRemotePath(folderName);
      
      try {
        const exists = await tree.exists(remoteFolderPath);
        if (!exists) {
          await tree.createDirectory(remoteFolderPath);
          console.log(`Created new folder: ${remoteFolderPath}`);
        } else {
          console.log(`Using existing folder: ${remoteFolderPath}`);
        }
      } catch (err) {
        console.error('Error checking/creating directory:', err);
      }
      
      // Upload to folder
      const remoteFilePath = getRemotePath(`${folderName}/${filename}`);
      const fileContent = await fs.readFile(localFilePath);
      
      await tree.writeFile(remoteFilePath, fileContent);
      
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
  }
});

// List files in SMB directory
app.get('/api/files', async (req, res) => {
  let tree = null;
  
  try {
    tree = await getSMBTree();
    const folder = req.query.folder || '';
    const remotePath = getRemotePath(folder);
    
    const files = await tree.readDirectory(remotePath);

    const fileList = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.isDirectory ? 'directory' : 'file',
      modifiedAt: file.lastModifiedTime
    })).filter(f => f.name !== '.' && f.name !== '..');

    res.json({ success: true, files: fileList, currentFolder: folder || '/' });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ 
      error: 'Failed to list files', 
      details: error.message 
    });
  }
});

// List directories only
app.get('/api/directories', async (req, res) => {
  let tree = null;
  
  try {
    tree = await getSMBTree();
    const remotePath = getRemotePath('');
    
    const files = await tree.readDirectory(remotePath);

    const directories = files
      .filter(file => file.isDirectory && file.name !== '.' && file.name !== '..')
      .map(file => ({ name: file.name }));

    res.json({ success: true, directories });
  } catch (error) {
    console.error('List directories error:', error);
    res.status(500).json({ 
      error: 'Failed to list directories', 
      details: error.message 
    });
  }
});

// Download file from SMB
app.get('/api/download/:filename', async (req, res) => {
  let tree = null;
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const remotePath = getRemotePath(folder ? `${folder}/${filename}` : filename);
  const localFilePath = path.join(uploadsDir, `download_${Date.now()}_${filename}`);

  try {
    tree = await getSMBTree();
    const fileContent = await tree.readFile(remotePath);

    await fs.writeFile(localFilePath, fileContent);

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
  }
});

// Download multiple files as ZIP
app.post('/api/download-multiple', async (req, res) => {
  let tree = null;
  const { files, folder } = req.body;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files specified' });
  }

  const tempFiles = [];
  
  try {
    tree = await getSMBTree();
    
    // Download all files
    for (const filename of files) {
      const remotePath = getRemotePath(folder ? `${folder}/${filename}` : filename);
      const localFilePath = path.join(uploadsDir, `temp_${Date.now()}_${filename}`);
      
      const fileContent = await tree.readFile(remotePath);
      
      await fs.writeFile(localFilePath, fileContent);
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
  }
});

// Delete file from SMB
app.delete('/api/delete/:filename', async (req, res) => {
  let tree = null;
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const remotePath = getRemotePath(folder ? `${folder}/${filename}` : filename);
  
  try {
    tree = await getSMBTree();
    await tree.unlink(remotePath);

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
  }
});

const PORT = config.server.port || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`SMB Share: ${config.smb.share}`);
});
