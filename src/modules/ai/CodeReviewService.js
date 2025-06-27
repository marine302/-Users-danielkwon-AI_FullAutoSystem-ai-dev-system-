/**
 * AI 코드 리뷰 서비스
 * 자동화된 코드 품질 검사 및 개선 제안
 */

import fs from 'fs/promises';
import path from 'path';
import { AIService } from './AIService.js';
import { DatabaseService } from '../../services/DatabaseService.js';

export class CodeReviewService {
  constructor() {
    this.aiService = new AIService();
    this.dbService = new DatabaseService();
    this.reviewCriteria = {
      performance: {
        weight: 0.3,
        rules: [
          'Big O complexity analysis',
          'Memory usage optimization',
          'Database query efficiency',
          'Algorithm efficiency'
        ]
      },
      security: {
        weight: 0.3,
        rules: [
          'Input validation',
          'SQL injection prevention',
          'XSS protection',
          'Authentication checks',
          'Authorization verification'
        ]
      },
      maintainability: {
        weight: 0.2,
        rules: [
          'Code readability',
          'Function complexity',
          'Naming conventions',
          'Documentation quality',
          'Code duplication'
        ]
      },
      reliability: {
        weight: 0.2,
        rules: [
          'Error handling',
          'Edge case coverage',
          'Type safety',
          'Null pointer checks',
          'Resource management'
        ]
      }
    };
  }

  /**
   * 파일 또는 코드 블록에 대한 종합적인 리뷰 수행
   */
  async reviewCode(codeContent, filePath = null, options = {}) {
    try {
      const reviewResult = {
        timestamp: new Date().toISOString(),
        filePath,
        overall_score: 0,
        categories: {},
        issues: [],
        suggestions: [],
        security_alerts: [],
        performance_tips: [],
        auto_fixes: []
      };

      // 1. 기본 코드 분석
      const basicAnalysis = await this.performBasicAnalysis(codeContent);
      
      // 2. AI 기반 심화 분석
      const aiAnalysis = await this.performAIAnalysis(codeContent, filePath);
      
      // 3. 보안 취약점 검사
      const securityAnalysis = await this.performSecurityAnalysis(codeContent);
      
      // 4. 성능 분석
      const performanceAnalysis = await this.performPerformanceAnalysis(codeContent);
      
      // 5. 종합 평가 및 점수 계산
      reviewResult.categories = {
        basic: basicAnalysis,
        ai_insights: aiAnalysis,
        security: securityAnalysis,
        performance: performanceAnalysis
      };

      reviewResult.overall_score = this.calculateOverallScore(reviewResult.categories);
      reviewResult.issues = this.consolidateIssues(reviewResult.categories);
      reviewResult.suggestions = await this.generateSuggestions(codeContent, reviewResult.issues);
      reviewResult.auto_fixes = await this.generateAutoFixes(codeContent, reviewResult.issues);

      // 6. 리뷰 결과 저장
      if (options.saveResult) {
        await this.saveReviewResult(reviewResult, filePath);
      }

      return reviewResult;
    } catch (error) {
      console.error('코드 리뷰 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 기본 코드 분석 (정적 분석)
   */
  async performBasicAnalysis(codeContent) {
    const analysis = {
      score: 80,
      metrics: {},
      issues: []
    };

    try {
      // 코드 복잡도 분석
      analysis.metrics.complexity = this.calculateComplexity(codeContent);
      analysis.metrics.lines_of_code = codeContent.split('\n').length;
      analysis.metrics.function_count = (codeContent.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
      analysis.metrics.comment_ratio = this.calculateCommentRatio(codeContent);

      // 코딩 컨벤션 검사
      const conventionIssues = this.checkCodingConventions(codeContent);
      analysis.issues.push(...conventionIssues);

      // 점수 조정
      if (analysis.metrics.complexity > 10) analysis.score -= 20;
      if (analysis.metrics.comment_ratio < 0.1) analysis.score -= 10;
      if (conventionIssues.length > 5) analysis.score -= 15;

    } catch (error) {
      console.error('기본 분석 오류:', error);
      analysis.score = 50;
    }

    return analysis;
  }

  /**
   * AI 기반 심화 코드 분석
   */
  async performAIAnalysis(codeContent, filePath) {
    const analysis = {
      score: 85,
      insights: [],
      improvements: [],
      patterns: []
    };

    try {
      const prompt = `
다음 코드를 분석하고 개선점을 제안해주세요:

파일 경로: ${filePath || 'Unknown'}

코드:
\`\`\`
${codeContent}
\`\`\`

다음 관점에서 분석해주세요:
1. 코드 구조와 아키텍처 패턴
2. 잠재적 버그나 문제점
3. 성능 최적화 기회
4. 가독성과 유지보수성
5. 모범 사례 적용 여부

JSON 형식으로 응답해주세요:
{
  "score": 0-100,
  "insights": ["insight1", "insight2"],
  "improvements": ["improvement1", "improvement2"],
  "patterns": ["pattern1", "pattern2"],
  "potential_bugs": ["bug1", "bug2"]
}
`;

      const aiResponse = await this.aiService.generateResponse(prompt);
      const parsed = JSON.parse(aiResponse);
      
      Object.assign(analysis, parsed);

    } catch (error) {
      console.error('AI 분석 오류:', error);
      analysis.insights.push('AI 분석을 완료할 수 없습니다.');
    }

    return analysis;
  }

  /**
   * 보안 취약점 분석
   */
  async performSecurityAnalysis(codeContent) {
    const analysis = {
      score: 90,
      vulnerabilities: [],
      security_level: 'medium',
      recommendations: []
    };

    try {
      // SQL 인젝션 검사
      if (codeContent.includes('query') && codeContent.includes('+')) {
        analysis.vulnerabilities.push({
          type: 'SQL_INJECTION',
          severity: 'HIGH',
          description: 'SQL 쿼리에서 문자열 연결 사용 감지'
        });
        analysis.score -= 30;
      }

      // XSS 검사
      if (codeContent.includes('innerHTML') || codeContent.includes('eval(')) {
        analysis.vulnerabilities.push({
          type: 'XSS',
          severity: 'HIGH',
          description: 'XSS 취약점 가능성 감지'
        });
        analysis.score -= 25;
      }

      // 하드코딩된 시크릿 검사
      const secretPatterns = [
        /password\s*=\s*["'][^"']+["']/i,
        /api_key\s*=\s*["'][^"']+["']/i,
        /secret\s*=\s*["'][^"']+["']/i
      ];

      secretPatterns.forEach(pattern => {
        if (pattern.test(codeContent)) {
          analysis.vulnerabilities.push({
            type: 'HARDCODED_SECRET',
            severity: 'MEDIUM',
            description: '하드코딩된 인증 정보 감지'
          });
          analysis.score -= 15;
        }
      });

      // 보안 레벨 결정
      if (analysis.vulnerabilities.length === 0) {
        analysis.security_level = 'high';
      } else if (analysis.vulnerabilities.some(v => v.severity === 'HIGH')) {
        analysis.security_level = 'low';
      }

    } catch (error) {
      console.error('보안 분석 오류:', error);
    }

    return analysis;
  }

  /**
   * 성능 분석
   */
  async performPerformanceAnalysis(codeContent) {
    const analysis = {
      score: 85,
      bottlenecks: [],
      optimizations: [],
      complexity_score: 0
    };

    try {
      // 중첩 루프 검사
      const nestedLoops = (codeContent.match(/for\s*\([^}]*for\s*\(/g) || []).length;
      if (nestedLoops > 0) {
        analysis.bottlenecks.push({
          type: 'NESTED_LOOPS',
          count: nestedLoops,
          impact: 'HIGH',
          description: '중첩 루프로 인한 성능 저하 가능성'
        });
        analysis.score -= nestedLoops * 15;
      }

      // 비동기 처리 검사
      const syncOperations = (codeContent.match(/fs\.readFileSync|fs\.writeFileSync/g) || []).length;
      if (syncOperations > 0) {
        analysis.bottlenecks.push({
          type: 'SYNC_OPERATIONS',
          count: syncOperations,
          impact: 'MEDIUM',
          description: '동기식 I/O 작업 감지'
        });
        analysis.score -= syncOperations * 10;
      }

      // 메모리 누수 가능성 검사
      if (codeContent.includes('setInterval') && !codeContent.includes('clearInterval')) {
        analysis.bottlenecks.push({
          type: 'MEMORY_LEAK',
          impact: 'HIGH',
          description: 'clearInterval 없는 setInterval 사용'
        });
        analysis.score -= 20;
      }

      // 최적화 제안
      if (codeContent.includes('console.log')) {
        analysis.optimizations.push('프로덕션 환경에서 console.log 제거 권장');
      }

      if (codeContent.includes('JSON.parse') && !codeContent.includes('try')) {
        analysis.optimizations.push('JSON.parse에 에러 핸들링 추가 권장');
      }

    } catch (error) {
      console.error('성능 분석 오류:', error);
    }

    return analysis;
  }

  /**
   * 종합 점수 계산
   */
  calculateOverallScore(categories) {
    const weights = {
      basic: 0.25,
      ai_insights: 0.25,
      security: 0.3,
      performance: 0.2
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([category, weight]) => {
      if (categories[category] && categories[category].score !== undefined) {
        totalScore += categories[category].score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * 자동 수정 제안 생성
   */
  async generateAutoFixes(codeContent, issues) {
    const autoFixes = [];

    try {
      // 간단한 자동 수정 규칙들
      if (codeContent.includes('var ')) {
        autoFixes.push({
          type: 'REPLACE',
          from: 'var ',
          to: 'const ',
          description: 'var를 const/let으로 변경'
        });
      }

      if (codeContent.includes('==') && !codeContent.includes('===')) {
        autoFixes.push({
          type: 'REPLACE',
          from: '==',
          to: '===',
          description: '느슨한 비교를 엄격한 비교로 변경'
        });
      }

      // 더 복잡한 패턴들은 AI로 처리
      if (issues.length > 0) {
        const prompt = `
다음 코드의 문제점들을 자동으로 수정할 수 있는 방법을 제안해주세요:

문제점들: ${JSON.stringify(issues)}

JSON 형식으로 응답해주세요:
{
  "fixes": [
    {
      "type": "REPLACE|INSERT|DELETE",
      "description": "수정 설명",
      "before": "수정 전 코드",
      "after": "수정 후 코드"
    }
  ]
}
`;

        const aiResponse = await this.aiService.generateResponse(prompt);
        const parsed = JSON.parse(aiResponse);
        autoFixes.push(...(parsed.fixes || []));
      }

    } catch (error) {
      console.error('자동 수정 생성 오류:', error);
    }

    return autoFixes;
  }

  /**
   * 코드 복잡도 계산 (간단한 McCabe 복잡도)
   */
  calculateComplexity(codeContent) {
    const complexityKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 
      'catch', 'throw', '&&', '||', '?'
    ];
    
    let complexity = 1; // 기본 복잡도
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = codeContent.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * 주석 비율 계산
   */
  calculateCommentRatio(codeContent) {
    const lines = codeContent.split('\n');
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('/*') || 
      line.trim().startsWith('*')
    ).length;
    
    return lines.length > 0 ? commentLines / lines.length : 0;
  }

  /**
   * 코딩 컨벤션 검사
   */
  checkCodingConventions(codeContent) {
    const issues = [];

    // 함수명 camelCase 검사
    const functionNames = codeContent.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (functionNames) {
      functionNames.forEach(func => {
        const name = func.replace('function ', '');
        if (!/^[a-z][a-zA-Z0-9]*$/.test(name) && name !== 'main') {
          issues.push(`함수명 '${name}'이 camelCase 규칙을 따르지 않습니다.`);
        }
      });
    }

    // 들여쓰기 일관성 검사
    const lines = codeContent.split('\n');
    let inconsistentIndentation = false;
    lines.forEach(line => {
      if (line.includes('\t') && line.includes('  ')) {
        inconsistentIndentation = true;
      }
    });
    
    if (inconsistentIndentation) {
      issues.push('들여쓰기가 일관되지 않습니다 (탭과 스페이스 혼용).');
    }

    return issues;
  }

  /**
   * 문제점들을 통합
   */
  consolidateIssues(categories) {
    const allIssues = [];

    Object.entries(categories).forEach(([category, data]) => {
      if (data.issues) {
        data.issues.forEach(issue => {
          allIssues.push({
            category,
            type: issue.type || 'GENERAL',
            severity: issue.severity || 'MEDIUM',
            description: issue.description || issue,
            line: issue.line || null
          });
        });
      }
    });

    return allIssues;
  }

  /**
   * 개선 제안 생성
   */
  async generateSuggestions(codeContent, issues) {
    const suggestions = [];

    try {
      const prompt = `
다음 코드와 발견된 문제점들을 바탕으로 구체적인 개선 제안을 해주세요:

문제점들: ${JSON.stringify(issues)}

JSON 형식으로 응답해주세요:
{
  "suggestions": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "category": "PERFORMANCE|SECURITY|MAINTAINABILITY|RELIABILITY",
      "description": "제안 설명",
      "implementation": "구현 방법"
    }
  ]
}
`;

      const aiResponse = await this.aiService.generateResponse(prompt);
      const parsed = JSON.parse(aiResponse);
      suggestions.push(...(parsed.suggestions || []));

    } catch (error) {
      console.error('제안 생성 오류:', error);
      suggestions.push({
        priority: 'LOW',
        category: 'GENERAL',
        description: '코드 리뷰 결과를 참고하여 개선해주세요.',
        implementation: '발견된 문제점들을 하나씩 해결해보세요.'
      });
    }

    return suggestions;
  }

  /**
   * 리뷰 결과 저장
   */
  async saveReviewResult(reviewResult, filePath) {
    try {
      // 데이터베이스에 저장
      const reviewData = {
        id: `review_${Date.now()}`,
        file_path: filePath || 'unknown',
        score: reviewResult.overall_score || 0,
        issues_found: reviewResult.issues?.length || 0,
        suggestions_count: reviewResult.suggestions?.length || 0,
        review_data: JSON.stringify(reviewResult),
        created_at: new Date().toISOString()
      };

      this.dbService.saveCodeReview(reviewData);

      // 파일 시스템에도 저장 (백업용)
      const reviewsDir = path.join(process.cwd(), 'docs', 'code-reviews');
      await fs.mkdir(reviewsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = filePath 
        ? `review-${path.basename(filePath)}-${timestamp}.json`
        : `review-${timestamp}.json`;

      const reviewPath = path.join(reviewsDir, fileName);
      await fs.writeFile(reviewPath, JSON.stringify(reviewResult, null, 2));

      console.log(`코드 리뷰 결과가 저장되었습니다: ${reviewPath}`);
      return reviewPath;
    } catch (error) {
      console.error('리뷰 결과 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 프로젝트 전체 코드 리뷰
   */
  async reviewProject(projectPath, options = {}) {
    try {
      const results = {
        timestamp: new Date().toISOString(),
        project_path: projectPath,
        overall_score: 0,
        file_reviews: [],
        summary: {}
      };

      // JavaScript/TypeScript 파일들 찾기
      const codeFiles = await this.findCodeFiles(projectPath);
      
      console.log(`${codeFiles.length}개의 코드 파일을 리뷰합니다...`);

      // 각 파일 리뷰
      for (const filePath of codeFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const review = await this.reviewCode(content, filePath, { saveResult: false });
          results.file_reviews.push({
            file_path: filePath,
            score: review.overall_score,
            issues_count: review.issues.length,
            review
          });
        } catch (error) {
          console.error(`파일 리뷰 실패 ${filePath}:`, error.message);
        }
      }

      // 전체 점수 및 요약 계산
      if (results.file_reviews.length > 0) {
        results.overall_score = Math.round(
          results.file_reviews.reduce((sum, r) => sum + r.score, 0) / results.file_reviews.length
        );

        results.summary = {
          total_files: results.file_reviews.length,
          average_score: results.overall_score,
          high_priority_issues: results.file_reviews.reduce((sum, r) => 
            sum + r.review.issues.filter(i => i.severity === 'HIGH').length, 0),
          files_needing_attention: results.file_reviews.filter(r => r.score < 70).length
        };
      }

      // 결과 저장
      if (options.saveResult !== false) {
        await this.saveReviewResult(results, 'project-review');
      }

      return results;
    } catch (error) {
      console.error('프로젝트 리뷰 오류:', error);
      throw error;
    }
  }

  /**
   * 코드 파일들 찾기
   */
  async findCodeFiles(dirPath, extensions = ['.js', '.ts', '.jsx', '.tsx']) {
    const files = [];

    async function traverse(currentPath) {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            // node_modules, .git 등 제외
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
              await traverse(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`디렉토리 탐색 오류 ${currentPath}:`, error.message);
      }
    }

    await traverse(dirPath);
    return files;
  }

  /**
   * 코드 리뷰 기록 조회
   */
  async getReviewHistory(filePath = null, limit = 50) {
    try {
      return this.dbService.getCodeReviews(filePath, limit);
    } catch (error) {
      console.error('리뷰 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 코드 리뷰 통계 조회
   */
  async getReviewStatistics() {
    try {
      const reviews = this.dbService.getAllCodeReviews();
      
      if (reviews.length === 0) {
        return {
          total_reviews: 0,
          average_score: 0,
          total_issues: 0,
          review_trend: []
        };
      }

      const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
      const totalIssues = reviews.reduce((sum, review) => sum + review.issues_found, 0);

      // 최근 30일 동안의 리뷰 트렌드
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentReviews = reviews.filter(review => 
        new Date(review.created_at) >= thirtyDaysAgo
      );

      return {
        total_reviews: reviews.length,
        average_score: Math.round(totalScore / reviews.length),
        total_issues: totalIssues,
        recent_reviews: recentReviews.length,
        review_trend: this.calculateReviewTrend(recentReviews)
      };
    } catch (error) {
      console.error('리뷰 통계 조회 오류:', error);
      return {
        total_reviews: 0,
        average_score: 0,
        total_issues: 0,
        review_trend: []
      };
    }
  }

  /**
   * 리뷰 트렌드 계산
   */
  calculateReviewTrend(reviews) {
    // 일별 리뷰 점수 평균 계산
    const dailyData = {};
    
    reviews.forEach(review => {
      const date = new Date(review.created_at).toDateString();
      if (!dailyData[date]) {
        dailyData[date] = { total: 0, count: 0 };
      }
      dailyData[date].total += review.score;
      dailyData[date].count += 1;
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      average_score: Math.round(data.total / data.count)
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

export default CodeReviewService;
