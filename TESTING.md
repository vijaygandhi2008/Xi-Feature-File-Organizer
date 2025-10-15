# Automated Unit Tests

## Overview
This test suite automatically validates the SMB file upload, folder organization, and download functionality without manual intervention.

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

### Run all tests with coverage:
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes):
```bash
npm run test:watch
```

### Run specific test file:
```bash
npm test -- server.test.js
```

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        0.854 s
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
- **Jest** - JavaScript testing framework
- **Supertest** - HTTP assertion library
- **Mocked SMB2** - SMB operations are mocked to avoid real server connections

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
  run: npm test
```

### GitLab CI Example:
```yaml
test:
  script:
    - npm install
    - npm test
```

## Test Configuration
Tests use a separate test configuration to avoid interfering with production settings:
```json
{
  "smb": {
    "share": "//test-server/test-share",
    "path": "/test-path",
    "domain": "WORKGROUP",
    "user": "testuser",
    "password": "testpass"
  }
}
```

## Adding New Tests

To add new test cases, edit `server.test.js`:

```javascript
test('your new test description', () => {
  // Your test code here
  expect(actualValue).toBe(expectedValue);
});
```

## Mocking SMB Operations
The SMB2 client is mocked to prevent actual network calls during testing:

```javascript
jest.mock('smb2');
const mockClient = {
  readdir: jest.fn((path, callback) => callback(null, [])),
  mkdir: jest.fn((path, callback) => callback(null)),
  writeFile: jest.fn((path, content, callback) => callback(null)),
  disconnect: jest.fn()
};
```

## Benefits of Automated Testing

1. **Fast Execution** - Tests run in < 1 second
2. **Repeatable** - Same results every time
3. **No Manual Intervention** - Fully automated
4. **Regression Prevention** - Catches bugs before deployment
5. **CI/CD Ready** - Integrates with automated pipelines
6. **Code Coverage** - Reports test coverage metrics

## Coverage Report
Coverage reports are generated in the `coverage/` directory after running tests.

View HTML coverage report:
```bash
open coverage/lcov-report/index.html
```

## Troubleshooting

### Tests hanging
If tests don't exit properly, run with debug flag:
```bash
npm test -- --detectOpenHandles
```

### SMB client not mocked
Ensure `jest.mock('smb2')` is at the top of the test file.

### Test files not found
Check that test files are created in `beforeEach` hook.
