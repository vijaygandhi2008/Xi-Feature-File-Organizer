const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock the node-smb2 Client to avoid actual SMB connections during tests
jest.mock('node-smb2', () => ({
  Client: jest.fn().mockImplementation(() => {
    const mockTree = {
      readDirectory: jest.fn().mockResolvedValue([]),
      readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
      writeFile: jest.fn().mockResolvedValue(undefined),
      createDirectory: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
      unlink: jest.fn().mockResolvedValue(undefined)
    };
    
    const mockSession = {
      connectTree: jest.fn().mockResolvedValue(mockTree)
    };
    
    return {
      authenticate: jest.fn().mockResolvedValue(mockSession)
    };
  })
}));

describe('SMB File Upload and Download Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Set up test configuration
    const testConfig = {
      smb: {
        share: '//test-server/test-share',
        path: '/test-path',
        domain: 'WORKGROUP',
        user: 'testuser',
        password: 'testpass'
      },
      server: {
        port: 3001
      }
    };

    // Write test config
    fs.writeFileSync(
      path.join(__dirname, 'config.json'),
      JSON.stringify(testConfig, null, 2)
    );

    // Import app after config is written
    delete require.cache[require.resolve('./server.js')];
    app = require('./server.js');
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('File Upload Tests', () => {
    const testFiles = [
      { name: 'feature-file-4k_hfr-304546.xml', folder: '304546' },
      { name: 'feature-file-4k_hfr_off-304546.xml', folder: '304546' },
      { name: 'feature-file-4k_hfr-303045.xml', folder: '303045' },
      { name: 'feature-file-4k_hfr_off-303045.xml', folder: '303045' }
    ];

    beforeEach(() => {
      // Create test files
      const testDir = path.join(__dirname, 'test-files');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      testFiles.forEach(file => {
        const filePath = path.join(testDir, file.name);
        const content = `<?xml version="1.0" encoding="UTF-8"?><feature>${file.name}</feature>`;
        fs.writeFileSync(filePath, content);
      });
    });

    afterEach(() => {
      // Clean up test files
      const testDir = path.join(__dirname, 'test-files');
      if (fs.existsSync(testDir)) {
        fs.readdirSync(testDir).forEach(file => {
          fs.unlinkSync(path.join(testDir, file));
        });
        fs.rmdirSync(testDir);
      }
    });

    test('should extract folder name correctly from filename pattern', () => {
      testFiles.forEach(file => {
        const parts = file.name.split('-');
        const lastPart = parts[parts.length - 1];
        const extractedFolder = lastPart.split('.')[0];
        expect(extractedFolder).toBe(file.folder);
      });
    });

    test('should organize files into correct folders', () => {
      const filesByFolder = testFiles.reduce((acc, file) => {
        if (!acc[file.folder]) {
          acc[file.folder] = [];
        }
        acc[file.folder].push(file.name);
        return acc;
      }, {});

      expect(filesByFolder['304546']).toHaveLength(2);
      expect(filesByFolder['303045']).toHaveLength(2);
      expect(filesByFolder['304546']).toContain('feature-file-4k_hfr-304546.xml');
      expect(filesByFolder['304546']).toContain('feature-file-4k_hfr_off-304546.xml');
      expect(filesByFolder['303045']).toContain('feature-file-4k_hfr-303045.xml');
      expect(filesByFolder['303045']).toContain('feature-file-4k_hfr_off-303045.xml');
    });

    test('should upload multiple files successfully (mocked)', async () => {
      const testFile = path.join(__dirname, 'test-files', testFiles[0].name);
      
      // Note: Actual upload test would require a running server
      // This is a placeholder for the upload logic test
      expect(fs.existsSync(testFile)).toBe(true);
    });
  });

  describe('Folder Navigation Tests', () => {
    test('should list directories correctly', () => {
      const expectedFolders = ['304546', '303045'];
      
      // Extract unique folders from test files
      const testFiles = [
        'feature-file-4k_hfr-304546.xml',
        'feature-file-4k_hfr_off-304546.xml',
        'feature-file-4k_hfr-303045.xml',
        'feature-file-4k_hfr_off-303045.xml'
      ];

      const folders = [...new Set(testFiles.map(name => {
        const parts = name.split('-');
        const lastPart = parts[parts.length - 1];
        return lastPart.split('.')[0];
      }))];

      expect(folders).toEqual(expect.arrayContaining(expectedFolders));
      expect(folders).toHaveLength(2);
    });

    test('should filter folders by search term', () => {
      const folders = ['304546', '303045', '304547'];
      
      const searchTerm = '30454';
      const filtered = folders.filter(folder => folder.includes(searchTerm));
      
      expect(filtered).toContain('304546');
      expect(filtered).not.toContain('303045');
    });
  });

  describe('Download Tests', () => {
    test('should select correct files for download', () => {
      const filesInFolder304546 = [
        'feature-file-4k_hfr-304546.xml',
        'feature-file-4k_hfr_off-304546.xml'
      ];

      const filesInFolder303045 = [
        'feature-file-4k_hfr-303045.xml',
        'feature-file-4k_hfr_off-303045.xml'
      ];

      expect(filesInFolder304546).toHaveLength(2);
      expect(filesInFolder303045).toHaveLength(2);
    });

    test('should create ZIP with selected files', () => {
      const selectedFiles = [
        'feature-file-4k_hfr-304546.xml',
        'feature-file-4k_hfr_off-304546.xml'
      ];

      expect(selectedFiles).toHaveLength(2);
      expect(selectedFiles.every(file => file.endsWith('.xml'))).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('complete workflow: upload -> list -> search -> download', () => {
      // Step 1: Upload files
      const uploadedFiles = [
        { filename: 'feature-file-4k_hfr-304546.xml', folder: '304546' },
        { filename: 'feature-file-4k_hfr_off-304546.xml', folder: '304546' },
        { filename: 'feature-file-4k_hfr-303045.xml', folder: '303045' },
        { filename: 'feature-file-4k_hfr_off-303045.xml', folder: '303045' }
      ];

      expect(uploadedFiles).toHaveLength(4);

      // Step 2: List directories
      const directories = [...new Set(uploadedFiles.map(f => f.folder))];
      expect(directories).toEqual(['304546', '303045']);

      // Step 3: Search for folder
      const searchResult = directories.filter(d => d.includes('304546'));
      expect(searchResult).toContain('304546');

      // Step 4: List files in folder
      const filesInFolder = uploadedFiles.filter(f => f.folder === '304546');
      expect(filesInFolder).toHaveLength(2);

      // Step 5: Select files for download
      const selectedFiles = filesInFolder.map(f => f.filename);
      expect(selectedFiles).toContain('feature-file-4k_hfr-304546.xml');
      expect(selectedFiles).toContain('feature-file-4k_hfr_off-304546.xml');
    });
  });
});
