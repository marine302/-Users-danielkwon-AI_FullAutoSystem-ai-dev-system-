import express from 'express';
import ProjectManager from '../modules/project/ProjectManager.js';

const router = express.Router();
const projectManager = new ProjectManager();

/**
 * 새 프로젝트 생성 API
 */
router.post('/', async (req, res) => {
  try {
    const projectConfig = req.body;
    
    // 필수 필드 검증
    const requiredFields = ['name', 'type', 'description', 'path'];
    const missingFields = requiredFields.filter(field => !projectConfig[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `다음 필드들이 필요합니다: ${missingFields.join(', ')}`
      });
    }

    const project = await projectManager.createProject(projectConfig);
    
    res.status(201).json({
      success: true,
      data: {
        project,
        message: '프로젝트가 성공적으로 생성되었습니다'
      }
    });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '프로젝트 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 프로젝트 목록 조회 API
 */
router.get('/', async (req, res) => {
  try {
    const projects = await projectManager.getProjects();
    
    res.json({
      success: true,
      data: {
        projects,
        count: projects.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '프로젝트 목록 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 특정 프로젝트 조회 API
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectManager.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: '프로젝트를 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      data: {
        project,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '프로젝트 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 프로젝트에 기능 추가 API
 */
router.post('/:projectId/features', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { featureDescription } = req.body;
    
    if (!featureDescription) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'featureDescription은 필수 매개변수입니다'
      });
    }

    const feature = await projectManager.addFeature(projectId, featureDescription);
    
    res.status(201).json({
      success: true,
      data: {
        feature,
        message: '기능이 성공적으로 추가되었습니다'
      }
    });
  } catch (error) {
    console.error('기능 추가 오류:', error);
    
    if (error.message.includes('프로젝트를 찾을 수 없습니다')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: '기능 추가 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 프로젝트 빌드 API
 */
router.post('/:projectId/build', async (req, res) => {
  try {
    const { projectId } = req.params;
    const buildResult = await projectManager.buildProject(projectId);
    
    res.json({
      success: true,
      data: {
        buildResult,
        message: '프로젝트 빌드가 완료되었습니다'
      }
    });
  } catch (error) {
    console.error('프로젝트 빌드 오류:', error);
    
    if (error.message.includes('프로젝트를 찾을 수 없습니다')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: '프로젝트 빌드 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 프로젝트 테스트 실행 API
 */
router.post('/:projectId/test', async (req, res) => {
  try {
    const { projectId } = req.params;
    const testResult = await projectManager.testProject(projectId);
    
    res.json({
      success: true,
      data: {
        testResult,
        message: '프로젝트 테스트가 완료되었습니다'
      }
    });
  } catch (error) {
    console.error('프로젝트 테스트 오류:', error);
    
    if (error.message.includes('프로젝트를 찾을 수 없습니다')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: '프로젝트 테스트 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 코드 리뷰 API
 */
router.post('/:projectId/review', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'filePath는 필수 매개변수입니다'
      });
    }

    const reviewResult = await projectManager.reviewCode(projectId, filePath);
    
    res.json({
      success: true,
      data: {
        reviewResult,
        message: '코드 리뷰가 완료되었습니다'
      }
    });
  } catch (error) {
    console.error('코드 리뷰 오류:', error);
    
    if (error.message.includes('프로젝트를 찾을 수 없습니다')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: '코드 리뷰 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

export default router;
