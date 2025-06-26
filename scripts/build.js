#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  console.log('🔨 빌드 시작...');
  
  try {
    // 1. 빌드 디렉토리 생성
    const buildDir = path.join(__dirname, '../build');
    await fs.mkdir(buildDir, { recursive: true });
    
    // 2. 소스 파일 복사
    const srcDir = path.join(__dirname, '../src');
    await copyDirectory(srcDir, path.join(buildDir, 'src'));
    
    // 3. package.json 복사
    const packageJsonPath = path.join(__dirname, '../package.json');
    await fs.copyFile(packageJsonPath, path.join(buildDir, 'package.json'));
    
    // 4. .env.example 복사
    const envExamplePath = path.join(__dirname, '../.env.example');
    await fs.copyFile(envExamplePath, path.join(buildDir, '.env.example'));
    
    // 5. README.md 복사
    const readmePath = path.join(__dirname, '../README.md');
    await fs.copyFile(readmePath, path.join(buildDir, 'README.md'));
    
    console.log('✅ 빌드 완료!');
    console.log(`📁 빌드 파일 위치: ${buildDir}`);
  } catch (error) {
    console.error('❌ 빌드 실패:', error.message);
    process.exit(1);
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

build();
