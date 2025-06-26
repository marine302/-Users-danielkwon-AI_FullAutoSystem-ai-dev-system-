import express from 'express';
import AIService from '../modules/ai/AIService.js';

const router = express.Router();
const aiService = new AIService();

/**
 * 텍스트 생성 API
 */
router.post('/generate-text', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'prompt는 필수 매개변수입니다'
      });
    }

    const result = await aiService.generateText(prompt, options);
    
    res.json({
      success: true,
      data: {
        generatedText: result,
        prompt,
        options,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI 텍스트 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '텍스트 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 코드 생성 API
 */
router.post('/generate-code', async (req, res) => {
  try {
    const { description, language = 'javascript', options = {} } = req.body;
    
    if (!description) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'description은 필수 매개변수입니다'
      });
    }

    const result = await aiService.generateCode(description, language, options);
    
    res.json({
      success: true,
      data: {
        generatedCode: result,
        description,
        language,
        options,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI 코드 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '코드 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 코드 리뷰 API
 */
router.post('/review-code', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'code는 필수 매개변수입니다'
      });
    }

    const result = await aiService.reviewCode(code, language);
    
    res.json({
      success: true,
      data: {
        review: result,
        language,
        codeLength: code.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI 코드 리뷰 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '코드 리뷰 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 프로젝트 구조 생성 API
 */
router.post('/generate-project-structure', async (req, res) => {
  try {
    const { projectType, description } = req.body;
    
    if (!projectType || !description) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'projectType과 description은 필수 매개변수입니다'
      });
    }

    const result = await aiService.generateProjectStructure(projectType, description);
    
    res.json({
      success: true,
      data: {
        projectStructure: result,
        projectType,
        description,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI 프로젝트 구조 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '프로젝트 구조 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * 문서 생성 API
 */
router.post('/generate-documentation', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'type과 data는 필수 매개변수입니다'
      });
    }

    const result = await aiService.generateDocumentation(type, data);
    
    res.json({
      success: true,
      data: {
        documentation: result,
        type,
        inputData: data,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI 문서 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '문서 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * AI 서비스 상태 확인 API
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'AI Service',
      status: 'running',
      features: [
        'Text Generation',
        'Code Generation',
        'Code Review',
        'Project Structure Generation',
        'Documentation Generation'
      ],
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
