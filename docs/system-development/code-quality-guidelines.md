# AI 코드 품질 가이드라인 v1.0

## 1. 개요

본 문서는 AI 자율 개발 시스템이 생성하는 모든 코드가 준수해야 할 품질 기준과 베스트 프랙티스를 정의합니다. 이 가이드라인을 따르면 읽기 쉽고, 유지보수하기 쉬우며, 확장 가능한 코드를 생성할 수 있습니다.

## 2. 코드 구조화 원칙

### 2.1 모듈화 (Modularity)

#### 단일 책임 원칙 (Single Responsibility)
```javascript
// ❌ 나쁜 예: 하나의 함수가 너무 많은 일을 함
async function processUserData(userId) {
  // 사용자 조회
  const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
  
  // 데이터 검증
  if (!user.email || !user.email.includes('@')) {
    throw new Error('Invalid email');
  }
  
  // 이메일 발송
  const transporter = nodemailer.createTransport({...});
  await transporter.sendMail({
    to: user.email,
    subject: 'Welcome',
    text: 'Hello ' + user.name
  });
  
  // 로그 기록
  fs.appendFileSync('user.log', `${new Date()} - Processed ${userId}\n`);
  
  return user;
}

// ✅ 좋은 예: 각 함수가 하나의 책임만 가짐
async function getUser(userId) {
  return await db.users.findById(userId);
}

function validateUserEmail(user) {
  if (!user.email || !user.email.includes('@')) {
    throw new ValidationError('Invalid email format');
  }
}

async function sendWelcomeEmail(user) {
  return await emailService.send({
    to: user.email,
    template: 'welcome',
    data: { name: user.name }
  });
}

async function logUserActivity(userId, action) {
  return await logger.info(`User ${userId}: ${action}`);
}

// 조합하여 사용
async function processNewUser(userId) {
  const user = await getUser(userId);
  validateUserEmail(user);
  await sendWelcomeEmail(user);
  await logUserActivity(userId, 'registration_completed');
  return user;
}
```

#### 파일 구조 표준
```
project/
├── src/
│   ├── controllers/     # 요청 처리 로직
│   │   └── user.controller.js (최대 200줄)
│   ├── services/        # 비즈니스 로직
│   │   └── user.service.js (최대 300줄)
│   ├── models/          # 데이터 모델
│   │   └── user.model.js (최대 150줄)
│   ├── utils/           # 유틸리티 함수
│   │   └── validation.js (최대 100줄)
│   └── config/          # 설정 파일
│       └── database.js (최대 50줄)
```

### 2.2 명확한 네이밍 규칙

#### 변수명 규칙
```javascript
// ✅ 좋은 변수명 예시
const userAccount = await getUserById(userId);
const isEmailValid = validateEmail(email);
const maxRetryAttempts = 3;
const createdAt = new Date();

// ❌ 나쁜 변수명 예시
const u = await get(id);  // 너무 짧음
const flag = check(e);    // 의미 불명확
const data = 3;          // 맥락 없음
const d = new Date();    // 약어 사용
```

#### 함수명 규칙
```javascript
// 동사로 시작하는 함수명
function calculateTotalPrice(items) { }     // 계산
function validateUserInput(input) { }       // 검증
function fetchUserData(userId) { }          // 가져오기
function updateUserProfile(userId, data) { } // 업데이트
function deleteExpiredSessions() { }        // 삭제
function isUserActive(user) { }             // 불린 체크
function hasPermission(user, action) { }    // 불린 체크

// 비동기 함수는 동작을 명확히
async function fetchUserFromDatabase(userId) { }
async function saveUserToCache(user) { }
```

### 2.3 일관된 코드 스타일

#### 들여쓰기와 공백
```javascript
// 2 스페이스 들여쓰기 사용
function processOrder(order) {
  if (order.status === 'pending') {
    return {
      ...order,
      status: 'processing',
      processedAt: new Date()
    };
  }
  
  return order;
}

// 연산자 주변 공백
const total = price * quantity + tax;
const isValid = age >= 18 && age <= 65;

// 객체 리터럴 공백
const user = { id: 1, name: 'John', age: 30 };
```

## 3. 에러 처리와 로깅

### 3.1 체계적인 에러 처리

```javascript
// 커스텀 에러 클래스
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

// 에러 처리 미들웨어
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error({
    error: err.name,
    message: err.message,
    stack: err.stack,
    requestId: req.id,
    userId: req.user?.id
  });
  
  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
```

### 3.2 구조화된 로깅

```javascript
// 로깅 레벨별 사용
logger.debug('Detailed debugging information');
logger.info('General information about app flow');
logger.warn('Warning: deprecated function used');
logger.error('Error occurred:', error);

// 구조화된 로그 데이터
logger.info({
  event: 'user_login',
  userId: user.id,
  timestamp: new Date().toISOString(),
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

## 4. 테스트 가능한 코드 작성

### 4.1 의존성 주입

```javascript
// ❌ 하드코딩된 의존성
class UserService {
  async getUser(id) {
    const db = new Database(); // 직접 생성
    return await db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

// ✅ 의존성 주입
class UserService {
  constructor(database) {
    this.db = database; // 주입받음
  }
  
  async getUser(id) {
    return await this.db.users.findById(id);
  }
}

// 테스트에서
const mockDb = { users: { findById: jest.fn() } };
const userService = new UserService(mockDb);
```

### 4.2 순수 함수 선호

```javascript
// ❌ 부수 효과가 있는 함수
let total = 0;
function addToTotal(amount) {
  total += amount; // 외부 상태 변경
  return total;
}

// ✅ 순수 함수
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

## 5. 문서화 표준

### 5.1 JSDoc 주석

```javascript
/**
 * 사용자 프로필을 업데이트합니다.
 * 
 * @async
 * @function updateUserProfile
 * @param {string} userId - 사용자 ID
 * @param {Object} profileData - 업데이트할 프로필 데이터
 * @param {string} profileData.name - 사용자 이름
 * @param {string} profileData.email - 이메일 주소
 * @param {number} profileData.age - 나이
 * @returns {Promise<User>} 업데이트된 사용자 객체
 * @throws {ValidationError} 입력 데이터가 유효하지 않은 경우
 * @throws {NotFoundError} 사용자를 찾을 수 없는 경우
 * 
 * @example
 * const updatedUser = await updateUserProfile('123', {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   age: 30
 * });
 */
async function updateUserProfile(userId, profileData) {
  // 구현...
}
```

### 5.2 README 템플릿

```markdown
# 프로젝트명

## 개요
프로젝트의 목적과 주요 기능을 간단히 설명

## 시작하기

### 필수 조건
- Node.js 18+
- PostgreSQL 14+

### 설치
\`\`\`bash
npm install
\`\`\`

### 환경 설정
\`\`\`bash
cp .env.example .env
# .env 파일 수정
\`\`\`

### 실행
\`\`\`bash
npm run dev  # 개발 모드
npm start    # 프로덕션 모드
\`\`\`

## API 문서
- `GET /api/users` - 사용자 목록 조회
- `POST /api/users` - 새 사용자 생성

## 프로젝트 구조
\`\`\`
src/
├── controllers/
├── services/
└── models/
\`\`\`
```

## 6. 성능 최적화 가이드

### 6.1 비동기 처리 최적화

```javascript
// ❌ 순차적 처리 (느림)
async function fetchUserData(userId) {
  const user = await getUser(userId);
  const posts = await getUserPosts(userId);
  const comments = await getUserComments(userId);
  
  return { user, posts, comments };
}

// ✅ 병렬 처리 (빠름)
async function fetchUserData(userId) {
  const [user, posts, comments] = await Promise.all([
    getUser(userId),
    getUserPosts(userId),
    getUserComments(userId)
  ]);
  
  return { user, posts, comments };
}
```

### 6.2 메모리 최적화

```javascript
// 스트림 사용으로 메모리 효율성 향상
async function processLargeFile(filePath) {
  const readStream = fs.createReadStream(filePath);
  const writeStream = fs.createWriteStream('output.txt');
  
  readStream
    .pipe(transform) // 변환 처리
    .pipe(writeStream) // 결과 저장
    .on('finish', () => console.log('Processing complete'));
}

// 페이지네이션으로 대량 데이터 처리
async function* fetchAllUsers() {
  let page = 1;
  const pageSize = 100;
  
  while (true) {
    const users = await getUsersPaginated(page, pageSize);
    if (users.length === 0) break;
    
    yield users;
    page++;
  }
}
```

## 7. 보안 베스트 프랙티스

### 7.1 입력 검증

```javascript
const { body, validationResult } = require('express-validator');

// 검증 규칙 정의
const userValidationRules = () => {
  return [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)/),
    body('age').isInt({ min: 0, max: 120 })
  ];
}

// 검증 미들웨어
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
```

### 7.2 SQL 인젝션 방지

```javascript
// ❌ 위험한 쿼리
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ 파라미터화된 쿼리
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);

// ✅ ORM 사용
const user = await User.findOne({ where: { id: userId } });
```

## 8. AI 에이전트 적용 가이드

### 8.1 코드 생성 시 체크리스트

```yaml
code_generation_checklist:
  structure:
    - [ ] 파일당 최대 300줄 제한
    - [ ] 함수당 최대 50줄 제한
    - [ ] 중첩 깊이 최대 3단계
    
  naming:
    - [ ] 의미 있는 변수명 사용
    - [ ] 일관된 네이밍 컨벤션
    - [ ] 약어 사용 최소화
    
  quality:
    - [ ] 모든 함수에 JSDoc 주석
    - [ ] 에러 처리 구현
    - [ ] 테스트 코드 포함
    
  security:
    - [ ] 입력 검증
    - [ ] SQL 인젝션 방지
    - [ ] XSS 방지
```

### 8.2 프롬프트 템플릿

```javascript
const codeGenerationPrompt = `
다음 요구사항에 따라 코드를 생성하세요:

요구사항: ${requirements}

품질 기준:
1. 단일 책임 원칙을 따르는 모듈화된 구조
2. 명확하고 의미 있는 변수/함수명
3. 완전한 에러 처리
4. JSDoc 주석 포함
5. 단위 테스트 포함

보안 요구사항:
- 모든 사용자 입력 검증
- SQL 인젝션 방지
- XSS 방지

성능 요구사항:
- 비동기 작업은 Promise.all 사용
- 대용량 데이터는 스트림 처리
- 적절한 캐싱 구현
`;
```

## 9. 코드 리뷰 자동화

### 9.1 정적 분석 도구 설정

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:node/recommended'],
  rules: {
    'complexity': ['error', 10],           // 함수 복잡도 제한
    'max-lines': ['error', 300],          // 파일 길이 제한
    'max-lines-per-function': ['error', 50], // 함수 길이 제한
    'max-depth': ['error', 3],            // 중첩 깊이 제한
    'no-unused-vars': 'error',
    'no-console': 'warn',
    'require-await': 'error',
    'prefer-const': 'error'
  }
};
```

### 9.2 자동화된 품질 검사

```yaml
# .github/workflows/code-quality.yml
name: Code Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run ESLint
        run: npm run lint
        
      - name: Run Tests
        run: npm test
        
      - name: Check Test Coverage
        run: npm run coverage
        
      - name: Security Audit
        run: npm audit
        
      - name: Code Complexity Analysis
        run: npx plato -r -d report src
```

## 10. 지속적 개선

### 10.1 메트릭 추적

```yaml
code_quality_metrics:
  maintainability:
    - cyclomatic_complexity: "< 10"
    - code_duplication: "< 5%"
    - technical_debt_ratio: "< 5%"
    
  reliability:
    - bug_density: "< 1 per KLOC"
    - test_coverage: "> 80%"
    - code_smells: "< 10"
    
  security:
    - vulnerabilities: "0 critical, 0 high"
    - security_hotspots: "< 5"
```

### 10.2 리팩토링 트리거

```yaml
refactoring_triggers:
  - file_size: "> 500 lines"
  - function_complexity: "> 15"
  - duplicate_code: "> 10%"
  - test_coverage: "< 70%"
  - performance_degradation: "> 20%"
```

---

*이 문서는 AI 자율 개발 시스템이 생성하는 모든 코드의 품질 기준을 정의합니다. 모든 AI 에이전트는 이 가이드라인을 준수해야 합니다.*

*최종 수정: 2024-01-26*
*다음 검토: 2024-02-26*