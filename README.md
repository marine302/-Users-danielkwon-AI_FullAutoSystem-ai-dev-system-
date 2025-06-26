# AI 개발 시스템 (AI Development System)

## 개요
이 프로젝트는 AI를 활용한 완전 자동화된 개발 시스템입니다. OpenAI GPT-4를 사용하여 텍스트 생성, 코드 생성, 코드 리뷰, 프로젝트 구조 생성 등의 기능을 제공하며, 전체 개발 워크플로우를 자동화합니다.

## 주요 기능

### 🧠 AI 모듈
- **텍스트 생성**: 자연어 프롬프트에서 텍스트 생성
- **코드 생성**: 요구사항에 따른 다양한 언어의 코드 자동 생성
- **코드 리뷰**: 코드 품질, 보안, 성능 분석
- **프로젝트 구조 생성**: 프로젝트 타입에 맞는 폴더 구조 자동 생성
- **문서 생성**: README, API 문서 등 자동 생성

### 📁 프로젝트 관리
- **프로젝트 생성**: AI 기반 자동 프로젝트 설정
- **기능 추가**: 자연어 설명으로 새 기능 구현
- **빌드 & 테스트**: 자동화된 빌드 및 테스트 실행
- **코드 리뷰**: 프로젝트 파일에 대한 AI 코드 리뷰

### ⚙️ 자동화
- **명령어 실행**: 안전한 쉘 명령어 실행
- **파일 관리**: 파일 및 디렉토리 조작
- **Git 관리**: 저장소 초기화 및 커밋 자동화
- **NPM 관리**: 패키지 설치 및 프로젝트 초기화
- **빌드 자동화**: 프로젝트 빌드 및 테스트 자동화

## 프로젝트 구조
```
ai-dev-system/
├── docs/
│   ├── system-development/    # 시스템 구축용 문서
│   └── ai-reference/         # AI 참조용 문서
├── src/                      # 소스 코드
│   ├── modules/             # 핵심 모듈들
│   │   ├── ai/             # AI 서비스 모듈
│   │   ├── automation/     # 자동화 서비스 모듈
│   │   └── project/        # 프로젝트 관리 모듈
│   ├── routes/             # API 라우트들
│   └── index.js            # 메인 서버 파일
├── tests/                   # 테스트 파일
├── config/                  # 설정 파일
├── scripts/                 # 유틸리티 스크립트
├── public/                  # 정적 파일 (웹 UI)
└── package.json            # 프로젝트 설정
```

## 시작하기

### 1. 환경 설정
```bash
# 저장소 클론 (필요시)
git clone <repository-url>
cd ai-dev-system

# 종속성 설치
npm install

# 환경변수 설정
cp .env.example .env
```

### 2. 환경변수 설정
`.env` 파일에서 다음 설정을 수정하세요:
```env
# OpenAI API 키 (필수)
OPENAI_API_KEY=your-openai-api-key-here

# 서버 설정
PORT=3001
NODE_ENV=development

# 기타 설정들...
```

### 3. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start

# 특정 포트로 실행
PORT=3001 npm start
```

### 4. 웹 인터페이스 접속
브라우저에서 `http://localhost:3001`에 접속하여 AI 개발 시스템을 사용할 수 있습니다.

## API 엔드포인트

### AI 서비스 (`/api/v1/ai`)
- `GET /status` - AI 서비스 상태 확인
- `POST /generate-text` - 텍스트 생성
- `POST /generate-code` - 코드 생성
- `POST /review-code` - 코드 리뷰
- `POST /generate-project-structure` - 프로젝트 구조 생성
- `POST /generate-documentation` - 문서 생성

### 프로젝트 관리 (`/api/v1/projects`)
- `GET /` - 프로젝트 목록 조회
- `POST /` - 새 프로젝트 생성
- `GET /:id` - 특정 프로젝트 조회
- `POST /:id/features` - 프로젝트에 기능 추가
- `POST /:id/build` - 프로젝트 빌드
- `POST /:id/test` - 프로젝트 테스트
- `POST /:id/review` - 코드 리뷰

### 자동화 (`/api/v1/automation`)
- `GET /status` - 자동화 서비스 상태
- `POST /execute` - 명령어 실행
- `POST /create-file` - 파일 생성
- `POST /read-file` - 파일 읽기
- `POST /create-directory` - 디렉토리 생성
- `POST /init-git` - Git 저장소 초기화
- `POST /init-npm` - NPM 프로젝트 초기화
- `POST /install-dependencies` - 의존성 설치
- `POST /build` - 프로젝트 빌드
- `POST /test` - 테스트 실행
- `GET /history` - 명령어 히스토리

## 테스트
```bash
# 모든 테스트 실행
npm test

# 테스트 감시 모드
npm run test:watch

# 코드 커버리지
npm test -- --coverage
```

## 개발 도구
```bash
# 코드 린팅
npm run lint

# 코드 자동 수정
npm run lint:fix

# 프로젝트 빌드
npm run build
```

## 개발 진행 상태
- [x] 프로젝트 초기 설정
- [x] 기본 아키텍처 구현
- [x] AI 모듈 개발 (OpenAI GPT-4 연동)
- [x] 자동화 모듈 개발
- [x] 프로젝트 관리 모듈 개발
- [x] API 서버 구현
- [x] 웹 인터페이스 개발
- [x] 테스트 프레임워크 설정
- [x] 에러 핸들링 및 로깅
- [x] 문서화 완료

## 주의사항
- OpenAI API 키가 설정되지 않으면 AI 기능이 데모 모드로 실행됩니다
- 자동화 기능 사용 시 시스템 보안에 주의하세요
- 프로덕션 환경에서는 적절한 보안 설정이 필요합니다

## 라이선스
MIT License

## 기여하기
이슈나 풀 리퀘스트를 통해 프로젝트에 기여할 수 있습니다.

---

**AI Development System** - 인공지능으로 구동되는 차세대 개발 도구
