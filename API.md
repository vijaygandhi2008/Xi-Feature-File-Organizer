# API Documentation

## Overview
This document describes the REST API endpoints provided by the Web FTP Application.

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Upload Files (Multiple)
Upload one or more files to the FTP server. Files are automatically organized into folders based on the filename pattern.

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `files` (file[], required): One or more files to upload (max 50)

**Folder Extraction Logic:**
The folder name is extracted from the filename using: `filename.split('-')[-1].split('.')[0]`
- Example: `report-data-sales.pdf` → folder: `sales`
- Example: `image-photo-vacation.jpg` → folder: `vacation`

**Response:**
```json
{
  "success": true,
  "message": "2 file(s) uploaded successfully",
  "files": [
    {
      "filename": "report-data-sales.pdf",
      "folder": "sales"
    }
  ]
}
```

**Error Response:**
```json
{
  "error": "Failed to upload files",
  "details": "Error message"
}
```

---

### 2. List Files
Get a list of all files in the FTP directory or a specific folder.

**Endpoint:** `GET /api/files`

**Query Parameters:**
- `folder` (string, optional): Folder path to list files from

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "name": "example.txt",
      "size": 1024,
      "type": "file",
      "modifiedAt": "2025-10-15T06:00:00.000Z"
    }
  ],
  "currentFolder": "/"
}
```

**Error Response:**
```json
{
  "error": "Failed to list files",
  "details": "Error message"
}
```

---

### 3. List Directories
Get a list of all directories in the FTP root.

**Endpoint:** `GET /api/directories`

**Response:**
```json
{
  "success": true,
  "directories": [
    { "name": "sales" },
    { "name": "vacation" }
  ]
}
```

**Error Response:**
```json
{
  "error": "Failed to list directories",
  "details": "Error message"
}
```

---

### 4. Download Single File
Download a single file from the FTP server.

**Endpoint:** `GET /api/download/:filename`

**Parameters:**
- `filename` (path parameter): Name of the file to download

**Query Parameters:**
- `folder` (string, optional): Folder containing the file

**Response:** File download stream

**Error Response:**
```json
{
  "error": "Failed to download file",
  "details": "Error message"
}
```

---

### 5. Download Multiple Files
Download multiple selected files as a ZIP archive.

**Endpoint:** `POST /api/download-multiple`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "files": ["file1.txt", "file2.pdf"],
  "folder": "sales"
}
```

**Response:** ZIP file stream

**Error Response:**
```json
{
  "error": "Failed to download files",
  "details": "Error message"
}
```

---

### 6. Delete File
Delete a file from the FTP server.

**Endpoint:** `DELETE /api/delete/:filename`

**Parameters:**
- `filename` (path parameter): Name of the file to delete

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Response:**
```json
{
  "error": "Failed to delete file",
  "details": "Error message"
}
```

---

## Example Usage

### Using cURL

**Upload multiple files:**
```bash
curl -X POST \
  -F "files=@/path/to/report-data-sales.pdf" \
  -F "files=@/path/to/image-photo-vacation.jpg" \
  http://localhost:3000/api/upload
```

**List files in a folder:**
```bash
curl "http://localhost:3000/api/files?folder=sales"
```

**List directories:**
```bash
curl http://localhost:3000/api/directories
```

**Download a file from a folder:**
```bash
curl -O "http://localhost:3000/api/download/report.pdf?folder=sales"
```

**Download multiple files as ZIP:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"files":["file1.txt","file2.pdf"],"folder":"sales"}' \
  http://localhost:3000/api/download-multiple -o files.zip
```

**Delete a file:**
```bash
curl -X DELETE http://localhost:3000/api/delete/file.txt
```

### Using JavaScript (Fetch API)

**Upload multiple files:**
```javascript
const formData = new FormData();
const fileInput = document.getElementById('fileInput');
for (const file of fileInput.files) {
  formData.append('files', file);
}

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data);
```

**List files in a folder:**
```javascript
const folder = 'sales';
const response = await fetch(`/api/files?folder=${folder}`);
const data = await response.json();
console.log(data.files);
```

**Download multiple files:**
```javascript
const response = await fetch('/api/download-multiple', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    files: ['file1.txt', 'file2.pdf'],
    folder: 'sales'
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'files.zip';
a.click();
```

## Error Codes

- `400` - Bad Request (e.g., no files uploaded)
- `500` - Internal Server Error (e.g., FTP connection failed)

## Notes

- All file operations require a valid FTP connection configured in `config.json`
- File uploads are temporarily stored in the `uploads/` directory before being transferred to FTP
- Files are automatically organized into folders based on filename pattern: `filename.split('-')[-1].split('.')[0]`
- Multiple files can be uploaded simultaneously (max 50 files)
- Downloaded files are temporarily stored and automatically cleaned up after download
- Multiple file downloads are packaged as ZIP archives
- The application does not implement authentication - consider adding it for production use
