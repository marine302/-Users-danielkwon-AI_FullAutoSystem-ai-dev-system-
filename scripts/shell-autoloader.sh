#!/bin/bash

# AI Development System - Shell Auto-loader
# 이 스크립트는 .bashrc, .zshrc 등에 자동으로 추가되어 터미널 자동화를 활성화합니다.

# ============================================================================
# 자동 로드 설정
# ============================================================================

AI_DEV_SYSTEM_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
AI_DEV_AUTOMATION_ENV="$AI_DEV_SYSTEM_DIR/.env.automation"

# .env.automation 파일이 존재하면 로드
if [[ -f "$AI_DEV_AUTOMATION_ENV" ]]; then
    source "$AI_DEV_AUTOMATION_ENV"
fi

# ============================================================================
# 자동 설치 함수
# ============================================================================

install_automation_to_shell() {
    local shell_rc=""
    local current_shell=$(basename "$SHELL")
    
    case "$current_shell" in
        "zsh")
            shell_rc="$HOME/.zshrc"
            ;;
        "bash")
            shell_rc="$HOME/.bashrc"
            ;;
        "fish")
            shell_rc="$HOME/.config/fish/config.fish"
            ;;
        *)
            echo "지원되지 않는 셸: $current_shell"
            return 1
            ;;
    esac
    
    local source_line="source \"$AI_DEV_SYSTEM_DIR/scripts/shell-autoloader.sh\""
    
    # 이미 추가되어 있는지 확인
    if ! grep -q "shell-autoloader.sh" "$shell_rc" 2>/dev/null; then
        echo "" >> "$shell_rc"
        echo "# AI Development System - Terminal Automation" >> "$shell_rc"
        echo "$source_line" >> "$shell_rc"
        echo "✅ $shell_rc에 자동화 설정이 추가되었습니다."
        echo "새 터미널을 열거나 'source $shell_rc'를 실행하세요."
    else
        echo "ℹ️  자동화 설정이 이미 $shell_rc에 존재합니다."
    fi
}

# ============================================================================
# 프로젝트별 자동 설정
# ============================================================================

setup_project_automation() {
    local project_dir="$PWD"
    
    # VS Code 워크스페이스인지 확인
    if [[ -d ".vscode" ]]; then
        echo "🔧 VS Code 워크스페이스 감지됨 - 자동화 설정 적용 중..."
        
        # 환경 변수 자동 적용
        export CI=true
        export npm_config_yes=true
        export COPILOT_AUTO_ACCEPT=true
        export AI_DEV_AUTO_MODE=true
        
        # NPM 설정
        if [[ -f "package.json" ]]; then
            npm config set yes true 2>/dev/null || true
            npm config set audit false 2>/dev/null || true
            npm config set fund false 2>/dev/null || true
            echo "📦 NPM 자동화 설정 완료"
        fi
        
        # Git 설정
        if [[ -d ".git" ]]; then
            git config --local init.defaultBranch main 2>/dev/null || true
            git config --local push.default simple 2>/dev/null || true
            git config --local pull.rebase false 2>/dev/null || true
            echo "🔀 Git 자동화 설정 완료"
        fi
        
        echo "✨ 프로젝트 자동화 설정 완료!"
    fi
}

# ============================================================================
# 자동 실행 함수들
# ============================================================================

# expect 스타일 자동 응답
auto_expect() {
    local command="$*"
    
    # expect가 설치되어 있다면 사용
    if command -v expect &> /dev/null; then
        expect -c "
            spawn $command
            expect {
                -re \"(Do you want to|Would you like to|Continue|Proceed|Are you sure)\" {
                    send \"y\r\"
                    exp_continue
                }
                -re \"(계속하시겠습니까|설치하시겠습니까)\" {
                    send \"y\r\"
                    exp_continue
                }
                -re \"(Press any key|Press Enter)\" {
                    send \"\r\"
                    exp_continue
                }
                eof
            }
        "
    else
        # expect가 없다면 환경 변수로 처리
        CI=true npm_config_yes=true DEBIAN_FRONTEND=noninteractive $command
    fi
}

# 완전 자동 설치
auto_install() {
    echo "🔄 자동 설치 시작..."
    
    if [[ -f "package.json" ]]; then
        auto_expect npm install
        echo "✅ NPM 패키지 설치 완료"
    fi
    
    if [[ -f "requirements.txt" ]]; then
        auto_expect pip install -r requirements.txt
        echo "✅ Python 패키지 설치 완료"
    fi
    
    if [[ -f "Gemfile" ]]; then
        auto_expect bundle install
        echo "✅ Ruby Gem 설치 완료"
    fi
}

# 완전 자동 시작
auto_start() {
    echo "🚀 자동 시작..."
    
    if [[ -f "package.json" ]]; then
        # 백그라운드에서 서버 시작
        nohup npm start > /dev/null 2>&1 &
        local pid=$!
        echo "✅ 서버가 백그라운드에서 시작되었습니다 (PID: $pid)"
        
        # 포트 확인
        sleep 2
        if lsof -i :3000 &> /dev/null; then
            echo "🌐 서버가 http://localhost:3000 에서 실행 중입니다"
        fi
    fi
}

# 완전 자동 테스트
auto_test() {
    echo "🧪 자동 테스트 실행..."
    auto_expect npm test
}

# 완전 자동 빌드
auto_build() {
    echo "🔨 자동 빌드 실행..."
    auto_expect npm run build
}

# ============================================================================
# 명령행 인터페이스
# ============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # 스크립트가 직접 실행된 경우
    case "${1:-help}" in
        "install-shell")
            install_automation_to_shell
            ;;
        "setup")
            setup_project_automation
            ;;
        "install")
            auto_install
            ;;
        "start")
            auto_start
            ;;
        "test")
            auto_test
            ;;
        "build")
            auto_build
            ;;
        "help"|"-h"|"--help")
            echo "AI Development System - Shell Auto-loader"
            echo ""
            echo "사용법: $0 [명령]"
            echo ""
            echo "명령:"
            echo "  install-shell  - 셸 프로파일에 자동화 설정 추가"
            echo "  setup         - 현재 프로젝트에 자동화 설정 적용"
            echo "  install       - 자동 의존성 설치"
            echo "  start         - 자동 서버 시작"
            echo "  test          - 자동 테스트 실행"
            echo "  build         - 자동 빌드 실행"
            echo "  help          - 이 도움말 표시"
            echo ""
            ;;
        *)
            echo "알 수 없는 명령: $1"
            echo "'$0 help'를 실행하여 도움말을 확인하세요."
            ;;
    esac
else
    # 스크립트가 source로 로드된 경우
    setup_project_automation
fi
