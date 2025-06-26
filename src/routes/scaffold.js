/**
 * 프로젝트 스캐폴딩 API 라우트
 */
import express from 'express';
import ProjectScaffolder from '../modules/project/ProjectScaffolder.js';

const router = express.Router();
const scaffolder = new ProjectScaffolder();

/**
 * 사용 가능한 템플릿 목록
 * GET /api/scaffold/templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = scaffolder.getAvailableTemplates();
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('템플릿 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 새 프로젝트 생성
 * POST /api/scaffold/create
 */
router.post('/create', async (req, res) => {
  try {
    const { 
      templateType, 
      projectName, 
      options = {} 
    } = req.body;
    
    if (!templateType || !projectName) {
      return res.status(400).json({
        success: false,
        error: '템플릿 타입과 프로젝트 이름이 필요합니다.'
      });
    }
    
    // 프로젝트명 유효성 검사
    if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
      return res.status(400).json({
        success: false,
        error: '프로젝트 이름은 영문, 숫자, 하이픈, 언더스코어만 허용됩니다.'
      });
    }
    
    const result = await scaffolder.createProject(templateType, projectName, {
      ...options,
      projectName
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: `프로젝트 '${projectName}'이 성공적으로 생성되었습니다.`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 템플릿 상세 정보
 * GET /api/scaffold/templates/:templateType
 */
router.get('/templates/:templateType', async (req, res) => {
  try {
    const { templateType } = req.params;
    const templates = scaffolder.getAvailableTemplates();
    const template = templates.find(t => t.id === templateType);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '템플릿을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('템플릿 정보 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 프로젝트 생성 미리보기
 * POST /api/scaffold/preview
 */
router.post('/preview', async (req, res) => {
  try {
    const { templateType, projectName, options = {} } = req.body;
    
    if (!templateType) {
      return res.status(400).json({
        success: false,
        error: '템플릿 타입이 필요합니다.'
      });
    }
    
    const templates = scaffolder.getAvailableTemplates();
    const template = templates.find(t => t.id === templateType);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '템플릿을 찾을 수 없습니다.'
      });
    }
    
    // 생성될 파일 구조 미리보기
    const preview = {
      template: template.name,
      description: template.description,
      projectName: projectName || 'my-project',
      estimatedFiles: 0,
      fileStructure: {},
      dependencies: [],
      devDependencies: [],
      nextSteps: scaffolder.getNextSteps(templateType, projectName || 'my-project')
    };
    
    // 템플릿 정보에서 파일 구조 추출
    const templateData = scaffolder.templates.get(templateType);
    if (templateData) {
      preview.fileStructure = templateData.structure;
      preview.dependencies = templateData.dependencies || [];
      preview.devDependencies = templateData.devDependencies || [];
      
      // 파일 수 계산
      const countFiles = (structure) => {
        let count = 0;
        Object.entries(structure).forEach(([key, value]) => {
          if (key.endsWith('/') && typeof value === 'object') {
            count += countFiles(value);
          } else {
            count++;
          }
        });
        return count;
      };
      
      preview.estimatedFiles = countFiles(templateData.structure);
    }
    
    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('미리보기 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 커스텀 템플릿 생성
 * POST /api/scaffold/custom-template
 */
router.post('/custom-template', async (req, res) => {
  try {
    const { 
      name,
      description,
      structure,
      dependencies = [],
      devDependencies = [],
      language = 'javascript'
    } = req.body;
    
    if (!name || !structure) {
      return res.status(400).json({
        success: false,
        error: '템플릿 이름과 구조가 필요합니다.'
      });
    }
    
    // 커스텀 템플릿을 임시로 저장 (실제로는 DB에 저장해야 함)
    const customTemplate = {
      name,
      description: description || `커스텀 ${language} 프로젝트`,
      dependencies,
      devDependencies,
      structure
    };
    
    const customId = `custom-${Date.now()}`;
    scaffolder.templates.set(customId, customTemplate);
    
    res.json({
      success: true,
      message: '커스텀 템플릿이 생성되었습니다.',
      data: {
        id: customId,
        template: customTemplate
      }
    });
  } catch (error) {
    console.error('커스텀 템플릿 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
