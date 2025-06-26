/**
 * 프로젝트 스캐폴딩 자동화 시스템
 */
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import AutomationService from '../automation/AutomationService.js';

export default class ProjectScaffolder {
  constructor() {
    this.automationService = new AutomationService();
    this.templates = new Map();
    this.loadProjectTemplates();
  }

  async loadProjectTemplates() {
    const templates = {
      'react-app': {
        name: 'React Application',
        description: '모던 React 앱 (Vite + TypeScript)',
        dependencies: [
          'react', 'react-dom', 'vite', '@vitejs/plugin-react',
          'typescript', '@types/react', '@types/react-dom'
        ],
        devDependencies: [
          'eslint', 'prettier', '@typescript-eslint/parser',
          '@typescript-eslint/eslint-plugin', 'tailwindcss'
        ],
        structure: {
          'src/': {
            'components/': {},
            'pages/': {},
            'hooks/': {},
            'utils/': {},
            'types/': {},
            'App.tsx': 'react-app-component',
            'main.tsx': 'react-main',
            'index.css': 'tailwind-base'
          },
          'public/': {
            'index.html': 'react-html'
          },
          'package.json': 'react-package',
          'vite.config.ts': 'vite-config',
          'tsconfig.json': 'typescript-config',
          'tailwind.config.js': 'tailwind-config',
          'postcss.config.js': 'postcss-config'
        }
      },
      'node-api': {
        name: 'Node.js API Server',
        description: 'Express + TypeScript API 서버',
        dependencies: [
          'express', 'cors', 'helmet', 'dotenv', 'mongoose',
          'joi', 'bcryptjs', 'jsonwebtoken'
        ],
        devDependencies: [
          'typescript', '@types/node', '@types/express',
          'ts-node', 'nodemon', 'jest', '@types/jest'
        ],
        structure: {
          'src/': {
            'controllers/': {},
            'models/': {},
            'routes/': {},
            'middleware/': {},
            'services/': {},
            'utils/': {},
            'types/': {},
            'index.ts': 'node-server',
            'app.ts': 'express-app'
          },
          'tests/': {},
          'package.json': 'node-package',
          'tsconfig.json': 'typescript-node-config',
          'jest.config.js': 'jest-config',
          '.env.example': 'env-example'
        }
      },
      'python-ml': {
        name: 'Python Machine Learning',
        description: 'Python ML 프로젝트 (Jupyter + FastAPI)',
        dependencies: [
          'fastapi', 'uvicorn', 'pydantic', 'scikit-learn',
          'pandas', 'numpy', 'matplotlib', 'seaborn',
          'jupyter', 'notebook'
        ],
        devDependencies: [
          'pytest', 'black', 'flake8', 'mypy'
        ],
        structure: {
          'src/': {
            'models/': {},
            'data/': {},
            'utils/': {},
            'api/': {},
            'main.py': 'fastapi-main'
          },
          'notebooks/': {
            'exploration.ipynb': 'jupyter-notebook'
          },
          'tests/': {},
          'requirements.txt': 'python-requirements',
          'pyproject.toml': 'python-config',
          '.env.example': 'env-example'
        }
      },
      'vscode-extension': {
        name: 'VS Code Extension',
        description: 'VS Code 확장 프로그램',
        dependencies: [],
        devDependencies: [
          'vscode', '@types/vscode', 'typescript',
          'eslint', '@typescript-eslint/parser',
          '@typescript-eslint/eslint-plugin'
        ],
        structure: {
          'src/': {
            'extension.ts': 'vscode-extension-main',
            'commands/': {},
            'providers/': {},
            'utils/': {}
          },
          'package.json': 'vscode-extension-package',
          'tsconfig.json': 'typescript-config',
          'README.md': 'vscode-extension-readme',
          'CHANGELOG.md': 'changelog',
          '.vscodeignore': 'vscodeignore'
        }
      }
    };
    
    Object.entries(templates).forEach(([key, template]) => {
      this.templates.set(key, template);
    });
  }

  /**
   * 새 프로젝트 생성
   */
  async createProject(templateType, projectName, options = {}) {
    try {
      const template = this.templates.get(templateType);
      if (!template) {
        throw new Error(`템플릿을 찾을 수 없습니다: ${templateType}`);
      }

      const projectPath = path.join(process.cwd(), 'generated-projects', projectName);
      
      console.log(`🚀 ${template.name} 프로젝트 생성 중: ${projectName}`);
      
      // 1. 프로젝트 디렉토리 생성
      await fs.mkdir(projectPath, { recursive: true });
      
      // 2. 파일 구조 생성
      await this.createFileStructure(projectPath, template.structure, options);
      
      // 3. 의존성 설치
      if (templateType.includes('node') || templateType === 'react-app' || templateType === 'vscode-extension') {
        await this.installNodeDependencies(projectPath, template);
      } else if (templateType.includes('python')) {
        await this.installPythonDependencies(projectPath, template);
      }
      
      // 4. Git 초기화
      if (options.initGit !== false) {
        await this.initializeGit(projectPath);
      }
      
      // 5. VS Code 설정 생성
      await this.createVSCodeConfig(projectPath, templateType);
      
      console.log(`✅ 프로젝트 생성 완료: ${projectPath}`);
      
      return {
        success: true,
        projectPath,
        template: template.name,
        nextSteps: this.getNextSteps(templateType, projectName)
      };
      
    } catch (error) {
      console.error(`❌ 프로젝트 생성 실패:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 파일 구조 생성
   */
  async createFileStructure(basePath, structure, options, currentPath = '') {
    for (const [name, content] of Object.entries(structure)) {
      const fullPath = path.join(basePath, currentPath, name);
      
      if (name.endsWith('/')) {
        // 디렉토리 생성
        await fs.mkdir(fullPath, { recursive: true });
        if (typeof content === 'object') {
          await this.createFileStructure(basePath, content, options, path.join(currentPath, name));
        }
      } else {
        // 파일 생성
        const fileContent = await this.generateFileContent(content, name, options);
        await fs.writeFile(fullPath, fileContent, 'utf-8');
      }
    }
  }

  /**
   * 파일 내용 생성
   */
  async generateFileContent(templateName, fileName, options) {
    const templates = {
      'react-app-component': `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome to ${options.projectName || 'Your React App'}
        </h1>
        <p className="text-gray-600">
          Start editing src/App.tsx to see changes!
        </p>
      </div>
    </div>
  );
}

export default App;`,

      'react-main': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

      'react-html': `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${options.projectName || 'React App'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

      'node-server': `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(helmet());
app.use(cors());
app.use(express.json());

// 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ${options.projectName || 'API Server'}',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});`,

      'fastapi-main': `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="${options.projectName || 'ML API'}",
    description="Machine Learning API Server",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Welcome to ${options.projectName || 'ML API'}",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "OK"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)`,

      'vscode-extension-main': `import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "${options.projectName || 'my-extension'}" is now active!');

    const disposable = vscode.commands.registerCommand('${options.projectName || 'my-extension'}.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from ${options.projectName || 'My Extension'}!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}`,

      'package.json': this.generatePackageJson(options),
      'requirements.txt': this.generateRequirementsTxt(),
      'vite.config.ts': this.generateViteConfig(),
      'tsconfig.json': this.generateTSConfig(),
      'tailwind.config.js': this.generateTailwindConfig(),
      'env-example': this.generateEnvExample()
    };

    return templates[templateName] || `# ${fileName}\n\n자동 생성된 파일입니다.`;
  }

  /**
   * package.json 생성
   */
  generatePackageJson(options) {
    return JSON.stringify({
      "name": options.projectName || "generated-project",
      "version": "1.0.0",
      "description": options.description || "자동 생성된 프로젝트",
      "main": "index.js",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "start": "node src/index.js",
        "test": "jest",
        "lint": "eslint src",
        "format": "prettier --write src"
      },
      "keywords": ["automated", "generated"],
      "author": options.author || "AI Dev System",
      "license": "MIT"
    }, null, 2);
  }

  /**
   * requirements.txt 생성
   */
  generateRequirementsTxt() {
    return `fastapi>=0.104.1
uvicorn>=0.24.0
pydantic>=2.5.0
scikit-learn>=1.3.0
pandas>=2.1.0
numpy>=1.24.0
matplotlib>=3.7.0
seaborn>=0.12.0
jupyter>=1.0.0
pytest>=7.4.0
black>=23.0.0
flake8>=6.0.0`;
  }

  /**
   * Node.js 의존성 설치
   */
  async installNodeDependencies(projectPath, template) {
    try {
      console.log('📦 npm 의존성 설치 중...');
      
      process.chdir(projectPath);
      
      if (template.dependencies.length > 0) {
        execSync(`npm install ${template.dependencies.join(' ')}`, { stdio: 'inherit' });
      }
      
      if (template.devDependencies.length > 0) {
        execSync(`npm install -D ${template.devDependencies.join(' ')}`, { stdio: 'inherit' });
      }
      
      console.log('✅ npm 의존성 설치 완료');
    } catch (error) {
      console.error('❌ npm 의존성 설치 실패:', error.message);
    }
  }

  /**
   * Python 의존성 설치
   */
  async installPythonDependencies(projectPath, template) {
    try {
      console.log('📦 Python 의존성 설치 중...');
      
      process.chdir(projectPath);
      
      // 가상환경 생성
      execSync('python -m venv venv', { stdio: 'inherit' });
      
      // 의존성 설치 (requirements.txt 기반)
      execSync('source venv/bin/activate && pip install -r requirements.txt', { 
        stdio: 'inherit',
        shell: '/bin/bash'
      });
      
      console.log('✅ Python 의존성 설치 완료');
    } catch (error) {
      console.error('❌ Python 의존성 설치 실패:', error.message);
    }
  }

  /**
   * Git 초기화
   */
  async initializeGit(projectPath) {
    try {
      process.chdir(projectPath);
      execSync('git init', { stdio: 'inherit' });
      
      // .gitignore 생성
      const gitignore = `node_modules/
dist/
build/
.env
.env.local
.DS_Store
*.log
venv/
__pycache__/
.pytest_cache/
.coverage
.vscode/settings.json`;
      
      await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
      
      execSync('git add .', { stdio: 'inherit' });
      execSync('git commit -m "Initial commit: Project scaffolded by AI Dev System"', { stdio: 'inherit' });
      
      console.log('✅ Git 초기화 완료');
    } catch (error) {
      console.error('❌ Git 초기화 실패:', error.message);
    }
  }

  /**
   * VS Code 설정 생성
   */
  async createVSCodeConfig(projectPath, templateType) {
    try {
      const vscodeDir = path.join(projectPath, '.vscode');
      await fs.mkdir(vscodeDir, { recursive: true });
      
      // settings.json
      const settings = {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true
        },
        "files.autoSave": "onFocusChange",
        "typescript.updateImportsOnFileMove.enabled": "always",
        "emmet.includeLanguages": {
          "javascript": "javascriptreact"
        }
      };
      
      if (templateType.includes('python')) {
        settings["python.defaultInterpreterPath"] = "./venv/bin/python";
        settings["python.formatting.provider"] = "black";
      }
      
      await fs.writeFile(
        path.join(vscodeDir, 'settings.json'),
        JSON.stringify(settings, null, 2)
      );
      
      // 확장 추천
      const extensions = {
        "recommendations": this.getRecommendedExtensions(templateType)
      };
      
      await fs.writeFile(
        path.join(vscodeDir, 'extensions.json'),
        JSON.stringify(extensions, null, 2)
      );
      
      console.log('✅ VS Code 설정 생성 완료');
    } catch (error) {
      console.error('❌ VS Code 설정 생성 실패:', error.message);
    }
  }

  /**
   * 추천 확장 프로그램 목록
   */
  getRecommendedExtensions(templateType) {
    const baseExtensions = [
      "GitHub.copilot",
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss"
    ];
    
    const extensionMap = {
      'react-app': [
        ...baseExtensions,
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next",
        "formulahendry.auto-rename-tag"
      ],
      'node-api': [
        ...baseExtensions,
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next",
        "christian-kohler.path-intellisense"
      ],
      'python-ml': [
        "ms-python.python",
        "ms-python.black-formatter",
        "ms-python.flake8",
        "ms-toolsai.jupyter"
      ],
      'vscode-extension': [
        ...baseExtensions,
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next"
      ]
    };
    
    return extensionMap[templateType] || baseExtensions;
  }

  /**
   * 다음 단계 안내
   */
  getNextSteps(templateType, projectName) {
    const steps = [
      `cd generated-projects/${projectName}`,
      'code . (VS Code에서 프로젝트 열기)'
    ];
    
    const specificSteps = {
      'react-app': [
        'npm run dev (개발 서버 시작)',
        'http://localhost:5173 에서 확인'
      ],
      'node-api': [
        'npm start (서버 시작)',
        'http://localhost:3000 에서 API 확인'
      ],
      'python-ml': [
        'source venv/bin/activate (가상환경 활성화)',
        'python src/main.py (FastAPI 서버 시작)',
        'jupyter notebook (Jupyter 노트북 시작)'
      ],
      'vscode-extension': [
        'F5 키로 확장 테스트 실행',
        'package.json에서 명령어 수정'
      ]
    };
    
    return [...steps, ...(specificSteps[templateType] || [])];
  }

  /**
   * 사용 가능한 템플릿 목록
   */
  getAvailableTemplates() {
    return Array.from(this.templates.entries()).map(([key, template]) => ({
      id: key,
      name: template.name,
      description: template.description
    }));
  }

  // 추가 설정 파일 생성 메서드들
  generateViteConfig() {
    return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})`;
  }

  generateTSConfig() {
    return JSON.stringify({
      "compilerOptions": {
        "target": "ES2020",
        "useDefineForClassFields": true,
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx",
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true
      },
      "include": ["src"],
      "references": [{ "path": "./tsconfig.node.json" }]
    }, null, 2);
  }

  generateTailwindConfig() {
    return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
  }

  generateEnvExample() {
    return `# 환경 변수 예시
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key
API_KEY=your-api-key`;
  }
}
