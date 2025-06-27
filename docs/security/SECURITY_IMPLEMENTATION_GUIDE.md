# Phase 8: 보안 강화 구현 가이드

## 🔐 보안 시스템 구축 상세 계획

### 8.1 사용자 인증 시스템

#### 단계 1: 필요한 패키지 설치
```bash
npm install jsonwebtoken bcryptjs helmet express-rate-limit cors dotenv-extended
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

#### 단계 2: 환경 변수 설정
`.env` 파일에 추가:
```env
# 인증 관련
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# 보안 설정
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
```

#### 단계 3: 데이터베이스 스키마 확장
`DatabaseService.js`에 사용자 테이블 추가:
```sql
-- 사용자 관리
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 세션 관리
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- API 키 관리
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions TEXT, -- JSON array
    is_active BOOLEAN DEFAULT true,
    last_used DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### 단계 4: 인증 서비스 구현

**파일 구조**:
```
src/
├── auth/
│   ├── AuthService.js       # 핵심 인증 로직
│   ├── JWTService.js        # JWT 토큰 관리
│   ├── PasswordService.js   # 비밀번호 처리
│   └── PermissionService.js # 권한 관리
├── middleware/
│   ├── authMiddleware.js    # 인증 미들웨어
│   ├── rateLimitMiddleware.js # Rate limiting
│   └── securityMiddleware.js  # 보안 헤더
└── routes/
    └── auth.js              # 인증 API 라우터
```

**AuthService.js 구현 예시**:
```javascript
import bcrypt from 'bcryptjs';
import { JWTService } from './JWTService.js';
import { DatabaseService } from '../services/DatabaseService.js';

export class AuthService {
  constructor() {
    this.db = new DatabaseService();
    this.jwtService = new JWTService();
  }

  async register(userData) {
    const { username, email, password } = userData;
    
    // 사용자 존재 확인
    const existingUser = this.db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('이미 존재하는 이메일입니다.');
    }

    // 비밀번호 해싱
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 사용자 생성
    const userId = `user_${Date.now()}`;
    const user = {
      id: userId,
      username,
      email,
      password_hash: passwordHash,
      role: 'user'
    };

    this.db.saveUser(user);
    
    // JWT 토큰 생성
    const token = this.jwtService.generateToken({ userId, email, role: 'user' });
    
    return { user: { id: userId, username, email, role: 'user' }, token };
  }

  async login(email, password) {
    // 사용자 조회
    const user = this.db.getUserByEmail(email);
    if (!user) {
      throw new Error('존재하지 않는 사용자입니다.');
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('잘못된 비밀번호입니다.');
    }

    // 로그인 시간 업데이트
    this.db.updateUserLastLogin(user.id);

    // JWT 토큰 생성
    const token = this.jwtService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    };
  }
}
```

#### 단계 5: API 라우터 구현

**auth.js 라우터**:
```javascript
import express from 'express';
import { AuthService } from '../auth/AuthService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const authService = new AuthService();

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 입력 검증
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '모든 필드를 입력해주세요.'
      });
    }

    const result = await authService.register({ username, email, password });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// 프로필 조회 (인증 필요)
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

export default router;
```

### 8.2 보안 미들웨어

#### authMiddleware.js
```javascript
import { JWTService } from '../auth/JWTService.js';

const jwtService = new JWTService();

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.split(' ')[1]; // "Bearer TOKEN"
    const decoded = jwtService.verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다.'
    });
  }
};
```

#### rateLimitMiddleware.js
```javascript
import rateLimit from 'express-rate-limit';

export const createRateLimit = (options = {}) => {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15분
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
      success: false,
      error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

// API별 제한
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 로그인 시도 5회 제한
  skipSuccessfulRequests: true
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 일반 API 100회 제한
});
```

### 8.3 기존 시스템 통합

#### index.js 업데이트
```javascript
// 보안 미들웨어 추가
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimit } from './src/middleware/rateLimitMiddleware.js';
import authRouter from './src/routes/auth.js';

// 보안 설정
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(apiRateLimit);

// 인증 라우터 추가
app.use('/api/v1/auth', authRouter);
```

#### 기존 API 보호
```javascript
// 보호가 필요한 라우터에 인증 미들웨어 적용
import { authMiddleware } from '../middleware/authMiddleware.js';

// 예: 코드 생성은 인증된 사용자만
router.post('/generate', authMiddleware, async (req, res) => {
  // 기존 코드...
});
```

### 8.4 테스트 계획

#### 단위 테스트
```javascript
// tests/auth.test.js
describe('AuthService', () => {
  test('should register new user', async () => {
    // 테스트 구현
  });
  
  test('should login with valid credentials', async () => {
    // 테스트 구현
  });
  
  test('should reject invalid credentials', async () => {
    // 테스트 구현
  });
});
```

#### 보안 테스트
- JWT 토큰 만료 테스트
- Rate limiting 테스트
- SQL injection 방지 테스트
- XSS 보호 테스트

### 8.5 구현 순서

1. **1일차**: 기본 인증 시스템 구축
   - 패키지 설치 및 환경 설정
   - AuthService, JWTService 구현
   - 데이터베이스 스키마 업데이트

2. **2일차**: API 및 미들웨어 구현
   - 인증 라우터 구현
   - 보안 미들웨어 구현
   - 기존 API에 인증 적용

3. **3일차**: 테스트 및 보안 강화
   - 단위 테스트 작성
   - 보안 테스트 수행
   - 문서 업데이트

이 가이드를 따라 구현하면 견고한 보안 시스템을 갖춘 AI 개발 플랫폼을 완성할 수 있습니다!
