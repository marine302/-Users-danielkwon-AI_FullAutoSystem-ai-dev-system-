import path from 'path';
import fs from 'fs/promises';
import AIService from '../ai/AIService.js';
import AutomationService from '../automation/AutomationService.js';
import DatabaseService from '../../services/DatabaseService.js';

class ProjectManager {
  constructor() {
    this.aiService = new AIService();
    this.automationService = new AutomationService();
    this.projects = new Map();
    this.db = new DatabaseService();
  }

  /**
   * 새 프로젝트 생성
   * @param {Object} projectConfig - 프로젝트 설정
   * @returns {Promise<Object>} 생성된 프로젝트 정보
   */
  async createProject(projectConfig) {
    const {
      name,
      type,
      description,
      path: projectPath,
      template = null,
      features = []
    } = projectConfig;

    try {
      console.log(`🚀 새 프로젝트 생성 시작: ${name}`);

      // 1. 프로젝트 구조 AI 생성
      const projectStructure = await this.aiService.generateProjectStructure(type, description);

      // 2. 프로젝트 디렉토리 생성
      const fullProjectPath = path.resolve(projectPath, name);
      await this.automationService.createDirectory(fullProjectPath);
      this.automationService.setWorkingDirectory(fullProjectPath);

      // 3. 폴더 구조 생성
      for (const folder of projectStructure.structure.folders) {
        await this.automationService.createDirectory(folder);
      }

      // 4. 기본 파일 생성
      await this.createProjectFiles(projectStructure, features);

      // 5. 의존성 설치
      if (projectStructure.dependencies.length > 0) {
        await this.automationService.installDependencies(projectStructure.dependencies);
      }

      // 6. Git 저장소 초기화
      await this.automationService.initializeGitRepository();

      // 7. 프로젝트 정보 저장
      const projectInfo = {
        id: this.generateProjectId(name),
        name,
        type,
        description,
        path: fullProjectPath,
        structure: projectStructure,
        features,
        createdAt: new Date().toISOString(),
        status: 'created'
      };

      // 메모리에 저장
      this.projects.set(projectInfo.id, projectInfo);

      // 데이터베이스에 저장
      try {
        await this.db.createProject({
          id: projectInfo.id,
          name: projectInfo.name,
          description: projectInfo.description,
          type: projectInfo.type,
          language: projectStructure.language || 'javascript',
          framework: projectStructure.framework || null,
          status: 'active',
          metadata: {
            path: fullProjectPath,
            structure: projectStructure,
            features: features,
            createdAt: projectInfo.createdAt
          }
        });
        console.log(`💾 프로젝트 정보 데이터베이스 저장 완료: ${name}`);
      } catch (dbError) {
        console.warn(`⚠️ 데이터베이스 저장 실패: ${dbError.message}`);
      }

      console.log(`✅ 프로젝트 생성 완료: ${name}`);
      return projectInfo;
    } catch (error) {
      console.error(`❌ 프로젝트 생성 실패: ${error.message}`);
      throw new Error(`프로젝트 생성 실패: ${error.message}`);
    }
  }

  /**
   * 프로젝트 파일 생성
   * @param {Object} projectStructure - 프로젝트 구조
   * @param {Array} features - 추가 기능들
   */
  async createProjectFiles(projectStructure, features) {
    // package.json 생성
    if (projectStructure.structure.files.includes('package.json')) {
      const packageJson = {
        name: projectStructure.name || 'new-project',
        version: '1.0.0',
        description: projectStructure.description || '',
        main: 'index.js',
        scripts: projectStructure.scripts || {
          start: 'node index.js',
          dev: 'nodemon index.js',
          test: 'jest'
        },
        dependencies: {},
        devDependencies: {},
        keywords: [],
        author: '',
        license: 'MIT'
      };

      await this.automationService.createFile('package.json', JSON.stringify(packageJson, null, 2));
    }

    // README.md 생성
    if (projectStructure.structure.files.includes('README.md')) {
      const readmeContent = await this.aiService.generateDocumentation('README', {
        name: projectStructure.name,
        description: projectStructure.description,
        features
      });
      await this.automationService.createFile('README.md', readmeContent);
    }

    // .gitignore 생성
    if (projectStructure.structure.files.includes('.gitignore')) {
      const gitignoreContent = this.generateGitignoreContent();
      await this.automationService.createFile('.gitignore', gitignoreContent);
    }

    // 기본 진입점 파일 생성
    if (projectStructure.structure.files.includes('index.js')) {
      const indexContent = await this.aiService.generateCode(
        `기본 ${projectStructure.type || 'Node.js'} 애플리케이션 진입점`,
        'javascript'
      );
      await this.automationService.createFile('index.js', indexContent);
    }
  }

  /**
   * 프로젝트에 기능 추가
   * @param {string} projectId - 프로젝트 ID
   * @param {string} featureDescription - 기능 설명
   * @returns {Promise<Object>} 추가된 기능 정보
   */
  async addFeature(projectId, featureDescription) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다');
    }

    try {
      console.log(`🔧 기능 추가 시작: ${featureDescription}`);

      // 작업 디렉토리 설정
      this.automationService.setWorkingDirectory(project.path);

      // AI로 기능 구현 코드 생성
      const featureCode = await this.aiService.generateCode(
        featureDescription,
        this.getProjectLanguage(project.type)
      );

      // 기능 파일 생성
      const featureFileName = this.generateFeatureFileName(featureDescription);
      const featurePath = path.join('src', 'features', featureFileName);
      
      await this.automationService.createFile(featurePath, featureCode);

      // 테스트 파일 생성
      const testCode = await this.aiService.generateCode(
        `${featureDescription}에 대한 Jest 테스트`,
        'javascript'
      );
      const testPath = path.join('tests', featureFileName.replace('.js', '.test.js'));
      await this.automationService.createFile(testPath, testCode);

      const featureInfo = {
        id: this.generateFeatureId(featureDescription),
        description: featureDescription,
        filePath: featurePath,
        testPath,
        addedAt: new Date().toISOString()
      };

      project.features.push(featureInfo);
      
      console.log(`✅ 기능 추가 완료: ${featureDescription}`);
      return featureInfo;
    } catch (error) {
      console.error(`❌ 기능 추가 실패: ${error.message}`);
      throw new Error(`기능 추가 실패: ${error.message}`);
    }
  }

  /**
   * 프로젝트 빌드
   * @param {string} projectId - 프로젝트 ID
   * @returns {Promise<Object>} 빌드 결과
   */
  async buildProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다');
    }

    try {
      console.log(`🔨 프로젝트 빌드 시작: ${project.name}`);
      
      const buildResult = await this.automationService.buildProject(project.path);
      
      project.lastBuild = {
        timestamp: new Date().toISOString(),
        success: buildResult.success,
        output: buildResult.buildOutput
      };

      console.log(`✅ 프로젝트 빌드 완료: ${project.name}`);
      return buildResult;
    } catch (error) {
      console.error(`❌ 프로젝트 빌드 실패: ${error.message}`);
      throw new Error(`프로젝트 빌드 실패: ${error.message}`);
    }
  }

  /**
   * 프로젝트 테스트 실행
   * @param {string} projectId - 프로젝트 ID
   * @returns {Promise<Object>} 테스트 결과
   */
  async testProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다');
    }

    try {
      console.log(`🧪 프로젝트 테스트 시작: ${project.name}`);
      
      const testResult = await this.automationService.runTests(project.path);
      
      project.lastTest = {
        timestamp: new Date().toISOString(),
        success: testResult.success,
        output: testResult.testOutput
      };

      console.log(`✅ 프로젝트 테스트 완료: ${project.name}`);
      return testResult;
    } catch (error) {
      console.error(`❌ 프로젝트 테스트 실패: ${error.message}`);
      throw new Error(`프로젝트 테스트 실패: ${error.message}`);
    }
  }

  /**
   * 코드 리뷰 실행
   * @param {string} projectId - 프로젝트 ID
   * @param {string} filePath - 리뷰할 파일 경로
   * @returns {Promise<Object>} 리뷰 결과
   */
  async reviewCode(projectId, filePath) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다');
    }

    try {
      const fullPath = path.join(project.path, filePath);
      const code = await this.automationService.readFile(fullPath);
      const language = this.getFileLanguage(filePath);
      
      const reviewResult = await this.aiService.reviewCode(code, language);
      
      return {
        filePath,
        language,
        reviewResult,
        reviewedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`코드 리뷰 실패: ${error.message}`);
    }
  }

  /**
   * 프로젝트 목록 조회
   * @returns {Array} 프로젝트 목록
   */
  async getProjects(filters = {}) {
    try {
      // 데이터베이스에서 프로젝트 조회
      const dbProjects = await this.db.getAllProjects(filters);
      
      // 메모리의 프로젝트와 병합 (메모리가 더 최신일 수 있음)
      const memoryProjects = Array.from(this.projects.values());
      
      // 중복 제거하고 최신 정보 유지
      const projectMap = new Map();
      
      // 데이터베이스 프로젝트 먼저 추가 (배열인지 확인)
      if (Array.isArray(dbProjects)) {
        dbProjects.forEach(project => {
          projectMap.set(project.id, project);
        });
      }
      
      // 메모리 프로젝트로 덮어쓰기 (더 최신)
      memoryProjects.forEach(project => {
        projectMap.set(project.id, project);
      });
      
      return Array.from(projectMap.values());
    } catch (error) {
      console.warn('데이터베이스에서 프로젝트 조회 실패, 메모리에서 반환:', error.message);
      return Array.from(this.projects.values());
    }
  }

  /**
   * 특정 프로젝트 조회
   * @param {string} projectId - 프로젝트 ID
   * @returns {Promise<Object>} 프로젝트 정보
   */
  async getProject(projectId) {
    try {
      // 메모리에서 먼저 확인
      let project = this.projects.get(projectId);
      
      if (!project) {
        // 데이터베이스에서 조회
        project = await this.db.getProject(projectId);
        
        // 메모리에 캐시
        if (project) {
          this.projects.set(projectId, project);
        }
      }
      
      return project;
    } catch (error) {
      console.warn('프로젝트 조회 실패:', error.message);
      return this.projects.get(projectId);
    }
  }

  // 유틸리티 메서드들
  generateProjectId(name) {
    return `proj_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
  }

  generateFeatureId(description) {
    return `feat_${description.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
  }

  generateFeatureFileName(description) {
    const cleanName = description.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    return `${cleanName}.js`;
  }

  getProjectLanguage(projectType) {
    const languageMap = {
      'node.js': 'javascript',
      'react': 'javascript',
      'vue': 'javascript',
      'angular': 'typescript',
      'express': 'javascript',
      'python': 'python',
      'django': 'python',
      'flask': 'python'
    };
    
    return languageMap[projectType.toLowerCase()] || 'javascript';
  }

  getFileLanguage(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const extensionMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php'
    };
    
    return extensionMap[extension] || 'text';
  }

  generateGitignoreContent() {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
*.tgz

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Temporary files
tmp/
temp/
`;
  }
}

export default ProjectManager;
