let currentFolder = '';
let allFolders = [];
let selectedFiles = new Set();

// Upload files to FTP
async function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!fileInput.files.length) {
        showStatus('Please select at least one file to upload', 'error');
        return;
    }

    const formData = new FormData();
    for (const file of fileInput.files) {
        formData.append('files', file);
    }

    try {
        statusDiv.innerHTML = '<p>Uploading...</p>';
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`✓ ${data.files.length} file(s) uploaded successfully!`, 'success');
            fileInput.value = '';
            // Refresh folder list and file list after successful upload
            setTimeout(() => {
                loadFolders();
                refreshFileList();
            }, 500);
        } else {
            showStatus(`✗ Upload failed: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`✗ Upload failed: ${error.message}`, 'error');
    }
}

// Load folders for dropdown
async function loadFolders() {
    try {
        const response = await fetch('/api/directories');
        const data = await response.json();

        if (response.ok) {
            allFolders = data.directories || [];
            updateFolderDropdown(allFolders);
        }
    } catch (error) {
        console.error('Failed to load folders:', error);
    }
}

// Update folder dropdown
function updateFolderDropdown(folders) {
    const select = document.getElementById('folderSelect');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Select folder from dropdown</option>';
    
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        select.appendChild(option);
    });
    
    // Restore previous selection if it exists
    if (currentValue && folders.includes(currentValue)) {
        select.value = currentValue;
    }
}

// Filter folders based on search
function filterFolders() {
    const searchInput = document.getElementById('folderSearch');
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm === '') {
        updateFolderDropdown(allFolders);
    } else {
        const filtered = allFolders.filter(folder => 
            folder.name.toLowerCase().includes(searchTerm)
        );
        updateFolderDropdown(filtered);
    }
}

// Handle folder change
function onFolderChange() {
    const select = document.getElementById('folderSelect');
    currentFolder = select.value;
    const displayText = currentFolder === '' ? 'Select folder from dropdown' : currentFolder;
    document.getElementById('currentFolderName').textContent = displayText;
    selectedFiles.clear();
    updateSelectedCount();
    refreshFileList();
}

// Refresh file list
async function refreshFileList() {
    const filesListDiv = document.getElementById('filesList');
    
    // Don't load files if no folder is selected
    if (currentFolder === '') {
        filesListDiv.innerHTML = '<p class="empty">Please select a folder from the dropdown to view files</p>';
        return;
    }
    
    try {
        filesListDiv.innerHTML = '<p class="loading">Loading files...</p>';
        
        const url = `/api/files?folder=${encodeURIComponent(currentFolder)}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.files) {
            const files = data.files.filter(f => f.type === 'file');
            
            if (files.length === 0) {
                filesListDiv.innerHTML = '<p class="empty">No files found in this folder</p>';
                return;
            }

            filesListDiv.innerHTML = '';
            files.forEach(file => {
                const fileItem = createFileItem(file);
                filesListDiv.appendChild(fileItem);
            });
        } else {
            filesListDiv.innerHTML = `<p class="error">Failed to load files: ${data.error || 'Unknown error'}</p>`;
        }
    } catch (error) {
        filesListDiv.innerHTML = `<p class="error">Failed to load files: ${error.message}</p>`;
    }
}

// Create file item element with checkbox
function createFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'file-checkbox';
    checkbox.onchange = (e) => {
        if (e.target.checked) {
            selectedFiles.add(file.name);
        } else {
            selectedFiles.delete(file.name);
        }
        updateSelectedCount();
    };

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

    div.appendChild(checkbox);
    div.appendChild(fileInfo);
    div.appendChild(fileActions);

    return div;
}

// Update selected count
function updateSelectedCount() {
    const count = selectedFiles.size;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('downloadSelectedBtn').disabled = count === 0;
}

// Download selected files
async function downloadSelected() {
    if (selectedFiles.size === 0) {
        showStatus('Please select at least one file', 'error');
        return;
    }

    try {
        const response = await fetch('/api/download-multiple', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: Array.from(selectedFiles),
                folder: currentFolder === '/' ? '' : currentFolder
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'files.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showStatus(`✓ ${selectedFiles.size} file(s) downloaded successfully!`, 'success');
            selectedFiles.clear();
            updateSelectedCount();
            
            // Uncheck all checkboxes
            document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
        } else {
            const data = await response.json();
            showStatus(`✗ Download failed: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`✗ Download failed: ${error.message}`, 'error');
    }
}

// Download file from FTP
async function downloadFile(filename) {
    try {
        const url = currentFolder === '/' 
            ? `/api/download/${encodeURIComponent(filename)}`
            : `/api/download/${encodeURIComponent(filename)}?folder=${encodeURIComponent(currentFolder)}`;
        window.location.href = url;
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
    loadFolders();
    refreshFileList();
});
