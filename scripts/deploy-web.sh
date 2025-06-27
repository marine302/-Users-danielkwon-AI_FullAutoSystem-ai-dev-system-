#!/bin/bash

# AI 개발 시스템 - 웹 배포 자동화 스크립트

echo "🌐 AI 개발 시스템 웹 배포 준비 중..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

echo "📋 현재 시스템 상태 확인..."

# 서버 상태 확인
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo "✅ 서버가 정상 실행 중입니다"
else
    echo "❌ 서버가 실행되지 않았습니다. npm start로 서버를 시작해주세요"
    exit 1
fi

echo "🔧 배포 환경 설정 중..."

# package.json에 배포 스크립트 추가
if ! grep -q "\"deploy\":" package.json; then
    echo "📦 package.json에 배포 스크립트 추가 중..."
    
    # 임시로 배포 스크립트 추가
    cp package.json package.json.backup
    
    # deploy 스크립트를 scripts 섹션에 추가
    sed -i '' 's/"scripts": {/"scripts": {\
    "deploy": "npm run build \&\& echo Ready for deployment",\
    "deploy:vercel": "vercel --prod",\
    "deploy:railway": "railway deploy",\
    "deploy:heroku": "git push heroku main",/' package.json
    
    echo "✅ package.json 업데이트 완료"
fi

echo "🌐 배포 옵션들:"
echo ""
echo "1️⃣  Vercel (추천 - 무료, 즉시 배포)"
echo "   npm install -g vercel"
echo "   vercel"
echo ""
echo "2️⃣  Railway (Node.js 최적화)"  
echo "   npm install -g @railway/cli"
echo "   railway login && railway deploy"
echo ""
echo "3️⃣  Heroku (전통적인 방법)"
echo "   heroku create ai-dev-system"
echo "   git push heroku main"
echo ""

read -p "어떤 플랫폼에 배포하시겠습니까? (1/2/3/skip): " choice

case $choice in
    1)
        echo "🚀 Vercel 배포 시작..."
        if command -v vercel &> /dev/null; then
            echo "✅ Vercel CLI가 이미 설치되어 있습니다"
        else
            echo "📦 Vercel CLI 설치 중..."
            npm install -g vercel
        fi
        
        echo "🌐 Vercel 배포 실행..."
        vercel
        ;;
    2)
        echo "🚀 Railway 배포 시작..."
        if command -v railway &> /dev/null; then
            echo "✅ Railway CLI가 이미 설치되어 있습니다"
        else
            echo "📦 Railway CLI 설치 중..."
            npm install -g @railway/cli
        fi
        
        echo "🔐 Railway 로그인..."
        railway login
        
        echo "🌐 Railway 배포 실행..."
        railway deploy
        ;;
    3)
        echo "🚀 Heroku 배포 준비..."
        if command -v heroku &> /dev/null; then
            echo "✅ Heroku CLI가 이미 설치되어 있습니다"
            
            echo "📝 Procfile 생성 중..."
            echo "web: npm start" > Procfile
            
            echo "🔐 Heroku 로그인이 필요합니다..."
            heroku login
            
            echo "📦 Heroku 앱 생성..."
            heroku create ai-dev-system-$(date +%s)
            
            echo "🌐 Heroku 배포 실행..."
            git add .
            git commit -m "Deploy to Heroku"
            git push heroku main
        else
            echo "❌ Heroku CLI가 설치되지 않았습니다"
            echo "다음 명령어로 설치하세요: brew install heroku/brew/heroku"
        fi
        ;;
    *)
        echo "⏭️  배포를 건너뜁니다"
        ;;
esac

echo ""
echo "📋 배포 완료 후 확인사항:"
echo "✅ 웹사이트가 정상 접속되는지 확인"
echo "✅ API 엔드포인트가 작동하는지 확인"
echo "✅ 환경 변수가 올바르게 설정되었는지 확인"
echo "✅ 데이터베이스가 정상 작동하는지 확인"
echo ""
echo "🔧 추가 설정이 필요한 항목:"
echo "- OpenAI API 키 설정"
echo "- JWT 시크릿 키 설정" 
echo "- CORS 도메인 설정"
echo ""
echo "📚 자세한 내용은 docs/WEB_DEPLOYMENT_GUIDE.md를 참고하세요"
echo ""
echo "🎉 배포 준비 완료!"
