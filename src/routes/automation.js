import express from 'express';
import AutomationService from '../modules/automation/AutomationService.js';

const router = express.Router();
const automationService = new AutomationService();

/**
 * 명령어 실행 API
 */
router.post('/execute', async (req, res) => {
  try {
    const { command, options = {} } = req.body;
    
    if (!command) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'command는 필수 매개변수입니다'
      });
    }

    const result = await automationService.executeCommand(command, options);
    
    res.json({
      success: true,
      data: {
        result,
        message: '명령어가 성공적으로 실행되었습니다'
      }
    });
  } catch (error) {
    console.error('명령어 실행 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '명령어 실행 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 파일 생성 API
 */
router.post('/create-file', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'filePath와 content는 필수 매개변수입니다'
      });
    }

    const result = await automationService.createFile(filePath, content);
    
    res.json({
      success: true,
      data: {
        filePath,
        created: result,
        message: '파일이 성공적으로 생성되었습니다'
      }
    });
  } catch (error) {
    console.error('파일 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '파일 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 파일 읽기 API
 */
router.post('/read-file', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'filePath는 필수 매개변수입니다'
      });
    }

    const content = await automationService.readFile(filePath);
    
    res.json({
      success: true,
      data: {
        filePath,
        content,
        size: content.length,
        message: '파일을 성공적으로 읽었습니다'
      }
    });
  } catch (error) {
    console.error('파일 읽기 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '파일 읽기 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 디렉토리 생성 API
 */
router.post('/create-directory', async (req, res) => {
  try {
    const { dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dirPath는 필수 매개변수입니다'
      });
    }

    const result = await automationService.createDirectory(dirPath);
    
    res.json({
      success: true,
      data: {
        dirPath,
        created: result,
        message: '디렉토리가 성공적으로 생성되었습니다'
      }
    });
  } catch (error) {
    console.error('디렉토리 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '디렉토리 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * Git 저장소 초기화 API
 */
router.post('/init-git', async (req, res) => {
  try {
    const { projectPath = '.' } = req.body;
    
    const results = await automationService.initializeGitRepository(projectPath);
    
    res.json({
      success: true,
      data: {
        projectPath,
        results,
        message: 'Git 저장소가 성공적으로 초기화되었습니다'
      }
    });
  } catch (error) {
    console.error('Git 초기화 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Git 저장소 초기화 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * NPM 프로젝트 초기화 API
 */
router.post('/init-npm', async (req, res) => {
  try {
    const { projectPath, packageConfig = {} } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'projectPath는 필수 매개변수입니다'
      });
    }

    const result = await automationService.initializeNpmProject(projectPath, packageConfig);
    
    res.json({
      success: true,
      data: {
        projectPath,
        result,
        message: 'NPM 프로젝트가 성공적으로 초기화되었습니다'
      }
    });
  } catch (error) {
    console.error('NPM 초기화 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'NPM 프로젝트 초기화 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 의존성 설치 API
 */
router.post('/install-dependencies', async (req, res) => {
  try {
    const { dependencies, options = {} } = req.body;
    
    if (!dependencies || !Array.isArray(dependencies)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dependencies는 배열 형태의 필수 매개변수입니다'
      });
    }

    const result = await automationService.installDependencies(dependencies, options);
    
    res.json({
      success: true,
      data: {
        dependencies,
        result,
        message: '의존성이 성공적으로 설치되었습니다'
      }
    });
  } catch (error) {
    console.error('의존성 설치 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '의존성 설치 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 프로젝트 빌드 API
 */
router.post('/build', async (req, res) => {
  try {
    const { projectPath, buildCommand = 'npm run build' } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'projectPath는 필수 매개변수입니다'
      });
    }

    const result = await automationService.buildProject(projectPath, buildCommand);
    
    res.json({
      success: true,
      data: {
        projectPath,
        buildCommand,
        result,
        message: '프로젝트가 성공적으로 빌드되었습니다'
      }
    });
  } catch (error) {
    console.error('프로젝트 빌드 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '프로젝트 빌드 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 테스트 실행 API
 */
router.post('/test', async (req, res) => {
  try {
    const { projectPath, testCommand = 'npm test' } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'projectPath는 필수 매개변수입니다'
      });
    }

    const result = await automationService.runTests(projectPath, testCommand);
    
    res.json({
      success: true,
      data: {
        projectPath,
        testCommand,
        result,
        message: '테스트가 완료되었습니다'
      }
    });
  } catch (error) {
    console.error('테스트 실행 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '테스트 실행 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 명령어 히스토리 조회 API
 */
router.get('/history', (req, res) => {
  try {
    const history = automationService.getCommandHistory();
    
    res.json({
      success: true,
      data: {
        history,
        count: history.length,
        message: '명령어 히스토리를 조회했습니다'
      }
    });
  } catch (error) {
    console.error('히스토리 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '히스토리 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 자동화 서비스 상태 확인 API
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Automation Service',
      status: 'running',
      workingDirectory: automationService.workingDirectory,
      features: [
        'Command Execution',
        'File Operations',
        'Directory Management',
        'Git Operations',
        'NPM Operations',
        'Build & Test Automation'
      ],
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
