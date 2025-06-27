/**
 * 실시간 코드 분석 및 최적화 시스템
 */
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { CodeGenerator } from '../ai/CodeGenerator.js';

export class CodeAnalyzer {
  constructor() {
    this.codeGenerator = new CodeGenerator();
    this.analysisCache = new Map();
    this.watchedFiles = new Set();
    this.analysisResults = new Map();
  }

  /**
   * 프로젝트 전체 분석
   */
  async analyzeProject(projectPath) {
    try {
      console.log('🔍 프로젝트 분석 시작...');
      
      const analysis = {
        projectPath,
        timestamp: new Date().toISOString(),
        structure: await this.analyzeProjectStructure(projectPath),
        codeQuality: await this.analyzeCodeQuality(projectPath),
        dependencies: await this.analyzeDependencies(projectPath),
        security: await this.analyzeSecurityIssues(projectPath),
        performance: await this.analyzePerformance(projectPath),
        suggestions: []
      };
      
      // AI 기반 종합 분석
      analysis.aiInsights = await this.generateAIInsights(analysis);
      
      // 개선 제안 생성
      analysis.suggestions = this.generateImprovementSuggestions(analysis);
      
      console.log('✅ 프로젝트 분석 완료');
      return analysis;
      
    } catch (error) {
      console.error('❌ 프로젝트 분석 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 프로젝트 구조 분석
   */
  async analyzeProjectStructure(projectPath) {
    const structure = {
      totalFiles: 0,
      totalLines: 0,
      fileTypes: {},
      directories: [],
      largestFiles: [],
      duplicates: []
    };

    try {
      const files = await this.getAllFiles(projectPath);
      structure.totalFiles = files.length;
      
      for (const filePath of files) {
        const ext = path.extname(filePath);
        const stats = await fs.stat(filePath);
        
        // 파일 타입별 통계
        structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
        
        // 코드 파일만 라인 수 계산
        if (this.isCodeFile(ext)) {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n').length;
          structure.totalLines += lines;
          
          // 큰 파일 추적
          if (lines > 200) {
            structure.largestFiles.push({
              path: filePath,
              lines,
              size: stats.size
            });
          }
        }
      }
      
      // 큰 파일 정렬
      structure.largestFiles.sort((a, b) => b.lines - a.lines);
      structure.largestFiles = structure.largestFiles.slice(0, 10);
      
      return structure;
    } catch (error) {
      console.error('구조 분석 실패:', error);
      return structure;
    }
  }

  /**
   * 코드 품질 분석
   */
  async analyzeCodeQuality(projectPath) {
    const quality = {
      overallScore: 0,
      metrics: {
        complexity: 0,
        maintainability: 0,
        readability: 0,
        testCoverage: 0
      },
      issues: [],
      files: []
    };

    try {
      const codeFiles = await this.getCodeFiles(projectPath);
      let totalScore = 0;
      let fileCount = 0;

      for (const filePath of codeFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const analysis = await this.codeGenerator.analyzeCode(content, this.getLanguageFromFile(filePath));
        
        quality.files.push({
          path: filePath,
          analysis
        });
        
        totalScore += analysis.quality.score;
        fileCount++;
        
        // 품질 이슈 수집
        if (analysis.quality.score < 60) {
          quality.issues.push({
            file: filePath,
            type: 'low_quality',
            score: analysis.quality.score,
            message: `코드 품질이 낮습니다 (${analysis.quality.grade})`
          });
        }
        
        if (analysis.complexity.level === 'high') {
          quality.issues.push({
            file: filePath,
            type: 'high_complexity',
            complexity: analysis.complexity.cyclomatic,
            message: `높은 복잡도 (순환 복잡도: ${analysis.complexity.cyclomatic})`
          });
        }
      }
      
      quality.overallScore = fileCount > 0 ? Math.round(totalScore / fileCount) : 0;
      
      // 메트릭 계산
      quality.metrics.complexity = this.calculateAverageComplexity(quality.files);
      quality.metrics.maintainability = this.calculateMaintainabilityIndex(quality.files);
      quality.metrics.readability = this.calculateReadabilityScore(quality.files);
      
      return quality;
    } catch (error) {
      console.error('품질 분석 실패:', error);
      return quality;
    }
  }

  /**
   * 의존성 분석
   */
  async analyzeDependencies(projectPath) {
    const dependencies = {
      total: 0,
      outdated: [],
      vulnerabilities: [],
      unused: [],
      licenses: {},
      size: 0
    };

    try {
      // package.json 확인
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
      
      if (packageJsonExists) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        const allDeps = {
          ...packageJson.dependencies || {},
          ...packageJson.devDependencies || {}
        };
        
        dependencies.total = Object.keys(allDeps).length;
        
        // npm audit 실행 (취약점 검사)
        try {
          process.chdir(projectPath);
          const auditResult = execSync('npm audit --json', { encoding: 'utf-8' });
          const audit = JSON.parse(auditResult);
          
          if (audit.vulnerabilities) {
            Object.entries(audit.vulnerabilities).forEach(([name, vuln]) => {
              dependencies.vulnerabilities.push({
                name,
                severity: vuln.severity,
                title: vuln.title,
                url: vuln.url
              });
            });
          }
        } catch (auditError) {
          console.log('npm audit 실행 불가 (정상적임)');
        }
        
        // 오래된 패키지 확인
        try {
          const outdatedResult = execSync('npm outdated --json', { encoding: 'utf-8' });
          if (outdatedResult) {
            const outdated = JSON.parse(outdatedResult);
            Object.entries(outdated).forEach(([name, info]) => {
              dependencies.outdated.push({
                name,
                current: info.current,
                wanted: info.wanted,
                latest: info.latest
              });
            });
          }
        } catch (outdatedError) {
          console.log('npm outdated 실행 불가 (정상적임)');
        }
      }
      
      // requirements.txt 확인 (Python)
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      const requirementsExists = await fs.access(requirementsPath).then(() => true).catch(() => false);
      
      if (requirementsExists) {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        const pythonDeps = requirements.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        dependencies.total += pythonDeps.length;
      }
      
      return dependencies;
    } catch (error) {
      console.error('의존성 분석 실패:', error);
      return dependencies;
    }
  }

  /**
   * 보안 이슈 분석
   */
  async analyzeSecurityIssues(projectPath) {
    const security = {
      score: 100,
      issues: [],
      categories: {
        authentication: [],
        dataExposure: [],
        injection: [],
        configuration: []
      }
    };

    try {
      const codeFiles = await this.getCodeFiles(projectPath);
      
      for (const filePath of codeFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const issues = this.detectSecurityIssues(content, filePath);
        security.issues.push(...issues);
      }
      
      // 카테고리별 분류
      security.issues.forEach(issue => {
        if (security.categories[issue.category]) {
          security.categories[issue.category].push(issue);
        }
      });
      
      // 보안 점수 계산
      const severityWeights = { high: 20, medium: 10, low: 5 };
      const deduction = security.issues.reduce((sum, issue) => {
        return sum + (severityWeights[issue.severity] || 5);
      }, 0);
      
      security.score = Math.max(0, 100 - deduction);
      
      return security;
    } catch (error) {
      console.error('보안 분석 실패:', error);
      return security;
    }
  }

  /**
   * 성능 분석
   */
  async analyzePerformance(projectPath) {
    const performance = {
      score: 0,
      issues: [],
      metrics: {
        bundleSize: 0,
        loadTime: 0,
        memoryUsage: 0
      },
      optimizations: []
    };

    try {
      const codeFiles = await this.getCodeFiles(projectPath);
      let totalSize = 0;
      
      for (const filePath of codeFiles) {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        const content = await fs.readFile(filePath, 'utf-8');
        const perfIssues = this.detectPerformanceIssues(content, filePath);
        performance.issues.push(...perfIssues);
      }
      
      performance.metrics.bundleSize = totalSize;
      
      // 성능 최적화 제안
      performance.optimizations = this.generatePerformanceOptimizations(performance.issues);
      
      // 성능 점수 계산
      const issueCount = performance.issues.length;
      performance.score = Math.max(0, 100 - (issueCount * 5));
      
      return performance;
    } catch (error) {
      console.error('성능 분석 실패:', error);
      return performance;
    }
  }

  /**
   * 보안 이슈 감지
   */
  detectSecurityIssues(content, filePath) {
    const issues = [];
    
    // SQL 인젝션 위험
    if (/query\s*\+|SELECT.*\+|INSERT.*\+/.test(content)) {
      issues.push({
        file: filePath,
        type: 'sql_injection',
        category: 'injection',
        severity: 'high',
        message: 'SQL 인젝션 취약점 가능성',
        line: this.findLineNumber(content, /query\s*\+|SELECT.*\+|INSERT.*\+/)
      });
    }
    
    // XSS 위험
    if (/innerHTML\s*=|document\.write/.test(content)) {
      issues.push({
        file: filePath,
        type: 'xss',
        category: 'injection',
        severity: 'medium',
        message: 'XSS 취약점 가능성',
        line: this.findLineNumber(content, /innerHTML\s*=|document\.write/)
      });
    }
    
    // 하드코딩된 비밀번호/API 키
    if (/password\s*=\s*['"][^'"]{3,}['"]|api_?key\s*=\s*['"][^'"]{10,}['"]/.test(content)) {
      issues.push({
        file: filePath,
        type: 'hardcoded_secrets',
        category: 'dataExposure',
        severity: 'high',
        message: '하드코딩된 비밀번호 또는 API 키',
        line: this.findLineNumber(content, /password\s*=\s*['"]|api_?key\s*=\s*['"]/)
      });
    }
    
    // HTTPS 미사용
    if (/http:\/\/(?!localhost|127\.0\.0\.1)/.test(content)) {
      issues.push({
        file: filePath,
        type: 'insecure_http',
        category: 'configuration',
        severity: 'medium',
        message: 'HTTPS 대신 HTTP 사용',
        line: this.findLineNumber(content, /http:\/\/(?!localhost|127\.0\.0\.1)/)
      });
    }
    
    return issues;
  }

  /**
   * 성능 이슈 감지
   */
  detectPerformanceIssues(content, filePath) {
    const issues = [];
    
    // 비효율적인 루프
    if (/for.*in.*{[\s\S]*for.*in/.test(content)) {
      issues.push({
        file: filePath,
        type: 'nested_loops',
        severity: 'medium',
        message: '중첩된 루프로 인한 성능 저하 가능성',
        line: this.findLineNumber(content, /for.*in.*{[\s\S]*for.*in/)
      });
    }
    
    // 대용량 동기 파일 읽기
    if (/readFileSync|writeFileSync/.test(content)) {
      issues.push({
        file: filePath,
        type: 'sync_file_operations',
        severity: 'medium',
        message: '동기 파일 작업으로 인한 블로킹',
        line: this.findLineNumber(content, /readFileSync|writeFileSync/)
      });
    }
    
    // 메모리 누수 가능성
    if (/setInterval(?!.*clearInterval)|addEventListener(?!.*removeEventListener)/.test(content)) {
      issues.push({
        file: filePath,
        type: 'memory_leak',
        severity: 'medium',
        message: '메모리 누수 가능성 (정리되지 않는 이벤트/타이머)',
        line: this.findLineNumber(content, /setInterval(?!.*clearInterval)|addEventListener(?!.*removeEventListener)/)
      });
    }
    
    return issues;
  }

  /**
   * AI 기반 종합 분석
   */
  async generateAIInsights(analysis) {
    try {
      const prompt = `다음 프로젝트 분석 결과를 바탕으로 종합적인 인사이트와 개선 방안을 제시해주세요:

프로젝트 구조:
- 총 파일 수: ${analysis.structure.totalFiles}
- 총 라인 수: ${analysis.structure.totalLines}
- 주요 파일 타입: ${Object.keys(analysis.structure.fileTypes).join(', ')}

코드 품질:
- 전체 점수: ${analysis.codeQuality.overallScore}/100
- 이슈 수: ${analysis.codeQuality.issues.length}

보안:
- 보안 점수: ${analysis.security.score}/100
- 보안 이슈: ${analysis.security.issues.length}개

성능:
- 성능 점수: ${analysis.performance.score}/100
- 번들 크기: ${Math.round(analysis.performance.metrics.bundleSize / 1024)}KB

주요 개선 사항과 우선순위를 제시해주세요.`;

      const insights = await this.codeGenerator.aiService.generateText(prompt);
      return insights;
    } catch (error) {
      return '현재 AI 인사이트를 생성할 수 없습니다. 분석 결과를 직접 검토해주세요.';
    }
  }

  /**
   * 개선 제안 생성
   */
  generateImprovementSuggestions(analysis) {
    const suggestions = [];
    
    // 코드 품질 개선
    if (analysis.codeQuality.overallScore < 70) {
      suggestions.push({
        category: 'code_quality',
        priority: 'high',
        title: '코드 품질 개선',
        description: '전체 코드 품질 점수가 낮습니다. 리팩토링을 고려하세요.',
        actions: [
          'ESLint/Prettier 설정 점검',
          '함수 길이 단축',
          '주석 추가',
          '에러 처리 강화'
        ]
      });
    }
    
    // 보안 개선
    if (analysis.security.score < 80) {
      suggestions.push({
        category: 'security',
        priority: 'high',
        title: '보안 강화',
        description: '보안 이슈가 발견되었습니다.',
        actions: [
          '하드코딩된 비밀번호 제거',
          'HTTPS 사용',
          '입력값 검증 강화',
          '보안 의존성 업데이트'
        ]
      });
    }
    
    // 성능 최적화
    if (analysis.performance.score < 80) {
      suggestions.push({
        category: 'performance',
        priority: 'medium',
        title: '성능 최적화',
        description: '성능 개선이 필요합니다.',
        actions: analysis.performance.optimizations
      });
    }
    
    // 의존성 관리
    if (analysis.dependencies.outdated.length > 0) {
      suggestions.push({
        category: 'dependencies',
        priority: 'medium',
        title: '의존성 업데이트',
        description: `${analysis.dependencies.outdated.length}개의 오래된 패키지가 있습니다.`,
        actions: [
          'npm update 실행',
          '주요 업데이트 확인',
          '취약점 패치'
        ]
      });
    }
    
    return suggestions;
  }

  /**
   * 성능 최적화 제안 생성
   */
  generatePerformanceOptimizations(issues) {
    const optimizations = [];
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'nested_loops':
          optimizations.push('중첩 루프를 Map/Set 자료구조로 최적화');
          break;
        case 'sync_file_operations':
          optimizations.push('동기 파일 작업을 비동기로 변경');
          break;
        case 'memory_leak':
          optimizations.push('이벤트 리스너와 타이머 정리 로직 추가');
          break;
      }
    });
    
    return [...new Set(optimizations)]; // 중복 제거
  }

  // 유틸리티 메서드들
  async getAllFiles(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        await this.getAllFiles(fullPath, files);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async getCodeFiles(projectPath) {
    const allFiles = await this.getAllFiles(projectPath);
    return allFiles.filter(file => this.isCodeFile(path.extname(file)));
  }

  isCodeFile(ext) {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go'];
    return codeExtensions.includes(ext.toLowerCase());
  }

  shouldSkipDirectory(name) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.pytest_cache', 'venv'];
    return skipDirs.includes(name);
  }

  getLanguageFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go'
    };
    return langMap[ext] || 'text';
  }

  findLineNumber(content, pattern) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return 1;
  }

  calculateAverageComplexity(files) {
    if (files.length === 0) return 0;
    const total = files.reduce((sum, file) => sum + file.analysis.complexity.cyclomatic, 0);
    return Math.round(total / files.length);
  }

  calculateMaintainabilityIndex(files) {
    // 간단한 유지보수성 지수 계산
    if (files.length === 0) return 0;
    const avgScore = files.reduce((sum, file) => sum + file.analysis.quality.score, 0) / files.length;
    return Math.round(avgScore * 0.8); // 품질 점수의 80%를 유지보수성으로 계산
  }

  calculateReadabilityScore(files) {
    // 가독성 점수 계산 (주석 비율, 함수 길이 등 고려)
    if (files.length === 0) return 0;
    
    let totalScore = 0;
    files.forEach(file => {
      const commentFactor = file.analysis.quality.factors.comments || 0;
      const functionFactor = file.analysis.quality.factors.functionLength || 0;
      const namingFactor = file.analysis.quality.factors.naming || 0;
      
      const readabilityScore = (commentFactor + functionFactor + namingFactor) / 3;
      totalScore += readabilityScore;
    });
    
    return Math.round(totalScore / files.length);
  }
}

export default CodeAnalyzer;
