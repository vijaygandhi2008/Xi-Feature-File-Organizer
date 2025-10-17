# Web SMB/Samba Application

A Python-based web application to upload and download files to/from a remote SMB/Samba share with automatic folder organization.

## Features

- 📤 **Upload Multiple Files**: Upload single or multiple files from your local machine to an SMB/Samba server
- 📁 **Auto Folder Organization**: Files are automatically organized into folders based on filename pattern
- 🔍 **Folder Browser**: Browse files by folder using dropdown or search functionality
- 📥 **Bulk Download**: Select multiple files with checkboxes and download as a ZIP archive
- 📂 **Directory Listing**: View all folders and files in the SMB directory with file details (size, modified date)
- 🗑️ **Delete Files**: Remove files from the SMB server
- 🔄 **Refresh**: Update the file list to see the latest changes
- 💅 **Modern UI**: Clean and responsive user interface

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Access to an SMB/Samba server

## Installation

1. Clone the repository:
```bash
git clone https://github.com/vijaygandhi2008/web-ftp-app.git
cd web-ftp-app
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Configure SMB settings:
   - Copy `config.example.json` to `config.json`
   - Update the SMB credentials in `config.json`:
```json
{
  "smb": {
    "server_name": "192.168.8.4",
    "server_ip": "192.168.8.4",
    "share_name": "Ocean",
    "path": "/Inbox/QubeXP/Xi-FeatureFiles",
    "domain": "WORKGROUP",
    "username": "your-username",
    "password": "your-password"
  },
  "server": {
    "host": "localhost",
    "port": 5000,
    "debug": false
  }
}
```

**Note**: Configure SMB settings:
- `server_name`: SMB server hostname (e.g., `192.168.8.4`)
- `server_ip`: SMB server IP address (e.g., `192.168.8.4`)
- `share_name`: Root SMB share name (e.g., `Ocean`)
- `path`: Subdirectory within the share (e.g., `/Inbox/QubeXP/Xi-FeatureFiles`)

## Usage

1. Start the Python Flask server:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

3. Use the web interface to:
   - **Upload files**: Select one or multiple files, click "Upload to SMB"
     - Files are automatically organized into folders based on the filename pattern: `filename.split('-')[-1].split('.')[0]`
     - Example: `report-data-sales.pdf` will be stored in folder `sales`
     - Example: `feature-file-4k_hfr-304546.xml` will be stored in folder `304546`
   - **Browse folders**: Use the dropdown to select a folder or search for folders by name
   - **View files**: Click "Refresh" to load files from the selected folder
   - **Download single file**: Click the "Download" button next to any file
   - **Download multiple files**: Select files using checkboxes and click "Download Selected" to get a ZIP archive
   - **Delete files**: Click the "Delete" button (with confirmation)

## Configuration

The `config.json` file contains the following settings:

- `smb.server_name`: SMB server hostname (e.g., `192.168.8.4`)
- `smb.server_ip`: SMB server IP address (e.g., `192.168.8.4`)
- `smb.share_name`: Root SMB share name (e.g., `Ocean`)
- `smb.path`: Subdirectory within the share (e.g., `/Inbox/QubeXP/Xi-FeatureFiles`)
- `smb.domain`: SMB domain (default: `WORKGROUP`)
- `smb.username`: SMB username
- `smb.password`: SMB password
- `server.host`: Web server host (default: `localhost`)
- `server.port`: Web server port (default: `5000`)
- `server.debug`: Debug mode (default: `false`)

**Important**: Configure your SMB connection correctly:
- Full SMB path: `smb://192.168.8.4/Ocean/Inbox/QubeXP/Xi-FeatureFiles`
- Split into: 
  - `server_name`: `192.168.8.4`
  - `server_ip`: `192.168.8.4`
  - `share_name`: `Ocean`
  - `path`: `/Inbox/QubeXP/Xi-FeatureFiles`

## Testing

### Automated Unit Tests

Run the automated test suite to validate all functionality:

```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=app

# Run tests in verbose mode
pytest -v
```

**Test Coverage:**
- File upload with folder organization
- Folder navigation (dropdown and search)
- File selection and download
- Complete workflow integration

See [TESTING.md](TESTING.md) for detailed test documentation.

## API Endpoints

The application exposes the following REST API endpoints:

- `POST /api/upload` - Upload multiple files to SMB server (organized into folders automatically)
- `GET /api/files?folder=<name>` - List all files in SMB directory or specific folder
- `GET /api/directories` - List all directories in SMB root
- `GET /api/download/<filename>?folder=<name>` - Download a file from SMB server
- `POST /api/download-multiple` - Download multiple files as ZIP archive
- `DELETE /api/delete/<filename>` - Delete a file from SMB server

See [API.md](API.md) for detailed documentation.

## Technologies Used

- **Backend**: Python 3.8+, Flask
- **SMB Client**: pysmb (pure Python SMB implementation)
- **File Upload**: Flask file handling with Werkzeug
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## Architecture

- **Python Flask Backend**: RESTful API server with pysmb library for SMB operations
- **pysmb Library**: Well-maintained, pure Python SMB/CIFS library with SMB2/SMB3 support
- **Cross-Platform**: Works on macOS, Windows, and Linux without native dependencies
- **Async Operations**: Efficient file operations with Python's async capabilities

## Security Notes

⚠️ **Important**: 
- Never commit `config.json` with real credentials to version control
- Use environment variables for production deployments
- Implement authentication for the web interface in production
- The application follows Python PEP standards and security best practices

## License

ISC