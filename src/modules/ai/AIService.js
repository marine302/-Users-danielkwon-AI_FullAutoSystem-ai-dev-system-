import OpenAI from 'openai';
import config from '../../../config/index.js';

class AIService {
  constructor() {
    // 싱글톤 인스턴스가 이미 있으면 반환
    if (AIService.instance) {
      return AIService.instance;
    }
    
    // OpenAI API 키가 있을 때만 클라이언트 초기화
    if (config.ai.openaiApiKey && config.ai.openaiApiKey !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({
        apiKey: config.ai.openaiApiKey
      });
      this.isEnabled = true;
    } else {
      this.openai = null;
      this.isEnabled = false;
      // 경고 메시지를 한 번만 출력하도록 제한
      if (!AIService.warningShown) {
        console.warn('⚠️  OpenAI API 키가 설정되지 않았습니다. AI 기능이 제한됩니다.');
        AIService.warningShown = true;
      }
    }
    
    this.defaultModel = config.ai.defaultModel;
    this.maxTokens = config.ai.maxTokens;
    this.temperature = config.ai.temperature;
    
    // 싱글톤 인스턴스 저장
    AIService.instance = this;
  }

  /**
   * 텍스트 생성
   * @param {string} prompt - 프롬프트
   * @param {Object} options - 옵션
   * @returns {Promise<string>} 생성된 텍스트
   */
  async generateText(prompt, options = {}) {
    if (!this.isEnabled) {
      return `[DEMO] AI 기능이 비활성화되어 있습니다. 다음은 "${prompt}"에 대한 모의 응답입니다.`;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        ...options
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI 텍스트 생성 오류:', error);
      throw new Error(`AI 텍스트 생성 실패: ${error.message}`);
    }
  }

  /**
   * 코드 생성
   * @param {string} description - 코드 설명
   * @param {string} language - 프로그래밍 언어
   * @param {Object} options - 옵션
   * @returns {Promise<string>} 생성된 코드
   */
  async generateCode(description, language = 'javascript', options = {}) {
    if (!this.isEnabled) {
      return `// [DEMO] AI 기능이 비활성화되어 있습니다.
// 다음은 "${description}"에 대한 ${language} 모의 코드입니다.

function example() {
  // TODO: ${description}
  console.log('Hello, World!');
  return 'demo code';
}

export default example;`;
    }

    const prompt = `
다음 요구사항에 맞는 ${language} 코드를 생성해주세요:

요구사항: ${description}

코드는 다음 조건을 만족해야 합니다:
- 클린 코드 원칙 준수
- 적절한 주석 포함
- 에러 핸들링 포함
- 테스트 가능한 구조

코드만 반환해주세요:
`;

    return await this.generateText(prompt, {
      ...options,
      temperature: 0.3 // 코드 생성시 더 낮은 창의성
    });
  }

  /**
   * 코드 리뷰
   * @param {string} code - 리뷰할 코드
   * @param {string} language - 프로그래밍 언어
   * @returns {Promise<Object>} 리뷰 결과
   */
  async reviewCode(code, language = 'javascript') {
    if (!this.isEnabled) {
      return {
        score: 7,
        issues: ['[DEMO] AI 기능이 비활성화되어 실제 리뷰를 수행할 수 없습니다'],
        suggestions: ['OpenAI API 키를 설정하여 실제 AI 리뷰 기능을 사용하세요'],
        security: ['보안 검사를 위해 AI 기능이 필요합니다'],
        performance: ['성능 분석을 위해 AI 기능이 필요합니다']
      };
    }

    const prompt = `
다음 ${language} 코드를 리뷰해주세요:

\`\`\`${language}
${code}
\`\`\`

다음 관점에서 분석해주세요:
1. 코드 품질
2. 성능 최적화 가능성
3. 보안 이슈
4. 버그 가능성
5. 개선 제안

JSON 형태로 결과를 반환해주세요:
{
  "score": 1-10,
  "issues": [],
  "suggestions": [],
  "security": [],
  "performance": []
}
`;

    const result = await this.generateText(prompt, {
      temperature: 0.2
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        score: 5,
        issues: ['파싱 오류로 인한 기본 응답'],
        suggestions: ['코드를 다시 확인해주세요'],
        security: [],
        performance: []
      };
    }
  }

  /**
   * 프로젝트 구조 생성
   * @param {string} projectType - 프로젝트 타입
   * @param {string} description - 프로젝트 설명
   * @returns {Promise<Object>} 프로젝트 구조
   */
  async generateProjectStructure(projectType, description) {
    if (!this.isEnabled) {
      return {
        structure: {
          folders: ['src', 'tests', 'docs', 'config'],
          files: ['README.md', 'package.json', '.gitignore', 'index.js']
        },
        dependencies: ['express', 'dotenv'],
        scripts: {
          start: 'node index.js',
          dev: 'nodemon index.js',
          test: 'jest'
        },
        description: `[DEMO] ${projectType} 프로젝트: ${description}`
      };
    }

    const prompt = `
${projectType} 프로젝트를 위한 폴더 구조를 생성해주세요.

프로젝트 설명: ${description}

다음 형태의 JSON으로 반환해주세요:
{
  "structure": {
    "folders": [],
    "files": []
  },
  "dependencies": [],
  "scripts": {},
  "description": ""
}
`;

    const result = await this.generateText(prompt, {
      temperature: 0.4
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        structure: {
          folders: ['src', 'tests', 'docs'],
          files: ['README.md', 'package.json', '.gitignore']
        },
        dependencies: [],
        scripts: {},
        description: '기본 프로젝트 구조'
      };
    }
  }

  /**
   * 문서 생성
   * @param {string} type - 문서 타입 (README, API, GUIDE 등)
   * @param {Object} data - 문서 데이터
   * @returns {Promise<string>} 생성된 문서
   */
  async generateDocumentation(type, data) {
    if (!this.isEnabled) {
      return `# [DEMO] ${type} 문서

AI 기능이 비활성화되어 있어 모의 문서를 생성합니다.

## 프로젝트 정보
- 이름: ${data.name || '알 수 없음'}
- 설명: ${data.description || '설명 없음'}

## 시작하기
1. 의존성 설치: \`npm install\`
2. 개발 서버 시작: \`npm run dev\`
3. 프로덕션 빌드: \`npm run build\`

> OpenAI API 키를 설정하면 실제 AI 생성 문서를 받을 수 있습니다.
`;
    }

    const prompt = `
${type} 문서를 생성해주세요.

데이터: ${JSON.stringify(data, null, 2)}

마크다운 형식으로 작성해주세요.
`;

    return await this.generateText(prompt, {
      temperature: 0.5
    });
  }
}

// 싱글톤 패턴을 위한 정적 변수들
AIService.instance = null;
AIService.warningShown = false;

export { AIService };
export default AIService;
