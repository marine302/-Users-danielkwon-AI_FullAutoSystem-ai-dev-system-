# Docker를 이용한 웹 배포 준비 - AI 개발 시스템

FROM node:18-alpine

# 작업 디렉터리 설정
WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 애플리케이션 코드 복사
COPY . .

# 데이터 디렉터리 생성
RUN mkdir -p /app/data /app/uploads

# 포트 노출
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# 애플리케이션 시작
CMD ["npm", "start"]
