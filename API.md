# API Documentation

## Overview
This document describes the REST API endpoints provided by the Web FTP Application.

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Upload File
Upload a file to the FTP server.

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (file, required): The file to upload

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "filename": "example.txt"
}
```

**Error Response:**
```json
{
  "error": "Failed to upload file",
  "details": "Error message"
}
```

---

### 2. List Files
Get a list of all files in the FTP directory.

**Endpoint:** `GET /api/files`

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
  ]
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

### 3. Download File
Download a file from the FTP server.

**Endpoint:** `GET /api/download/:filename`

**Parameters:**
- `filename` (path parameter): Name of the file to download

**Response:** File download stream

**Error Response:**
```json
{
  "error": "Failed to download file",
  "details": "Error message"
}
```

---

### 4. Delete File
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

**Upload a file:**
```bash
curl -X POST -F "file=@/path/to/file.txt" http://localhost:3000/api/upload
```

**List files:**
```bash
curl http://localhost:3000/api/files
```

**Download a file:**
```bash
curl -O http://localhost:3000/api/download/file.txt
```

**Delete a file:**
```bash
curl -X DELETE http://localhost:3000/api/delete/file.txt
```

### Using JavaScript (Fetch API)

**Upload a file:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data);
```

**List files:**
```javascript
const response = await fetch('/api/files');
const data = await response.json();
console.log(data.files);
```

**Download a file:**
```javascript
window.location.href = `/api/download/${filename}`;
```

**Delete a file:**
```javascript
const response = await fetch(`/api/delete/${filename}`, {
  method: 'DELETE'
});

const data = await response.json();
console.log(data);
```

## Error Codes

- `400` - Bad Request (e.g., no file uploaded)
- `500` - Internal Server Error (e.g., FTP connection failed)

## Notes

- All file operations require a valid FTP connection configured in `config.json`
- File uploads are temporarily stored in the `uploads/` directory before being transferred to FTP
- Downloaded files are temporarily stored in the `uploads/` directory and cleaned up after download
- The application does not implement authentication - consider adding it for production use
