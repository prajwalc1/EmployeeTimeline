/**
 * Schwarzenberg Tech Time Management System
 * Packaging Script - Creates a deployment package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// Configuration
const packageConfig = {
  name: 'SchwarzenbergTech-TimeManagement-Server',
  version: '1.0.0',
  outputDir: './dist',
  filesToInclude: [
    'modular-server.js',
    'setup.js',
    'run-server.js',
    'test-server.js',
    'package.json',
    'package-lock.json',
    'config.yaml',
    '.env.example',
    'CLOUD-DEPLOYMENT.md',
    'README.md',
    'LICENSE',
    'start.sh',
    'stop.sh',
    'deploy-aws.sh',
    'Dockerfile',
    'docker-compose.yml'
  ],
  directoriesToInclude: [
    'modules',
    'db',
    'client'
  ],
  createDirectories: [
    'data',
    'logs',
    'backups',
    'config'
  ]
};

/**
 * Create the deployment package
 */
async function createPackage() {
  try {
    console.log('Creating deployment package...');
    
    // Create output directory
    const outputDir = path.resolve(packageConfig.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a temporary directory for the package contents
    const tempDir = path.join(outputDir, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Copy files
    for (const file of packageConfig.filesToInclude) {
      const srcPath = path.resolve(file);
      const destPath = path.join(tempDir, file);
      
      if (fs.existsSync(srcPath)) {
        // Create destination directory if it doesn't exist
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file}`);
      } else {
        console.warn(`Warning: File not found: ${srcPath}`);
      }
    }
    
    // Copy directories
    for (const dir of packageConfig.directoriesToInclude) {
      const srcDir = path.resolve(dir);
      const destDir = path.join(tempDir, dir);
      
      if (fs.existsSync(srcDir)) {
        copyDirectory(srcDir, destDir);
        console.log(`Copied directory ${dir}`);
      } else {
        console.warn(`Warning: Directory not found: ${srcDir}`);
      }
    }
    
    // Create empty directories
    for (const dir of packageConfig.createDirectories) {
      const dirPath = path.join(tempDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');
        console.log(`Created directory ${dir}`);
      }
    }
    
    // Create ZIP archive
    const zipFileName = `${packageConfig.name}-${packageConfig.version}.zip`;
    const zipFilePath = path.join(outputDir, zipFileName);
    
    await createZipArchive(tempDir, zipFilePath);
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log(`
===== Package Created Successfully =====
Package: ${zipFilePath}

To deploy on a server:
1. Unzip the package
2. Run the setup wizard: node setup.js
3. Start the application: ./start.sh

For cloud deployment options, see CLOUD-DEPLOYMENT.md
`);
  } catch (error) {
    console.error('Error creating package:', error);
    process.exit(1);
  }
}

/**
 * Create a ZIP archive
 * @param {string} sourceDir - Source directory
 * @param {string} outputPath - Output ZIP file path
 */
function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Best compression
    });
    
    output.on('close', () => {
      console.log(`Created ZIP archive: ${outputPath}`);
      console.log(`Total size: ${archive.pointer()} bytes`);
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add the entire directory contents to the ZIP
    archive.directory(sourceDir, false);
    
    archive.finalize();
  });
}

/**
 * Copy a directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create the package
createPackage().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});