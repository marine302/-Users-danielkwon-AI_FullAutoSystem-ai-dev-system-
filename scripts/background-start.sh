#!/bin/bash

# 백그라운드 서버 자동 시작 스크립트
# VSCode에서 확인창 없이 완전 자동으로 실행됩니다

echo "🚀 AI 개발 시스템 백그라운드 시작..."

# 기존 프로세스 확인 및 종료
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "📋 포트 3000이 이미 사용 중입니다. 기존 프로세스를 종료합니다..."
    lsof -ti:3000 | xargs kill -9 > /dev/null 2>&1
    sleep 2
fi

# Node.js 프로세스 백그라운드 실행
nohup npm start > /tmp/ai-dev-system.log 2>&1 &
SERVER_PID=$!

echo "🎯 서버 PID: $SERVER_PID"
echo "📝 로그 위치: /tmp/ai-dev-system.log"

# 서버 시작 대기
echo "⏳ 서버 시작 대기 중..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ AI 개발 시스템이 성공적으로 시작되었습니다!"
        echo "🌐 URL: http://localhost:3000"
        echo "📱 UI: http://localhost:3000/static/app.html"
        exit 0
    fi
    sleep 1
done

echo "❌ 서버 시작에 실패했습니다. 로그를 확인하세요:"
tail -n 10 /tmp/ai-dev-system.log
