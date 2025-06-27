#!/bin/bash

# AI 개발 시스템 - 보안 초기화 스크립트
# 사용자 인증 시스템 구축을 위한 자동 설정

echo "🔐 보안 시스템 초기화 시작..."

# 현재 디렉터리 확인
if [ ! -f "package.json" ]; then
    echo "❌ 오류: package.json이 없습니다. 프로젝트 루트 디렉터리에서 실행해주세요."
    exit 1
fi

# 1. 필요한 패키지 설치
echo "📦 보안 관련 패키지 설치 중..."
npm install jsonwebtoken bcryptjs helmet express-rate-limit cors

# 2. 디렉터리 구조 생성
echo "📁 디렉터리 구조 생성 중..."
mkdir -p src/auth
mkdir -p src/middleware

# 3. 환경 변수 설정
echo "🔑 환경 변수 설정 중..."
if ! grep -q "JWT_SECRET" .env; then
    echo "" >> .env
    echo "# 보안 설정 ($(date)에 추가됨)" >> .env
    echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
    echo "JWT_EXPIRES_IN=7d" >> .env
    echo "BCRYPT_ROUNDS=12" >> .env
    echo "RATE_LIMIT_WINDOW_MS=900000" >> .env
    echo "RATE_LIMIT_MAX_REQUESTS=100" >> .env
    echo "CORS_ORIGIN=http://localhost:3000" >> .env
else
    echo "⚠️  JWT_SECRET이 이미 설정되어 있습니다."
fi

# 4. 기본 파일 템플릿 생성
echo "📄 기본 템플릿 파일 생성 중..."

# AuthService.js 템플릿
cat > src/auth/AuthService.js << 'EOF'
/**
 * 사용자 인증 서비스
 * 회원가입, 로그인, 토큰 관리
 */

import bcrypt from 'bcryptjs';
import { JWTService } from './JWTService.js';
import { DatabaseService } from '../services/DatabaseService.js';

export class AuthService {
  constructor() {
    this.db = new DatabaseService();
    this.jwtService = new JWTService();
  }

  /**
   * 사용자 회원가입
   */
  async register(userData) {
    const { username, email, password } = userData;
    
    // TODO: 구현 필요
    // 1. 입력 데이터 검증
    // 2. 중복 사용자 확인
    // 3. 비밀번호 해싱
    // 4. 사용자 생성
    // 5. JWT 토큰 생성
    
    throw new Error('회원가입 기능 구현 필요');
  }

  /**
   * 사용자 로그인
   */
  async login(email, password) {
    // TODO: 구현 필요
    // 1. 사용자 조회
    // 2. 비밀번호 확인
    // 3. JWT 토큰 생성
    
    throw new Error('로그인 기능 구현 필요');
  }
}
EOF

# JWTService.js 템플릿
cat > src/auth/JWTService.js << 'EOF'
/**
 * JWT 토큰 관리 서비스
 */

import jwt from 'jsonwebtoken';

export class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * JWT 토큰 생성
   */
  generateToken(payload) {
    // TODO: 구현 필요
    throw new Error('JWT 토큰 생성 기능 구현 필요');
  }

  /**
   * JWT 토큰 검증
   */
  verifyToken(token) {
    // TODO: 구현 필요
    throw new Error('JWT 토큰 검증 기능 구현 필요');
  }
}
EOF

# authMiddleware.js 템플릿
cat > src/middleware/authMiddleware.js << 'EOF'
/**
 * 인증 미들웨어
 * API 요청 시 JWT 토큰 검증
 */

import { JWTService } from '../auth/JWTService.js';

const jwtService = new JWTService();

export const authMiddleware = (req, res, next) => {
  try {
    // TODO: 구현 필요
    // 1. Authorization 헤더 확인
    // 2. Bearer 토큰 추출
    // 3. JWT 토큰 검증
    // 4. 사용자 정보를 req.user에 저장
    
    throw new Error('인증 미들웨어 구현 필요');
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '인증이 필요합니다.'
    });
  }
};
EOF

# auth.js 라우터 템플릿
cat > src/routes/auth.js << 'EOF'
/**
 * 인증 API 라우터
 */

import express from 'express';
import { AuthService } from '../auth/AuthService.js';

const router = express.Router();
const authService = new AuthService();

/**
 * POST /api/v1/auth/register
 * 사용자 회원가입
 */
router.post('/register', async (req, res) => {
  try {
    // TODO: 구현 필요
    res.status(501).json({
      success: false,
      error: '회원가입 기능 구현 필요'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/auth/login
 * 사용자 로그인
 */
router.post('/login', async (req, res) => {
  try {
    // TODO: 구현 필요
    res.status(501).json({
      success: false,
      error: '로그인 기능 구현 필요'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
EOF

# 5. 사용자 테이블 추가를 위한 SQL 스크립트 생성
cat > scripts/add-user-tables.sql << 'EOF'
-- 사용자 관리 테이블
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

-- 세션 관리 테이블
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- API 키 관리 테이블
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
EOF

# 6. 보안 설정 완료 메시지
echo ""
echo "✅ 보안 시스템 초기화 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. src/auth/ 폴더의 파일들을 구현하세요"
echo "2. DatabaseService.js에 사용자 관련 메서드를 추가하세요"
echo "3. src/index.js에 인증 라우터를 추가하세요"
echo ""
echo "🔧 참고 문서:"
echo "- docs/security/SECURITY_IMPLEMENTATION_GUIDE.md"
echo "- docs/QUICK_START_CHECKLIST.md"
echo ""
echo "🚀 바로 시작하려면:"
echo "code src/auth/AuthService.js"
EOF
