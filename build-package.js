import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildPackage() {
  try {
    // Create the distribution directory
    const distDir = path.join(__dirname, 'dist-package');
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir, { recursive: true });

    // Create necessary subdirectories
    const serverDir = path.join(distDir, 'server');
    const serverPublicDir = path.join(serverDir, 'public');
    const dataDir = path.join(distDir, 'data');
    const dbDir = path.join(distDir, 'db');
    const migrationsDir = path.join(distDir, 'migrations');
    const electronDir = path.join(distDir, 'electron');

    [serverDir, serverPublicDir, dataDir, dbDir, migrationsDir, electronDir].forEach(dir => {
      fs.mkdirSync(dir, { recursive: true });
    });

    // Copy Windows build scripts
    fs.copyFileSync(
      path.join(__dirname, 'windows-build.bat'),
      path.join(distDir, 'windows-build.bat')
    );

    // Copy necessary files
    const filesToCopy = [
      { src: ['dist', 'public'], dest: serverPublicDir },
      { src: ['dist', 'index.js'], dest: path.join(serverDir, 'index.js') },
      { src: ['electron', 'main.js'], dest: path.join(electronDir, 'main.js') },
      { src: 'db', dest: dbDir },
      { src: 'migrations', dest: migrationsDir }
    ];

    filesToCopy.forEach(({ src, dest }) => {
      const sourcePath = Array.isArray(src) ? path.join(__dirname, ...src) : path.join(__dirname, src);
      if (fs.existsSync(sourcePath)) {
        if (fs.lstatSync(sourcePath).isDirectory()) {
          fs.cpSync(sourcePath, dest, { recursive: true });
        } else {
          fs.copyFileSync(sourcePath, dest);
        }
      }
    });

    // Create Windows-specific package.json
    const packageJson = {
      name: "schwarzenberg-tech-time-management",
      version: "1.0.0",
      description: "Enterprise Employee Time and Leave Management System for German business environments",
      main: "electron/main.js",
      private: true,
      author: {
        name: "Schwarzenberg Tech",
        email: "contact@schwarzenbergtech.com"
      },
      scripts: {
        "postinstall": "electron-builder install-app-deps"
      },
      dependencies: {
        "express": "^4.21.2",
        "better-sqlite3": "^11.8.1",
        "drizzle-orm": "^0.28.6",
        "express-session": "^1.18.0",
        "memorystore": "^1.6.7",
        "ws": "^8.18.0"
      },
      config: {
        "better-sqlite3": {
          "msvs_version": "2019",
          "module_name": "better_sqlite3",
          "module_path": "./lib/binding/napi-v{napi_build_version}",
          "host": "https://raw.githubusercontent.com/JoshuaWise/better-sqlite3/master/deps"
        }
      }
    };

    fs.writeFileSync(
      path.join(distDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create Windows build instructions
    const buildInstructions = `
Windows Build Instructions
-------------------------
1. Extract all files from this package
2. Right-click on windows-build.bat and select "Run as administrator"
3. Follow the prompts to install any missing dependencies
4. The installer will be created in the release/win directory

Requirements:
- Python 3.10 or later
- Visual Studio Build Tools 2019
- Node.js 18 or later

If you encounter any issues during the build:
1. Make sure Python is installed with pip and added to PATH
2. Install Visual Studio Build Tools with "Desktop development with C++"
3. Run the build script again
`;

    fs.writeFileSync(path.join(distDir, 'WINDOWS-BUILD.txt'), buildInstructions);

    // Create distribution package
    console.log('Creating distribution package...');
    const output = fs.createWriteStream(path.join(__dirname, 'release', 'SchwarzenbergTech-TimeManagement.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`\nPackage created successfully (${archive.pointer()} bytes)`);
      console.log('Distribution package: release/SchwarzenbergTech-TimeManagement.zip');
      console.log('\nTo build on Windows:');
      console.log('1. Extract the zip file');
      console.log('2. Run windows-build.bat as administrator');
      console.log('3. Follow the instructions in the setup script');
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(distDir, false);
    await archive.finalize();

  } catch (error) {
    console.error('Build failed:', error);
    console.error('\nDetailed error:', error.stack);
    process.exit(1);
  }
}

buildPackage();