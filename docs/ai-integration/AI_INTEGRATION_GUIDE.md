# Phase 9: 실제 AI 통합 구현 가이드

## 🤖 OpenAI API 완전 통합 계획

### 9.1 OpenAI API 설정 및 구성

#### 단계 1: API 키 설정
```bash
# .env 파일에 추가
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7
OPENAI_TIMEOUT=30000

# 사용량 모니터링
OPENAI_DAILY_LIMIT=100000  # 일일 토큰 한도
OPENAI_COST_ALERT=50       # 비용 알림 임계값 ($)
```

#### 단계 2: OpenAI SDK 업그레이드
```bash
npm install openai@latest
npm install node-cache        # 응답 캐싱용
npm install tiktoken         # 토큰 계산용
```

#### 단계 3: 향상된 AIService 구현

**src/modules/ai/EnhancedAIService.js**:
```javascript
import OpenAI from 'openai';
import NodeCache from 'node-cache';
import { encoding_for_model } from 'tiktoken';
import { DatabaseService } from '../../services/DatabaseService.js';

export class EnhancedAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1시간 캐시
    this.db = new DatabaseService();
    this.encoder = encoding_for_model(process.env.OPENAI_MODEL || 'gpt-4');
    
    this.usage = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0
    };
    
    this.initializeUsageTracking();
  }

  async generateCode(prompt, options = {}) {
    try {
      const {
        language = 'javascript',
        framework = '',
        style = 'modern',
        includeComments = true,
        includeTests = false
      } = options;

      // 캐시 확인
      const cacheKey = this.generateCacheKey('code', { prompt, language, framework });
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      // 프롬프트 최적화
      const optimizedPrompt = this.buildCodeGenerationPrompt(
        prompt, language, framework, style, includeComments, includeTests
      );

      // OpenAI API 호출
      const response = await this.callOpenAI(optimizedPrompt, {
        temperature: 0.2, // 코드 생성은 낮은 temperature
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS)
      });

      // 결과 처리 및 검증
      const result = this.processCodeResponse(response);
      
      // 캐시 저장
      this.cache.set(cacheKey, result);
      
      // 사용량 추적
      await this.trackUsage('code_generation', response.usage);

      return result;

    } catch (error) {
      console.error('코드 생성 오류:', error);
      throw new Error(`코드 생성 실패: ${error.message}`);
    }
  }

  async reviewCode(code, options = {}) {
    try {
      const {
        language = 'javascript',
        focusAreas = ['performance', 'security', 'maintainability'],
        severity = 'all'
      } = options;

      const cacheKey = this.generateCacheKey('review', { code: this.hashCode(code), language });
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const reviewPrompt = this.buildCodeReviewPrompt(code, language, focusAreas, severity);
      
      const response = await this.callOpenAI(reviewPrompt, {
        temperature: 0.1, // 코드 리뷰는 일관성 중요
        max_tokens: 2000
      });

      const result = this.processReviewResponse(response);
      
      this.cache.set(cacheKey, result);
      await this.trackUsage('code_review', response.usage);

      return result;

    } catch (error) {
      console.error('코드 리뷰 오류:', error);
      throw new Error(`코드 리뷰 실패: ${error.message}`);
    }
  }

  async generateTests(code, options = {}) {
    try {
      const {
        language = 'javascript',
        framework = 'jest',
        coverage = 'comprehensive',
        testTypes = ['unit', 'integration']
      } = options;

      const cacheKey = this.generateCacheKey('tests', { 
        code: this.hashCode(code), language, framework 
      });
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const testPrompt = this.buildTestGenerationPrompt(
        code, language, framework, coverage, testTypes
      );

      const response = await this.callOpenAI(testPrompt, {
        temperature: 0.3,
        max_tokens: 3000
      });

      const result = this.processTestResponse(response);
      
      this.cache.set(cacheKey, result);
      await this.trackUsage('test_generation', response.usage);

      return result;

    } catch (error) {
      console.error('테스트 생성 오류:', error);
      throw new Error(`테스트 생성 실패: ${error.message}`);
    }
  }

  async chatAssistant(message, context = {}) {
    try {
      const {
        conversationId = null,
        projectContext = {},
        codeContext = null
      } = context;

      // 대화 기록 조회
      let conversationHistory = [];
      if (conversationId) {
        conversationHistory = await this.getConversationHistory(conversationId);
      }

      const chatPrompt = this.buildChatPrompt(
        message, conversationHistory, projectContext, codeContext
      );

      const response = await this.callOpenAI(chatPrompt, {
        temperature: 0.7, // 대화는 자연스럽게
        max_tokens: 1500
      });

      const result = this.processChatResponse(response);
      
      // 대화 기록 저장
      if (conversationId) {
        await this.saveConversationTurn(conversationId, message, result.response);
      }

      await this.trackUsage('chat_assistant', response.usage);

      return result;

    } catch (error) {
      console.error('AI 어시스턴트 오류:', error);
      throw new Error(`AI 어시스턴트 실패: ${error.message}`);
    }
  }

  // 프롬프트 빌더 메서드들
  buildCodeGenerationPrompt(prompt, language, framework, style, includeComments, includeTests) {
    return `
당신은 전문적인 소프트웨어 개발자입니다. 다음 요구사항에 따라 고품질의 ${language} 코드를 생성해주세요.

요구사항: ${prompt}

개발 조건:
- 언어: ${language}
- 프레임워크: ${framework || '없음'}
- 스타일: ${style}
- 주석 포함: ${includeComments ? '예' : '아니오'}
- 테스트 포함: ${includeTests ? '예' : '아니오'}

다음 형식으로 응답해주세요:
\`\`\`json
{
  "code": "생성된 코드",
  "explanation": "코드 설명",
  "dependencies": ["필요한 의존성"],
  "usage_example": "사용 예시",
  "notes": ["추가 참고사항"]
}
\`\`\`

모범 사례를 따르고, 가독성과 유지보수성을 중시하여 작성해주세요.
`;
  }

  buildCodeReviewPrompt(code, language, focusAreas, severity) {
    return `
당신은 시니어 소프트웨어 엔지니어입니다. 다음 ${language} 코드를 전문적으로 리뷰해주세요.

검토 코드:
\`\`\`${language}
${code}
\`\`\`

검토 중점 사항: ${focusAreas.join(', ')}
심각도 필터: ${severity}

다음 형식으로 응답해주세요:
\`\`\`json
{
  "overall_score": 85,
  "issues": [
    {
      "type": "performance|security|maintainability|bug",
      "severity": "high|medium|low",
      "line": 10,
      "message": "문제 설명",
      "suggestion": "개선 제안"
    }
  ],
  "strengths": ["코드의 장점들"],
  "improvements": ["개선 제안들"],
  "best_practices": ["적용된 모범 사례들"]
}
\`\`\`

정확하고 건설적인 피드백을 제공해주세요.
`;
  }

  buildTestGenerationPrompt(code, language, framework, coverage, testTypes) {
    return `
전문 테스트 엔지니어로서 다음 ${language} 코드에 대한 ${framework} 테스트를 생성해주세요.

대상 코드:
\`\`\`${language}
${code}
\`\`\`

테스트 요구사항:
- 프레임워크: ${framework}
- 커버리지: ${coverage}
- 테스트 유형: ${testTypes.join(', ')}

다음 형식으로 응답해주세요:
\`\`\`json
{
  "test_code": "생성된 테스트 코드",
  "test_cases": [
    {
      "name": "테스트 케이스 이름",
      "description": "테스트 설명",
      "type": "unit|integration|e2e"
    }
  ],
  "coverage_estimate": 95,
  "setup_instructions": "테스트 설정 방법",
  "dependencies": ["테스트 의존성"]
}
\`\`\`

포괄적이고 신뢰할 수 있는 테스트를 작성해주세요.
`;
  }

  // OpenAI API 호출 래퍼
  async callOpenAI(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      // 토큰 수 계산
      const tokens = this.countTokens(prompt);
      
      // 일일 한도 확인
      await this.checkDailyLimit(tokens);

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional software developer assistant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000')
      });

      const duration = Date.now() - startTime;
      
      // 응답 로깅
      console.log(`OpenAI API 호출 완료: ${duration}ms, 토큰: ${response.usage.total_tokens}`);

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`OpenAI API 오류: ${duration}ms, ${error.message}`);
      throw error;
    }
  }

  // 사용량 추적
  async trackUsage(operation, usage) {
    this.usage.totalTokens += usage.total_tokens;
    this.usage.requestCount++;
    
    // GPT-4 요금 계산 (대략적)
    const cost = (usage.prompt_tokens * 0.03 + usage.completion_tokens * 0.06) / 1000;
    this.usage.totalCost += cost;

    // 데이터베이스에 사용량 기록
    const usageRecord = {
      id: `usage_${Date.now()}`,
      operation,
      model: process.env.OPENAI_MODEL,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost: cost,
      created_at: new Date().toISOString()
    };

    await this.db.saveAIUsage(usageRecord);

    // 비용 알림
    if (this.usage.totalCost > parseInt(process.env.OPENAI_COST_ALERT || '50')) {
      console.warn(`⚠️ OpenAI 사용 비용이 $${this.usage.totalCost.toFixed(2)}에 도달했습니다!`);
    }
  }

  // 토큰 계산
  countTokens(text) {
    return this.encoder.encode(text).length;
  }

  // 유틸리티 메서드들
  generateCacheKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer 변환
    }
    return hash;
  }

  // 사용량 통계
  getUsageStats() {
    return {
      ...this.usage,
      averageCostPerRequest: this.usage.requestCount > 0 
        ? this.usage.totalCost / this.usage.requestCount 
        : 0
    };
  }
}
```

### 9.2 기존 모듈 업그레이드

#### CodeGenerator 업그레이드
```javascript
// src/modules/ai/CodeGenerator.js 업데이트
import { EnhancedAIService } from './EnhancedAIService.js';

export class CodeGenerator {
  constructor() {
    this.aiService = new EnhancedAIService(); // 업그레이드된 서비스 사용
    // ... 기존 코드
  }

  async generateCode(prompt, options = {}) {
    // 실제 AI 기능 활성화
    return await this.aiService.generateCode(prompt, options);
  }
}
```

#### CodeReviewService 업그레이드
```javascript
// AI 분석 개선
async performAIAnalysis(codeContent, filePath) {
  try {
    const aiReview = await this.aiService.reviewCode(codeContent, {
      language: this.detectLanguage(filePath),
      focusAreas: ['performance', 'security', 'maintainability'],
      severity: 'all'
    });

    return {
      score: aiReview.overall_score,
      insights: aiReview.strengths,
      improvements: aiReview.improvements,
      issues: aiReview.issues
    };
  } catch (error) {
    console.error('AI 분석 오류:', error);
    return { score: 50, insights: ['AI 분석을 완료할 수 없습니다.'] };
  }
}
```

### 9.3 새로운 AI 어시스턴트 채팅 시스템

**src/routes/ai-chat.js**:
```javascript
import express from 'express';
import { EnhancedAIService } from '../modules/ai/EnhancedAIService.js';

const router = express.Router();
const aiService = new EnhancedAIService();

// 새 대화 시작
router.post('/start', async (req, res) => {
  try {
    const conversationId = `conv_${Date.now()}`;
    
    res.json({
      success: true,
      data: {
        conversationId,
        message: 'AI 어시스턴트가 준비되었습니다. 무엇을 도와드릴까요?'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 메시지 전송
router.post('/message', async (req, res) => {
  try {
    const { message, conversationId, projectContext, codeContext } = req.body;
    
    const response = await aiService.chatAssistant(message, {
      conversationId,
      projectContext,
      codeContext
    });
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

### 9.4 사용량 모니터링 대시보드

**src/routes/ai-usage.js**:
```javascript
router.get('/stats', async (req, res) => {
  try {
    const stats = aiService.getUsageStats();
    const dailyUsage = await aiService.getDailyUsage();
    
    res.json({
      success: true,
      data: {
        current_session: stats,
        daily_usage: dailyUsage,
        cost_breakdown: {
          today: dailyUsage.cost,
          month: await aiService.getMonthlyUsage(),
          limit: process.env.OPENAI_DAILY_LIMIT
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 9.5 구현 일정

#### 1일차: 기본 AI 통합
- OpenAI API 키 설정
- EnhancedAIService 구현
- 기본 코드 생성 기능 활성화

#### 2일차: 고급 AI 기능
- 코드 리뷰 AI 분석 개선
- 테스트 생성 AI 통합
- 사용량 추적 시스템

#### 3일차: AI 어시스턴트 및 최적화
- 채팅 어시스턴트 구현
- 캐싱 시스템 최적화
- 모니터링 대시보드 구축

이 구현을 통해 실제 GPT-4의 강력한 AI 능력을 활용한 완전 자동화된 개발 시스템을 구축할 수 있습니다!
