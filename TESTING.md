# Automated Unit Tests

## Overview
This test suite automatically validates the SMB file upload, folder organization, and download functionality without manual intervention using pytest.

## Test Coverage

### 1. File Upload Tests
- ✅ Extract folder name from filename pattern `filename.split('-')[-1].split('.')[0]`
- ✅ Organize files into correct folders based on extracted names
- ✅ Upload multiple files successfully (mocked SMB operations)

### 2. Folder Navigation Tests
- ✅ List directories correctly
- ✅ Filter folders by search term (dropdown and search functionality)

### 3. Download Tests
- ✅ Select correct files for download
- ✅ Create ZIP archives with selected files

### 4. Integration Tests
- ✅ Complete workflow validation: upload → list → search → download

## Test Files Used
The tests validate the following test files:
- `feature-file-4k_hfr-304546.xml` → Folder: `304546`
- `feature-file-4k_hfr_off-304546.xml` → Folder: `304546`
- `feature-file-4k_hfr-303045.xml` → Folder: `303045`
- `feature-file-4k_hfr_off-303045.xml` → Folder: `303045`

## Running Tests

### Run all tests:
```bash
pytest
```

### Run all tests with coverage:
```bash
pytest --cov=app
```

### Run tests in verbose mode:
```bash
pytest -v
```

### Run tests with detailed output:
```bash
pytest -vv
```

### Run specific test file:
```bash
pytest test_app.py
```

### Run tests with coverage report:
```bash
pytest --cov=app --cov-report=html
```

## Test Results

===============================test session starts================================
platform darwin -- Python 3.11.0, pytest-7.4.3, pluggy-1.3.0
collected 8 items

test_app.py ........                                                     [100%]

============================ 8 passed in 0.85s ================================
```

### Test Breakdown:
1. ✅ **Filename Pattern Extraction** - Validates folder name extraction logic
2. ✅ **File Organization** - Ensures files are grouped correctly by folder
3. ✅ **Upload Functionality** - Tests file upload with mocked SMB client
4. ✅ **Directory Listing** - Validates folder list generation
5. ✅ **Search Functionality** - Tests folder filtering by search term
6. ✅ **File Selection** - Validates correct file selection for download
7. ✅ **ZIP Creation** - Tests multi-file download preparation
8. ✅ **Integration Workflow** - End-to-end workflow validation

## Testing Framework
- **pytest** - Python testing framework
- **pytest-flask** - Flask testing utilities
- **unittest.mock** - Mocked SMB operations to avoid real server connections

## Expected Folder Structure
```
304546/
  ├── feature-file-4k_hfr-304546.xml
  └── feature-file-4k_hfr_off-304546.xml

303045/
  ├── feature-file-4k_hfr-303045.xml
  └── feature-file-4k_hfr_off-303045.xml
```

## Continuous Integration
These tests can be integrated into CI/CD pipelines:

### GitHub Actions Example:
```yaml
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest
```

### GitLab CI Example:
```yaml
test:
  script:
    - pip install -r requirements.txt
    - pytest
```

## Test Configuration
Tests use a separate test configuration to avoid interfering with production settings:
```json
{
  "smb": {
    "server_name": "test-server",
    "server_ip": "192.168.1.1",
    "share_name": "test-share",
    "path": "/test-path",
    "domain": "WORKGROUP",
    "username": "testuser",
    "password": "testpass"
  }
}
```

## Adding New Tests

To add new test cases, edit `test_app.py`:

```python
def test_your_new_test(client):
    """Test description"""
    # Your test code here
    response = client.get('/api/endpoint')
    assert response.status_code == 200
    assert response.json['success'] == True
```

## Mocking SMB Operations
The SMB connection is mocked to prevent actual network calls during testing:

```python
from unittest.mock import Mock, patch

@patch('app.SMBConnection')
def test_upload(mock_smb_connection):
    mock_conn = Mock()
    mock_smb_connection.return_value = mock_conn
    mock_conn.connect.return_value = True
    # Test code here
```

## Benefits of Automated Testing

1. **Fast Execution** - Tests run in < 1 second
2. **Repeatable** - Same results every time
3. **No Manual Intervention** - Fully automated
4. **Regression Prevention** - Catches bugs before deployment
5. **CI/CD Ready** - Integrates with automated pipelines
6. **Code Coverage** - Reports test coverage metrics

## Coverage Report
Coverage reports are generated in the `htmlcov/` directory after running tests with coverage.

View HTML coverage report:
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## Troubleshooting

### Tests failing with import errors
Ensure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### SMB connection not mocked
Ensure the SMB connection is properly mocked at the top of the test file with `@patch('app.SMBConnection')`.

### Test files not found
Check that test fixtures are properly set up in the test file.
