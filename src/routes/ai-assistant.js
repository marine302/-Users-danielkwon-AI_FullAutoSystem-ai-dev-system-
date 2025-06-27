/**
 * AI 어시스턴트 API 라우터
 * 대화형 AI 어시스턴트 서비스
 */

import express from 'express';
import { AIService } from '../modules/ai/AIService.js';

const router = express.Router();
const aiService = new AIService();

/**
 * POST /api/v1/ai-assistant/chat
 * AI 어시스턴트와 채팅
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context = [], systemPrompt } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: '메시지가 필요합니다.'
      });
    }

    console.log('AI 어시스턴트 채팅 요청:', { message: message.substring(0, 100) });

    // 시스템 프롬프트 설정
    const defaultSystemPrompt = `
당신은 AI 개발 시스템의 전문 어시스턴트입니다. 
코딩, 개발, 테스팅, 디버깅, 아키텍처 설계 등 모든 개발 관련 질문에 도움을 드립니다.
한국어로 친절하고 정확하게 답변해주세요.
`;

    const prompt = systemPrompt || defaultSystemPrompt;
    
    // 대화 컨텍스트 구성
    let fullContext = prompt + '\n\n';
    if (context.length > 0) {
      fullContext += '이전 대화:\n';
      context.forEach((msg, index) => {
        fullContext += `${msg.role}: ${msg.content}\n`;
      });
      fullContext += '\n';
    }
    fullContext += `사용자: ${message}\n어시스턴트:`;

    // AI 응답 생성
    const response = await aiService.generateResponse(fullContext);

    res.json({
      success: true,
      data: {
        message: response,
        timestamp: new Date().toISOString(),
        context_updated: [...context, 
          { role: '사용자', content: message },
          { role: '어시스턴트', content: response }
        ]
      }
    });

  } catch (error) {
    console.error('AI 어시스턴트 채팅 오류:', error);
    res.status(500).json({
      success: false,
      error: 'AI 어시스턴트 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/ai-assistant/code-help
 * 코드 관련 도움말
 */
router.post('/code-help', async (req, res) => {
  try {
    const { code, question, language = 'javascript' } = req.body;

    if (!code && !question) {
      return res.status(400).json({
        success: false,
        error: '코드 또는 질문이 필요합니다.'
      });
    }

    console.log('코드 도움말 요청');

    const prompt = `
다음 ${language} 코드에 대한 질문에 답변해주세요:

${code ? `코드:\n\`\`\`${language}\n${code}\n\`\`\`` : ''}

질문: ${question}

친절하고 구체적으로 설명해주세요. 필요하다면 수정된 코드 예시도 제공해주세요.
`;

    const response = await aiService.generateResponse(prompt);

    res.json({
      success: true,
      data: {
        answer: response,
        language,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('코드 도움말 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 도움말 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/ai-assistant/explain
 * 코드 설명
 */
router.post('/explain', async (req, res) => {
  try {
    const { code, language = 'javascript', level = 'intermediate' } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '설명할 코드가 필요합니다.'
      });
    }

    console.log('코드 설명 요청');

    const levelMap = {
      beginner: '초보자도 이해할 수 있게',
      intermediate: '중급 개발자 수준으로',
      advanced: '고급 개발자 관점에서'
    };

    const prompt = `
다음 ${language} 코드를 ${levelMap[level]} 설명해주세요:

\`\`\`${language}
${code}
\`\`\`

다음을 포함해서 설명해주세요:
1. 코드의 전반적인 목적
2. 주요 로직의 흐름
3. 사용된 개념이나 패턴
4. 잠재적인 개선점 (있다면)

한국어로 친절하게 설명해주세요.
`;

    const response = await aiService.generateResponse(prompt);

    res.json({
      success: true,
      data: {
        explanation: response,
        code,
        language,
        level,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('코드 설명 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 설명 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/ai-assistant/debug
 * 디버깅 도움
 */
router.post('/debug', async (req, res) => {
  try {
    const { code, error_message, expected_behavior, language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '디버깅할 코드가 필요합니다.'
      });
    }

    console.log('디버깅 도움 요청');

    const prompt = `
다음 ${language} 코드의 디버깅을 도와주세요:

코드:
\`\`\`${language}
${code}
\`\`\`

${error_message ? `에러 메시지: ${error_message}` : ''}
${expected_behavior ? `예상 동작: ${expected_behavior}` : ''}

다음을 제공해주세요:
1. 문제 분석
2. 가능한 원인들
3. 해결 방법
4. 수정된 코드 (필요한 경우)
5. 향후 유사한 문제 예방법

한국어로 친절하고 구체적으로 설명해주세요.
`;

    const response = await aiService.generateResponse(prompt);

    res.json({
      success: true,
      data: {
        debug_help: response,
        original_code: code,
        error_message,
        expected_behavior,
        language,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('디버깅 도움 오류:', error);
    res.status(500).json({
      success: false,
      error: '디버깅 도움 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/ai-assistant/optimize
 * 코드 최적화 제안
 */
router.post('/optimize', async (req, res) => {
  try {
    const { code, optimization_goals = [], language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '최적화할 코드가 필요합니다.'
      });
    }

    console.log('코드 최적화 요청');

    const goalsText = optimization_goals.length > 0 
      ? `최적화 목표: ${optimization_goals.join(', ')}`
      : '일반적인 성능 및 가독성 최적화';

    const prompt = `
다음 ${language} 코드의 최적화를 제안해주세요:

코드:
\`\`\`${language}
${code}
\`\`\`

${goalsText}

다음을 제공해주세요:
1. 현재 코드의 문제점 분석
2. 최적화 기회들
3. 개선된 코드
4. 성능 향상 예상치
5. 트레이드오프 설명

한국어로 친절하고 구체적으로 설명해주세요.
`;

    const response = await aiService.generateResponse(prompt);

    res.json({
      success: true,
      data: {
        optimization_advice: response,
        original_code: code,
        optimization_goals,
        language,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('코드 최적화 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 최적화 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export default router;
