# web-ftp-app

A web application to upload and download files to/from a remote FTP directory.

## Features

- 📤 **Upload Files**: Upload files from your local machine to an FTP server
- 📥 **Download Files**: Download files from the FTP server to your local machine
- 📁 **Browse Files**: View all files in the FTP directory with file details (size, modified date)
- 🗑️ **Delete Files**: Remove files from the FTP server
- 🔄 **Refresh**: Update the file list to see the latest changes
- 💅 **Modern UI**: Clean and responsive user interface

## Prerequisites

- Node.js (v14 or higher)
- Access to an FTP server

## Installation

1. Clone the repository:
```bash
git clone https://github.com/vijaygandhi2008/web-ftp-app.git
cd web-ftp-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure FTP settings:
   - Copy `config.example.json` to `config.json`
   - Update the FTP credentials in `config.json`:
```json
{
  "ftp": {
    "host": "your-ftp-server.com",
    "port": 21,
    "user": "your-username",
    "password": "your-password",
    "secure": false
  },
  "server": {
    "port": 3000
  }
}
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Use the web interface to:
   - Upload files by clicking "Choose File" and then "Upload to FTP"
   - View files by clicking the "Refresh" button
   - Download files by clicking the "Download" button next to any file
   - Delete files by clicking the "Delete" button (with confirmation)

## Configuration

The `config.json` file contains the following settings:

- `ftp.host`: FTP server hostname or IP address
- `ftp.port`: FTP server port (default: 21)
- `ftp.user`: FTP username
- `ftp.password`: FTP password
- `ftp.secure`: Use FTPS (secure FTP) - set to `true` for secure connections
- `server.port`: Web server port (default: 3000)

## API Endpoints

The application exposes the following REST API endpoints:

- `POST /api/upload` - Upload a file to FTP server
- `GET /api/files` - List all files in FTP directory
- `GET /api/download/:filename` - Download a file from FTP server
- `DELETE /api/delete/:filename` - Delete a file from FTP server

## Technologies Used

- **Backend**: Node.js, Express.js
- **FTP Client**: basic-ftp
- **File Upload**: Multer
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## Security Notes

⚠️ **Important**: 
- Never commit `config.json` with real credentials to version control
- Use environment variables for production deployments
- Consider using FTPS (secure FTP) by setting `secure: true` in config
- Implement authentication for the web interface in production

## License

ISC