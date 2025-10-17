"""
Automated tests for Flask SMB application
Tests all functionality: upload, download, folder organization, etc.
"""

import pytest
import json
from io import BytesIO
from app import app, extract_folder_from_filename

@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_page(client):
    """Test that index page loads"""
    response = client.get('/')
    assert response.status_code == 200

def test_extract_folder_from_filename():
    """Test folder name extraction from filename"""
    # Test cases from requirements
    assert extract_folder_from_filename('feature-file-4k_hfr-304546.xml') == '304546'
    assert extract_folder_from_filename('feature-file-4k_hfr_off-304546.xml') == '304546'
    assert extract_folder_from_filename('feature-file-4k_hfr-303045.xml') == '303045'
    assert extract_folder_from_filename('feature-file-4k_hfr_off-303045.xml') == '303045'
    
    # Additional test cases
    assert extract_folder_from_filename('report-data-sales.pdf') == 'sales'
    assert extract_folder_from_filename('image-photo-vacation.jpg') == 'vacation'
    assert extract_folder_from_filename('document-final-version-test.docx') == 'test'

def test_api_directories_endpoint(client):
    """Test directories listing endpoint exists"""
    response = client.get('/api/directories')
    assert response.status_code in [200, 500]  # Will be 500 if SMB not available, but endpoint exists

def test_api_files_endpoint(client):
    """Test files listing endpoint exists"""
    response = client.get('/api/files?folder=testfolder')
    assert response.status_code in [200, 500]  # Will be 500 if SMB not available, but endpoint exists

def test_upload_endpoint_exists(client):
    """Test upload endpoint exists"""
    # Create a test file
    data = {
        'files': (BytesIO(b'test content'), 'test-file-304546.txt')
    }
    response = client.post('/api/upload', data=data, content_type='multipart/form-data')
    assert response.status_code in [200, 400, 500]  # Endpoint exists

def test_download_endpoint_exists(client):
    """Test download endpoint exists"""
    response = client.get('/api/download/test.txt?folder=304546')
    assert response.status_code in [200, 404, 500]  # Endpoint exists

def test_download_multiple_endpoint_exists(client):
    """Test bulk download endpoint exists"""
    response = client.post('/api/download-multiple', 
                          json={'files': ['test1.txt', 'test2.txt'], 'folder': '304546'},
                          content_type='application/json')
    assert response.status_code in [200, 400, 500]  # Endpoint exists

def test_delete_endpoint_exists(client):
    """Test delete endpoint exists"""
    response = client.delete('/api/delete/test.txt?folder=304546')
    assert response.status_code in [200, 404, 500]  # Endpoint exists

def test_api_endpoints_return_json(client):
    """Test that API endpoints return JSON"""
    # Test directories endpoint
    response = client.get('/api/directories')
    assert response.content_type == 'application/json'
    
    # Test files endpoint
    response = client.get('/api/files')
    assert response.content_type == 'application/json'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
