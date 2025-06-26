# VSCode 완전 자동화 설정 가이드 v1.0

## 1. 개요

VSCode에서 개발 작업 중 자동화를 방해하는 확인 창, 프롬프트, 알림을 제거하고 완전 자동화 환경을 구축하는 가이드입니다.

## 2. 빠른 시작

### 2.1 자동 설정 스크립트 실행 (추천)
```bash
# macOS용 자동 설정
./scripts/macos-auto-setup.sh

# Node.js 자동화 헬퍼
node scripts/auto-dev-helper.js setup
```

### 2.2 수동 설정
아래 섹션들을 참고하여 수동으로 설정 가능합니다.

## 3. 핵심 자동화 설정

### 3.1 VSCode 설정 (.vscode/settings.json)
```json
{
  // 자동 저장
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 500,
  
  // 확인창 모두 무시
  "explorer.confirmDelete": false,
  "explorer.confirmDragAndDrop": false,
  "explorer.confirmPasteNative": false,
  "terminal.integrated.confirmOnExit": "never",
  "terminal.integrated.confirmOnKill": "never",
  
  // Copilot 완전 자동화
  "github.copilot.enable": { "*": true },
  "github.copilot.editor.enableCodeActions": true,
  "editor.inlineSuggest.enabled": true,
  
  // Git 자동화
  "git.confirmSync": false,
  "git.confirmEmptyCommits": false,
  "git.confirmForcePush": false,
  "git.enableSmartCommit": true,
  "git.autofetch": true,
  
  // 자동 포맷팅
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.formatOnType": true,
  
  // 방해 요소 제거
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  "update.mode": "none",
  "extensions.ignoreRecommendations": true,
  
  // 터미널 자동 응답
  "terminal.integrated.autoReplies": {
    "Terminate batch job (Y/N)?": "Y\r",
    "Are you sure you want to continue? (y/N)": "y\r",
    "Do you want to save your changes? (y/n)": "y\r"
  }
}
```

### 3.2 키보드 단축키 (.vscode/keybindings.json)
```json
[
  {
    "key": "tab",
    "command": "acceptSelectedSuggestion",
    "when": "suggestWidgetVisible && textInputFocus"
  },
  {
    "key": "tab",
    "command": "editor.action.inlineSuggest.commit",
    "when": "inlineSuggestionVisible && !editorTabMovesFocus"
  }
]
```

## 4. 자동화 기능들

### 4.1 현재 적용된 자동화
- ✅ **자동 저장**: 500ms 후 자동 저장
- ✅ **Copilot 자동 제안**: 모든 파일 타입에서 활성화
- ✅ **확인창 제거**: 모든 삭제/이동 확인창 비활성화
- ✅ **Git 자동화**: 확인 없이 동기화, 커밋, 푸시
- ✅ **터미널 자동 응답**: 일반적인 Y/N 질문 자동 응답
- ✅ **자동 포맷팅**: 저장/붙여넣기/입력 시 자동 포맷팅
- ✅ **알림 제거**: 팁, 업데이트, 추천 알림 비활성화

### 4.2 키보드 자동화
- `Tab`: Copilot 제안 자동 수락
- `Ctrl+Shift+S`: 모든 파일 저장
- `Ctrl+Shift+G`: Git 빠른 커밋
- `Ctrl+Alt+G`: AI 코드 생성

### 4.3 작업 자동화
- **폴더 열기 시**: 자동으로 개발 서버 시작
- **파일 변경 시**: 자동 저장 → 자동 포맷팅 → 자동 테스트
- **Git 작업**: 자동 페치, 스마트 커밋

## 5. 환경변수 설정

### 5.1 자동 설정된 환경변수
```bash
export COPILOT_AUTO_ACCEPT=true
export VSCODE_AUTO_SAVE=true
export AI_DEV_AUTO_MODE=true
export GIT_AUTO_COMMIT=false  # 선택사항
```

### 5.2 쉘 함수
```bash
# 자동 응답 함수
function auto_yes() {
  yes | "$@"
}

# AI 개발 시스템 빠른 시작
function ai_dev() {
  cd ~/AI_FullAutoSystem/ai-dev-system
  code .
  npm start
}

# 자동 Git 푸시
function auto_push() {
  git add .
  git commit -m "Auto commit: $(date)"
  git push
}
```

## 6. 고급 자동화 옵션

### 6.1 완전 자동 Git 커밋 (주의 필요)
```bash
# 5분마다 자동 커밋 (선택사항)
export GIT_AUTO_COMMIT=true
```

### 6.2 AI 자동 코드 생성 모드
```bash
# Copilot 제안 즉시 수락 (주의 필요)
export COPILOT_INSTANT_ACCEPT=true
```

### 6.3 무음 모드
```bash
# 모든 출력 숨기기
export AI_DEV_SILENT=true
```

## 7. 사용법

### 7.1 기본 사용법
```bash
# 1. 프로젝트 열기
ai_dev

# 2. 또는 수동으로
cd ~/AI_FullAutoSystem/ai-dev-system
code .
npm start
```

### 7.2 자동화 모드 시작
```bash
# 완전 자동화 모드
node scripts/auto-dev-helper.js start

# 또는 스크립트로
~/.ai-dev-auto-start.sh
```

### 7.3 개발 워크플로우
1. **파일 편집**: 자동 저장 → 자동 포맷팅
2. **코딩**: Copilot 제안 → Tab으로 수락
3. **테스트**: 자동으로 백그라운드 실행
4. **커밋**: `auto_push` 명령으로 자동 커밋

## 8. 트러블슈팅

### 8.1 자동 저장이 작동하지 않을 때
```bash
# VSCode 설정 확인
code ~/.vscode/settings.json
```

### 8.2 Copilot 제안이 나타나지 않을 때
```bash
# Copilot 로그인 확인
code --command github.copilot.signIn
```

### 8.3 터미널 자동 응답이 작동하지 않을 때
```bash
# 터미널 설정 리셋
rm -rf ~/.vscode/terminal/
```

### 8.4 Git 자동화 문제
```bash
# Git 설정 확인
git config --list | grep -E "(confirm|auto)"
```

## 9. 보안 고려사항

### 9.1 주의사항
- ⚠️ **자동 커밋**: 민감한 데이터 실수 커밋 위험
- ⚠️ **확인창 제거**: 실수로 파일 삭제 위험
- ⚠️ **Copilot 자동 수락**: 부적절한 코드 수락 위험

### 9.2 안전 설정
```json
{
  // 민감한 파일 제외
  "files.exclude": {
    "**/.env": true,
    "**/secrets/**": true,
    "**/private/**": true
  },
  
  // Git 자동 커밋 제한
  "git.smartCommitChanges": "tracked"
}
```

## 10. 커스터마이징

### 10.1 개인 설정 추가
```bash
# 개인용 자동화 스크립트
echo 'alias my-dev="ai_dev && echo 개발 시작!"' >> ~/.zshrc
```

### 10.2 프로젝트별 설정
```json
// .vscode/settings.json (프로젝트별)
{
  "files.autoSaveDelay": 1000,  // 더 긴 지연
  "git.smartCommitChanges": "all"  // 모든 변경사항 커밋
}
```

## 11. 성능 최적화

### 11.1 빠른 시작을 위한 설정
- 불필요한 확장 프로그램 비활성화
- 자동 저장 지연 시간 최적화
- Git 자동 페치 간격 조정

### 11.2 리소스 사용량 모니터링
```bash
# VSCode 프로세스 모니터링
ps aux | grep "Visual Studio Code"

# 메모리 사용량 확인
top -p $(pgrep -f "Visual Studio Code")
```

---

## 📋 완전 자동화 체크리스트

- [ ] 자동 저장 활성화 (500ms)
- [ ] Copilot 모든 파일 타입 활성화
- [ ] 확인 대화상자 모두 비활성화
- [ ] 터미널 자동 응답 설정
- [ ] Git 자동화 설정
- [ ] 자동 포맷팅 활성화
- [ ] 키보드 단축키 설정
- [ ] 환경변수 설정
- [ ] 자동 시작 스크립트 설정
- [ ] 방해 요소 제거 설정

---

*🤖 AI 개발 시스템 - 완전 자동화로 개발 생산성을 극대화하세요!*
