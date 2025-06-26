#!/bin/bash

# AI 개발 시스템 macOS 자동화 설정 스크립트
# chmod +x scripts/macos-auto-setup.sh 로 실행 권한 부여 후 사용

echo "🍎 macOS AI 개발 시스템 자동화 설정 시작..."

# 1. 환경변수 설정
echo "📝 환경변수 설정 중..."

# .zshrc 또는 .bash_profile에 환경변수 추가
SHELL_RC=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_RC="$HOME/.bash_profile"
else
    echo "⚠️  쉘 설정 파일을 찾을 수 없습니다. .zshrc 파일을 생성합니다."
    SHELL_RC="$HOME/.zshrc"
    touch "$SHELL_RC"
fi

# AI 자동화 환경변수 추가
AUTO_VARS="
# AI 개발 시스템 자동화 설정
export COPILOT_AUTO_ACCEPT=true
export VSCODE_AUTO_SAVE=true
export AI_DEV_AUTO_MODE=true
export GIT_AUTO_COMMIT=false

# 자동 응답 함수
function auto_yes() {
  yes | \"\$@\"
}

# VSCode 자동 시작 함수
function ai_dev() {
  cd ~/AI_FullAutoSystem/ai-dev-system
  code .
  npm start
}

# 자동 Git 푸시 함수
function auto_push() {
  git add .
  git commit -m \"Auto commit: \$(date)\"
  git push
}
"

# 이미 설정되어 있는지 확인
if ! grep -q "COPILOT_AUTO_ACCEPT" "$SHELL_RC"; then
    echo "$AUTO_VARS" >> "$SHELL_RC"
    echo "✅ 환경변수 설정 완료"
else
    echo "ℹ️  환경변수가 이미 설정되어 있습니다."
fi

# 2. Git 전역 설정
echo "🔧 Git 자동화 설정 중..."

git config --global push.autoSetupRemote true
git config --global pull.rebase false
git config --global core.autocrlf false
git config --global advice.addIgnoredFile false
git config --global init.defaultBranch main

echo "✅ Git 설정 완료"

# 3. Homebrew 패키지 자동 설치 (선택사항)
echo "🍺 개발 도구 확인 중..."

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo "📦 Node.js 설치 중..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "⚠️  Homebrew가 설치되어 있지 않습니다. Node.js를 수동으로 설치해주세요."
    fi
else
    echo "✅ Node.js 설치됨: $(node --version)"
fi

# Git 확인
if ! command -v git &> /dev/null; then
    echo "📦 Git 설치 중..."
    if command -v brew &> /dev/null; then
        brew install git
    else
        echo "⚠️  Git을 수동으로 설치해주세요."
    fi
else
    echo "✅ Git 설치됨: $(git --version)"
fi

# 4. VSCode 설정 확인
echo "⚙️  VSCode 설정 확인 중..."

VSCODE_SETTINGS_DIR="$HOME/Library/Application Support/Code/User"
if [ -d "$VSCODE_SETTINGS_DIR" ]; then
    echo "✅ VSCode 설정 디렉토리 확인됨"
    
    # 전역 설정에 자동화 설정 추가
    GLOBAL_SETTINGS="$VSCODE_SETTINGS_DIR/settings.json"
    if [ -f "$GLOBAL_SETTINGS" ]; then
        echo "ℹ️  기존 VSCode 설정 파일을 백업합니다."
        cp "$GLOBAL_SETTINGS" "$GLOBAL_SETTINGS.backup.$(date +%Y%m%d_%H%M%S)"
    fi
else
    echo "⚠️  VSCode가 설치되어 있지 않거나 실행된 적이 없습니다."
fi

# 5. 자동 시작 스크립트 생성
echo "🚀 자동 시작 스크립트 생성 중..."

AUTO_START_SCRIPT="$HOME/.ai-dev-auto-start.sh"
cat > "$AUTO_START_SCRIPT" << 'EOF'
#!/bin/bash

# AI 개발 시스템 자동 시작 스크립트

echo "🤖 AI 개발 시스템 자동 시작..."

# 프로젝트 디렉토리로 이동
PROJECT_DIR="$HOME/AI_FullAutoSystem/ai-dev-system"

if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    
    # 환경변수 로드
    export COPILOT_AUTO_ACCEPT=true
    export VSCODE_AUTO_SAVE=true
    
    # VSCode 실행
    if command -v code &> /dev/null; then
        echo "📝 VSCode 실행 중..."
        code . &
        sleep 3
    fi
    
    # 의존성 설치 (필요시)
    if [ ! -d "node_modules" ]; then
        echo "📦 의존성 설치 중..."
        npm install
    fi
    
    # 서버 시작
    echo "🚀 서버 시작 중..."
    npm start
else
    echo "❌ 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR"
    exit 1
fi
EOF

chmod +x "$AUTO_START_SCRIPT"
echo "✅ 자동 시작 스크립트 생성 완료: $AUTO_START_SCRIPT"

# 6. 설정 요약 출력
echo ""
echo "🎉 macOS 자동화 설정 완료!"
echo ""
echo "📋 설정 요약:"
echo "  ✅ 환경변수 설정됨"
echo "  ✅ Git 자동화 설정됨"
echo "  ✅ 개발 도구 확인됨"
echo "  ✅ 자동 시작 스크립트 생성됨"
echo ""
echo "🚀 사용 방법:"
echo "  1. 터미널 재시작 또는 'source $SHELL_RC' 실행"
echo "  2. 'ai_dev' 명령으로 AI 개발 시스템 시작"
echo "  3. '$AUTO_START_SCRIPT' 실행으로 완전 자동 시작"
echo ""
echo "💡 팁:"
echo "  - 'auto_yes <명령어>' 로 모든 확인에 자동으로 'y' 응답"
echo "  - 'auto_push' 로 자동 Git 커밋 및 푸시"
echo ""

# 즉시 환경변수 적용
source "$SHELL_RC" 2>/dev/null || true

echo "✨ 설정 완료! 새 터미널 세션에서 ai_dev 명령을 사용해보세요."
