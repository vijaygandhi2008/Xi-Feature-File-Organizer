"""
Flask application for SMB/Samba file management
Provides web interface for uploading, downloading, and managing files on SMB shares
"""

import os
import json
import tempfile
import zipfile
from io import BytesIO
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from smb.SMBConnection import SMBConnection
from smb.smb_structs import OperationFailure
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# Load configuration
def load_config():
    """Load configuration from config.json"""
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: config.json not found, using defaults")
        return {
            "smb": {
                "share": "//192.168.8.4/Ocean",
                "path": "/Inbox/QubeXP/Xi-FeatureFiles",
                "domain": "WORKGROUP",
                "user": "username",
                "password": "password"
            },
            "server": {
                "port": 3000
            }
        }

config = load_config()

def parse_smb_share(share_path):
    """Parse SMB share path to extract host and share name"""
    # Remove leading slashes and split
    clean_path = share_path.replace('\\', '/').lstrip('/')
    parts = clean_path.split('/')
    if len(parts) >= 2:
        return parts[0], parts[1]  # host, share_name
    return None, None

def get_smb_connection():
    """Create and return an authenticated SMB connection"""
    smb_config = config['smb']
    host, share_name = parse_smb_share(smb_config['share'])
    
    if not host or not share_name:
        raise ValueError(f"Invalid SMB share format: {smb_config['share']}")
    
    # Create SMB connection
    conn = SMBConnection(
        username=smb_config['user'],
        password=smb_config['password'],
        my_name='web-smb-app',
        remote_name=host.split('.')[0],  # Use hostname without domain
        domain=smb_config.get('domain', 'WORKGROUP'),
        use_ntlm_v2=True,
        is_direct_tcp=True
    )
    
    # Connect to SMB server
    if not conn.connect(host, 445):
        raise ConnectionError(f"Failed to connect to SMB server: {host}")
    
    return conn, share_name

def get_remote_path(folder=''):
    """Combine base path with folder to get full remote path"""
    base_path = config['smb'].get('path', '').replace('\\', '/').strip('/')
    folder = folder.replace('\\', '/').strip('/')
    
    if folder:
        full_path = f"{base_path}/{folder}" if base_path else folder
    else:
        full_path = base_path
    
    return full_path

def extract_folder_from_filename(filename):
    """Extract folder name from filename using pattern: filename.split('-')[-1].split('.')[0]"""
    try:
        # Get last part after splitting by '-'
        parts = filename.split('-')
        if len(parts) > 1:
            last_part = parts[-1]
            # Remove file extension
            folder_name = last_part.split('.')[0]
            return folder_name if folder_name else None
    except Exception as e:
        print(f"Error extracting folder from filename {filename}: {e}")
    return None

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('public', 'index.html')

@app.route('/api/directories', methods=['GET'])
def list_directories():
    """List all directories in the SMB share"""
    try:
        conn, share_name = get_smb_connection()
        remote_path = get_remote_path()
        
        try:
            # List contents of the directory
            entries = conn.listPath(share_name, remote_path if remote_path else '/')
            
            # Filter only directories (exclude . and ..)
            directories = []
            for entry in entries:
                if entry.isDirectory and entry.filename not in ['.', '..']:
                    directories.append(entry.filename)
            
            return jsonify({
                'success': True,
                'directories': sorted(directories)
            })
        finally:
            conn.close()
            
    except Exception as e:
        print(f"List directories error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """List files in a specific folder"""
    try:
        folder = request.args.get('folder', '')
        conn, share_name = get_smb_connection()
        remote_path = get_remote_path(folder)
        
        try:
            # List contents of the directory
            entries = conn.listPath(share_name, remote_path if remote_path else '/')
            
            # Filter only files (not directories)
            files = []
            for entry in entries:
                if not entry.isDirectory:
                    files.append({
                        'name': entry.filename,
                        'size': entry.file_size,
                        'modified': entry.last_write_time
                    })
            
            return jsonify({
                'success': True,
                'files': files,
                'folder': folder
            })
        finally:
            conn.close()
            
    except Exception as e:
        print(f"List files error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Upload multiple files to SMB share with automatic folder organization"""
    try:
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No files provided'
            }), 400
        
        files = request.files.getlist('files')
        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'No files selected'
            }), 400
        
        conn, share_name = get_smb_connection()
        uploaded_files = []
        errors = []
        
        try:
            for file in files:
                if file.filename == '':
                    continue
                
                filename = secure_filename(file.filename)
                
                # Extract folder from filename
                folder = extract_folder_from_filename(filename)
                if not folder:
                    errors.append(f"{filename}: Could not extract folder name")
                    continue
                
                # Get remote path including folder
                remote_path = get_remote_path(folder)
                
                # Check if folder exists, create if it doesn't
                folder_exists = False
                try:
                    # Try to list the directory to check if it exists
                    conn.listPath(share_name, remote_path)
                    folder_exists = True
                    print(f"Using existing folder: {remote_path}")
                except (OperationFailure, Exception) as e:
                    print(f"Folder doesn't exist: {remote_path}, creating it...")
                
                if not folder_exists:
                    # Folder doesn't exist, create it
                    try:
                        conn.createDirectory(share_name, remote_path)
                        print(f"Created new folder: {remote_path}")
                    except Exception as e:
                        print(f"Error creating folder {remote_path}: {e}")
                        errors.append(f"{filename}: Failed to create folder {folder}")
                        continue
                
                # Upload file
                try:
                    # Construct proper file path
                    file_path = f"{remote_path}/{filename}".replace('//', '/')
                    
                    # Read file content into BytesIO
                    file_content = file.read()
                    file_obj = BytesIO(file_content)
                    
                    # Upload to SMB share
                    conn.storeFile(share_name, file_path, file_obj)
                    
                    uploaded_files.append({
                        'filename': filename,
                        'folder': folder
                    })
                    print(f"Uploaded: {filename} to {folder} (path: {file_path})")
                except Exception as e:
                    print(f"Error uploading {filename}: {e}")
                    errors.append(f"{filename}: {str(e)}")
            
            return jsonify({
                'success': len(uploaded_files) > 0,
                'files': uploaded_files,  # For backward compatibility
                'uploaded': uploaded_files,
                'errors': errors,
                'count': len(uploaded_files)
            })
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download a single file from SMB share"""
    try:
        folder = request.args.get('folder', '')
        conn, share_name = get_smb_connection()
        remote_path = get_remote_path(folder)
        file_path = f"{remote_path}/{filename}"
        
        try:
            # Download file to memory
            file_obj = BytesIO()
            conn.retrieveFile(share_name, file_path, file_obj)
            file_obj.seek(0)
            
            return send_file(
                file_obj,
                as_attachment=True,
                download_name=filename,
                mimetype='application/octet-stream'
            )
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Download error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/download-multiple', methods=['POST'])
def download_multiple():
    """Download multiple files as a ZIP archive"""
    try:
        data = request.json
        files = data.get('files', [])
        folder = data.get('folder', '')
        
        if not files:
            return jsonify({
                'success': False,
                'error': 'No files specified'
            }), 400
        
        conn, share_name = get_smb_connection()
        remote_path = get_remote_path(folder)
        
        try:
            # Create ZIP file in memory
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for filename in files:
                    try:
                        file_path = f"{remote_path}/{filename}"
                        file_obj = BytesIO()
                        conn.retrieveFile(share_name, file_path, file_obj)
                        file_obj.seek(0)
                        zip_file.writestr(filename, file_obj.read())
                    except Exception as e:
                        print(f"Error adding {filename} to ZIP: {e}")
            
            zip_buffer.seek(0)
            return send_file(
                zip_buffer,
                as_attachment=True,
                download_name=f'smb-files-{folder if folder else "root"}.zip',
                mimetype='application/zip'
            )
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Download multiple error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete a file from SMB share"""
    try:
        folder = request.args.get('folder', '')
        conn, share_name = get_smb_connection()
        remote_path = get_remote_path(folder)
        file_path = f"{remote_path}/{filename}"
        
        try:
            conn.deleteFiles(share_name, file_path)
            return jsonify({
                'success': True,
                'message': f'File {filename} deleted successfully'
            })
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = config['server'].get('port', 5000)
    debug_mode = config['server'].get('debug', False)
    print(f"Starting Flask server on port {port}")
    print(f"SMB Share: {config['smb']['share']}")
    print(f"SMB Path: {config['smb'].get('path', '/')}")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
