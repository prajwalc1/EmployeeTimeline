import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build, Platform } from 'electron-builder';
import { dirname, resolve } from 'path';
import * as Jimp from 'jimp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateWindowsIcon() {
  try {
    // Generate a simple icon if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'generated-icon.png'))) {
      const image = new Jimp(256, 256, '#1e40af');
      await image.writeAsync('generated-icon.png');
    }

    // Convert PNG to ICO for Windows
    const buf = await pngToIco(path.join(__dirname, 'generated-icon.png'));
    fs.writeFileSync(path.join(__dirname, 'generated-icon.ico'), buf);
  } catch (error) {
    console.error('Failed to generate Windows icon:', error);
    throw error;
  }
}

async function buildApp() {
  try {
    // First build the React app and server
    console.log('Building React app and server...');
    execSync('npm run build', { stdio: 'inherit' });

    // Generate Windows icon
    console.log('Generating Windows icon...');
    await generateWindowsIcon();

    // Create temporary build directory
    const buildDir = resolve(__dirname, 'build-temp');
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });

    // Create necessary subdirectories
    const serverDir = resolve(buildDir, 'server');
    const dbDir = resolve(buildDir, 'db');
    const distDir = resolve(buildDir, 'dist');
    const electronDir = resolve(buildDir, 'electron');
    const buildResourcesDir = resolve(buildDir, 'build');

    fs.mkdirSync(serverDir, { recursive: true });
    fs.mkdirSync(dbDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(electronDir, { recursive: true });
    fs.mkdirSync(buildResourcesDir, { recursive: true });

    // Create a temporary package.json for the build
    const tempPackageJson = {
      name: "schwarzenberg-tech-time-management",
      version: "1.0.0",
      description: "Enterprise Employee Time and Leave Management System for German business environments",
      main: "electron/main.js",
      private: true,
      author: {
        name: "Schwarzenberg Tech",
        email: "contact@schwarzenbergtech.com"
      },
      dependencies: {
        "express": "^4.21.2",
        "better-sqlite3": "^11.8.1",
        "drizzle-orm": "^0.28.6"
      },
      devDependencies: {
        "electron": "24.3.0",
        "electron-builder": "^25.1.8"
      }
    };

    // Write temporary package.json
    fs.writeFileSync(
      resolve(buildDir, 'package.json'),
      JSON.stringify(tempPackageJson, null, 2)
    );

    // Install build dependencies
    console.log('Installing build dependencies...');
    execSync('npm install --only=dev', {
      cwd: buildDir,
      stdio: 'inherit'
    });

    // Copy necessary files
    const filesToCopy = [
      { src: 'dist', dest: 'dist' },
      { src: 'electron', dest: 'electron' },
      { src: 'server', dest: 'server' },
      { src: 'db', dest: 'db' },
      { src: 'README.txt', dest: 'README.txt' },
      { src: 'install-windows.bat', dest: 'install-windows.bat' },
      { src: 'generated-icon.png', dest: 'build/icon.png' },
      { src: 'generated-icon.ico', dest: 'build/icon.ico' }
    ];

    for (const file of filesToCopy) {
      const srcPath = resolve(__dirname, file.src);
      const destPath = resolve(buildDir, file.dest);

      if (fs.existsSync(srcPath)) {
        if (fs.lstatSync(srcPath).isDirectory()) {
          fs.mkdirSync(dirname(destPath), { recursive: true });
          fs.cpSync(srcPath, destPath, { recursive: true });
        } else {
          fs.mkdirSync(dirname(destPath), { recursive: true });
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }

    console.log('Building Electron app...');
    await build({
      config: {
        appId: "com.schwarzenbergtech.timemanagement",
        productName: "Schwarzenberg Tech Zeiterfassung",
        directories: {
          output: resolve(__dirname, "release"),
          buildResources: buildResourcesDir
        },
        files: [
          "dist/**/*",
          "electron/**/*",
          "server/**/*",
          "db/**/*",
          "README.txt",
          "install-windows.bat"
        ],
        win: {
          target: ["nsis"],
          icon: "build/icon.ico",
          artifactName: "Schwarzenberg-Tech-Zeiterfassung-Setup-${version}.${ext}"
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: "Schwarzenberg Tech Zeiterfassung",
          language: "1031", // German
          perMachine: false,
          artifactName: "Schwarzenberg-Tech-Zeiterfassung-Setup-${version}.${ext}",
          runAfterFinish: true,
          include: "install-windows.bat",
          license: "LICENSE.txt",
          installerIcon: "build/icon.ico",
          uninstallerIcon: "build/icon.ico",
          installerHeaderIcon: "build/icon.ico"
        },
        extraResources: [
          {
            from: ".",
            to: ".",
            filter: ["README.txt"]
          }
        ],
        electronVersion: "24.3.0",
        npmRebuild: false,
        buildDependenciesFromSource: false
      },
      targets: Platform.WINDOWS.createTarget(),
      projectDir: buildDir
    });

    console.log('\nBuild completed successfully!');
    console.log('The Windows installer can be found in the release/ directory');

  } catch (error) {
    console.error('Build failed:', error);
    console.error('\nDetailed error:', error.stack);
    process.exit(1);
  }
}

buildApp();