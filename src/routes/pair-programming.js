import express from 'express';
import AIService from '../modules/ai/AIService.js';
import CodeGenerator from '../modules/ai/CodeGenerator.js';
import CodeAnalyzer from '../modules/analysis/CodeAnalyzer.js';

const router = express.Router();
const aiService = new AIService();
const codeGenerator = new CodeGenerator();
const codeAnalyzer = new CodeAnalyzer();

// 활성 페어 프로그래밍 세션들
const activeSessions = new Map();

/**
 * 실시간 AI 페어 프로그래밍 세션 시작
 */
router.post('/start-session', async (req, res) => {
  try {
    const { userId, projectType, language, goals } = req.body;
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      userId,
      projectType,
      language,
      goals: goals || [],
      startTime: new Date(),
      status: 'active',
      context: {
        currentFile: null,
        workingDirectory: null,
        recentChanges: [],
        suggestions: [],
        feedback: []
      },
      aiPersonality: {
        style: 'collaborative', // collaborative, mentoring, expert
        verbosity: 'balanced',  // minimal, balanced, detailed
        focus: 'productivity'   // productivity, learning, quality
      }
    };
    
    activeSessions.set(sessionId, session);
    
    // AI 페어 프로그래밍 세션 초기화
    const welcomeMessage = await aiService.generateText(
      `새로운 ${language} ${projectType} 프로젝트의 페어 프로그래밍 세션을 시작합니다. 
       목표: ${goals.join(', ')}
       개발자에게 환영 메시지와 첫 번째 제안을 제공해주세요.`
    );
    
    session.context.suggestions.push({
      type: 'welcome',
      message: welcomeMessage,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      sessionId,
      session,
      welcomeMessage
    });
    
  } catch (error) {
    console.error('페어 프로그래밍 세션 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: '페어 프로그래밍 세션을 시작할 수 없습니다.'
    });
  }
});

/**
 * 실시간 코드 분석 및 제안
 */
router.post('/analyze-code', async (req, res) => {
  try {
    const { sessionId, code, fileName, action } = req.body;
    
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }
    
    const session = activeSessions.get(sessionId);
    
    // 코드 분석
    const analysis = await codeAnalyzer.analyzeCode(code, fileName);
    
    // AI 피드백 생성
    const feedback = await aiService.generateText(
      `다음 코드를 페어 프로그래밍 관점에서 분석해주세요:
       파일: ${fileName}
       액션: ${action}
       코드: ${code}
       
       분석 결과: ${JSON.stringify(analysis)}
       
       개선점, 제안사항, 다음 단계를 제공해주세요.`
    );
    
    // 실시간 제안 생성
    const suggestions = await generateRealTimeSuggestions(code, fileName, analysis, session);
    
    // 세션 업데이트
    session.context.currentFile = fileName;
    session.context.recentChanges.push({
      action,
      fileName,
      timestamp: new Date(),
      codeSnippet: code.substring(0, 200) // 처음 200자만 저장
    });
    
    session.context.suggestions.push({
      type: 'analysis',
      analysis,
      feedback,
      suggestions,
      timestamp: new Date()
    });
    
    // 최근 변경사항은 최대 10개만 유지
    if (session.context.recentChanges.length > 10) {
      session.context.recentChanges = session.context.recentChanges.slice(-10);
    }
    
    res.json({
      success: true,
      analysis,
      feedback,
      suggestions,
      sessionId
    });
    
  } catch (error) {
    console.error('실시간 코드 분석 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 분석을 완료할 수 없습니다.'
    });
  }
});

/**
 * AI 페어 프로그래밍 대화
 */
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message, context } = req.body;
    
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }
    
    const session = activeSessions.get(sessionId);
    
    // 간단한 AI 응답 생성
    let response;
    try {
      const contextualPrompt = `페어 프로그래밍 세션에서 "${message}"라는 질문에 대해 도움이 되는 응답을 제공해주세요.`;
      response = await aiService.generateText(contextualPrompt);
    } catch (aiError) {
      // AI 서비스 오류 시 기본 응답
      response = `안녕하세요! "${message}"에 대해 도움을 드리겠습니다. 현재 ${session.language} ${session.projectType} 프로젝트를 진행 중이시군요.`;
    }
    
    // 대화 기록 저장
    session.context.feedback.push({
      type: 'chat',
      userMessage: message,
      aiResponse: response,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      response,
      sessionId
    });
    
  } catch (error) {
    console.error('페어 프로그래밍 채팅 오류:', error);
    res.status(500).json({
      success: false,
      error: '채팅 응답을 생성할 수 없습니다.',
      details: error.message
    });
  }
});

/**
 * 코드 자동 완성 및 제안
 */
router.post('/autocomplete', async (req, res) => {
  try {
    const { sessionId, partialCode, cursorPosition, language } = req.body;
    
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }
    
    const session = activeSessions.get(sessionId);
    
    // AI 기반 자동 완성
    const completion = await codeGenerator.generateCodeCompletion({
      code: partialCode,
      language: language || session.language,
      cursorPosition,
      context: session.context
    });
    
    res.json({
      success: true,
      completion,
      sessionId
    });
    
  } catch (error) {
    console.error('자동 완성 오류:', error);
    res.status(500).json({
      success: false,
      error: '자동 완성을 제공할 수 없습니다.'
    });
  }
});

/**
 * 리팩토링 제안
 */
router.post('/refactor', async (req, res) => {
  try {
    const { sessionId, code, refactorType } = req.body;
    
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }
    
    const session = activeSessions.get(sessionId);
    
    // AI 기반 리팩토링 제안
    const refactoringSuggestions = await codeGenerator.generateRefactoring({
      code,
      type: refactorType,
      language: session.language,
      context: session.context
    });
    
    res.json({
      success: true,
      suggestions: refactoringSuggestions,
      sessionId
    });
    
  } catch (error) {
    console.error('리팩토링 제안 오류:', error);
    res.status(500).json({
      success: false,
      error: '리팩토링 제안을 생성할 수 없습니다.'
    });
  }
});

/**
 * 세션 상태 조회
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }
    
    const session = activeSessions.get(sessionId);
    
    res.json({
      success: true,
      session
    });
    
  } catch (error) {
    console.error('세션 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '세션 정보를 가져올 수 없습니다.'
    });
  }
});

/**
 * 세션 종료
 */
router.post('/end-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }
    
    const session = activeSessions.get(sessionId);
    session.status = 'ended';
    session.endTime = new Date();
    
    // 세션 요약 생성
    const summary = await generateSessionSummary(session);
    
    // 세션 제거
    activeSessions.delete(sessionId);
    
    res.json({
      success: true,
      summary,
      message: '페어 프로그래밍 세션이 종료되었습니다.'
    });
    
  } catch (error) {
    console.error('세션 종료 오류:', error);
    res.status(500).json({
      success: false,
      error: '세션을 종료할 수 없습니다.'
    });
  }
});

/**
 * 활성 세션 목록
 */
router.get('/sessions', (req, res) => {
  try {
    const sessions = Array.from(activeSessions.values()).map(session => ({
      id: session.id,
      userId: session.userId,
      projectType: session.projectType,
      language: session.language,
      status: session.status,
      startTime: session.startTime,
      duration: Date.now() - session.startTime.getTime()
    }));
    
    res.json({
      success: true,
      sessions,
      count: sessions.length
    });
    
  } catch (error) {
    console.error('세션 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '세션 목록을 가져올 수 없습니다.'
    });
  }
});

// 유틸리티 함수들

/**
 * 실시간 제안 생성
 */
async function generateRealTimeSuggestions(code, fileName, analysis, session) {
  const suggestions = [];
  
  try {
    // 성능 최적화 제안
    if (analysis.performance && analysis.performance.length > 0) {
      suggestions.push({
        type: 'performance',
        priority: 'high',
        message: '성능 최적화 기회가 발견되었습니다.',
        details: analysis.performance
      });
    }
    
    // 보안 이슈 제안
    if (analysis.security && analysis.security.length > 0) {
      suggestions.push({
        type: 'security',
        priority: 'critical',
        message: '보안 이슈를 확인해주세요.',
        details: analysis.security
      });
    }
    
    // 코드 품질 제안
    if (analysis.quality && analysis.quality.length > 0) {
      suggestions.push({
        type: 'quality',
        priority: 'medium',
        message: '코드 품질을 개선할 수 있습니다.',
        details: analysis.quality
      });
    }
    
    // 다음 단계 제안
    const nextSteps = await aiService.generateText(
      `현재 코드를 기반으로 다음에 구현해야 할 기능이나 개선사항을 제안해주세요:
       파일: ${fileName}
       프로젝트: ${session.projectType}
       언어: ${session.language}`
    );
    
    suggestions.push({
      type: 'next_steps',
      priority: 'low',
      message: '다음 단계 제안',
      details: nextSteps
    });
    
  } catch (error) {
    console.error('실시간 제안 생성 오류:', error);
  }
  
  return suggestions;
}

/**
 * 세션 요약 생성
 */
async function generateSessionSummary(session) {
  try {
    const duration = session.endTime.getTime() - session.startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    const summary = {
      sessionId: session.id,
      duration: {
        total: duration,
        formatted: `${hours}시간 ${minutes}분`
      },
      projectType: session.projectType,
      language: session.language,
      goals: session.goals,
      statistics: {
        codeChanges: session.context.recentChanges.length,
        suggestions: session.context.suggestions.length,
        conversations: session.context.feedback.filter(f => f.type === 'chat').length
      },
      achievements: [],
      recommendations: []
    };
    
    // AI가 세션 성과 분석
    const aiSummary = await aiService.generateText(
      `다음 페어 프로그래밍 세션을 요약하고 성과를 분석해주세요:
       ${JSON.stringify(summary)}
       
       성취한 것들과 향후 개선 방향을 제시해주세요.`
    );
    
    summary.aiAnalysis = aiSummary;
    
    return summary;
    
  } catch (error) {
    console.error('세션 요약 생성 오류:', error);
    return {
      error: '세션 요약을 생성할 수 없습니다.',
      sessionId: session.id
    };
  }
}

export default router;
