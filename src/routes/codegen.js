/**
 * 코드 생성 API 라우트
 */
import express from 'express';
import CodeGenerator from '../modules/ai/CodeGenerator.js';

const router = express.Router();
const codeGenerator = new CodeGenerator();

/**
 * 코드 생성
 * POST /api/codegen/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, language = 'javascript', options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '프롬프트가 필요합니다.'
      });
    }
    
    const result = await codeGenerator.generateCode(prompt, language, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('코드 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 코드 분석
 * POST /api/codegen/analyze
 */
router.post('/analyze', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '분석할 코드가 필요합니다.'
      });
    }
    
    const analysis = await codeGenerator.analyzeCode(code, language);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('코드 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 코드 저장
 * POST /api/codegen/save
 */
router.post('/save', async (req, res) => {
  try {
    const { generatedCode, filename, directory = 'generated' } = req.body;
    
    if (!generatedCode || !filename) {
      return res.status(400).json({
        success: false,
        error: '생성된 코드와 파일명이 필요합니다.'
      });
    }
    
    const result = await codeGenerator.saveCode(generatedCode, filename, directory);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('코드 저장 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 코드 개선 제안
 * POST /api/codegen/improve
 */
router.post('/improve', async (req, res) => {
  try {
    const { code, language = 'javascript', focusArea = 'general' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '개선할 코드가 필요합니다.'
      });
    }
    
    // 코드 분석 후 개선 제안 생성
    const analysis = await codeGenerator.analyzeCode(code, language);
    
    const improvementPrompt = `다음 ${language} 코드를 분석하고 ${focusArea} 관점에서 개선된 버전을 제공해주세요:

원본 코드:
\`\`\`${language}
${code}
\`\`\`

현재 품질 점수: ${analysis.quality.score}/100
복잡도: ${analysis.complexity.cyclomatic}
감지된 패턴: ${analysis.patterns.join(', ')}

개선 방향:
- 코드 품질 향상
- 가독성 개선
- 성능 최적화
- 에러 처리 강화

개선된 코드와 변경 사항에 대한 설명을 제공해주세요.`;

    const improvedCode = await codeGenerator.generateCode(improvementPrompt, language, {
      type: 'improvement',
      originalCode: code,
      focusArea
    });
    
    res.json({
      success: true,
      data: {
        original: {
          code,
          analysis
        },
        improved: improvedCode,
        suggestions: analysis.aiSuggestions
      }
    });
  } catch (error) {
    console.error('코드 개선 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
