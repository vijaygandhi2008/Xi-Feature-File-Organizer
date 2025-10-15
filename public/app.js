// Upload file to FTP
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!fileInput.files.length) {
        showStatus('Please select a file to upload', 'error');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        statusDiv.innerHTML = '<p>Uploading...</p>';
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`✓ File "${data.filename}" uploaded successfully!`, 'success');
            fileInput.value = '';
            // Refresh file list after successful upload
            setTimeout(refreshFileList, 500);
        } else {
            showStatus(`✗ Upload failed: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`✗ Upload failed: ${error.message}`, 'error');
    }
}

// Refresh file list
async function refreshFileList() {
    const filesListDiv = document.getElementById('filesList');
    
    try {
        filesListDiv.innerHTML = '<p class="loading">Loading files...</p>';
        
        const response = await fetch('/api/files');
        const data = await response.json();

        if (response.ok && data.files) {
            if (data.files.length === 0) {
                filesListDiv.innerHTML = '<p class="empty">No files found in FTP directory</p>';
                return;
            }

            filesListDiv.innerHTML = '';
            data.files.forEach(file => {
                if (file.type === 'file') {
                    const fileItem = createFileItem(file);
                    filesListDiv.appendChild(fileItem);
                }
            });
        } else {
            filesListDiv.innerHTML = `<p class="error">Failed to load files: ${data.error || 'Unknown error'}</p>`;
        }
    } catch (error) {
        filesListDiv.innerHTML = `<p class="error">Failed to load files: ${error.message}</p>`;
    }
}

// Create file item element
function createFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';

    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;

    const fileMeta = document.createElement('div');
    fileMeta.className = 'file-meta';
    fileMeta.textContent = `Size: ${formatFileSize(file.size)} | Modified: ${formatDate(file.modifiedAt)}`;

    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileMeta);

    const fileActions = document.createElement('div');
    fileActions.className = 'file-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-download';
    downloadBtn.textContent = '⬇ Download';
    downloadBtn.onclick = () => downloadFile(file.name);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-delete';
    deleteBtn.textContent = '🗑 Delete';
    deleteBtn.onclick = () => deleteFile(file.name);

    fileActions.appendChild(downloadBtn);
    fileActions.appendChild(deleteBtn);

    div.appendChild(fileInfo);
    div.appendChild(fileActions);

    return div;
}

// Download file from FTP
async function downloadFile(filename) {
    try {
        window.location.href = `/api/download/${encodeURIComponent(filename)}`;
    } catch (error) {
        showStatus(`✗ Download failed: ${error.message}`, 'error');
    }
}

// Delete file from FTP
async function deleteFile(filename) {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/delete/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`✓ File "${filename}" deleted successfully!`, 'success');
            refreshFileList();
        } else {
            showStatus(`✗ Delete failed: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`✗ Delete failed: ${error.message}`, 'error');
    }
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status-message';
    }, 5000);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Load files on page load
window.addEventListener('DOMContentLoaded', () => {
    refreshFileList();
});
