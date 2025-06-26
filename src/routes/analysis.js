/**
 * 코드 분석 API 라우트
 */
import express from 'express';
import CodeAnalyzer from '../modules/analysis/CodeAnalyzer.js';
import path from 'path';

const router = express.Router();
const analyzer = new CodeAnalyzer();

/**
 * 프로젝트 전체 분석
 * POST /api/analysis/project
 */
router.post('/project', async (req, res) => {
  try {
    const { projectPath } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: '프로젝트 경로가 필요합니다.'
      });
    }
    
    // 보안을 위해 상대 경로만 허용
    const safePath = path.resolve(process.cwd(), 'generated-projects', path.basename(projectPath));
    
    const analysis = await analyzer.analyzeProject(safePath);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('프로젝트 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 빠른 코드 품질 검사
 * POST /api/analysis/quick-check
 */
router.post('/quick-check', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '분석할 코드가 필요합니다.'
      });
    }        // 빠른 품질 검사 수행
        const CodeGenerator = (await import('../modules/ai/CodeGenerator.js')).default;
        const codeGenerator = new CodeGenerator();
        const analysis = await codeGenerator.analyzeCode(code, language);
        
        const quickAnalysis = {
          language,
          complexity: analysis.complexity,
          patterns: analysis.patterns,
          quality: analysis.quality,
          security: {
            issueCount: 0,
            issues: []
          },
          performance: {
            issueCount: 0,
            issues: []
          },
          summary: {
            overallScore: analysis.quality.score,
            recommendations: []
          }
        };        // 추천 사항 생성
        if (analysis.quality.score < 70) {
          quickAnalysis.summary.recommendations.push('코드 품질 개선이 필요합니다.');
        }
        if (analysis.complexity.level === 'high') {
          quickAnalysis.summary.recommendations.push('함수를 더 작은 단위로 분리하세요.');
        }
    
    res.json({
      success: true,
      data: quickAnalysis
    });
  } catch (error) {
    console.error('빠른 코드 검사 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 보안 분석
 * POST /api/analysis/security
 */
router.post('/security', async (req, res) => {
  try {
    const { code, filePath = 'temp-file' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '분석할 코드가 필요합니다.'
      });
    }
    
    const securityIssues = analyzer.detectSecurityIssues(code, filePath);
    
    // 보안 점수 계산
    const severityWeights = { high: 20, medium: 10, low: 5 };
    const deduction = securityIssues.reduce((sum, issue) => {
      return sum + (severityWeights[issue.severity] || 5);
    }, 0);
    
    const securityScore = Math.max(0, 100 - deduction);
    
    const securityAnalysis = {
      score: securityScore,
      grade: securityScore >= 90 ? 'A' : securityScore >= 80 ? 'B' : securityScore >= 70 ? 'C' : 'D',
      totalIssues: securityIssues.length,
      issues: securityIssues,
      categories: {
        authentication: securityIssues.filter(i => i.category === 'authentication'),
        dataExposure: securityIssues.filter(i => i.category === 'dataExposure'),
        injection: securityIssues.filter(i => i.category === 'injection'),
        configuration: securityIssues.filter(i => i.category === 'configuration')
      },
      recommendations: []
    };
    
    // 보안 권장사항
    if (securityIssues.some(i => i.type === 'hardcoded_secrets')) {
      securityAnalysis.recommendations.push('환경변수나 보안 저장소를 사용하여 비밀정보를 관리하세요.');
    }
    if (securityIssues.some(i => i.type === 'sql_injection')) {
      securityAnalysis.recommendations.push('매개변수화된 쿼리나 ORM을 사용하세요.');
    }
    if (securityIssues.some(i => i.type === 'xss')) {
      securityAnalysis.recommendations.push('사용자 입력을 적절히 이스케이프하거나 검증하세요.');
    }
    if (securityIssues.some(i => i.type === 'insecure_http')) {
      securityAnalysis.recommendations.push('모든 통신에 HTTPS를 사용하세요.');
    }
    
    res.json({
      success: true,
      data: securityAnalysis
    });
  } catch (error) {
    console.error('보안 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 성능 분석
 * POST /api/analysis/performance
 */
router.post('/performance', async (req, res) => {
  try {
    const { code, filePath = 'temp-file' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '분석할 코드가 필요합니다.'
      });
    }
    
    const performanceIssues = analyzer.detectPerformanceIssues(code, filePath);
    const performanceScore = Math.max(0, 100 - (performanceIssues.length * 5));
    
    const performanceAnalysis = {
      score: performanceScore,
      grade: performanceScore >= 90 ? 'A' : performanceScore >= 80 ? 'B' : performanceScore >= 70 ? 'C' : 'D',
      totalIssues: performanceIssues.length,
      issues: performanceIssues,
      metrics: {
        codeSize: code.length,
        lineCount: code.split('\n').length,
        estimatedComplexity: analyzer.calculateComplexity(code)
      },
      optimizations: [],
      recommendations: []
    };
    
    // 최적화 제안
    performanceIssues.forEach(issue => {
      switch (issue.type) {
        case 'nested_loops':
          performanceAnalysis.optimizations.push('중첩 루프를 해시 테이블이나 더 효율적인 알고리즘으로 대체');
          performanceAnalysis.recommendations.push('O(n²) 복잡도를 O(n) 또는 O(n log n)으로 개선하세요.');
          break;
        case 'sync_file_operations':
          performanceAnalysis.optimizations.push('동기 파일 작업을 비동기로 변경');
          performanceAnalysis.recommendations.push('Non-blocking I/O를 사용하여 성능을 향상시키세요.');
          break;
        case 'memory_leak':
          performanceAnalysis.optimizations.push('메모리 누수 방지를 위한 정리 로직 추가');
          performanceAnalysis.recommendations.push('이벤트 리스너와 타이머를 적절히 정리하세요.');
          break;
      }
    });
    
    // 중복 제거
    performanceAnalysis.optimizations = [...new Set(performanceAnalysis.optimizations)];
    performanceAnalysis.recommendations = [...new Set(performanceAnalysis.recommendations)];
    
    res.json({
      success: true,
      data: performanceAnalysis
    });
  } catch (error) {
    console.error('성능 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 코드 복잡도 분석
 * POST /api/analysis/complexity
 */
router.post('/complexity', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '분석할 코드가 필요합니다.'
      });
    }
    
    const complexity = analyzer.calculateComplexity(code);
    const patterns = analyzer.detectPatterns(code, language);
    
    // 함수별 복잡도 분석
    const functions = code.match(/function\s+\w+.*?\{[\s\S]*?\}|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}/g) || [];
    const functionComplexities = functions.map((fn, index) => ({
      id: index + 1,
      name: fn.match(/function\s+(\w+)|const\s+(\w+)\s*=/)?.[1] || `함수${index + 1}`,
      complexity: analyzer.calculateComplexity(fn),
      lines: fn.split('\n').length,
      snippet: fn.substring(0, 100) + (fn.length > 100 ? '...' : '')
    }));
    
    const complexityAnalysis = {
      overall: complexity,
      patterns,
      functions: functionComplexities,
      recommendations: [],
      refactoringTargets: functionComplexities.filter(f => f.complexity.cyclomatic > 10)
    };
    
    // 권장사항 생성
    if (complexity.level === 'high') {
      complexityAnalysis.recommendations.push('전체적인 복잡도가 높습니다. 함수를 더 작은 단위로 분리하세요.');
    }
    
    if (complexityAnalysis.refactoringTargets.length > 0) {
      complexityAnalysis.recommendations.push(`${complexityAnalysis.refactoringTargets.length}개의 함수가 리팩토링을 필요로 합니다.`);
    }
    
    if (patterns.includes('Module')) {
      complexityAnalysis.recommendations.push('모듈 구조가 잘 되어 있습니다.');
    }
    
    res.json({
      success: true,
      data: complexityAnalysis
    });
  } catch (error) {
    console.error('복잡도 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
