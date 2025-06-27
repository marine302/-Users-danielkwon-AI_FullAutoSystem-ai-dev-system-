#!/bin/bash

# AI 개발 시스템 - AI 통합 초기화 스크립트
# OpenAI API 실제 통합을 위한 자동 설정

echo "🤖 AI 시스템 실제 통합 시작..."

# 현재 디렉터리 확인
if [ ! -f "package.json" ]; then
    echo "❌ 오류: package.json이 없습니다. 프로젝트 루트 디렉터리에서 실행해주세요."
    exit 1
fi

# 1. OpenAI 관련 패키지 설치
echo "📦 AI 관련 패키지 설치 중..."
npm install openai@latest node-cache tiktoken

# 2. AI 서비스 디렉터리 준비
echo "📁 AI 서비스 디렉터리 구조 생성 중..."
mkdir -p src/modules/ai/enhanced
mkdir -p src/routes/ai

# 3. 환경 변수 설정
echo "🔑 OpenAI 환경 변수 설정 중..."
if ! grep -q "OPENAI_API_KEY" .env; then
    echo "" >> .env
    echo "# OpenAI API 설정 ($(date)에 추가됨)" >> .env
    echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env
    echo "OPENAI_MODEL=gpt-4" >> .env
    echo "OPENAI_MAX_TOKENS=4000" >> .env
    echo "OPENAI_TEMPERATURE=0.7" >> .env
    echo "OPENAI_TIMEOUT=30000" >> .env
    echo "" >> .env
    echo "# AI 사용량 모니터링" >> .env
    echo "OPENAI_DAILY_LIMIT=100000" >> .env
    echo "OPENAI_COST_ALERT=50" >> .env
else
    echo "⚠️  OpenAI 환경 변수가 이미 설정되어 있습니다."
fi

# 4. 향상된 AI 서비스 템플릿 생성
echo "📄 향상된 AI 서비스 템플릿 생성 중..."

cat > src/modules/ai/EnhancedAIService.js << 'EOF'
/**
 * 향상된 AI 서비스
 * OpenAI API 실제 통합 및 고급 기능
 */

import OpenAI from 'openai';
import NodeCache from 'node-cache';
import { DatabaseService } from '../../services/DatabaseService.js';

export class EnhancedAIService {
  constructor() {
    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.warn('⚠️  OpenAI API 키가 설정되지 않았습니다. AI 기능이 제한됩니다.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1시간 캐시
    this.db = new DatabaseService();
    
    this.usage = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0
    };
  }

  /**
   * 실제 OpenAI API를 사용한 코드 생성
   */
  async generateCode(prompt, options = {}) {
    if (!this.openai) {
      return this.generateMockCode(prompt, options);
    }

    try {
      const {
        language = 'javascript',
        framework = '',
        style = 'modern'
      } = options;

      // 캐시 확인
      const cacheKey = this.generateCacheKey('code', { prompt, language, framework });
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      // OpenAI API 호출
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `당신은 전문적인 ${language} 개발자입니다. 고품질의 코드를 생성해주세요.`
          },
          {
            role: 'user',
            content: `${prompt}\n\n언어: ${language}\n프레임워크: ${framework}\n스타일: ${style}`
          }
        ],
        temperature: 0.2,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000')
      });

      const result = {
        code: response.choices[0].message.content,
        language,
        framework,
        generated_at: new Date().toISOString(),
        tokens_used: response.usage.total_tokens
      };

      // 캐시 및 사용량 저장
      this.cache.set(cacheKey, result);
      await this.trackUsage('code_generation', response.usage);

      return result;

    } catch (error) {
      console.error('OpenAI 코드 생성 오류:', error);
      return this.generateMockCode(prompt, options);
    }
  }

  /**
   * 실제 OpenAI API를 사용한 코드 리뷰
   */
  async reviewCode(code, options = {}) {
    if (!this.openai) {
      return this.generateMockReview(code, options);
    }

    try {
      const { language = 'javascript' } = options;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '당신은 시니어 소프트웨어 엔지니어입니다. 코드를 전문적으로 리뷰해주세요.'
          },
          {
            role: 'user',
            content: `다음 ${language} 코드를 리뷰해주세요:\n\n${code}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const result = {
        review: response.choices[0].message.content,
        language,
        reviewed_at: new Date().toISOString(),
        tokens_used: response.usage.total_tokens
      };

      await this.trackUsage('code_review', response.usage);
      return result;

    } catch (error) {
      console.error('OpenAI 코드 리뷰 오류:', error);
      return this.generateMockReview(code, options);
    }
  }

  /**
   * AI 어시스턴트 채팅
   */
  async chatWithAssistant(message, context = {}) {
    if (!this.openai) {
      return {
        response: '죄송합니다. AI 어시스턴트 기능을 사용하려면 OpenAI API 키가 필요합니다.',
        mock: true
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '당신은 도움이 되는 AI 개발 어시스턴트입니다. 개발 관련 질문에 친절하고 정확하게 답변해주세요.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const result = {
        response: response.choices[0].message.content,
        timestamp: new Date().toISOString(),
        tokens_used: response.usage.total_tokens
      };

      await this.trackUsage('chat_assistant', response.usage);
      return result;

    } catch (error) {
      console.error('AI 어시스턴트 오류:', error);
      return {
        response: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        error: true
      };
    }
  }

  /**
   * 사용량 추적
   */
  async trackUsage(operation, usage) {
    this.usage.totalTokens += usage.total_tokens;
    this.usage.requestCount++;
    
    // GPT-4 요금 계산 (대략적)
    const cost = (usage.prompt_tokens * 0.03 + usage.completion_tokens * 0.06) / 1000;
    this.usage.totalCost += cost;

    console.log(`🤖 AI 사용량: ${operation}, 토큰: ${usage.total_tokens}, 비용: $${cost.toFixed(4)}`);

    // 비용 알림
    const costAlert = parseInt(process.env.OPENAI_COST_ALERT || '50');
    if (this.usage.totalCost > costAlert) {
      console.warn(`⚠️ OpenAI 사용 비용이 $${this.usage.totalCost.toFixed(2)}에 도달했습니다!`);
    }
  }

  /**
   * Mock 코드 생성 (API 키가 없을 때)
   */
  generateMockCode(prompt, options) {
    const { language = 'javascript' } = options;
    
    return {
      code: `// AI가 생성한 ${language} 코드 (Mock)\n// 프롬프트: ${prompt}\n\nfunction generatedFunction() {\n  // TODO: 실제 OpenAI API 키를 설정하면 실제 코드가 생성됩니다\n  console.log('AI 코드 생성 기능 활성화 필요');\n}`,
      language,
      generated_at: new Date().toISOString(),
      mock: true
    };
  }

  /**
   * Mock 코드 리뷰 (API 키가 없을 때)
   */
  generateMockReview(code, options) {
    return {
      review: '실제 OpenAI API 키를 설정하면 전문적인 코드 리뷰를 받을 수 있습니다.\n\n기본 분석:\n- 코드 길이: ' + code.length + '자\n- 권장사항: OpenAI API 키 설정 후 재시도',
      language: options.language || 'javascript',
      reviewed_at: new Date().toISOString(),
      mock: true
    };
  }

  /**
   * 캐시 키 생성
   */
  generateCacheKey(type, params) {
    return `${type}_${JSON.stringify(params)}`;
  }

  /**
   * 사용량 통계
   */
  getUsageStats() {
    return {
      ...this.usage,
      averageCostPerRequest: this.usage.requestCount > 0 
        ? this.usage.totalCost / this.usage.requestCount 
        : 0,
      apiKeyConfigured: !!this.openai
    };
  }
}
EOF

# 5. AI 채팅 라우터 생성
cat > src/routes/ai-chat.js << 'EOF'
/**
 * AI 어시스턴트 채팅 API 라우터
 */

import express from 'express';
import { EnhancedAIService } from '../modules/ai/EnhancedAIService.js';

const router = express.Router();
const aiService = new EnhancedAIService();

/**
 * POST /api/v1/ai-chat/message
 * AI 어시스턴트와 채팅
 */
router.post('/message', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: '메시지가 필요합니다.'
      });
    }

    const response = await aiService.chatWithAssistant(message, context);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('AI 채팅 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ai-chat/usage
 * AI 사용량 통계
 */
router.get('/usage', (req, res) => {
  try {
    const stats = aiService.getUsageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
EOF

# 6. 기존 AI 서비스 업그레이드 가이드 생성
cat > src/modules/ai/UPGRADE_GUIDE.md << 'EOF'
# AI 서비스 업그레이드 가이드

## 기존 서비스 업그레이드

### 1. AIService.js 업그레이드
기존 `AIService.js`를 다음과 같이 수정:

```javascript
// 기존 코드 대신 EnhancedAIService 사용
import { EnhancedAIService } from './EnhancedAIService.js';

export class AIService extends EnhancedAIService {
  // 기존 메서드들을 유지하면서 새로운 기능 추가
}
```

### 2. CodeGenerator.js 업그레이드
```javascript
// generateCode 메서드 수정
async generateCode(prompt, options = {}) {
  // 실제 AI 기능 사용
  return await this.aiService.generateCode(prompt, options);
}
```

### 3. CodeReviewService.js 업그레이드
```javascript
// performAIAnalysis 메서드 수정
async performAIAnalysis(codeContent, filePath) {
  const aiReview = await this.aiService.reviewCode(codeContent, {
    language: this.detectLanguage(filePath)
  });
  
  return {
    score: 85, // AI 응답에서 점수 추출
    insights: [aiReview.review],
    improvements: []
  };
}
```

## 다음 단계

1. OpenAI API 키 설정
2. 기존 서비스 업그레이드
3. 새로운 채팅 라우터 통합
4. 테스트 실행
EOF

echo ""
echo "✅ AI 시스템 실제 통합 준비 완료!"
echo ""
echo "🔑 중요: OpenAI API 키 설정"
echo "1. https://platform.openai.com/api-keys 에서 API 키 생성"
echo "2. .env 파일에서 OPENAI_API_KEY=your_actual_key_here 로 설정"
echo ""
echo "📝 다음 단계:"
echo "1. OpenAI API 키를 실제 키로 교체"
echo "2. 기존 AI 서비스들을 EnhancedAIService로 업그레이드"
echo "3. AI 채팅 라우터를 index.js에 추가"
echo ""
echo "🔧 참고 문서:"
echo "- docs/ai-integration/AI_INTEGRATION_GUIDE.md"
echo "- src/modules/ai/UPGRADE_GUIDE.md"
echo ""
echo "🚀 바로 시작하려면:"
echo "code .env  # API 키 설정"
echo "code src/modules/ai/EnhancedAIService.js  # AI 서비스 확인"
