/**
 * AI 코드 생성기 - 자동 코드 생성 및 분석 기능
 */
import AIService from './AIService.js';
import fs from 'fs/promises';
import path from 'path';

export default class CodeGenerator {
  constructor() {
    this.aiService = new AIService();
    this.templates = new Map();
    this.loadTemplates();
  }

  async loadTemplates() {
    try {
      const templatesPath = path.join(process.cwd(), 'config', 'templates');
      const files = await fs.readdir(templatesPath).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(templatesPath, file), 'utf-8');
          const template = JSON.parse(content);
          this.templates.set(template.name, template);
        }
      }
    } catch (error) {
      console.log('템플릿 로딩 중 오류 (정상적임):', error.message);
    }
  }

  /**
   * 프롬프트를 기반으로 코드 생성
   */
  async generateCode(prompt, language = 'javascript', options = {}) {
    try {
      const enhancedPrompt = this.enhancePrompt(prompt, language, options);
      const response = await this.aiService.generateText(enhancedPrompt);
      
      const code = this.extractCodeFromResponse(response);
      const analysis = await this.analyzeCode(code, language);
      
      return {
        code,
        analysis,
        language,
        metadata: {
          prompt: enhancedPrompt,
          generatedAt: new Date().toISOString(),
          options
        }
      };
    } catch (error) {
      console.error('코드 생성 실패:', error);
      return this.generateFallbackCode(prompt, language, options);
    }
  }

  /**
   * 프롬프트 개선
   */
  enhancePrompt(prompt, language, options) {
    const template = this.templates.get(`${language}_template`) || this.getDefaultTemplate(language);
    
    let enhancedPrompt = `언어: ${language}\n`;
    enhancedPrompt += `요구사항: ${prompt}\n`;
    
    if (options.framework) {
      enhancedPrompt += `프레임워크: ${options.framework}\n`;
    }
    
    if (options.style) {
      enhancedPrompt += `코드 스타일: ${options.style}\n`;
    }
    
    enhancedPrompt += `\n다음 조건을 만족하는 코드를 생성하세요:\n`;
    enhancedPrompt += `- 모던 ${language} 문법 사용\n`;
    enhancedPrompt += `- 주석과 문서화 포함\n`;
    enhancedPrompt += `- 에러 처리 포함\n`;
    enhancedPrompt += `- 테스트 가능한 구조\n`;
    enhancedPrompt += `- 확장 가능한 아키텍처\n`;
    
    if (template) {
      enhancedPrompt += `\n템플릿 구조를 참고하세요:\n${JSON.stringify(template, null, 2)}`;
    }
    
    return enhancedPrompt;
  }

  /**
   * 응답에서 코드 추출
   */
  extractCodeFromResponse(response) {
    // 코드 블록 추출 (```로 감싸진 부분)
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const matches = Array.from(response.matchAll(codeBlockRegex));
    
    if (matches.length > 0) {
      return matches.map(match => match[1]).join('\n\n');
    }
    
    // 코드 블록이 없으면 전체 응답을 반환
    return response;
  }

  /**
   * 코드 분석
   */
  async analyzeCode(code, language) {
    const analysis = {
      language,
      lineCount: code.split('\n').length,
      complexity: this.calculateComplexity(code),
      patterns: this.detectPatterns(code, language),
      quality: this.assessQuality(code, language),
      suggestions: []
    };
    
    // AI 기반 추가 분석
    try {
      const aiAnalysis = await this.aiService.generateText(
        `다음 ${language} 코드를 분석하고 개선 제안을 하세요:\n\n${code}`
      );
      analysis.aiSuggestions = aiAnalysis;
    } catch (error) {
      analysis.aiSuggestions = '현재 AI 분석을 사용할 수 없습니다.';
    }
    
    return analysis;
  }

  /**
   * 코드 복잡도 계산
   */
  calculateComplexity(code) {
    const cyclomaticPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\?\s*.*\s*:/g // 삼항 연산자
    ];
    
    let complexity = 1; // 기본 복잡도
    
    cyclomaticPatterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return {
      cyclomatic: complexity,
      level: complexity <= 5 ? 'low' : complexity <= 10 ? 'medium' : 'high'
    };
  }

  /**
   * 디자인 패턴 감지
   */
  detectPatterns(code, language) {
    const patterns = [];
    
    // 일반적인 패턴들
    const patternChecks = {
      'Singleton': /class\s+\w+\s*{[\s\S]*static\s+instance[\s\S]*}/,
      'Factory': /createW+|factoryW+/i,
      'Observer': /addEventListener|subscribe|notify/i,
      'Module': /export\s+(default\s+)?/,
      'Promise': /new\s+Promise|async\s+|await\s+/,
      'Class': /class\s+\w+/,
      'Function': /function\s+\w+|=>\s*{/,
      'Arrow Function': /=>/,
      'Destructuring': /{.*}.*=|[.*].*=/,
      'Template Literals': /`.*`/s
    };
    
    Object.entries(patternChecks).forEach(([pattern, regex]) => {
      if (regex.test(code)) {
        patterns.push(pattern);
      }
    });
    
    return patterns;
  }

  /**
   * 코드 품질 평가
   */
  assessQuality(code, language) {
    const metrics = {
      score: 0,
      maxScore: 100,
      factors: {}
    };
    
    // 주석 비율
    const totalLines = code.split('\n').length;
    const commentLines = (code.match(/\/\/|\/\*|\*/g) || []).length;
    const commentRatio = commentLines / totalLines;
    metrics.factors.comments = Math.min(commentRatio * 50, 20);
    
    // 함수 길이
    const functions = code.match(/function\s+\w+.*{[\s\S]*?}|=>\s*{[\s\S]*?}/g) || [];
    const avgFunctionLength = functions.reduce((sum, fn) => {
      return sum + fn.split('\n').length;
    }, 0) / (functions.length || 1);
    metrics.factors.functionLength = avgFunctionLength < 20 ? 20 : avgFunctionLength < 50 ? 10 : 0;
    
    // 명명 규칙
    const goodNaming = /[a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*/g;
    const namingMatches = (code.match(goodNaming) || []).length;
    const totalIdentifiers = (code.match(/\b[a-zA-Z_]\w*\b/g) || []).length;
    metrics.factors.naming = (namingMatches / totalIdentifiers) * 15;
    
    // 에러 처리
    const hasErrorHandling = /try\s*{|catch\s*\(|throw\s+/.test(code);
    metrics.factors.errorHandling = hasErrorHandling ? 15 : 0;
    
    // 모던 문법 사용
    const modernFeatures = [
      /const\s+|let\s+/,
      /=>/,
      /async\s+|await\s+/,
      /\.map\(|\.filter\(|\.reduce\(/,
      /import\s+|export\s+/
    ];
    const modernScore = modernFeatures.filter(pattern => pattern.test(code)).length;
    metrics.factors.modernSyntax = (modernScore / modernFeatures.length) * 15;
    
    // 총점 계산
    metrics.score = Object.values(metrics.factors).reduce((sum, factor) => sum + factor, 0);
    metrics.grade = metrics.score >= 80 ? 'A' : metrics.score >= 60 ? 'B' : metrics.score >= 40 ? 'C' : 'D';
    
    return metrics;
  }

  /**
   * 폴백 코드 생성
   */
  generateFallbackCode(prompt, language, options) {
    const templates = {
      javascript: {
        function: `/**
 * ${prompt}
 */
function generatedFunction() {
  // TODO: ${prompt} 구현
  console.log('구현 필요: ${prompt}');
  return null;
}

export default generatedFunction;`,
        class: `/**
 * ${prompt}
 */
class GeneratedClass {
  constructor() {
    // TODO: ${prompt} 구현
    this.initialized = false;
  }
  
  // TODO: 메서드 구현
  method() {
    console.log('구현 필요: ${prompt}');
  }
}

export default GeneratedClass;`
      },
      python: {
        function: `"""
${prompt}
"""
def generated_function():
    # TODO: ${prompt} 구현
    print(f"구현 필요: ${prompt}")
    return None`,
        class: `"""
${prompt}
"""
class GeneratedClass:
    def __init__(self):
        # TODO: ${prompt} 구현
        self.initialized = False
    
    def method(self):
        # TODO: 메서드 구현
        print(f"구현 필요: ${prompt}")`
      }
    };
    
    const langTemplates = templates[language] || templates.javascript;
    const templateType = options.type || 'function';
    const code = langTemplates[templateType] || langTemplates.function;
    
    return {
      code,
      analysis: {
        language,
        lineCount: code.split('\n').length,
        complexity: { cyclomatic: 1, level: 'low' },
        patterns: ['Template'],
        quality: { score: 50, grade: 'C', factors: { template: true } },
        aiSuggestions: '이것은 템플릿 코드입니다. 실제 구현이 필요합니다.'
      },
      metadata: {
        prompt,
        generatedAt: new Date().toISOString(),
        options,
        fallback: true
      }
    };
  }

  /**
   * 기본 템플릿 가져오기
   */
  getDefaultTemplate(language) {
    const defaultTemplates = {
      javascript: {
        name: 'javascript_template',
        structure: {
          imports: 'ES6 모듈 시스템 사용',
          functions: '화살표 함수 또는 function 선언',
          classes: 'ES6 클래스 문법',
          exports: 'export default 또는 named exports',
          errorHandling: 'try-catch 블록',
          documentation: 'JSDoc 주석'
        }
      },
      python: {
        name: 'python_template',
        structure: {
          imports: 'import 문',
          functions: 'def 함수 정의',
          classes: 'class 정의',
          documentation: 'docstring',
          errorHandling: 'try-except 블록'
        }
      }
    };
    
    return defaultTemplates[language];
  }

  /**
   * 코드 파일로 저장
   */
  async saveCode(generatedCode, filename, directory = 'generated') {
    try {
      const outputDir = path.join(process.cwd(), 'src', directory);
      await fs.mkdir(outputDir, { recursive: true });
      
      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, generatedCode.code, 'utf-8');
      
      // 메타데이터도 저장
      const metadataPath = filePath.replace(/\.[^.]+$/, '.meta.json');
      await fs.writeFile(metadataPath, JSON.stringify(generatedCode, null, 2), 'utf-8');
      
      return {
        success: true,
        filePath,
        metadataPath
      };
    } catch (error) {
      console.error('코드 저장 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
