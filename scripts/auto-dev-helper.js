#!/usr/bin/env node

/**
 * AI 개발 시스템 자동화 헬퍼 스크립트
 * VSCode에서 완전 자동화된 개발 환경을 구축하기 위한 스크립트
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

class AutoDevHelper {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.vscodeDir = path.join(this.projectRoot, '.vscode');
  }

  /**
   * 자동화 환경 설정
   */
  async setupAutomation() {
    console.log('🤖 AI 개발 시스템 자동화 설정 시작...');

    try {
      // 1. 환경변수 설정
      await this.setupEnvironmentVariables();
      
      // 2. Git 자동 설정
      await this.setupGitAutomation();
      
      // 3. NPM 스크립트 자동화
      await this.setupNpmAutomation();
      
      // 4. Copilot 자동 설정 확인
      await this.verifyCopilotSettings();
      
      console.log('✅ 자동화 설정 완료!');
    } catch (error) {
      console.error('❌ 자동화 설정 실패:', error.message);
    }
  }

  /**
   * 환경변수 자동 설정
   */
  async setupEnvironmentVariables() {
    console.log('📝 환경변수 설정 중...');
    
    const autoEnvVars = {
      'COPILOT_AUTO_ACCEPT': 'true',
      'VSCODE_AUTO_SAVE': 'true',
      'AI_DEV_AUTO_MODE': 'true',
      'GIT_AUTO_COMMIT': 'true'
    };

    // 현재 셸에 환경변수 설정
    for (const [key, value] of Object.entries(autoEnvVars)) {
      process.env[key] = value;
    }

    // .env 파일에 추가
    const envPath = path.join(this.projectRoot, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    for (const [key, value] of Object.entries(autoEnvVars)) {
      if (!envContent.includes(key)) {
        envContent += `\n# 자동화 설정\n${key}=${value}\n`;
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ 환경변수 설정 완료');
  }

  /**
   * Git 자동화 설정
   */
  async setupGitAutomation() {
    console.log('🔧 Git 자동화 설정 중...');
    
    const gitCommands = [
      'git config --local push.autoSetupRemote true',
      'git config --local pull.rebase false',
      'git config --local core.autocrlf false',
      'git config --local advice.addIgnoredFile false'
    ];

    for (const command of gitCommands) {
      try {
        await this.execCommand(command);
      } catch (error) {
        console.warn(`Git 설정 경고: ${command}`, error.message);
      }
    }

    console.log('✅ Git 자동화 설정 완료');
  }

  /**
   * NPM 자동화 설정
   */
  async setupNpmAutomation() {
    console.log('📦 NPM 자동화 설정 중...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.warn('package.json을 찾을 수 없습니다.');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 자동화 스크립트 추가
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['auto-dev'] = 'node scripts/auto-dev-helper.js';
    packageJson.scripts['auto-format'] = 'prettier --write . && eslint --fix .';
    packageJson.scripts['auto-test'] = 'jest --watch --silent';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ NPM 자동화 설정 완료');
  }

  /**
   * Copilot 설정 확인
   */
  async verifyCopilotSettings() {
    console.log('🤖 Copilot 설정 확인 중...');
    
    const settingsPath = path.join(this.vscodeDir, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      console.warn('VSCode settings.json을 찾을 수 없습니다.');
      return;
    }

    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      
      const requiredSettings = [
        'github.copilot.enable',
        'editor.inlineSuggest.enabled',
        'files.autoSave'
      ];

      const missingSettings = requiredSettings.filter(setting => 
        !this.hasNestedProperty(settings, setting)
      );

      if (missingSettings.length > 0) {
        console.warn('누락된 설정:', missingSettings);
      } else {
        console.log('✅ Copilot 설정 확인 완료');
      }
    } catch (error) {
      console.error('설정 파일 파싱 오류:', error.message);
    }
  }

  /**
   * 자동 개발 모드 시작
   */
  async startAutoDevMode() {
    console.log('🚀 자동 개발 모드 시작...');
    
    // 1. 자동 저장 감시
    this.startAutoSaveWatcher();
    
    // 2. 자동 테스트 실행
    this.startAutoTesting();
    
    // 3. 자동 포맷팅
    this.startAutoFormatting();
    
    // 4. Git 자동 커밋 (옵션)
    if (process.env.GIT_AUTO_COMMIT === 'true') {
      this.startAutoCommit();
    }
    
    console.log('✅ 자동 개발 모드 활성화됨');
    console.log('💡 파일을 편집하면 자동으로 저장, 포맷팅, 테스트가 실행됩니다.');
  }

  /**
   * 자동 저장 감시
   */
  startAutoSaveWatcher() {
    console.log('👀 자동 저장 감시 시작...');
    // VSCode의 자동 저장 기능에 의존
  }

  /**
   * 자동 테스트 실행
   */
  async startAutoTesting() {
    console.log('🧪 자동 테스트 모드 시작...');
    
    if (fs.existsSync(path.join(this.projectRoot, 'tests'))) {
      try {
        await this.execCommand('npm run test:watch', { detached: true });
      } catch (error) {
        console.warn('테스트 실행 중 오류:', error.message);
      }
    }
  }

  /**
   * 자동 포맷팅
   */
  startAutoFormatting() {
    console.log('🎨 자동 포맷팅 모드 시작...');
    // VSCode의 formatOnSave 기능에 의존
  }

  /**
   * Git 자동 커밋
   */
  startAutoCommit() {
    console.log('📝 Git 자동 커밋 모드 시작...');
    
    setInterval(async () => {
      try {
        const { stdout } = await this.execCommand('git status --porcelain');
        if (stdout.trim()) {
          const timestamp = new Date().toISOString();
          await this.execCommand('git add .');
          await this.execCommand(`git commit -m "Auto commit: ${timestamp}"`);
          console.log(`✅ 자동 커밋 완료: ${timestamp}`);
        }
      } catch (error) {
        // 커밋할 변경사항이 없거나 다른 오류
      }
    }, 300000); // 5분마다
  }

  /**
   * 명령어 실행 헬퍼
   */
  async execCommand(command, options = {}) {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this.projectRoot, ...options });
      return { stdout, stderr };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 중첩된 속성 확인 헬퍼
   */
  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj) !== undefined;
  }
}

// CLI 실행
const helper = new AutoDevHelper();

const command = process.argv[2];

switch (command) {
  case 'setup':
    await helper.setupAutomation();
    break;
  case 'start':
    await helper.startAutoDevMode();
    break;
  default:
    console.log('🤖 AI 개발 시스템 자동화 헬퍼');
    console.log('');
    console.log('사용법:');
    console.log('  node auto-dev-helper.js setup  - 자동화 환경 설정');
    console.log('  node auto-dev-helper.js start  - 자동 개발 모드 시작');
    break;
}

export default AutoDevHelper;
