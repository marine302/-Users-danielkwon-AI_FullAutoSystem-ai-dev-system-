/**
 * 지능형 테스트 생성 API 라우터
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { IntelligentTestGenerator } from '../modules/ai/IntelligentTestGenerator.js';

const router = express.Router();
const testGenerator = new IntelligentTestGenerator();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp', 'test-uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다.'), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 10 // 10MB 제한
  }
});

/**
 * POST /api/test-generator/file
 * 파일에 대한 테스트 생성
 */
router.post('/file', upload.single('sourceFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '소스 파일이 업로드되지 않았습니다.'
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    console.log(`테스트 생성 시작: ${originalName}`);

    // 테스트 생성 실행
    const result = await testGenerator.generateTestsForFile(filePath, {
      framework: options.framework || 'jest',
      language: options.language || 'javascript',
      testTypes: options.testTypes || ['unit', 'integration'],
      coverage: options.coverage || 'comprehensive'
    });

    // 임시 파일 삭제
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error('임시 파일 삭제 오류:', cleanupError);
    }

    res.json({
      success: true,
      data: result,
      message: `"${originalName}" 파일의 테스트가 성공적으로 생성되었습니다.`
    });

  } catch (error) {
    console.error('파일 테스트 생성 오류:', error);
    
    // 임시 파일 정리
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('임시 파일 삭제 오류:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: '테스트 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/test-generator/project
 * 프로젝트 전체 테스트 생성
 */
router.post('/project', async (req, res) => {
  try {
    const { projectPath, options = {} } = req.body;

    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({
        success: false,
        error: '프로젝트 경로가 필요합니다.'
      });
    }

    // 경로 유효성 검사
    try {
      await fs.access(projectPath);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 프로젝트 경로입니다.'
      });
    }

    console.log(`프로젝트 테스트 생성 시작: ${projectPath}`);

    // 즉시 응답 (백그라운드에서 처리)
    res.json({
      success: true,
      message: '프로젝트 테스트 생성이 시작되었습니다. 완료되면 결과를 확인할 수 있습니다.',
      data: {
        project_path: projectPath,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }
    });

    // 백그라운드에서 테스트 생성
    try {
      const result = await testGenerator.generateProjectTests(projectPath, {
        framework: options.framework || 'jest',
        language: options.language || 'javascript',
        testTypes: options.testTypes || ['unit'],
        coverage: options.coverage || 'basic'
      });

      console.log(`프로젝트 테스트 생성 완료: ${projectPath}`, {
        generated_files: result.generated_files.length,
        successful: result.summary.successful_generations
      });
    } catch (error) {
      console.error('백그라운드 테스트 생성 오류:', error);
    }

  } catch (error) {
    console.error('프로젝트 테스트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 테스트 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/test-generator/analyze
 * 코드 분석 (테스트 생성 전 미리보기)
 */
router.post('/analyze', upload.single('sourceFile'), async (req, res) => {
  try {
    let filePath, isTemporary = false;

    if (req.file) {
      filePath = req.file.path;
      isTemporary = true;
    } else if (req.body.filePath) {
      filePath = req.body.filePath;
    } else {
      return res.status(400).json({
        success: false,
        error: '파일 또는 파일 경로가 필요합니다.'
      });
    }

    console.log(`코드 분석 시작: ${filePath}`);

    // 파일 내용 읽기
    const codeContent = await fs.readFile(filePath, 'utf-8');
    
    // 코드 분석 실행
    const analysis = await testGenerator.analyzeCodeForTesting(codeContent, filePath);

    // 임시 파일 삭제
    if (isTemporary) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('임시 파일 삭제 오류:', cleanupError);
      }
    }

    res.json({
      success: true,
      data: analysis,
      message: '코드 분석이 완료되었습니다.'
    });

  } catch (error) {
    console.error('코드 분석 오류:', error);
    
    // 임시 파일 정리
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('임시 파일 삭제 오류:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: '코드 분석 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/test-generator/custom
 * 커스텀 테스트 생성 (사용자 지정 요구사항)
 */
router.post('/custom', async (req, res) => {
  try {
    const { 
      codeContent, 
      requirements, 
      framework = 'jest',
      language = 'javascript',
      testTypes = ['unit']
    } = req.body;

    if (!codeContent) {
      return res.status(400).json({
        success: false,
        error: '코드 내용이 필요합니다.'
      });
    }

    if (!requirements || !Array.isArray(requirements)) {
      return res.status(400).json({
        success: false,
        error: '테스트 요구사항이 필요합니다.'
      });
    }

    console.log('커스텀 테스트 생성 시작');

    // 코드 분석
    const analysis = await testGenerator.analyzeCodeForTesting(codeContent, 'custom-code');
    
    // 커스텀 요구사항을 반영한 테스트 계획 수립
    const testPlan = await testGenerator.createTestPlan(analysis, testTypes, 'custom');
    testPlan.custom_requirements = requirements;

    // 테스트 생성
    const generatedTests = await testGenerator.generateTests(analysis, testPlan, framework, language);

    // 커스텀 요구사항에 따른 추가 테스트 생성
    const customTests = await generateCustomTests(codeContent, requirements, framework, language);
    generatedTests.custom_tests = customTests;

    // 테스트 스위트 구조화
    const testSuite = testGenerator.structureTestSuite(generatedTests, framework, language);

    res.json({
      success: true,
      data: {
        analysis,
        test_plan: testPlan,
        generated_tests: generatedTests,
        test_suite: testSuite,
        custom_requirements: requirements,
        framework,
        language
      },
      message: '커스텀 테스트가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('커스텀 테스트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '커스텀 테스트 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * 커스텀 테스트 생성 헬퍼 함수
 */
async function generateCustomTests(codeContent, requirements, framework, language) {
  const customTests = [];

  for (const requirement of requirements) {
    try {
      const prompt = `
다음 코드에 대해 특정 요구사항에 맞는 테스트를 생성해주세요:

코드:
\`\`\`
${codeContent}
\`\`\`

요구사항: ${requirement}

${framework} ${language} 형식으로 테스트 코드를 생성해주세요.
`;

      const testGenerator = new (await import('../modules/ai/IntelligentTestGenerator.js')).IntelligentTestGenerator();
      const testCode = await testGenerator.aiService.generateResponse(prompt);

      customTests.push({
        requirement,
        test_code: testCode,
        framework,
        language
      });
    } catch (error) {
      console.error(`커스텀 테스트 생성 오류 (${requirement}):`, error);
      customTests.push({
        requirement,
        test_code: `// 테스트 생성 실패: ${requirement}`,
        error: error.message
      });
    }
  }

  return customTests;
}

/**
 * GET /api/test-generator/frameworks
 * 지원되는 테스트 프레임워크 목록
 */
router.get('/frameworks', (req, res) => {
  try {
    const frameworks = {
      javascript: {
        jest: {
          name: 'Jest',
          description: 'Facebook에서 개발한 JavaScript 테스팅 프레임워크',
          features: ['스냅샷 테스팅', '모킹', '코드 커버리지', '병렬 실행'],
          setup_required: false
        },
        mocha: {
          name: 'Mocha',
          description: '유연한 JavaScript 테스트 프레임워크',
          features: ['다양한 assertion 라이브러리 지원', '비동기 테스팅', 'BDD/TDD'],
          setup_required: true
        }
      },
      python: {
        pytest: {
          name: 'pytest',
          description: 'Python의 강력한 테스팅 프레임워크',
          features: ['간단한 문법', '픽스처', '플러그인', '매개변수화'],
          setup_required: false
        },
        unittest: {
          name: 'unittest',
          description: 'Python 표준 라이브러리의 테스팅 프레임워크',
          features: ['표준 라이브러리', '클래스 기반', 'setUp/tearDown'],
          setup_required: false
        }
      }
    };

    res.json({
      success: true,
      data: frameworks
    });
  } catch (error) {
    console.error('프레임워크 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '프레임워크 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/test-generator/templates
 * 테스트 템플릿 목록
 */
router.get('/templates', (req, res) => {
  try {
    const templates = {
      unit_test: {
        name: '단위 테스트',
        description: '개별 함수/메서드에 대한 테스트',
        use_cases: ['함수 로직 검증', '입출력 검증', '예외 처리']
      },
      integration_test: {
        name: '통합 테스트',
        description: '여러 컴포넌트 간의 상호작용 테스트',
        use_cases: ['API 통합', '데이터베이스 연동', '서비스 간 통신']
      },
      e2e_test: {
        name: '종단간 테스트',
        description: '전체 워크플로우에 대한 테스트',
        use_cases: ['사용자 시나리오', '전체 시스템 검증']
      },
      performance_test: {
        name: '성능 테스트',
        description: '성능 및 부하에 대한 테스트',
        use_cases: ['응답 시간 측정', '메모리 사용량', '동시성']
      }
    };

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '템플릿 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/test-generator/validate
 * 생성된 테스트 코드 검증
 */
router.post('/validate', async (req, res) => {
  try {
    const { testCode, framework = 'jest', language = 'javascript' } = req.body;

    if (!testCode) {
      return res.status(400).json({
        success: false,
        error: '테스트 코드가 필요합니다.'
      });
    }

    console.log('테스트 코드 검증 시작');

    const validation = {
      syntax_valid: true,
      issues: [],
      suggestions: [],
      score: 100
    };

    // 기본 문법 검사
    const syntaxIssues = await validateTestSyntax(testCode, framework, language);
    validation.issues.push(...syntaxIssues);

    // 테스트 구조 검사
    const structureIssues = await validateTestStructure(testCode, framework);
    validation.issues.push(...structureIssues);

    // 모범 사례 검사
    const bestPracticeIssues = await validateTestBestPractices(testCode);
    validation.issues.push(...bestPracticeIssues);

    // 점수 계산
    validation.score = Math.max(0, 100 - (validation.issues.length * 10));
    validation.syntax_valid = validation.issues.filter(i => i.severity === 'error').length === 0;

    // 개선 제안 생성
    validation.suggestions = await generateValidationSuggestions(validation.issues);

    res.json({
      success: true,
      data: validation,
      message: '테스트 코드 검증이 완료되었습니다.'
    });

  } catch (error) {
    console.error('테스트 코드 검증 오류:', error);
    res.status(500).json({
      success: false,
      error: '테스트 코드 검증 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * 테스트 문법 검증
 */
async function validateTestSyntax(testCode, framework, language) {
  const issues = [];

  try {
    if (language === 'javascript') {
      // 기본 JavaScript 문법 검사
      new Function(testCode);
    }
  } catch (error) {
    issues.push({
      type: 'syntax_error',
      severity: 'error',
      message: `문법 오류: ${error.message}`,
      line: null
    });
  }

  return issues;
}

/**
 * 테스트 구조 검증
 */
async function validateTestStructure(testCode, framework) {
  const issues = [];

  // describe 블록 확인
  if (framework === 'jest' && !testCode.includes('describe(')) {
    issues.push({
      type: 'structure',
      severity: 'warning',
      message: 'describe 블록이 없습니다.',
      suggestion: 'describe 블록으로 테스트를 그룹화하세요.'
    });
  }

  // test/it 블록 확인
  if (!testCode.includes('test(') && !testCode.includes('it(')) {
    issues.push({
      type: 'structure',
      severity: 'error',
      message: '테스트 케이스가 없습니다.',
      suggestion: 'test() 또는 it() 블록을 추가하세요.'
    });
  }

  // expect 구문 확인
  if (!testCode.includes('expect(')) {
    issues.push({
      type: 'structure',
      severity: 'warning',
      message: 'assertion이 없습니다.',
      suggestion: 'expect()를 사용한 assertion을 추가하세요.'
    });
  }

  return issues;
}

/**
 * 테스트 모범 사례 검증
 */
async function validateTestBestPractices(testCode) {
  const issues = [];

  // 테스트 이름 검사
  const testNames = testCode.match(/(?:test|it)\(['"`]([^'"`]+)['"`]/g);
  if (testNames) {
    testNames.forEach(match => {
      const name = match.match(/['"`]([^'"`]+)['"`]/)[1];
      if (name.length < 10) {
        issues.push({
          type: 'best_practice',
          severity: 'info',
          message: `테스트 이름이 너무 짧습니다: "${name}"`,
          suggestion: '테스트 이름을 더 구체적으로 작성하세요.'
        });
      }
    });
  }

  // beforeEach/afterEach 사용 확인
  if (testCode.includes('setup') && !testCode.includes('beforeEach')) {
    issues.push({
      type: 'best_practice',
      severity: 'info',
      message: 'beforeEach 사용을 고려해보세요.',
      suggestion: '반복되는 설정 코드는 beforeEach로 분리하세요.'
    });
  }

  return issues;
}

/**
 * 검증 개선 제안 생성
 */
async function generateValidationSuggestions(issues) {
  const suggestions = [];

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  if (errorCount > 0) {
    suggestions.push('문법 오류를 먼저 수정하세요.');
  }

  if (warningCount > 0) {
    suggestions.push('경고 사항들을 검토하여 테스트 품질을 향상시키세요.');
  }

  if (infoCount > 0) {
    suggestions.push('모범 사례를 적용하여 더 나은 테스트를 작성하세요.');
  }

  if (issues.length === 0) {
    suggestions.push('훌륭합니다! 테스트 코드가 모든 검증을 통과했습니다.');
  }

  return suggestions;
}

/**
 * GET /api/test-generator/history
 * 테스트 생성 기록 조회
 */
router.get('/history', async (req, res) => {
  try {
    const { sourceFile, limit = 50 } = req.query;
    
    const history = await testGenerator.getTestGenerationHistory(sourceFile, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        history,
        total: history.length,
        filter: sourceFile ? { sourceFile } : null
      }
    });
  } catch (error) {
    console.error('테스트 생성 기록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '테스트 생성 기록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/test-generator/analytics
 * 테스트 생성 분석 및 통계
 */
router.get('/analytics', async (req, res) => {
  try {
    const statistics = await testGenerator.getTestGenerationStatistics();
    
    res.json({
      success: true,
      data: {
        statistics,
        analytics: {
          generation_activity: statistics.total_generations > 0 ? 'active' : 'inactive',
          test_coverage: statistics.average_coverage >= 80 ? 'excellent' : 
                        statistics.average_coverage >= 60 ? 'good' : 'needs_improvement',
          framework_usage: {
            most_popular: statistics.popular_frameworks[0] || 'N/A',
            diversity: statistics.popular_frameworks.length
          },
          trend_analysis: {
            trend: statistics.generation_trend.length > 1 ? 'growing' : 'stable',
            data_points: statistics.generation_trend.length
          }
        },
        recommendations: [
          statistics.total_generations === 0 ? 'Start generating tests for better code quality' : null,
          statistics.average_coverage < 60 ? 'Focus on improving test coverage' : null,
          statistics.popular_frameworks.length === 1 ? 'Consider using multiple test frameworks' : null
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('테스트 생성 분석 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '테스트 생성 분석 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export default router;
