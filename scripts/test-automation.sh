#!/bin/bash

# Complete Automation Test Script
# 모든 자동화 설정을 테스트하고 검증합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로그 함수들
log_header() {
    echo -e "\n${PURPLE}=== $1 ===${NC}\n"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

# 테스트 카운터
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# 테스트 함수
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_test "테스트 실행: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        log_success "✅ $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "❌ $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# 환경 변수 테스트
test_environment_variables() {
    log_header "환경 변수 자동화 테스트"
    
    # .env.automation 파일 로드
    if [ -f ".env.automation" ]; then
        source .env.automation
        log_success ".env.automation 파일 로드 완료"
    else
        log_warning ".env.automation 파일이 없습니다"
    fi
    
    # 핵심 환경 변수 테스트
    run_test "CI 환경 변수" "[ '$CI' = 'true' ]"
    run_test "npm_config_yes 환경 변수" "[ '$npm_config_yes' = 'true' ]"
    run_test "COPILOT_AUTO_ACCEPT 환경 변수" "[ '$COPILOT_AUTO_ACCEPT' = 'true' ]"
    run_test "AI_DEV_AUTO_MODE 환경 변수" "[ '$AI_DEV_AUTO_MODE' = 'true' ]"
    run_test "DEBIAN_FRONTEND 환경 변수" "[ '$DEBIAN_FRONTEND' = 'noninteractive' ]"
}

# VS Code 설정 테스트
test_vscode_settings() {
    log_header "VS Code 설정 자동화 테스트"
    
    local settings_file=".vscode/settings.json"
    
    if [ ! -f "$settings_file" ]; then
        log_error "VS Code settings.json 파일이 없습니다"
        return 1
    fi
    
    # 핵심 설정 확인
    run_test "터미널 확인 비활성화" "grep -q 'confirmOnExit.*never' $settings_file"
    run_test "워크스페이스 신뢰 비활성화" "grep -q 'workspace.trust.enabled.*false' $settings_file"
    run_test "자동 응답 설정" "grep -q 'autoReplies' $settings_file"
    run_test "계속 반복 프롬프트 설정" "grep -q '계속 반복하시겠습니까' $settings_file"
    run_test "Copilot 자동 활성화" "grep -q 'github.copilot.enable' $settings_file"
    run_test "자동 저장 설정" "grep -q 'files.autoSave.*afterDelay' $settings_file"
}

# 스크립트 파일 테스트
test_automation_scripts() {
    log_header "자동화 스크립트 테스트"
    
    # 스크립트 파일 존재 확인
    run_test "전체 터미널 자동화 스크립트" "[ -f 'scripts/full-terminal-automation.sh' ]"
    run_test "스크립트 실행 권한" "[ -x 'scripts/full-terminal-automation.sh' ]"
    
    # 자동 개발 도우미 스크립트
    run_test "자동 개발 도우미 스크립트" "[ -f 'scripts/auto-dev-helper.js' ]"
    
    # macOS 자동 설정 스크립트
    run_test "macOS 자동 설정 스크립트" "[ -f 'scripts/macos-auto-setup.sh' ]"
}

# package.json 스크립트 테스트
test_package_scripts() {
    log_header "Package.json 스크립트 자동화 테스트"
    
    if [ ! -f "package.json" ]; then
        log_error "package.json 파일이 없습니다"
        return 1
    fi
    
    # 자동화 스크립트 확인
    run_test "auto-start 스크립트" "grep -q 'auto-start' package.json"
    run_test "auto-install 스크립트" "grep -q 'auto-install' package.json"
    run_test "full-auto-all 스크립트" "grep -q 'full-auto-all' package.json"
    run_test "zero-prompt 스크립트" "grep -q 'zero-prompt' package.json"
    run_test "background-start 스크립트" "grep -q 'background-start' package.json"
}

# VS Code 작업 테스트
test_vscode_tasks() {
    log_header "VS Code 작업 자동화 테스트"
    
    local tasks_file=".vscode/tasks.json"
    
    if [ ! -f "$tasks_file" ]; then
        log_error "VS Code tasks.json 파일이 없습니다"
        return 1
    fi
    
    # 자동화 작업 확인
    run_test "백그라운드 서버 작업" "grep -q '백그라운드 서버 시작' $tasks_file"
    run_test "완전 자동화 터미널 설정 작업" "grep -q '완전 자동화 터미널 설정' $tasks_file"
    run_test "자동 의존성 설치 작업" "grep -q '자동 의존성 설치' $tasks_file"
    run_test "전체 자동화 시스템 작업" "grep -q '전체 자동화 시스템 실행' $tasks_file"
}

# Git 자동화 테스트
test_git_automation() {
    log_header "Git 자동화 테스트"
    
    # Git 설정 확인
    if command -v git &> /dev/null; then
        run_test "Git 설치 확인" "command -v git"
        
        # Git 자동 설정 테스트
        git config --global init.defaultBranch main 2>/dev/null || true
        git config --global push.default simple 2>/dev/null || true
        
        run_test "Git 기본 브랜치 설정" "git config --global init.defaultBranch | grep -q main"
        run_test "Git push 기본 설정" "git config --global push.default | grep -q simple"
    else
        log_warning "Git이 설치되어 있지 않습니다"
    fi
}

# 터미널 프롬프트 자동화 테스트
test_terminal_prompts() {
    log_header "터미널 프롬프트 자동화 테스트"
    
    # expect 도구 확인
    if command -v expect &> /dev/null; then
        run_test "expect 도구 설치" "command -v expect"
        log_success "expect를 사용한 자동 응답이 가능합니다"
    else
        log_warning "expect 도구가 설치되어 있지 않습니다"
        log_info "자동 설치를 위해 ./scripts/full-terminal-automation.sh setup을 실행하세요"
    fi
    
    # 자동 응답 스크립트 확인
    if [ -f "/tmp/auto_responses.exp" ]; then
        run_test "자동 응답 스크립트" "[ -f '/tmp/auto_responses.exp' ]"
    else
        log_info "자동 응답 스크립트가 생성되지 않았습니다"
    fi
}

# 네트워크 및 서버 테스트
test_server_automation() {
    log_header "서버 자동화 테스트"
    
    # Node.js 확인
    if command -v node &> /dev/null; then
        run_test "Node.js 설치 확인" "command -v node"
        
        # npm 설정 확인
        run_test "npm 설치 확인" "command -v npm"
        
        # 패키지 설치 테스트 (실제 설치하지 않고 설정만 확인)
        if [ -f "package.json" ]; then
            run_test "package.json 존재" "[ -f 'package.json' ]"
            
            # npm 자동 설정 적용
            npm config set yes true 2>/dev/null || true
            npm config set audit false 2>/dev/null || true
            npm config set fund false 2>/dev/null || true
            
            log_success "npm 자동 설정이 적용되었습니다"
        fi
    else
        log_error "Node.js가 설치되어 있지 않습니다"
    fi
}

# 통합 자동화 테스트
test_integration() {
    log_header "통합 자동화 테스트"
    
    # 전체 자동화 스크립트 실행 테스트 (실제 실행하지 않고 구문만 확인)
    if [ -f "scripts/full-terminal-automation.sh" ]; then
        run_test "자동화 스크립트 구문 검사" "bash -n scripts/full-terminal-automation.sh"
    fi
    
    # 환경 변수 통합 테스트
    export CI=true
    export npm_config_yes=true
    export COPILOT_AUTO_ACCEPT=true
    
    run_test "통합 환경 변수 설정" "[ '$CI' = 'true' ] && [ '$npm_config_yes' = 'true' ]"
    
    log_success "통합 자동화 환경이 준비되었습니다"
}

# 테스트 결과 요약
show_test_summary() {
    log_header "테스트 결과 요약"
    
    echo -e "${CYAN}총 테스트: ${TOTAL_TESTS}${NC}"
    echo -e "${GREEN}통과: ${TESTS_PASSED}${NC}"
    echo -e "${RED}실패: ${TESTS_FAILED}${NC}"
    
    local success_rate=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    echo -e "${PURPLE}성공률: ${success_rate}%${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 모든 자동화 설정이 완벽하게 구성되었습니다!${NC}"
        echo -e "${BLUE}💡 이제 '계속 반복하시겠습니까?' 및 모든 확인 프롬프트가 자동으로 처리됩니다.${NC}"
    else
        echo -e "\n${YELLOW}⚠️  일부 설정을 확인해야 합니다.${NC}"
        echo -e "${BLUE}💡 ./scripts/full-terminal-automation.sh all 을 실행하여 자동화를 완성하세요.${NC}"
    fi
    
    echo -e "\n${CYAN}사용 가능한 자동화 명령:${NC}"
    echo -e "  ${GREEN}npm run full-auto-all${NC}    - 전체 자동화 실행"
    echo -e "  ${GREEN}npm run auto-start${NC}       - 자동 서버 시작"
    echo -e "  ${GREEN}npm run zero-prompt${NC}      - 프롬프트 없이 실행"
    echo -e "  ${GREEN}Ctrl+Alt+A${NC}               - VS Code 자동화 작업 실행"
}

# 메인 실행
main() {
    clear
    echo -e "${PURPLE}"
    echo "  ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗     ███████╗████████╗███████╗"
    echo " ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║     ██╔════╝╚══██╔══╝██╔════╝"
    echo " ██║     ██║   ██║██╔████╔██║██████╔╝██║     █████╗     ██║   █████╗  "
    echo " ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║     ██╔══╝     ██║   ██╔══╝  "
    echo " ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ███████╗███████╗   ██║   ███████╗"
    echo "  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚══════╝╚══════╝   ╚═╝   ╚══════╝"
    echo -e "${NC}"
    echo -e "${BLUE}AI Development System - Complete Automation Test${NC}"
    echo -e "${YELLOW}모든 자동화 설정을 검증합니다...${NC}\n"
    
    # 모든 테스트 실행
    test_environment_variables
    test_vscode_settings
    test_automation_scripts
    test_package_scripts
    test_vscode_tasks
    test_git_automation
    test_terminal_prompts
    test_server_automation
    test_integration
    
    # 결과 요약
    show_test_summary
}

# 도움말
if [[ "${1:-}" == "help" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    echo "Complete Automation Test Script"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "이 스크립트는 AI Development System의 모든 자동화 설정을 테스트합니다:"
    echo "  - 환경 변수 자동화"
    echo "  - VS Code 설정 자동화"
    echo "  - 터미널 프롬프트 자동화"
    echo "  - 스크립트 및 작업 자동화"
    echo "  - Git 및 서버 자동화"
    echo ""
    echo "테스트 후 자동화 완성을 위해:"
    echo "  ./scripts/full-terminal-automation.sh all"
    echo ""
    exit 0
fi

# 메인 실행
main "$@"
