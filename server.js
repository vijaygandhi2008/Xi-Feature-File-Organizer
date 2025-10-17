const express = require('express');
const multer = require('multer');
const SMB2 = require('smb2');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config.json');
const archiver = require('archiver');
const { promisify } = require('util');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Create SMB2 client
function createSMBClient() {
  return new SMB2({
    share: config.smb.share,
    domain: config.smb.domain || 'WORKGROUP',
    username: config.smb.user,
    password: config.smb.password
  });
}

// Helper to get full remote path
function getRemotePath(relativePath) {
  const basePath = config.smb.path || '';
  if (!relativePath || relativePath === '/' || relativePath === '') {
    return basePath;
  }
  // Use backslashes for SMB paths
  const cleanBasePath = basePath.replace(/\//g, '\\');
  const cleanRelativePath = relativePath.replace(/\//g, '\\');
  return cleanBasePath + (cleanRelativePath.startsWith('\\') ? '' : '\\') + cleanRelativePath;
}

// Upload file to SMB
app.post('/api/upload', upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const smbClient = createSMBClient();
    const readdir = promisify(smbClient.readdir.bind(smbClient));
    const mkdir = promisify(smbClient.mkdir.bind(smbClient));
    const writeFile = promisify(smbClient.writeFile.bind(smbClient));
    
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
        await readdir(remoteFolderPath);
        console.log(`Using existing folder: ${remoteFolderPath}`);
      } catch (err) {
        // Directory doesn't exist, create it
        try {
          await mkdir(remoteFolderPath);
          console.log(`Created new folder: ${remoteFolderPath}`);
        } catch (mkdirErr) {
          console.error('Error creating directory:', mkdirErr);
        }
      }
      
      // Upload to folder
      const remoteFilePath = getRemotePath(`${folderName}\\${filename}`);
      const fileContent = await fs.readFile(localFilePath);
      
      await writeFile(remoteFilePath, fileContent);
      
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
  try {
    const smbClient = createSMBClient();
    const readdir = promisify(smbClient.readdir.bind(smbClient));
    
    const folder = req.query.folder || '';
    const remotePath = getRemotePath(folder);
    
    const files = await readdir(remotePath);

    const fileList = [];
    for (const filename of files) {
      if (filename !== '.' && filename !== '..') {
        fileList.push({
          name: filename,
          type: 'file' // SMB2 readdir doesn't provide detailed stats by default
        });
      }
    }

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
  try {
    const smbClient = createSMBClient();
    const readdir = promisify(smbClient.readdir.bind(smbClient));
    const exists = promisify(smbClient.exists.bind(smbClient));
    
    const remotePath = getRemotePath('');
    
    const files = await readdir(remotePath);

    const directories = [];
    for (const filename of files) {
      if (filename !== '.' && filename !== '..') {
        // Check if it's a directory by trying to read it
        const testPath = getRemotePath(filename);
        try {
          const isDir = await exists(testPath);
          if (isDir) {
            directories.push({ name: filename });
          }
        } catch (err) {
          // Assume it's a directory if we can't determine
          directories.push({ name: filename });
        }
      }
    }

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
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const remotePath = getRemotePath(folder ? `${folder}\\${filename}` : filename);
  const localFilePath = path.join(uploadsDir, `download_${Date.now()}_${filename}`);

  try {
    const smbClient = createSMBClient();
    const readFile = promisify(smbClient.readFile.bind(smbClient));
    
    const fileContent = await readFile(remotePath);

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
  const { files, folder } = req.body;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files specified' });
  }

  const tempFiles = [];
  
  try {
    const smbClient = createSMBClient();
    const readFile = promisify(smbClient.readFile.bind(smbClient));
    
    // Download all files
    for (const filename of files) {
      const remotePath = getRemotePath(folder ? `${folder}\\${filename}` : filename);
      const localFilePath = path.join(uploadsDir, `temp_${Date.now()}_${filename}`);
      
      const fileContent = await readFile(remotePath);
      
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
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const remotePath = getRemotePath(folder ? `${folder}\\${filename}` : filename);
  
  try {
    const smbClient = createSMBClient();
    const unlink = promisify(smbClient.unlink.bind(smbClient));
    
    await unlink(remotePath);

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
