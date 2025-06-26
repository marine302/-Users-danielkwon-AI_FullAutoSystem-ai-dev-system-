import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class AutomationService {
  constructor() {
    this.workingDirectory = process.cwd();
    this.commandHistory = [];
  }

  /**
   * 쉘 명령어 실행
   * @param {string} command - 실행할 명령어
   * @param {Object} options - 실행 옵션
   * @returns {Promise<Object>} 실행 결과
   */
  async executeCommand(command, options = {}) {
    try {
      console.log(`🔧 명령어 실행: ${command}`);
      
      const result = await execAsync(command, {
        cwd: options.cwd || this.workingDirectory,
        maxBuffer: 1024 * 1024, // 1MB
        ...options
      });

      const commandResult = {
        command,
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        timestamp: new Date().toISOString()
      };

      this.commandHistory.push(commandResult);
      return commandResult;
    } catch (error) {
      const commandResult = {
        command,
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        timestamp: new Date().toISOString()
      };

      this.commandHistory.push(commandResult);
      throw new Error(`명령어 실행 실패: ${error.message}`);
    }
  }

  /**
   * 파일 생성
   * @param {string} filePath - 파일 경로
   * @param {string} content - 파일 내용
   * @returns {Promise<boolean>} 성공 여부
   */
  async createFile(filePath, content) {
    try {
      const fullPath = path.resolve(this.workingDirectory, filePath);
      const dir = path.dirname(fullPath);
      
      // 디렉토리가 없으면 생성
      await fs.mkdir(dir, { recursive: true });
      
      // 파일 작성
      await fs.writeFile(fullPath, content, 'utf8');
      
      console.log(`📄 파일 생성 완료: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`파일 생성 실패: ${filePath}`, error);
      throw new Error(`파일 생성 실패: ${error.message}`);
    }
  }

  /**
   * 파일 읽기
   * @param {string} filePath - 파일 경로
   * @returns {Promise<string>} 파일 내용
   */
  async readFile(filePath) {
    try {
      const fullPath = path.resolve(this.workingDirectory, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`파일 읽기 실패: ${error.message}`);
    }
  }

  /**
   * 디렉토리 생성
   * @param {string} dirPath - 디렉토리 경로
   * @returns {Promise<boolean>} 성공 여부
   */
  async createDirectory(dirPath) {
    try {
      const fullPath = path.resolve(this.workingDirectory, dirPath);
      await fs.mkdir(fullPath, { recursive: true });
      
      console.log(`📁 디렉토리 생성 완료: ${dirPath}`);
      return true;
    } catch (error) {
      throw new Error(`디렉토리 생성 실패: ${error.message}`);
    }
  }

  /**
   * Git 저장소 초기화
   * @param {string} projectPath - 프로젝트 경로
   * @returns {Promise<Object>} 실행 결과
   */
  async initializeGitRepository(projectPath = '.') {
    const commands = [
      'git init',
      'git add .',
      'git commit -m "Initial commit"'
    ];

    const results = [];
    for (const command of commands) {
      try {
        const result = await this.executeCommand(command, { cwd: projectPath });
        results.push(result);
      } catch (error) {
        console.warn(`Git 명령어 실행 중 경고: ${error.message}`);
        results.push({
          command,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * NPM 프로젝트 초기화
   * @param {string} projectPath - 프로젝트 경로
   * @param {Object} packageConfig - package.json 설정
   * @returns {Promise<Object>} 실행 결과
   */
  async initializeNpmProject(projectPath, packageConfig = {}) {
    try {
      // package.json 생성
      const defaultPackageConfig = {
        name: path.basename(projectPath),
        version: '1.0.0',
        description: '',
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          test: 'echo "Error: no test specified" && exit 1'
        },
        keywords: [],
        author: '',
        license: 'MIT',
        ...packageConfig
      };

      const packageJsonPath = path.join(projectPath, 'package.json');
      await this.createFile(packageJsonPath, JSON.stringify(defaultPackageConfig, null, 2));

      // npm install 실행
      const result = await this.executeCommand('npm install', { cwd: projectPath });
      
      return {
        success: true,
        packageConfig: defaultPackageConfig,
        installResult: result
      };
    } catch (error) {
      throw new Error(`NPM 프로젝트 초기화 실패: ${error.message}`);
    }
  }

  /**
   * 의존성 설치
   * @param {Array} dependencies - 설치할 의존성 목록
   * @param {Object} options - 설치 옵션
   * @returns {Promise<Object>} 설치 결과
   */
  async installDependencies(dependencies, options = {}) {
    const { dev = false, cwd = this.workingDirectory } = options;
    const flag = dev ? '--save-dev' : '--save';
    const command = `npm install ${flag} ${dependencies.join(' ')}`;

    try {
      const result = await this.executeCommand(command, { cwd });
      return {
        success: true,
        installed: dependencies,
        result
      };
    } catch (error) {
      throw new Error(`의존성 설치 실패: ${error.message}`);
    }
  }

  /**
   * 프로젝트 빌드
   * @param {string} projectPath - 프로젝트 경로
   * @param {string} buildCommand - 빌드 명령어
   * @returns {Promise<Object>} 빌드 결과
   */
  async buildProject(projectPath, buildCommand = 'npm run build') {
    try {
      const result = await this.executeCommand(buildCommand, { cwd: projectPath });
      return {
        success: true,
        buildOutput: result.stdout,
        buildErrors: result.stderr
      };
    } catch (error) {
      throw new Error(`프로젝트 빌드 실패: ${error.message}`);
    }
  }

  /**
   * 테스트 실행
   * @param {string} projectPath - 프로젝트 경로
   * @param {string} testCommand - 테스트 명령어
   * @returns {Promise<Object>} 테스트 결과
   */
  async runTests(projectPath, testCommand = 'npm test') {
    try {
      const result = await this.executeCommand(testCommand, { cwd: projectPath });
      return {
        success: true,
        testOutput: result.stdout,
        testErrors: result.stderr
      };
    } catch (error) {
      return {
        success: false,
        testOutput: error.stdout || '',
        testErrors: error.stderr || error.message
      };
    }
  }

  /**
   * 명령어 히스토리 조회
   * @returns {Array} 명령어 히스토리
   */
  getCommandHistory() {
    return this.commandHistory;
  }

  /**
   * 작업 디렉토리 변경
   * @param {string} newPath - 새로운 작업 디렉토리
   */
  setWorkingDirectory(newPath) {
    this.workingDirectory = path.resolve(newPath);
  }
}

export default AutomationService;
