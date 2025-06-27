/**
 * AI 기반 지능형 테스트 생성 서비스
 * 코드 분석을 통한 자동 단위 테스트 및 통합 테스트 생성
 */

import fs from 'fs/promises';
import path from 'path';
import { AIService } from './AIService.js';
import { CodeAnalyzer } from '../analysis/CodeAnalyzer.js';
import { DatabaseService } from '../../services/DatabaseService.js';

export class IntelligentTestGenerator {
  constructor() {
    this.aiService = new AIService();
    this.codeAnalyzer = new CodeAnalyzer();
    this.dbService = new DatabaseService();
    this.testFrameworks = {
      javascript: {
        jest: {
          imports: "import { jest } from '@jest/globals';",
          describe: "describe",
          test: "test",
          expect: "expect",
          mock: "jest.fn()",
          spy: "jest.spyOn"
        },
        mocha: {
          imports: "import { describe, it } from 'mocha';\nimport { expect } from 'chai';",
          describe: "describe",
          test: "it",
          expect: "expect",
          mock: "sinon.stub()",
          spy: "sinon.spy"
        }
      },
      python: {
        pytest: {
          imports: "import pytest\nfrom unittest.mock import Mock, patch",
          describe: "class Test",
          test: "def test_",
          expect: "assert",
          mock: "Mock()",
          spy: "patch"
        },
        unittest: {
          imports: "import unittest\nfrom unittest.mock import Mock, patch",
          describe: "class Test",
          test: "def test_",
          expect: "self.assertEqual",
          mock: "Mock()",
          spy: "patch"
        }
      }
    };
  }

  /**
   * 코드 파일에 대한 종합적인 테스트 생성
   */
  async generateTestsForFile(filePath, options = {}) {
    try {
      const {
        framework = 'jest',
        language = 'javascript',
        testTypes = ['unit', 'integration'],
        coverage = 'comprehensive'
      } = options;

      console.log(`테스트 생성 시작: ${filePath}`);

      // 1. 코드 분석
      const codeContent = await fs.readFile(filePath, 'utf-8');
      const analysis = await this.analyzeCodeForTesting(codeContent, filePath);

      // 2. 테스트 계획 수립
      const testPlan = await this.createTestPlan(analysis, testTypes, coverage);

      // 3. 테스트 생성
      const generatedTests = await this.generateTests(analysis, testPlan, framework, language);

      // 4. 테스트 파일 구조화
      const testSuite = this.structureTestSuite(generatedTests, framework, language);

      // 5. 테스트 파일 저장
      const testFilePath = await this.saveTestFile(testSuite, filePath, framework);

      const result = {
        source_file: filePath,
        test_file: testFilePath,
        framework,
        language,
        analysis,
        test_plan: testPlan,
        generated_tests: generatedTests,
        test_suite: testSuite,
        coverage_estimate: this.estimateCoverage(analysis, generatedTests),
        recommendations: await this.generateTestRecommendations(analysis, generatedTests)
      };

      // 6. 데이터베이스에 테스트 생성 기록 저장
      await this.saveTestGenerationRecord(result);

      return result;

    } catch (error) {
      console.error('테스트 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 코드 분석 for 테스트 생성
   */
  async analyzeCodeForTesting(codeContent, filePath) {
    try {
      const analysis = {
        file_info: {
          path: filePath,
          extension: path.extname(filePath),
          size: codeContent.length,
          lines: codeContent.split('\n').length
        },
        functions: [],
        classes: [],
        exports: [],
        imports: [],
        dependencies: [],
        complexity: 0,
        test_requirements: {}
      };

      // 함수 분석
      analysis.functions = this.extractFunctions(codeContent);
      
      // 클래스 분석
      analysis.classes = this.extractClasses(codeContent);
      
      // 모듈 분석
      analysis.exports = this.extractExports(codeContent);
      analysis.imports = this.extractImports(codeContent);
      
      // 의존성 분석
      analysis.dependencies = this.extractDependencies(codeContent);
      
      // 복잡도 계산
      analysis.complexity = this.calculateTestComplexity(codeContent);

      // AI 기반 심화 분석
      const aiAnalysis = await this.performAICodeAnalysis(codeContent, filePath);
      analysis.ai_insights = aiAnalysis;

      // 테스트 요구사항 결정
      analysis.test_requirements = this.determineTestRequirements(analysis);

      return analysis;
    } catch (error) {
      console.error('코드 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 함수 추출
   */
  extractFunctions(codeContent) {
    const functions = [];
    
    // 일반 함수
    const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*{/g;
    let match;
    while ((match = functionRegex.exec(codeContent)) !== null) {
      functions.push({
        name: match[1],
        parameters: match[2].split(',').map(p => p.trim()).filter(p => p),
        type: 'function',
        async: false
      });
    }

    // 화살표 함수
    const arrowFunctionRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
    while ((match = arrowFunctionRegex.exec(codeContent)) !== null) {
      functions.push({
        name: match[1],
        parameters: match[2].split(',').map(p => p.trim()).filter(p => p),
        type: 'arrow_function',
        async: codeContent.includes('async')
      });
    }

    // 메서드
    const methodRegex = /(\w+)\s*\(([^)]*)\)\s*{/g;
    while ((match = methodRegex.exec(codeContent)) !== null) {
      if (!functions.find(f => f.name === match[1])) {
        functions.push({
          name: match[1],
          parameters: match[2].split(',').map(p => p.trim()).filter(p => p),
          type: 'method',
          async: false
        });
      }
    }

    return functions;
  }

  /**
   * 클래스 추출
   */
  extractClasses(codeContent) {
    const classes = [];
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^}]+)}/g;
    let match;

    while ((match = classRegex.exec(codeContent)) !== null) {
      const className = match[1];
      const parentClass = match[2];
      const classBody = match[3];

      const methods = this.extractFunctions(classBody).map(method => ({
        ...method,
        class: className
      }));

      classes.push({
        name: className,
        parent: parentClass,
        methods,
        constructor: classBody.includes('constructor'),
        properties: this.extractClassProperties(classBody)
      });
    }

    return classes;
  }

  /**
   * 클래스 속성 추출
   */
  extractClassProperties(classBody) {
    const properties = [];
    const propertyRegex = /this\.(\w+)\s*=/g;
    let match;

    while ((match = propertyRegex.exec(classBody)) !== null) {
      if (!properties.includes(match[1])) {
        properties.push(match[1]);
      }
    }

    return properties;
  }

  /**
   * exports 추출
   */
  extractExports(codeContent) {
    const exports = [];
    
    // export function
    const exportFunctionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
    let match;
    while ((match = exportFunctionRegex.exec(codeContent)) !== null) {
      exports.push({ name: match[1], type: 'function' });
    }

    // export class
    const exportClassRegex = /export\s+class\s+(\w+)/g;
    while ((match = exportClassRegex.exec(codeContent)) !== null) {
      exports.push({ name: match[1], type: 'class' });
    }

    // export const/let/var
    const exportVarRegex = /export\s+(?:const|let|var)\s+(\w+)/g;
    while ((match = exportVarRegex.exec(codeContent)) !== null) {
      exports.push({ name: match[1], type: 'variable' });
    }

    // export default
    if (codeContent.includes('export default')) {
      exports.push({ name: 'default', type: 'default' });
    }

    return exports;
  }

  /**
   * imports 추출
   */
  extractImports(codeContent) {
    const imports = [];
    const importRegex = /import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(codeContent)) !== null) {
      const namedImports = match[1] ? match[1].split(',').map(i => i.trim()) : [];
      const namespaceImport = match[2];
      const defaultImport = match[3];
      const module = match[4];

      imports.push({
        module,
        default: defaultImport,
        namespace: namespaceImport,
        named: namedImports,
        external: !module.startsWith('.')
      });
    }

    return imports;
  }

  /**
   * 의존성 추출
   */
  extractDependencies(codeContent) {
    const dependencies = new Set();
    
    // require 패턴
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = requireRegex.exec(codeContent)) !== null) {
      dependencies.add(match[1]);
    }

    // import 패턴
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(codeContent)) !== null) {
      dependencies.add(match[1]);
    }

    return Array.from(dependencies);
  }

  /**
   * 테스트 복잡도 계산
   */
  calculateTestComplexity(codeContent) {
    let complexity = 1;
    
    // 조건문
    const conditionals = (codeContent.match(/\bif\b|\belse\b|\bswitch\b|\bcase\b/g) || []).length;
    complexity += conditionals;
    
    // 반복문
    const loops = (codeContent.match(/\bfor\b|\bwhile\b|\bdo\b/g) || []).length;
    complexity += loops;
    
    // try-catch
    const errorHandling = (codeContent.match(/\btry\b|\bcatch\b|\bfinally\b/g) || []).length;
    complexity += errorHandling;
    
    // 비동기 패턴
    const asyncPatterns = (codeContent.match(/\basync\b|\bawait\b|\bPromise\b|\bthen\b/g) || []).length;
    complexity += asyncPatterns * 2;

    return complexity;
  }

  /**
   * AI 기반 코드 분석
   */
  async performAICodeAnalysis(codeContent, filePath) {
    try {
      const prompt = `
다음 코드에 대한 테스트 생성을 위한 분석을 해주세요:

파일: ${filePath}

코드:
\`\`\`
${codeContent}
\`\`\`

다음 정보를 JSON 형식으로 제공해주세요:
{
  "main_purpose": "코드의 주요 목적",
  "key_functionalities": ["기능1", "기능2"],
  "edge_cases": ["엣지케이스1", "엣지케이스2"],
  "error_scenarios": ["에러시나리오1", "에러시나리오2"],
  "mock_requirements": ["모킹이 필요한 의존성1", "의존성2"],
  "test_priorities": {
    "high": ["우선순위 높은 테스트"],
    "medium": ["우선순위 중간 테스트"],
    "low": ["우선순위 낮은 테스트"]
  },
  "complexity_analysis": {
    "simple_functions": ["함수명"],
    "complex_functions": ["함수명"],
    "integration_points": ["통합점"]
  }
}
`;

      const response = await this.aiService.generateResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('AI 코드 분석 오류:', error);
      return {
        main_purpose: "분석 실패",
        key_functionalities: [],
        edge_cases: [],
        error_scenarios: [],
        mock_requirements: [],
        test_priorities: { high: [], medium: [], low: [] },
        complexity_analysis: { simple_functions: [], complex_functions: [], integration_points: [] }
      };
    }
  }

  /**
   * 테스트 요구사항 결정
   */
  determineTestRequirements(analysis) {
    const requirements = {
      unit_tests: [],
      integration_tests: [],
      mocking_needed: [],
      setup_teardown: false,
      async_testing: false,
      error_testing: true
    };

    // 단위 테스트 요구사항
    analysis.functions.forEach(func => {
      requirements.unit_tests.push({
        function: func.name,
        parameters: func.parameters,
        test_cases: this.generateTestCases(func)
      });
    });

    // 통합 테스트 요구사항
    if (analysis.classes.length > 0) {
      requirements.integration_tests.push('class_integration');
    }
    if (analysis.dependencies.length > 0) {
      requirements.integration_tests.push('dependency_integration');
    }

    // 모킹 요구사항
    requirements.mocking_needed = analysis.dependencies.filter(dep => !dep.startsWith('.'));

    // 비동기 테스트 필요성
    requirements.async_testing = analysis.functions.some(func => func.async) || 
                                 analysis.ai_insights.key_functionalities.some(func => 
                                   func.includes('async') || func.includes('promise'));

    return requirements;
  }

  /**
   * 테스트 케이스 생성
   */
  generateTestCases(func) {
    const testCases = [];

    // 기본 케이스
    testCases.push({
      name: `should work with valid inputs`,
      type: 'positive',
      inputs: func.parameters.map(p => `valid_${p}`),
      expected: 'expected_result'
    });

    // 엣지 케이스
    if (func.parameters.length > 0) {
      testCases.push({
        name: `should handle empty inputs`,
        type: 'edge',
        inputs: func.parameters.map(() => null),
        expected: 'error_or_default'
      });

      testCases.push({
        name: `should handle invalid inputs`,
        type: 'negative',
        inputs: func.parameters.map(() => 'invalid_input'),
        expected: 'error'
      });
    }

    return testCases;
  }

  /**
   * 테스트 계획 수립
   */
  async createTestPlan(analysis, testTypes, coverage) {
    const plan = {
      test_types: testTypes,
      coverage_level: coverage,
      test_files: [],
      test_suites: [],
      priority_order: [],
      estimated_time: 0
    };

    // 우선순위 결정
    if (analysis.ai_insights.test_priorities) {
      plan.priority_order = [
        ...analysis.ai_insights.test_priorities.high,
        ...analysis.ai_insights.test_priorities.medium,
        ...analysis.ai_insights.test_priorities.low
      ];
    }

    // 테스트 스위트 계획
    if (testTypes.includes('unit')) {
      plan.test_suites.push({
        name: 'Unit Tests',
        type: 'unit',
        functions: analysis.functions.map(f => f.name),
        estimated_tests: analysis.functions.length * 3
      });
    }

    if (testTypes.includes('integration')) {
      plan.test_suites.push({
        name: 'Integration Tests',
        type: 'integration',
        scenarios: analysis.ai_insights.complexity_analysis.integration_points,
        estimated_tests: Math.max(analysis.classes.length, 1) * 2
      });
    }

    // 시간 추정
    plan.estimated_time = this.estimateTestGenerationTime(analysis, plan);

    return plan;
  }

  /**
   * 테스트 생성 시간 추정
   */
  estimateTestGenerationTime(analysis, plan) {
    let time = 0;
    
    // 기본 시간 (분)
    time += analysis.functions.length * 2; // 함수당 2분
    time += analysis.classes.length * 5;   // 클래스당 5분
    time += analysis.complexity * 1;       // 복잡도당 1분
    
    // 테스트 타입별 추가 시간
    if (plan.test_types.includes('integration')) {
      time += 10; // 통합 테스트 추가 시간
    }
    
    return Math.max(time, 5); // 최소 5분
  }

  /**
   * 실제 테스트 생성
   */
  async generateTests(analysis, testPlan, framework, language) {
    const tests = {
      unit_tests: [],
      integration_tests: [],
      setup_code: '',
      teardown_code: '',
      mock_definitions: []
    };

    try {
      // 단위 테스트 생성
      for (const func of analysis.functions) {
        const unitTest = await this.generateUnitTest(func, analysis, framework, language);
        tests.unit_tests.push(unitTest);
      }

      // 통합 테스트 생성
      if (testPlan.test_types.includes('integration')) {
        for (const cls of analysis.classes) {
          const integrationTest = await this.generateIntegrationTest(cls, analysis, framework, language);
          tests.integration_tests.push(integrationTest);
        }
      }

      // 모킹 코드 생성
      tests.mock_definitions = await this.generateMockDefinitions(analysis, framework, language);

      // 셋업/티어다운 코드 생성
      if (analysis.test_requirements.setup_teardown) {
        tests.setup_code = this.generateSetupCode(analysis, framework, language);
        tests.teardown_code = this.generateTeardownCode(analysis, framework, language);
      }

    } catch (error) {
      console.error('테스트 생성 오류:', error);
      throw error;
    }

    return tests;
  }

  /**
   * 단위 테스트 생성
   */
  async generateUnitTest(func, analysis, framework, language) {
    try {
      const prompt = `
다음 함수에 대한 ${framework} 단위 테스트를 생성해주세요:

함수 정보:
- 이름: ${func.name}
- 매개변수: ${func.parameters.join(', ')}
- 타입: ${func.type}
- 비동기: ${func.async}

컨텍스트:
- 파일 목적: ${analysis.ai_insights.main_purpose}
- 주요 기능: ${analysis.ai_insights.key_functionalities.join(', ')}
- 엣지 케이스: ${analysis.ai_insights.edge_cases.join(', ')}

다음을 포함한 완전한 테스트 코드를 생성해주세요:
1. 정상 케이스 테스트
2. 엣지 케이스 테스트
3. 에러 케이스 테스트
4. 필요한 모킹

${language} ${framework} 형식으로 작성해주세요.
`;

      const testCode = await this.aiService.generateResponse(prompt);
      
      return {
        function_name: func.name,
        test_code: testCode,
        test_cases: func.parameters.length > 0 ? 3 : 1,
        async: func.async,
        mocks_needed: analysis.dependencies.filter(dep => !dep.startsWith('.'))
      };
    } catch (error) {
      console.error(`단위 테스트 생성 오류 (${func.name}):`, error);
      return {
        function_name: func.name,
        test_code: `// 테스트 생성 실패: ${func.name}`,
        test_cases: 0,
        async: false,
        mocks_needed: []
      };
    }
  }

  /**
   * 통합 테스트 생성
   */
  async generateIntegrationTest(cls, analysis, framework, language) {
    try {
      const prompt = `
다음 클래스에 대한 ${framework} 통합 테스트를 생성해주세요:

클래스 정보:
- 이름: ${cls.name}
- 부모 클래스: ${cls.parent || 'None'}
- 메서드: ${cls.methods.map(m => m.name).join(', ')}
- 속성: ${cls.properties.join(', ')}

다음을 포함한 통합 테스트를 생성해주세요:
1. 클래스 인스턴스화 테스트
2. 메서드 간 상호작용 테스트
3. 상태 변화 테스트
4. 전체 워크플로우 테스트

${language} ${framework} 형식으로 작성해주세요.
`;

      const testCode = await this.aiService.generateResponse(prompt);
      
      return {
        class_name: cls.name,
        test_code: testCode,
        test_scenarios: ['instantiation', 'method_interaction', 'state_changes', 'workflow'],
        complexity: cls.methods.length
      };
    } catch (error) {
      console.error(`통합 테스트 생성 오류 (${cls.name}):`, error);
      return {
        class_name: cls.name,
        test_code: `// 통합 테스트 생성 실패: ${cls.name}`,
        test_scenarios: [],
        complexity: 0
      };
    }
  }

  /**
   * 모킹 정의 생성
   */
  async generateMockDefinitions(analysis, framework, language) {
    const mocks = [];

    for (const dependency of analysis.dependencies) {
      if (!dependency.startsWith('.') && dependency !== 'fs' && dependency !== 'path') {
        const mockDef = await this.generateSingleMock(dependency, framework, language);
        mocks.push(mockDef);
      }
    }

    return mocks;
  }

  /**
   * 개별 모킹 생성
   */
  async generateSingleMock(dependency, framework, language) {
    try {
      const prompt = `
${dependency} 모듈에 대한 ${framework} 모킹 코드를 생성해주세요.

${language} ${framework} 형식으로 모킹 정의와 사용 예시를 포함해주세요.
`;

      const mockCode = await this.aiService.generateResponse(prompt);
      
      return {
        dependency,
        mock_code: mockCode,
        framework
      };
    } catch (error) {
      console.error(`모킹 생성 오류 (${dependency}):`, error);
      return {
        dependency,
        mock_code: `// 모킹 생성 실패: ${dependency}`,
        framework
      };
    }
  }

  /**
   * 셋업 코드 생성
   */
  generateSetupCode(analysis, framework, language) {
    const fw = this.testFrameworks[language][framework];
    return `
// Test setup
beforeEach(() => {
  // 테스트 환경 초기화
  ${analysis.dependencies.map(dep => `// ${dep} 모킹 설정`).join('\n  ')}
});
`;
  }

  /**
   * 티어다운 코드 생성
   */
  generateTeardownCode(analysis, framework, language) {
    return `
// Test teardown
afterEach(() => {
  // 테스트 후 정리
  jest.clearAllMocks();
});
`;
  }

  /**
   * 테스트 스위트 구조화
   */
  structureTestSuite(generatedTests, framework, language) {
    const fw = this.testFrameworks[language][framework];
    
    let testSuite = `${fw.imports}\n\n`;
    
    // 모킹 정의
    if (generatedTests.mock_definitions.length > 0) {
      testSuite += "// Mocks\n";
      generatedTests.mock_definitions.forEach(mock => {
        testSuite += `${mock.mock_code}\n\n`;
      });
    }

    // 셋업/티어다운
    if (generatedTests.setup_code) {
      testSuite += `${generatedTests.setup_code}\n`;
    }
    if (generatedTests.teardown_code) {
      testSuite += `${generatedTests.teardown_code}\n`;
    }

    // 단위 테스트
    if (generatedTests.unit_tests.length > 0) {
      testSuite += `${fw.describe}('Unit Tests', () => {\n`;
      generatedTests.unit_tests.forEach(test => {
        testSuite += `  ${fw.describe}('${test.function_name}', () => {\n`;
        testSuite += `${test.test_code.split('\n').map(line => '    ' + line).join('\n')}\n`;
        testSuite += `  });\n\n`;
      });
      testSuite += `});\n\n`;
    }

    // 통합 테스트
    if (generatedTests.integration_tests.length > 0) {
      testSuite += `${fw.describe}('Integration Tests', () => {\n`;
      generatedTests.integration_tests.forEach(test => {
        testSuite += `  ${fw.describe}('${test.class_name}', () => {\n`;
        testSuite += `${test.test_code.split('\n').map(line => '    ' + line).join('\n')}\n`;
        testSuite += `  });\n\n`;
      });
      testSuite += `});\n`;
    }

    return testSuite;
  }

  /**
   * 테스트 파일 저장
   */
  async saveTestFile(testSuite, sourceFilePath, framework) {
    try {
      const sourceDir = path.dirname(sourceFilePath);
      const sourceBasename = path.basename(sourceFilePath, path.extname(sourceFilePath));
      
      // 테스트 디렉토리 결정
      let testDir;
      if (sourceDir.includes('src')) {
        testDir = sourceDir.replace('src', 'tests');
      } else {
        testDir = path.join(sourceDir, '__tests__');
      }
      
      await fs.mkdir(testDir, { recursive: true });
      
      // 테스트 파일 이름 생성
      const testFileName = framework === 'jest' 
        ? `${sourceBasename}.test.js`
        : `${sourceBasename}.spec.js`;
      
      const testFilePath = path.join(testDir, testFileName);
      
      // 파일 저장
      await fs.writeFile(testFilePath, testSuite, 'utf-8');
      
      console.log(`테스트 파일 생성됨: ${testFilePath}`);
      return testFilePath;
    } catch (error) {
      console.error('테스트 파일 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 커버리지 추정
   */
  estimateCoverage(analysis, generatedTests) {
    const totalFunctions = analysis.functions.length;
    const totalClasses = analysis.classes.length;
    const testedFunctions = generatedTests.unit_tests.length;
    const testedClasses = generatedTests.integration_tests.length;

    const functionCoverage = totalFunctions > 0 ? (testedFunctions / totalFunctions) * 100 : 100;
    const classCoverage = totalClasses > 0 ? (testedClasses / totalClasses) * 100 : 100;

    return {
      estimated_function_coverage: Math.round(functionCoverage),
      estimated_class_coverage: Math.round(classCoverage),
      overall_coverage: Math.round((functionCoverage + classCoverage) / 2),
      details: {
        total_functions: totalFunctions,
        tested_functions: testedFunctions,
        total_classes: totalClasses,
        tested_classes: testedClasses
      }
    };
  }

  /**
   * 테스트 권장사항 생성
   */
  async generateTestRecommendations(analysis, generatedTests) {
    try {
      const prompt = `
다음 코드 분석과 생성된 테스트를 바탕으로 추가 권장사항을 제공해주세요:

분석 결과:
- 함수 수: ${analysis.functions.length}
- 클래스 수: ${analysis.classes.length}
- 복잡도: ${analysis.complexity}
- 의존성: ${analysis.dependencies.join(', ')}

생성된 테스트:
- 단위 테스트: ${generatedTests.unit_tests.length}개
- 통합 테스트: ${generatedTests.integration_tests.length}개

JSON 형식으로 다음을 제공해주세요:
{
  "missing_tests": ["부족한 테스트 영역"],
  "improvement_suggestions": ["개선 제안"],
  "additional_test_types": ["추가 테스트 유형"],
  "performance_considerations": ["성능 고려사항"],
  "maintenance_tips": ["유지보수 팁"]
}
`;

      const response = await this.aiService.generateResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('권장사항 생성 오류:', error);
      return {
        missing_tests: [],
        improvement_suggestions: [],
        additional_test_types: [],
        performance_considerations: [],
        maintenance_tips: []
      };
    }
  }

  /**
   * 프로젝트 전체 테스트 생성
   */
  async generateProjectTests(projectPath, options = {}) {
    try {
      const results = {
        project_path: projectPath,
        timestamp: new Date().toISOString(),
        generated_files: [],
        summary: {},
        recommendations: []
      };

      // 코드 파일 찾기
      const codeFiles = await this.findTestableFiles(projectPath);
      console.log(`${codeFiles.length}개의 파일에 대한 테스트를 생성합니다...`);

      // 각 파일에 대한 테스트 생성
      for (const filePath of codeFiles) {
        try {
          console.log(`테스트 생성 중: ${filePath}`);
          const testResult = await this.generateTestsForFile(filePath, options);
          results.generated_files.push(testResult);
        } catch (error) {
          console.error(`테스트 생성 실패 ${filePath}:`, error.message);
          results.generated_files.push({
            source_file: filePath,
            error: error.message,
            success: false
          });
        }
      }

      // 요약 정보 생성
      const successfulTests = results.generated_files.filter(r => !r.error);
      results.summary = {
        total_files: codeFiles.length,
        successful_generations: successfulTests.length,
        failed_generations: results.generated_files.length - successfulTests.length,
        total_test_files: successfulTests.length,
        estimated_coverage: successfulTests.length > 0 
          ? Math.round(successfulTests.reduce((sum, r) => sum + (r.coverage_estimate?.overall_coverage || 0), 0) / successfulTests.length)
          : 0
      };

      // 프로젝트 수준 권장사항
      results.recommendations = await this.generateProjectTestRecommendations(results);

      return results;
    } catch (error) {
      console.error('프로젝트 테스트 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 테스트 가능한 파일 찾기
   */
  async findTestableFiles(projectPath) {
    const files = [];
    const testableExtensions = ['.js', '.ts', '.jsx', '.tsx'];
    
    async function traverse(currentPath) {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            // 제외할 디렉토리
            if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__tests__', 'tests'].includes(entry.name)) {
              await traverse(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            // 이미 테스트 파일이 아닌 경우만
            if (testableExtensions.includes(ext) && 
                !entry.name.includes('.test.') && 
                !entry.name.includes('.spec.')) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`디렉토리 탐색 오류 ${currentPath}:`, error.message);
      }
    }

    await traverse(projectPath);
    return files;
  }

  /**
   * 프로젝트 테스트 권장사항 생성
   */
  async generateProjectTestRecommendations(results) {
    const recommendations = [];

    // 커버리지 기반 권장사항
    if (results.summary.estimated_coverage < 70) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: '테스트 커버리지가 낮습니다. 핵심 비즈니스 로직에 대한 테스트를 추가하세요.'
      });
    }

    // 실패한 생성에 대한 권장사항
    if (results.summary.failed_generations > 0) {
      recommendations.push({
        type: 'generation_failures',
        priority: 'medium',
        message: `${results.summary.failed_generations}개 파일의 테스트 생성에 실패했습니다. 수동으로 검토하세요.`
      });
    }

    // 성공적인 생성에 대한 축하
    if (results.summary.successful_generations > 0) {
      recommendations.push({
        type: 'success',
        priority: 'info',
        message: `${results.summary.successful_generations}개 파일의 테스트가 성공적으로 생성되었습니다.`
      });
    }

    return recommendations;
  }

  /**
   * 테스트 생성 기록을 데이터베이스에 저장
   */
  async saveTestGenerationRecord(testResult) {
    try {
      const recordData = {
        id: `test_gen_${Date.now()}`,
        source_file: testResult.source_file,
        test_file: testResult.test_file,
        framework: testResult.framework,
        language: testResult.language,
        tests_count: testResult.generated_tests?.length || 0,
        coverage_estimate: testResult.coverage_estimate || 0,
        generation_data: JSON.stringify({
          analysis: testResult.analysis,
          test_plan: testResult.test_plan,
          recommendations: testResult.recommendations
        }),
        created_at: new Date().toISOString()
      };

      // DatabaseService에 저장하는 메서드가 아직 없으므로 임시로 콘솔 출력
      console.log('테스트 생성 기록 저장:', recordData.id);
      
      // TODO: DatabaseService에 saveTestGeneration 메서드 추가 필요
      // this.dbService.saveTestGeneration(recordData);

    } catch (error) {
      console.error('테스트 생성 기록 저장 오류:', error);
    }
  }

  /**
   * 테스트 생성 기록 조회
   */
  async getTestGenerationHistory(sourceFile = null, limit = 50) {
    try {
      // TODO: DatabaseService에서 조회 메서드 구현 필요
      console.log(`테스트 생성 기록 조회: ${sourceFile || 'all'}`);
      return [];
    } catch (error) {
      console.error('테스트 생성 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 테스트 생성 통계 조회
   */
  async getTestGenerationStatistics() {
    try {
      // TODO: DatabaseService에서 통계 조회 메서드 구현 필요
      return {
        total_generations: 0,
        total_tests_created: 0,
        average_coverage: 0,
        popular_frameworks: [],
        generation_trend: []
      };
    } catch (error) {
      console.error('테스트 생성 통계 조회 오류:', error);
      return {
        total_generations: 0,
        total_tests_created: 0,
        average_coverage: 0,
        popular_frameworks: [],
        generation_trend: []
      };
    }
  }
}

export default IntelligentTestGenerator;
