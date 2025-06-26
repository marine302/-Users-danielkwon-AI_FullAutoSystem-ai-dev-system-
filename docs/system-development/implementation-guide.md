# AI 자동 개발 시스템 구현 가이드 v1.0

## 🚀 Quick Start (15분 안에 시작하기)

### 필수 준비물
- Node.js 18+ 설치
- VSCode + GitHub Copilot
- OpenAI API Key
- Git

### 즉시 시작 명령어
```bash
# 1. 프로젝트 생성
mkdir ai-auto-dev-system && cd ai-auto-dev-system

# 2. 초기화
npm init -y
npm install openai anthropic gray-matter chokidar express ws dotenv

# 3. 기본 구조 생성
node setup.js  # 이 파일은 아래에서 제공

# 4. 첫 실행
npm start
```

## 📁 Phase 1: 프로젝트 구조 설정 (Day 1)

### 1.1 디렉토리 구조 생성

**setup.js - 자동 폴더 구조 생성 스크립트**
```javascript
const fs = require('fs-extra');
const path = require('path');

async function setupProjectStructure() {
  console.log('🏗️  AI 자동 개발 시스템 구조 생성 중...');
  
  // 폴더 구조 정의
  const folders = [
    // 통신 채널
    'communication/inbox/idea_collector',
    'communication/inbox/task_planner',
    'communication/inbox/task_distributor',
    'communication/inbox/developer',
    'communication/inbox/tester',
    'communication/inbox/reviewer',
    'communication/inbox/deployer',
    
    'communication/outbox/idea_collector',
    'communication/outbox/task_planner',
    'communication/outbox/task_distributor',
    'communication/outbox/developer',
    'communication/outbox/tester',
    'communication/outbox/reviewer',
    'communication/outbox/deployer',
    
    'communication/processing',
    'communication/completed',
    'communication/failed',
    
    // 공유 리소스
    'shared/templates',
    'shared/schemas',
    'shared/knowledge',
    
    // 작업 공간
    'workspace/current',
    'workspace/artifacts',
    
    // 모니터링
    'monitoring/logs',
    'monitoring/metrics',
    
    // 소스 코드
    'src/agents',
    'src/core',
    'src/utils',
    'src/web',
    
    // 설정
    'config',
    
    // 문서
    'docs'
  ];
  
  // 폴더 생성
  for (const folder of folders) {
    await fs.ensureDir(folder);
    console.log(`✅ 생성: ${folder}`);
  }
  
  // 기본 파일 생성
  await createBasicFiles();
  
  console.log('\n🎉 프로젝트 구조 생성 완료!');
}

async function createBasicFiles() {
  // .env 템플릿
  const envTemplate = `# AI API Keys
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# System Configuration
NODE_ENV=development
LOG_LEVEL=info
MONITORING_PORT=3000
WEBSOCKET_PORT=8080

# Agent Configuration
MAX_RETRIES=3
TIMEOUT_MINUTES=30
`;
  
  await fs.writeFile('.env.example', envTemplate);
  
  // .gitignore
  const gitignore = `node_modules/
.env
.DS_Store
*.log
communication/inbox/
communication/outbox/
communication/processing/
workspace/current/
monitoring/logs/
`;
  
  await fs.writeFile('.gitignore', gitignore);
  
  // README.md
  const readme = `# AI 자동 개발 시스템

## 🤖 개요
24시간 자동으로 소프트웨어를 개발하는 AI 에이전트 시스템

## 🚀 시작하기
\`\`\`bash
npm install
cp .env.example .env
# .env 파일에 API 키 입력
npm start
\`\`\`

## 📋 문서
- [통신 프로토콜](docs/protocol-v1.0.md)
- [에이전트 역할](docs/agent-roles-v1.0.md)
- [워크플로우](docs/workflow-v1.0.md)
`;
  
  await fs.writeFile('README.md', readme);
}

// 실행
setupProjectStructure().catch(console.error);
```

### 1.2 환경 설정

**.env 파일 설정**
```bash
# 실제 API 키로 교체 필요
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# 개발 환경 설정
NODE_ENV=development
LOG_LEVEL=debug

# 시스템 설정
MAX_CONCURRENT_AGENTS=5
TASK_TIMEOUT_MINUTES=30
RETRY_ATTEMPTS=3
```

### 1.3 패키지 설정

**package.json**
```json
{
  "name": "ai-auto-dev-system",
  "version": "1.0.0",
  "description": "AI 자동 개발 시스템",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "monitor": "node src/web/dashboard-server.js",
    "test": "jest",
    "setup": "node setup.js"
  },
  "dependencies": {
    "openai": "^4.0.0",
    "anthropic": "^0.6.0",
    "gray-matter": "^4.0.3",
    "chokidar": "^3.5.3",
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "dotenv": "^16.0.3",
    "winston": "^3.8.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "jest": "^29.3.1"
  }
}
```

## 🏗️ Phase 2: 핵심 시스템 구현 (Day 2-3)

### 2.1 문서 시스템 구현

**src/core/document-system.js**
```javascript
const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const { v4: uuidv4 } = require('uuid');

class DocumentSystem {
  constructor() {
    this.basePath = path.join(process.cwd(), 'communication');
  }

  /**
   * 문서 생성
   */
  async createDocument(type, from, to, content, metadata = {}) {
    const documentId = this.generateDocumentId(type);
    const timestamp = new Date().toISOString();
    
    const document = {
      // 필수 메타데이터
      document_id: documentId,
      document_type: type,
      version: "1.0",
      created_at: timestamp,
      created_by: from,
      from: from,
      to: to,
      priority: metadata.priority || "normal",
      status: "pending",
      
      // 추적 정보
      parent_id: metadata.parent_id || null,
      thread_id: metadata.thread_id || uuidv4(),
      sequence: metadata.sequence || 1,
      
      // 상태 정보
      processing_started_at: null,
      processing_completed_at: null,
      
      // 커스텀 메타데이터
      custom: metadata.custom || {}
    };
    
    // 문서 내용과 메타데이터 결합
    const fileContent = matter.stringify(content, document);
    
    // 파일명 생성
    const fileName = `${type}-${timestamp.replace(/[:.]/g, '-')}-${from}-${documentId}.md`;
    
    // 발신함에 저장
    const filePath = path.join(this.basePath, 'outbox', from, fileName);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, fileContent);
    
    console.log(`📄 문서 생성: ${fileName}`);
    
    return {
      id: documentId,
      path: filePath,
      document: document
    };
  }

  /**
   * 문서 읽기
   */
  async readDocument(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data: metadata, content: body } = matter(content);
      
      return {
        metadata,
        body,
        filePath
      };
    } catch (error) {
      console.error(`문서 읽기 실패: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 문서 이동 (inbox → processing → completed)
   */
  async moveDocument(filePath, destination) {
    const fileName = path.basename(filePath);
    const newPath = path.join(this.basePath, destination, fileName);
    
    await fs.ensureDir(path.dirname(newPath));
    await fs.move(filePath, newPath, { overwrite: true });
    
    console.log(`📦 문서 이동: ${fileName} → ${destination}`);
    
    return newPath;
  }

  /**
   * 문서 ID 생성
   */
  generateDocumentId(type) {
    const typePrefix = type.split('_').map(word => word[0].toUpperCase()).join('');
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `${typePrefix}-${timestamp}-${random}`;
  }

  /**
   * 문서 전송 (outbox → inbox)
   */
  async sendDocument(documentPath) {
    const doc = await this.readDocument(documentPath);
    const fileName = path.basename(documentPath);
    const destinationPath = path.join(this.basePath, 'inbox', doc.metadata.to, fileName);
    
    await fs.ensureDir(path.dirname(destinationPath));
    await fs.copy(documentPath, destinationPath);
    await fs.remove(documentPath); // 원본 삭제
    
    console.log(`📮 문서 전송: ${fileName} → ${doc.metadata.to}`);
    
    return destinationPath;
  }
}

module.exports = DocumentSystem;
```

### 2.2 기본 에이전트 클래스

**src/core/base-agent.js**
```javascript
const EventEmitter = require('events');
const DocumentSystem = require('./document-system');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');

class BaseAgent extends EventEmitter {
  constructor(config) {
    super();
    
    this.id = config.id;
    this.type = config.type;
    this.name = config.name;
    this.model = config.model || 'gpt-4';
    this.systemPrompt = config.systemPrompt;
    
    this.documentSystem = new DocumentSystem();
    this.inboxPath = path.join(process.cwd(), 'communication/inbox', this.id);
    this.outboxPath = path.join(process.cwd(), 'communication/outbox', this.id);
    this.processingPath = path.join(process.cwd(), 'communication/processing');
    
    this.isRunning = false;
    this.currentTask = null;
    
    this.setupFileWatcher();
  }

  /**
   * 파일 감시 설정
   */
  setupFileWatcher() {
    // inbox 폴더 감시
    this.watcher = chokidar.watch(this.inboxPath, {
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('add', async (filePath) => {
      if (filePath.endsWith('.md')) {
        console.log(`📥 ${this.name}: 새 문서 도착 - ${path.basename(filePath)}`);
        await this.processDocument(filePath);
      }
    });
  }

  /**
   * 에이전트 시작
   */
  async start() {
    this.isRunning = true;
    console.log(`🤖 ${this.name} 에이전트 시작됨`);
    
    // 기존 문서 처리
    await this.processExistingDocuments();
  }

  /**
   * 에이전트 중지
   */
  async stop() {
    this.isRunning = false;
    if (this.watcher) {
      await this.watcher.close();
    }
    console.log(`🛑 ${this.name} 에이전트 중지됨`);
  }

  /**
   * 기존 문서 처리
   */
  async processExistingDocuments() {
    try {
      const files = await fs.readdir(this.inboxPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of mdFiles) {
        const filePath = path.join(this.inboxPath, file);
        await this.processDocument(filePath);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`기존 문서 처리 실패:`, error);
      }
    }
  }

  /**
   * 문서 처리 (하위 클래스에서 구현)
   */
  async processDocument(filePath) {
    try {
      // processing 폴더로 이동
      const processingPath = await this.documentSystem.moveDocument(
        filePath, 
        `processing/${this.id}`
      );
      
      // 문서 읽기
      const doc = await this.documentSystem.readDocument(processingPath);
      
      // 상태 업데이트
      doc.metadata.status = 'processing';
      doc.metadata.processing_started_at = new Date().toISOString();
      
      // 실제 처리 (하위 클래스에서 구현)
      const result = await this.handleTask(doc);
      
      // 결과 문서 생성
      if (result) {
        await this.createResponseDocument(doc, result);
      }
      
      // completed 폴더로 이동
      await this.documentSystem.moveDocument(
        processingPath,
        `completed/${new Date().toISOString().split('T')[0]}`
      );
      
    } catch (error) {
      console.error(`${this.name} 문서 처리 실패:`, error);
      await this.handleError(filePath, error);
    }
  }

  /**
   * 작업 처리 (하위 클래스에서 오버라이드)
   */
  async handleTask(document) {
    throw new Error('handleTask must be implemented by subclass');
  }

  /**
   * 응답 문서 생성
   */
  async createResponseDocument(originalDoc, result) {
    return await this.documentSystem.createDocument(
      result.type,
      this.id,
      result.to,
      result.content,
      {
        parent_id: originalDoc.metadata.document_id,
        thread_id: originalDoc.metadata.thread_id,
        sequence: originalDoc.metadata.sequence + 1,
        priority: result.priority || originalDoc.metadata.priority,
        custom: result.metadata || {}
      }
    );
  }

  /**
   * 에러 처리
   */
  async handleError(filePath, error) {
    const errorReport = `# 에러 보고서

## 에러 정보
- 에이전트: ${this.name}
- 시간: ${new Date().toISOString()}
- 파일: ${path.basename(filePath)}

## 에러 내용
\`\`\`
${error.message}
${error.stack}
\`\`\`

## 조치 사항
자동 재시도 예정
`;

    await this.documentSystem.createDocument(
      'error_report',
      this.id,
      'error_handler',
      errorReport,
      {
        priority: 'high',
        custom: {
          error_code: 'E001',
          original_file: filePath
        }
      }
    );
    
    // failed 폴더로 이동
    try {
      await this.documentSystem.moveDocument(
        filePath,
        `failed/${new Date().toISOString().split('T')[0]}`
      );
    } catch (moveError) {
      console.error('Failed 폴더로 이동 실패:', moveError);
    }
  }
}

module.exports = BaseAgent;
```

## 🤖 Phase 3: AI 에이전트 구현 (Day 4-5)

### 3.1 아이디어 수집 AI

**src/agents/idea-collector.js**
```javascript
const BaseAgent = require('../core/base-agent');
const OpenAI = require('openai');

class IdeaCollectorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'idea_collector',
      type: 'strategic',
      name: '아이디어 수집 AI',
      model: 'gpt-4',
      systemPrompt: `당신은 혁신적인 소프트웨어 아이디어를 발굴하고 정제하는 전문가입니다.
      
주요 역할:
1. 아이디어를 명확하고 구체적으로 정리
2. 기술적 실현 가능성 평가 (0-100%)
3. 비즈니스 가치 분석
4. 필요한 핵심 기능 도출
5. 예상 개발 시간 추정

출력은 항상 구조화된 형식으로 제공하세요.`
    });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async handleTask(document) {
    console.log(`💡 아이디어 분석 중: ${document.metadata.document_id}`);
    
    // AI에게 아이디어 정제 요청
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: this.systemPrompt
        },
        {
          role: "user",
          content: `다음 아이디어를 분석하고 정제해주세요:\n\n${document.body}`
        }
      ],
      temperature: 0.7
    });

    const analysis = completion.choices[0].message.content;
    
    // 분석 결과 파싱
    const refinedIdea = this.parseAnalysis(analysis);
    
    // 정제된 아이디어 문서 내용
    const content = `# 정제된 아이디어: ${refinedIdea.title}

## 개요
${refinedIdea.overview}

## 핵심 기능
${refinedIdea.features.map(f => `- ${f}`).join('\n')}

## 기술적 요구사항
${refinedIdea.technicalRequirements.map(r => `- ${r}`).join('\n')}

## 평가 지표
- 기술적 실현 가능성: ${refinedIdea.feasibility}%
- 비즈니스 가치: ${refinedIdea.businessValue}/10
- 예상 개발 시간: ${refinedIdea.estimatedHours}시간
- 복잡도: ${refinedIdea.complexity}

## 다음 단계
작업 계획 수립 필요`;

    return {
      type: 'refined_idea',
      to: 'task_planner',
      content: content,
      priority: refinedIdea.feasibility >= 70 ? 'high' : 'normal',
      metadata: refinedIdea
    };
  }

  parseAnalysis(analysis) {
    // 실제로는 더 정교한 파싱 필요
    // 여기서는 간단한 예시
    return {
      title: "AI 자동 개발 시스템",
      overview: "아이디어 개요...",
      features: ["기능1", "기능2", "기능3"],
      technicalRequirements: ["Node.js", "AI API", "데이터베이스"],
      feasibility: 85,
      businessValue: 8,
      estimatedHours: 160,
      complexity: "medium"
    };
  }
}

module.exports = IdeaCollectorAgent;
```

### 3.2 작업 계획 AI

**src/agents/task-planner.js**
```javascript
const BaseAgent = require('../core/base-agent');
const OpenAI = require('openai');

class TaskPlannerAgent extends BaseAgent {
  constructor() {
    super({
      id: 'task_planner',
      type: 'planning',
      name: '작업 계획 AI',
      model: 'gpt-4',
      systemPrompt: `당신은 소프트웨어 프로젝트 관리 전문가입니다.
      
주요 역할:
1. 아이디어를 구체적인 작업으로 분해 (WBS)
2. 작업 간 의존성 분석
3. 우선순위 설정
4. 리소스 할당 계획
5. 일정 수립

모든 작업은 명확하고 측정 가능해야 합니다.`
    });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async handleTask(document) {
    console.log(`📋 작업 계획 수립 중: ${document.metadata.document_id}`);
    
    // AI에게 작업 계획 요청
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: this.systemPrompt
        },
        {
          role: "user",
          content: `다음 프로젝트의 상세 작업 계획을 수립해주세요:\n\n${document.body}`
        }
      ],
      temperature: 0.5
    });

    const planAnalysis = completion.choices[0].message.content;
    const workPlan = this.parsePlan(planAnalysis);
    
    // 작업 계획서 작성
    const content = `# 작업 계획서: ${workPlan.projectName}

## 프로젝트 개요
${workPlan.overview}

## 작업 분해 구조 (WBS)

${this.generateWBS(workPlan.tasks)}

## 작업 일정
\`\`\`mermaid
gantt
    title 프로젝트 일정
    dateFormat YYYY-MM-DD
    
${this.generateGanttChart(workPlan.tasks)}
\`\`\`

## 리소스 할당
${this.generateResourceTable(workPlan.tasks)}

## 우선순위 및 의존성
${this.generateDependencyInfo(workPlan.tasks)}

## 위험 요소
${workPlan.risks.map(r => `- ${r}`).join('\n')}

## 예상 완료 시간
총 ${workPlan.totalHours}시간 (${Math.ceil(workPlan.totalHours / 8)}일)`;

    return {
      type: 'task_plan',
      to: 'task_distributor',
      content: content,
      priority: 'high',
      metadata: {
        tasks: workPlan.tasks,
        totalHours: workPlan.totalHours,
        criticalPath: workPlan.criticalPath
      }
    };
  }

  parsePlan(analysis) {
    // 실제 구현에서는 더 정교한 파싱 필요
    return {
      projectName: "AI 자동 개발 시스템",
      overview: "프로젝트 개요...",
      tasks: [
        {
          id: "1",
          name: "백엔드 API 개발",
          duration: 40,
          dependencies: [],
          assignTo: "developer",
          priority: "high"
        },
        {
          id: "2",
          name: "프론트엔드 개발",
          duration: 32,
          dependencies: ["1"],
          assignTo: "developer",
          priority: "medium"
        }
      ],
      totalHours: 72,
      criticalPath: ["1", "2"],
      risks: ["API 통합 지연 가능성", "성능 최적화 필요"]
    };
  }

  generateWBS(tasks) {
    return tasks.map((task, index) => 
      `### ${index + 1}. ${task.name}\n- 예상 시간: ${task.duration}시간\n- 담당: ${task.assignTo}\n- 우선순위: ${task.priority}`
    ).join('\n\n');
  }

  generateGanttChart(tasks) {
    // Mermaid gantt 차트 생성 로직
    return tasks.map(task => 
      `    ${task.name} :${task.dependencies.length > 0 ? 'after ' + task.dependencies[0] : ''}, ${task.duration}h`
    ).join('\n');
  }

  generateResourceTable(tasks) {
    return `| 작업 | 담당자 | 예상 시간 | 우선순위 |
|------|--------|-----------|----------|
${tasks.map(t => `| ${t.name} | ${t.assignTo} | ${t.duration}h | ${t.priority} |`).join('\n')}`;
  }

  generateDependencyInfo(tasks) {
    return tasks
      .filter(t => t.dependencies.length > 0)
      .map(t => `- ${t.name} → 의존: ${t.dependencies.join(', ')}`)
      .join('\n');
  }
}

module.exports = TaskPlannerAgent;
```

### 3.3 개발자 AI

**src/agents/developer.js**
```javascript
const BaseAgent = require('../core/base-agent');
const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');

class DeveloperAgent extends BaseAgent {
  constructor() {
    super({
      id: 'developer',
      type: 'execution',
      name: '개발자 AI',
      model: 'gpt-4',
      systemPrompt: `당신은 경험 많은 풀스택 개발자입니다.
      
주요 역할:
1. 고품질의 production-ready 코드 작성
2. 모든 코드에 적절한 주석 추가
3. 에러 처리 및 예외 상황 고려
4. 단위 테스트 작성
5. 보안 best practices 준수

코드는 항상 깔끔하고, 유지보수가 쉬우며, 확장 가능해야 합니다.`
    });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async handleTask(document) {
    console.log(`💻 개발 작업 시작: ${document.metadata.document_id}`);
    
    const taskDetails = document.metadata.custom;
    
    // 코드 생성 요청
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: this.systemPrompt
        },
        {
          role: "user",
          content: `다음 작업을 구현하는 코드를 작성해주세요:\n\n${document.body}`
        }
      ],
      temperature: 0.3 // 낮은 temperature로 일관성 있는 코드 생성
    });

    const generatedCode = completion.choices[0].message.content;
    
    // 코드 파일 저장
    const codeFiles = await this.saveGeneratedCode(generatedCode, taskDetails);
    
    // 테스트 코드 생성
    const testCode = await this.generateTests(generatedCode);
    const testFiles = await this.saveTestCode(testCode, taskDetails);
    
    // 결과 보고서 작성
    const content = `# 개발 완료 보고서

## 작업 정보
- 작업 ID: ${document.metadata.document_id}
- 완료 시간: ${new Date().toISOString()}

## 생성된 파일
### 소스 코드
${codeFiles.map(f => `- ${f.name}: ${f.lines} 라인`).join('\n')}

### 테스트 코드
${testFiles.map(f => `- ${f.name}: ${f.lines} 라인`).join('\n')}

## 코드 통계
- 총 라인 수: ${codeFiles.reduce((sum, f) => sum + f.lines, 0)}
- 테스트 커버리지 목표: 80%
- 복잡도: 중간

## 주요 구현 사항
${this.extractImplementationDetails(generatedCode)}

## 다음 단계
- 코드 리뷰 필요
- 통합 테스트 실행
- 보안 검사`;

    return {
      type: 'task_result',
      to: 'code_reviewer',
      content: content,
      priority: 'normal',
      metadata: {
        codeFiles: codeFiles,
        testFiles: testFiles,
        language: 'javascript'
      }
    };
  }

  async saveGeneratedCode(code, taskDetails) {
    const outputDir = path.join(process.cwd(), 'workspace/current');
    await fs.ensureDir(outputDir);
    
    // 실제로는 코드를 파싱해서 여러 파일로 분리해야 함
    const fileName = `generated-${Date.now()}.js`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, code);
    
    return [{
      name: fileName,
      path: filePath,
      lines: code.split('\n').length
    }];
  }

  async generateTests(code) {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "당신은 테스트 전문가입니다. 주어진 코드에 대한 comprehensive한 단위 테스트를 작성하세요."
        },
        {
          role: "user",
          content: `다음 코드에 대한 테스트를 작성해주세요:\n\n${code}`
        }
      ],
      temperature: 0.3
    });

    return completion.choices[0].message.content;
  }

  async saveTestCode(testCode, taskDetails) {
    const outputDir = path.join(process.cwd(), 'workspace/current/tests');
    await fs.ensureDir(outputDir);
    
    const fileName = `test-${Date.now()}.test.js`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, testCode);
    
    return [{
      name: fileName,
      path: filePath,
      lines: testCode.split('\n').length
    }];
  }

  extractImplementationDetails(code) {
    // 실제로는 코드를 분석해서 주요 구현 사항 추출
    return `- RESTful API 엔드포인트 구현
- 데이터 검증 로직 추가
- 에러 핸들링 구현
- 비동기 처리 최적화`;
  }
}

module.exports = DeveloperAgent;
```

## 📊 Phase 4: 모니터링 시스템 구축 (Day 6)

### 4.1 실시간 대시보드 서버

**src/web/dashboard-server.js**
```javascript
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const chokidar = require('chokidar');
const fs = require('fs-extra');

class DashboardServer {
  constructor(port = 3000, wsPort = 8080) {
    this.app = express();
    this.port = port;
    this.wsPort = wsPort;
    
    this.agents = new Map();
    this.tasks = new Map();
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0
    };
    
    this.setupExpress();
    this.setupWebSocket();
    this.setupFileWatching();
  }

  setupExpress() {
    // 정적 파일 제공
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // API 엔드포인트
    this.app.get('/api/status', (req, res) => {
      res.json({
        agents: Array.from(this.agents.values()),
        tasks: Array.from(this.tasks.values()).slice(-20), // 최근 20개
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });
    });
    
    this.app.get('/api/agents/:id/logs', async (req, res) => {
      const logs = await this.getAgentLogs(req.params.id);
      res.json(logs);
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ port: this.wsPort });
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 대시보드 클라이언트 연결됨');
      
      // 초기 상태 전송
      ws.send(JSON.stringify({
        type: 'initial',
        data: {
          agents: Array.from(this.agents.values()),
          tasks: Array.from(this.tasks.values()).slice(-20),
          metrics: this.metrics
        }
      }));
      
      ws.on('close', () => {
        console.log('🔌 대시보드 클라이언트 연결 해제');
      });
    });
  }

  setupFileWatching() {
    const communicationPath = path.join(process.cwd(), 'communication');
    
    // 모든 하위 폴더 감시
    this.watcher = chokidar.watch(communicationPath, {
      persistent: true,
      ignoreInitial: false
    });
    
    this.watcher
      .on('add', (filePath) => this.handleFileEvent('added', filePath))
      .on('change', (filePath) => this.handleFileEvent('changed', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('removed', filePath));
  }

  async handleFileEvent(event, filePath) {
    if (!filePath.endsWith('.md')) return;
    
    const relativePath = path.relative(process.cwd(), filePath);
    const parts = relativePath.split(path.sep);
    
    // 이벤트 타입에 따른 처리
    if (parts[1] === 'inbox' && event === 'added') {
      await this.handleNewTask(filePath);
    } else if (parts[1] === 'processing') {
      await this.handleProcessingTask(filePath);
    } else if (parts[1] === 'completed') {
      await this.handleCompletedTask(filePath);
    } else if (parts[1] === 'failed') {
      await this.handleFailedTask(filePath);
    }
    
    // WebSocket으로 업데이트 브로드캐스트
    this.broadcast({
      type: 'file_event',
      event: event,
      path: relativePath,
      timestamp: new Date().toISOString()
    });
  }

  async handleNewTask(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const matter = require('gray-matter');
      const { data: metadata } = matter(content);
      
      const task = {
        id: metadata.document_id,
        type: metadata.document_type,
        from: metadata.from,
        to: metadata.to,
        priority: metadata.priority,
        status: 'pending',
        createdAt: metadata.created_at,
        filePath: filePath
      };
      
      this.tasks.set(task.id, task);
      this.metrics.totalTasks++;
      
      // 에이전트 상태 업데이트
      if (this.agents.has(metadata.to)) {
        const agent = this.agents.get(metadata.to);
        agent.pendingTasks++;
        agent.status = 'busy';
      }
      
      this.updateMetrics();
    } catch (error) {
      console.error('새 작업 처리 실패:', error);
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  updateMetrics() {
    // 평균 처리 시간 계산 등
    this.broadcast({
      type: 'metrics_update',
      metrics: this.metrics
    });
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`📊 대시보드 서버: http://localhost:${this.port}`);
      console.log(`🔌 WebSocket 서버: ws://localhost:${this.wsPort}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
    if (this.wss) {
      this.wss.close();
    }
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

module.exports = DashboardServer;
```

### 4.2 대시보드 웹 인터페이스

**src/web/public/index.html**
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 자동 개발 시스템 대시보드</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 0;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .status-bar {
            display: flex;
            justify-content: center;
            gap: 30px;
            font-size: 0.9em;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4ade80;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .panel {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 10px;
            padding: 20px;
            overflow: hidden;
        }
        
        .panel h2 {
            font-size: 1.4em;
            margin-bottom: 15px;
            color: #667eea;
        }
        
        .agents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .agent-card {
            background: #2a2a2a;
            border: 2px solid #444;
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
        }
        
        .agent-card.active {
            border-color: #4ade80;
            background: #1e3a1e;
        }
        
        .agent-card.busy {
            border-color: #fbbf24;
            background: #3a2e1a;
            animation: busy-pulse 1s infinite;
        }
        
        @keyframes busy-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
        
        .agent-card.error {
            border-color: #ef4444;
            background: #3a1e1e;
        }
        
        .agent-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .agent-stats {
            font-size: 0.85em;
            color: #999;
        }
        
        .tasks-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .task-item {
            background: #2a2a2a;
            border-left: 3px solid #667eea;
            padding: 10px 15px;
            margin-bottom: 10px;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .task-item.completed {
            border-color: #4ade80;
            opacity: 0.7;
        }
        
        .task-item.failed {
            border-color: #ef4444;
        }
        
        .task-info {
            flex: 1;
        }
        
        .task-id {
            font-size: 0.85em;
            color: #999;
        }
        
        .task-route {
            font-size: 0.9em;
            color: #ccc;
        }
        
        .priority-badge {
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .priority-urgent {
            background: #ef4444;
            color: white;
        }
        
        .priority-high {
            background: #f59e0b;
            color: white;
        }
        
        .priority-normal {
            background: #3b82f6;
            color: white;
        }
        
        .priority-low {
            background: #6b7280;
            color: white;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }
        
        .metric-card {
            background: #2a2a2a;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .metric-label {
            font-size: 0.9em;
            color: #999;
            margin-top: 5px;
        }
        
        .logs-container {
            background: #0f0f0f;
            border: 1px solid #333;
            border-radius: 5px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .log-entry {
            margin-bottom: 5px;
            padding: 3px 0;
        }
        
        .log-timestamp {
            color: #666;
        }
        
        .log-level-info {
            color: #3b82f6;
        }
        
        .log-level-warn {
            color: #fbbf24;
        }
        
        .log-level-error {
            color: #ef4444;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 AI 자동 개발 시스템</h1>
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-indicator"></div>
                    <span>시스템 정상 작동 중</span>
                </div>
                <div class="status-item">
                    <span id="current-time"></span>
                </div>
            </div>
        </header>

        <div class="grid">
            <div class="panel">
                <h2>📊 시스템 메트릭</h2>
                <div class="metrics-grid" id="metrics">
                    <div class="metric-card">
                        <div class="metric-value" id="total-tasks">0</div>
                        <div class="metric-label">총 작업</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="completed-tasks">0</div>
                        <div class="metric-label">완료</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="failed-tasks">0</div>
                        <div class="metric-label">실패</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="success-rate">0%</div>
                        <div class="metric-label">성공률</div>
                    </div>
                </div>
            </div>

            <div class="panel">
                <h2>🤖 AI 에이전트 상태</h2>
                <div class="agents-grid" id="agents">
                    <!-- 동적으로 생성됨 -->
                </div>
            </div>
        </div>

        <div class="panel">
            <h2>📋 최근 작업</h2>
            <div class="tasks-list" id="tasks">
                <!-- 동적으로 생성됨 -->
            </div>
        </div>

        <div class="panel">
            <h2>📜 실시간 로그</h2>
            <div class="logs-container" id="logs">
                <!-- 동적으로 생성됨 -->
            </div>
        </div>
    </div>

    <script>
        // WebSocket 연결
        const ws = new WebSocket('ws://localhost:8080');
        
        // 상태 저장
        let agents = new Map();
        let tasks = [];
        let metrics = {};
        
        // WebSocket 이벤트 핸들러
        ws.onopen = () => {
            addLog('info', '시스템 연결됨');
        };
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleMessage(message);
        };
        
        ws.onclose = () => {
            addLog('error', '시스템 연결 끊김');
        };
        
        ws.onerror = (error) => {
            addLog('error', `WebSocket 오류: ${error}`);
        };
        
        function handleMessage(message) {
            switch (message.type) {
                case 'initial':
                    initializeDashboard(message.data);
                    break;
                case 'file_event':
                    handleFileEvent(message);
                    break;
                case 'metrics_update':
                    updateMetrics(message.metrics);
                    break;
                case 'agent_update':
                    updateAgent(message.agent);
                    break;
                case 'task_update':
                    updateTask(message.task);
                    break;
            }
        }
        
        function initializeDashboard(data) {
            // 에이전트 초기화
            if (data.agents) {
                data.agents.forEach(agent => {
                    agents.set(agent.id, agent);
                });
                renderAgents();
            }
            
            // 작업 초기화
            if (data.tasks) {
                tasks = data.tasks;
                renderTasks();
            }
            
            // 메트릭 초기화
            if (data.metrics) {
                metrics = data.metrics;
                updateMetrics(metrics);
            }
        }
        
        function renderAgents() {
            const container = document.getElementById('agents');
            container.innerHTML = '';
            
            // 기본 에이전트 목록
            const defaultAgents = [
                { id: 'idea_collector', name: '아이디어 수집 AI', status: 'idle' },
                { id: 'task_planner', name: '작업 계획 AI', status: 'idle' },
                { id: 'task_distributor', name: '작업 분배 AI', status: 'idle' },
                { id: 'developer', name: '개발자 AI', status: 'idle' },
                { id: 'tester', name: '테스터 AI', status: 'idle' },
                { id: 'reviewer', name: '리뷰어 AI', status: 'idle' },
                { id: 'deployer', name: '배포 AI', status: 'idle' }
            ];
            
            defaultAgents.forEach(defaultAgent => {
                const agent = agents.get(defaultAgent.id) || defaultAgent;
                const card = document.createElement('div');
                card.className = `agent-card ${agent.status}`;
                card.innerHTML = `
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-stats">
                        상태: ${getStatusText(agent.status)}<br>
                        대기 작업: ${agent.pendingTasks || 0}
                    </div>
                `;
                container.appendChild(card);
            });
        }
        
        function renderTasks() {
            const container = document.getElementById('tasks');
            container.innerHTML = '';
            
            tasks.slice(-20).reverse().forEach(task => {
                const item = document.createElement('div');
                item.className = `task-item ${task.status}`;
                item.innerHTML = `
                    <div class="task-info">
                        <div class="task-id">${task.id}</div>
                        <div class="task-route">${task.from} → ${task.to}</div>
                    </div>
                    <div class="priority-badge priority-${task.priority}">${task.priority}</div>
                `;
                container.appendChild(item);
            });
        }
        
        function updateMetrics(newMetrics) {
            metrics = newMetrics;
            
            document.getElementById('total-tasks').textContent = metrics.totalTasks || 0;
            document.getElementById('completed-tasks').textContent = metrics.completedTasks || 0;
            document.getElementById('failed-tasks').textContent = metrics.failedTasks || 0;
            
            const successRate = metrics.totalTasks > 0 
                ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
                : 0;
            document.getElementById('success-rate').textContent = `${successRate}%`;
        }
        
        function handleFileEvent(event) {
            addLog('info', `파일 이벤트: ${event.event} - ${event.path}`);
        }
        
        function addLog(level, message) {
            const logsContainer = document.getElementById('logs');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            
            const timestamp = new Date().toLocaleTimeString();
            entry.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-level-${level}">[${level.toUpperCase()}]</span>
                ${message}
            `;
            
            logsContainer.appendChild(entry);
            logsContainer.scrollTop = logsContainer.scrollHeight;
            
            // 로그가 너무 많으면 오래된 것 제거
            if (logsContainer.children.length > 100) {
                logsContainer.removeChild(logsContainer.firstChild);
            }
        }
        
        function getStatusText(status) {
            const statusMap = {
                'idle': '대기중',
                'busy': '작업중',
                'active': '활성',
                'error': '오류'
            };
            return statusMap[status] || status;
        }
        
        // 시간 업데이트
        function updateTime() {
            const now = new Date();
            document.getElementById('current-time').textContent = 
                now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        }
        
        setInterval(updateTime, 1000);
        updateTime();
        
        // 초기 로그
        addLog('info', 'AI 자동 개발 시스템 대시보드 시작');
    </script>
</body>
</html>
```

## 🚀 Phase 5: 시스템 통합 및 실행 (Day 7)

### 5.1 메인 실행 파일

**src/index.js**
```javascript
require('dotenv').config();
const path = require('path');

// 코어 모듈
const DocumentSystem = require('./core/document-system');
const DashboardServer = require('./web/dashboard-server');

// 에이전트
const IdeaCollectorAgent = require('./agents/idea-collector');
const TaskPlannerAgent = require('./agents/task-planner');
const DeveloperAgent = require('./agents/developer');

// 로깅
const winston = require('winston');

// 로거 설정
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'monitoring/logs/system.log' })
  ]
});

class AIAutoDevelopmentSystem {
  constructor() {
    this.agents = [];
    this.dashboard = null;
    this.isRunning = false;
  }

  async initialize() {
    logger.info('🚀 AI 자동 개발 시스템 초기화 중...');
    
    try {
      // 1. 대시보드 서버 시작
      this.dashboard = new DashboardServer();
      this.dashboard.start();
      
      // 2. 에이전트 초기화
      await this.initializeAgents();
      
      // 3. 문서 전송 시스템 초기화
      await this.initializeDocumentRouter();
      
      logger.info('✅ 시스템 초기화 완료!');
      
    } catch (error) {
      logger.error('시스템 초기화 실패:', error);
      throw error;
    }
  }

  async initializeAgents() {
    logger.info('🤖 AI 에이전트 초기화 중...');
    
    // 에이전트 인스턴스 생성
    const agents = [
      new IdeaCollectorAgent(),
      new TaskPlannerAgent(),
      new DeveloperAgent()
      // 필요한 다른 에이전트들 추가
    ];
    
    // 모든 에이전트 시작
    for (const agent of agents) {
      await agent.start();
      this.agents.push(agent);
      logger.info(`✅ ${agent.name} 시작됨`);
    }
  }

  async initializeDocumentRouter() {
    const documentSystem = new DocumentSystem();
    const chokidar = require('chokidar');
    
    // outbox 폴더 감시하여 자동으로 문서 전송
    const outboxPath = path.join(process.cwd(), 'communication/outbox');
    
    const watcher = chokidar.watch(outboxPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 2
    });
    
    watcher.on('add', async (filePath) => {
      if (filePath.endsWith('.md')) {
        logger.info(`📮 문서 라우팅: ${path.basename(filePath)}`);
        
        try {
          await documentSystem.sendDocument(filePath);
        } catch (error) {
          logger.error('문서 전송 실패:', error);
        }
      }
    });
    
    this.documentRouter = watcher;
  }

  async start() {
    this.isRunning = true;
    logger.info('🎯 AI 자동 개발 시스템 가동!');
    
    // 시스템 상태 주기적 체크
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // 1분마다
    
    // 초기 테스트 아이디어 생성 (옵션)
    if (process.env.NODE_ENV === 'development') {
      await this.createTestIdea();
    }
  }

  async createTestIdea() {
    const documentSystem = new DocumentSystem();
    
    const testIdea = `USDT 가격을 실시간으로 모니터링하고, 
여러 거래소 간 가격 차이가 0.5% 이상 발생하면 자동으로 알림을 보내는 시스템을 만들어주세요.

주요 기능:
- Binance, Coinbase, Kraken 거래소 지원
- 1초 간격 실시간 모니터링
- 웹 대시보드로 가격 차트 표시
- 이메일/텔레그램 알림 기능`;

    await documentSystem.createDocument(
      'idea_submission',
      'human_user',
      'idea_collector',
      testIdea,
      {
        priority: 'high',
        custom: {
          category: 'trading',
          estimated_value: 'high'
        }
      }
    );
    
    logger.info('🧪 테스트 아이디어 생성됨');
  }

  performHealthCheck() {
    const activeAgents = this.agents.filter(a => a.isRunning).length;
    const totalAgents = this.agents.length;
    
    logger.info(`💓 시스템 상태: ${activeAgents}/${totalAgents} 에이전트 활성`);
    
    // 비정상 에이전트 재시작
    this.agents.forEach(async (agent) => {
      if (!agent.isRunning) {
        logger.warn(`⚠️ ${agent.name} 비활성 상태 - 재시작 시도`);
        try {
          await agent.start();
        } catch (error) {
          logger.error(`${agent.name} 재시작 실패:`, error);
        }
      }
    });
  }

  async stop() {
    logger.info('🛑 시스템 종료 중...');
    
    this.isRunning = false;
    
    // 헬스체크 중지
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // 모든 에이전트 중지
    for (const agent of this.agents) {
      await agent.stop();
    }
    
    // 문서 라우터 중지
    if (this.documentRouter) {
      await this.documentRouter.close();
    }
    
    // 대시보드 중지
    if (this.dashboard) {
      this.dashboard.stop();
    }
    
    logger.info('✅ 시스템 종료 완료');
  }
}

// 메인 실행
async function main() {
  const system = new AIAutoDevelopmentSystem();
  
  try {
    await system.initialize();
    await system.start();
    
    console.log('\n' + '='.repeat(60));
    console.log('🤖 AI 자동 개발 시스템이 성공적으로 시작되었습니다!');
    console.log('📊 대시보드: http://localhost:3000');
    console.log('💡 Ctrl+C를 눌러 종료할 수 있습니다.');
    console.log('='.repeat(60) + '\n');
    
    // 종료 시그널 처리
    process.on('SIGINT', async () => {
      console.log('\n종료 신호 감지...');
      await system.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await system.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('시스템 시작 실패:', error);
    process.exit(1);
  }
}

// 직접 실행시에만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = AIAutoDevelopmentSystem;
```

## 📚 Phase 6: 문서 템플릿 생성 (보너스)

### 6.1 표준 문서 템플릿들

**shared/templates/ 폴더에 생성**

각 문서 타입별 템플릿을 미리 만들어두면 에이전트들이 일관된 형식으로 문서를 작성할 수 있습니다.

**shared/templates/task_request.md**
```markdown
---
document_id: ""
document_type: "task_request"
version: "1.0"
created_at: ""
created_by: ""
from: ""
to: "task_planner"
priority: "normal"
parent_id: null
thread_id: ""
sequence: 1
status: "pending"
processing_started_at: null
processing_completed_at: null
custom:
  task_type: "feature"
  estimated_hours: 0
  required_skills: []
  dependencies: []
---

# 작업 요청: [작업명]

## 목적
[작업의 목적과 배경을 설명하세요]

## 요구사항
- [구체적인 요구사항 1]
- [구체적인 요구사항 2]
- [구체적인 요구사항 3]

## 제약사항
- [기술적 제약]
- [비즈니스 제약]
- [시간적 제약]

## 예상 결과물
- [결과물 1]
- [결과물 2]

## 참고 자료
- [관련 문서나 링크]
```

## 🎯 실행 가이드

### 즉시 시작하기

1. **환경 설정**
   ```bash
   cp .env.example .env
   # .env 파일을 열어서 실제 API 키 입력
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **시스템 시작**
   ```bash
   npm start
   ```

4. **대시보드 확인**
   - 브라우저에서 http://localhost:3000 접속
   - 실시간으로 AI 에이전트들의 작업 확인

### 문제 해결

**API 키 오류**
- .env 파일의 API 키가 올바른지 확인
- OpenAI/Anthropic 계정의 사용량 한도 확인

**파일 권한 오류**
- 프로젝트 폴더의 쓰기 권한 확인
- Windows의 경우 관리자 권한으로 실행

**포트 충돌**
- 3000, 8080 포트가 사용 중인지 확인
- .env에서 다른 포트로 변경 가능

## 🚀 다음 단계

이제 기본적인 AI 자동 개발 시스템이 구축되었습니다! 

다음으로 할 수 있는 것들:
1. 더 많은 AI 에이전트 추가 (테스터, 리뷰어, 배포자 등)
2. 고급 워크플로우 구현 (병렬 처리, 조건부 분기 등)
3. 외부 서비스 통합 (GitHub, Slack, Jira 등)
4. 성능 최적화 및 확장
5. 보안 강화

시스템이 작동하기 시작하면, AI들이 서로 문서를 주고받으며 자동으로 개발을 진행하는 것을 볼 수 있을 것입니다! 🎉

---

*이 가이드는 AI 자동 개발 시스템의 실제 구현을 위한 step-by-step 안내서입니다.*

*최종 수정: 2024-01-26*