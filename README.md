# web-ftp-app

A web application to upload and download files to/from a remote FTP directory.

## Features

- 📤 **Upload Multiple Files**: Upload single or multiple files from your local machine to an FTP server
- 📁 **Auto Folder Organization**: Files are automatically organized into folders based on filename pattern
- 🔍 **Folder Browser**: Browse files by folder using dropdown or search functionality
- 📥 **Bulk Download**: Select multiple files with checkboxes and download as a ZIP archive
- 📂 **Directory Listing**: View all folders and files in the FTP directory with file details (size, modified date)
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
   - **Upload files**: Select one or multiple files, click "Upload to FTP"
     - Files are automatically organized into folders based on the filename pattern: `filename.split('-')[-1].split('.')[0]`
     - Example: `report-data-sales.pdf` will be stored in folder `sales`
   - **Browse folders**: Use the dropdown to select a folder or search for folders by name
   - **View files**: Click "Refresh" to load files from the selected folder
   - **Download single file**: Click the "Download" button next to any file
   - **Download multiple files**: Select files using checkboxes and click "Download Selected" to get a ZIP archive
   - **Delete files**: Click the "Delete" button (with confirmation)

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

- `POST /api/upload` - Upload multiple files to FTP server (organized into folders automatically)
- `GET /api/files?folder=<name>` - List all files in FTP directory or specific folder
- `GET /api/directories` - List all directories in FTP root
- `GET /api/download/:filename?folder=<name>` - Download a file from FTP server
- `POST /api/download-multiple` - Download multiple files as ZIP archive
- `DELETE /api/delete/:filename` - Delete a file from FTP server

See [API.md](API.md) for detailed documentation.

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