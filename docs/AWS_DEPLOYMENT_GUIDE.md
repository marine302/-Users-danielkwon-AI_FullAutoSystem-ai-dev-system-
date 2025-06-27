# 🚀 AWS 클라우드 배포 가이드 - AI 개발 시스템

## 📋 AWS 배포에 필요한 사항들

### 1. **AWS 계정 및 액세스**
- AWS 계정 (Free Tier 사용 가능)
- IAM 사용자 또는 액세스 키
- AWS CLI 설치 및 구성

### 2. **AWS 서비스 선택지**

#### Option A: AWS App Runner (가장 간단) ⭐ 추천
- **장점**: 코드만 업로드하면 자동 배포
- **비용**: $0.007/vCPU/분 + $0.0008/GB/분
- **설정**: GitHub 연결만으로 자동 배포

#### Option B: AWS Elastic Beanstalk (중간 복잡도)
- **장점**: Load Balancer, Auto Scaling 자동 설정
- **비용**: EC2 인스턴스 비용만 (t3.micro 무료)
- **설정**: ZIP 파일 업로드 또는 Git 연결

#### Option C: AWS ECS + Fargate (완전 제어)
- **장점**: Docker 컨테이너, 마이크로서비스
- **비용**: $0.04048/vCPU/시간 + $0.004445/GB/시간
- **설정**: Docker 이미지 필요

#### Option D: AWS EC2 (전통적)
- **장점**: 완전한 서버 제어
- **비용**: t3.micro 무료 (1년간)
- **설정**: 서버 관리 필요

---

## 🎯 추천 방법: AWS App Runner

### 장점
- 가장 빠른 배포 (10분)
- 자동 스케일링
- HTTPS 자동 설정
- CI/CD 자동 구성
- 서버 관리 불필요

### 단계별 배포 과정

#### 1단계: AWS CLI 설치 및 설정
```bash
# AWS CLI 설치
brew install awscli

# AWS 구성 (액세스 키 필요)
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: ap-northeast-2 (서울)
# Default output format: json
```

#### 2단계: App Runner용 설정 파일 생성
```yaml
# apprunner.yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm install
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
    - name: PORT
      value: 3000
```

#### 3단계: GitHub 리포지토리 연결
- AWS 콘솔에서 App Runner 서비스 생성
- GitHub 리포지토리 연결
- 자동 배포 설정

---

## 🛠 필요한 정보 및 권한

### AWS 계정 정보
```
✅ AWS 계정 ID
✅ IAM 사용자 Access Key
✅ IAM 사용자 Secret Key
✅ 권한: App Runner, CloudWatch, IAM
```

### 권한 정책 (IAM)
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "apprunner:*",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:PassRole",
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
```

---

## 💰 AWS 배포 비용 예상

### App Runner (추천)
- **최소 비용**: $5-15/월
- **중간 사용**: $20-50/월
- **높은 사용**: $50-200/월

### Elastic Beanstalk
- **Free Tier**: t3.micro 무료 (1년)
- **유료**: $10-30/월 (t3.small)

### ECS Fargate
- **최소**: $15-25/월
- **확장**: $30-100/월

---

## 🚀 즉시 배포 가능한 방법들

### 방법 1: AWS App Runner (자동화) ⭐
```bash
# 1. AWS CLI 설정
aws configure

# 2. GitHub에 코드 푸시
git add .
git commit -m "Deploy to AWS"
git push origin main

# 3. AWS 콘솔에서 App Runner 생성
# - GitHub 리포지토리 연결
# - 자동 배포 설정
```

### 방법 2: Elastic Beanstalk (ZIP 업로드)
```bash
# 1. 배포 패키지 생성
zip -r ai-dev-system.zip . -x "node_modules/*" ".git/*"

# 2. AWS EB CLI 설치
pip install awsebcli

# 3. EB 초기화 및 배포
eb init
eb create ai-dev-system-env
eb deploy
```

### 방법 3: ECS Fargate (Docker)
```bash
# 1. ECR 리포지토리 생성
aws ecr create-repository --repository-name ai-dev-system

# 2. Docker 이미지 빌드 및 푸시
docker build -t ai-dev-system .
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.ap-northeast-2.amazonaws.com
docker tag ai-dev-system:latest YOUR_ACCOUNT.dkr.ecr.ap-northeast-2.amazonaws.com/ai-dev-system:latest
docker push YOUR_ACCOUNT.dkr.ecr.ap-northeast-2.amazonaws.com/ai-dev-system:latest

# 3. ECS 서비스 생성 (콘솔에서)
```

---

## 📝 계정 정보가 필요한 항목들

### 1. **AWS 액세스 키**
```
AWS Access Key ID: AKIA****************
AWS Secret Access Key: ****************************************
Region: ap-northeast-2 (서울)
```

### 2. **IAM 권한 확인**
- App Runner 서비스 생성 권한
- CloudWatch 로그 권한
- ECR 이미지 관리 권한 (Docker 사용 시)

### 3. **도메인 설정 (선택사항)**
- Route 53 도메인 또는 외부 도메인
- SSL 인증서 (자동 생성 가능)

---

## 🎯 추천 배포 단계

### 1단계: 계정 설정 (5분)
```bash
# AWS CLI 설치
brew install awscli

# 계정 설정 (액세스 키 필요)
aws configure
```

### 2단계: GitHub 준비 (5분)
```bash
# GitHub 리포지토리 생성 및 푸시
git remote add origin https://github.com/your-username/ai-dev-system.git
git push -u origin main
```

### 3단계: AWS App Runner 배포 (10분)
1. AWS 콘솔 → App Runner
2. 서비스 생성 → GitHub 연결
3. 리포지토리 선택 → 자동 배포 설정
4. 서비스 URL 확인

---

## 🔧 배포 후 설정

### 환경 변수 설정
```
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://your-app-url.awsapprunner.com
```

### 도메인 연결
- 커스텀 도메인 설정
- HTTPS 자동 활성화
- CDN 설정 (CloudFront)

---

## 📞 계정 정보 제공 시 즉시 진행 가능

계정 정보를 제공해주시면:

1. **즉시 배포 스크립트 실행**
2. **환경 변수 자동 설정**
3. **도메인 URL 제공**
4. **모니터링 설정**

필요한 정보:
- AWS Access Key ID
- AWS Secret Access Key
- 선호하는 배포 방법 (App Runner 추천)

---

## 🎉 배포 완료 후 결과

배포 완료 시 다음과 같은 URL을 제공받게 됩니다:

```
🌐 메인 URL: https://your-app-name.awsapprunner.com
📱 웹 앱: https://your-app-name.awsapprunner.com/app.html
📊 모니터링: https://your-app-name.awsapprunner.com/monitoring-dashboard.html
🤝 협업: https://your-app-name.awsapprunner.com/pair-programming.html
📋 API: https://your-app-name.awsapprunner.com/api/v1/
```

**AWS 계정 정보를 제공해주시면 즉시 배포를 진행하겠습니다!**
