# VSCode 완전 자동화 설정 가이드 v1.0

## 1. 개요

VSCode에서 개발 작업 중 자동화를 방해하는 확인 창, 프롬프트, 알림을 제거하고 완전 자동화 환경을 구축하는 가이드입니다.

## 2. GitHub Copilot 자동화 설정

### 2.1 자동 제안 수락 설정
```json
// settings.json
{
  // Copilot 자동 완성 설정
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "plaintext": true,
    "markdown": true
  },
  
  // 인라인 제안 자동 표시
  "editor.inlineSuggest.enabled": true,
  
  // 제안 자동 수락 (주의: 이 설정은 모든 제안을 자동 수락)
  "editor.acceptSuggestionOnEnter": "on",
  "editor.acceptSuggestionOnCommitCharacter": true,
  
  // 탭으로 제안 수락
  "editor.tabCompletion": "on",
  
  // Copilot 제안 지연 시간 단축
  "github.copilot.editor.enableAutoCompletions": true
}
```

### 2.2 Copilot Chat 자동화
```json
{
  // Copilot Chat 자동 응답
  "github.copilot.chat.welcomeMessage": "suppress",
  "github.copilot.chat.localeOverride": "en"
}
```

## 3. 파일 저장 자동화

### 3.1 자동 저장 설정
```json
{
  // 자동 저장 활성화
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000, // 1초 후 자동 저장
  
  // 포커스 변경 시 자동 저장
  "files.autoSave": "onFocusChange",
  
  // 창 전환 시 자동 저장
  "files.autoSave": "onWindowChange"
}
```

### 3.2 파일 작업 확인 무시
```json
{
  // 파일 삭제 확인 무시
  "explorer.confirmDelete": false,
  
  // 파일 이동/드래그 확인 무시
  "explorer.confirmDragAndDrop": false,
  
  // 빈 폴더 삭제 확인 무시
  "explorer.confirmPasteNative": false
}
```

## 4. 터미널 자동화

### 4.1 터미널 확인 프롬프트 무시
```json
{
  // 터미널 종료 확인 무시
  "terminal.integrated.confirmOnExit": "never",
  
  // 활성 터미널 종료 확인 무시
  "terminal.integrated.confirmOnKill": "never",
  
  // 터미널 프로세스 재사용
  "terminal.integrated.enablePersistentSessions": true,
  
  // 터미널 자동 응답
  "terminal.integrated.autoReplies": {
    "Terminate batch job (Y/N)?": "Y\r",
    "Are you sure you want to continue? (y/N)": "y\r",
    "Do you want to save your changes? (y/n)": "y\r"
  }
}
```

### 4.2 Git 작업 자동화
```json
{
  // Git 작업 확인 무시
  "git.confirmSync": false,
  "git.confirmEmptyCommits": false,
  "git.confirmForcePush": false,
  
  // 자동 페치
  "git.autofetch": true,
  "git.autofetchPeriod": 180, // 3분마다
  
  // 자동 스테이징
  "git.enableSmartCommit": true,
  "git.smartCommitChanges": "all"
}
```

## 5. 확장 프로그램 알림 제어

### 5.1 알림 및 팝업 무시
```json
{
  // 확장 프로그램 추천 무시
  "extensions.ignoreRecommendations": true,
  
  // 확장 프로그램 업데이트 알림 무시
  "extensions.autoUpdate": true,
  "extensions.autoCheckUpdates": false,
  
  // 시작 시 팁 무시
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  
  // 환영 페이지 무시
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  
  // 업데이트 알림 무시
  "update.mode": "none"
}
```

### 5.2 에디터 방해 요소 제거
```json
{
  // 미니맵 숨기기
  "editor.minimap.enabled": false,
  
  // 코드 렌즈 비활성화
  "editor.codeLens": false,
  
  // 인라인 힌트 제한
  "editor.inlayHints.enabled": "off",
  
  // 팝업 지연 시간 증가
  "editor.hover.delay": 3000,
  
  // 파라미터 힌트 비활성화
  "editor.parameterHints.enabled": false
}
```

## 6. 작업 자동화 스크립트

### 6.1 VSCode 작업 자동화 (tasks.json)
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto Development",
      "type": "shell",
      "command": "npm run dev",
      "problemMatcher": [],
      "isBackground": true,
      "runOptions": {
        "runOn": "folderOpen"  // 폴더 열 때 자동 실행
      },
      "presentation": {
        "reveal": "silent",    // 터미널 숨김
        "panel": "dedicated"
      }
    }
  ]
}
```

### 6.2 키보드 단축키로 자동화 (keybindings.json)
```json
[
  {
    // Copilot 제안 즉시 수락
    "key": "tab",
    "command": "acceptSelectedSuggestion",
    "when": "suggestWidgetVisible && textInputFocus"
  },
  {
    // 모든 파일 저장
    "key": "ctrl+shift+s",
    "command": "workbench.action.files.saveAll"
  },
  {
    // 터미널 명령 자동 실행
    "key": "ctrl+shift+enter",
    "command": "workbench.action.terminal.runSelectedText"
  }
]
```

## 7. AI 개발 시스템 전용 설정

### 7.1 AI 자동 개발용 workspace 설정
```json
// ai-dev-system.code-workspace
{
  "folders": [
    {
      "path": "."
    }
  ],
  "settings": {
    // AI 개발 시스템 전용 설정
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 500,
    
    // Copilot 최대 활용
    "github.copilot.enable": {
      "*": true
    },
    "github.copilot.editor.enableAutoCompletions": true,
    
    // 모든 확인 무시
    "explorer.confirmDelete": false,
    "explorer.confirmDragAndDrop": false,
    "git.confirmSync": false,
    "terminal.integrated.confirmOnExit": "never",
    
    // 자동 포맷팅
    "editor.formatOnSave": true,
    "editor.formatOnPaste": true,
    "editor.formatOnType": true
  },
  "extensions": {
    "recommendations": [
      "github.copilot",
      "github.copilot-chat",
      "ms-vscode.vscode-typescript-next"
    ]
  }
}
```

### 7.2 자동화 헬퍼 스크립트
```javascript
// auto-dev-helper.js
const vscode = require('vscode');

// Copilot 제안 자동 수락
function autoAcceptCopilotSuggestions() {
  const interval = setInterval(() => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      vscode.commands.executeCommand('acceptSelectedSuggestion');
    }
  }, 2000); // 2초마다 체크
  
  return interval;
}

// 자동 저장 강제 실행
function forceAutoSave() {
  setInterval(() => {
    vscode.commands.executeCommand('workbench.action.files.saveAll');
  }, 30000); // 30초마다 모든 파일 저장
}

// 활성화
exports.activate = function(context) {
  autoAcceptCopilotSuggestions();
  forceAutoSave();
};
```

## 8. 운영체제별 추가 설정

### 8.1 Windows
```powershell
# PowerShell 실행 정책 설정 (관리자 권한)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 자동 응답 스크립트
$env:COPILOT_AUTO_ACCEPT = "true"
```

### 8.2 macOS
```bash
# .zshrc 또는 .bash_profile에 추가
export COPILOT_AUTO_ACCEPT=true
export VSCODE_AUTO_SAVE=true

# 자동 응답 함수
function auto_yes() {
  yes | "$@"
}
```

### 8.3 Linux
```bash
# .bashrc에 추가
alias code='code --disable-gpu-sandbox'
export COPILOT_AUTO_ACCEPT=true

# 자동 응답 설정
yes | command
```

## 9. 완전 자동화 체크리스트

### 9.1 필수 설정 확인
- [ ] 자동 저장 활성화
- [ ] Copilot 자동 제안 설정
- [ ] 터미널 자동 응답 설정
- [ ] 확인 대화상자 모두 비활성화
- [ ] Git 자동 동기화 설정

### 9.2 선택 설정
- [ ] 미니맵 비활성화
- [ ] 코드 렌즈 비활성화
- [ ] 시작 페이지 비활성화
- [ ] 업데이트 알림 비활성화

## 10. 트러블슈팅

### 10.1 Copilot이 계속 확인을 요구할 때
```json
{
  "github.copilot.editor.enableCodeActions": true,
  "github.copilot.editor.iterativeFixing": false
}
```

### 10.2 자동 저장이 작동하지 않을 때
1. 파일 → 기본 설정 → 설정
2. "auto save" 검색
3. "Files: Auto Save"를 "afterDelay"로 변경

### 10.3 터미널 명령이 멈출 때
```bash
# 자동 응답 wrapper 스크립트
#!/bin/bash
echo "y" | your-command
```

---

*이 설정들을 적용하면 VSCode에서 완전 자동화된 개발 환경을 구축할 수 있습니다.*

*주의: 일부 자동화 설정은 보안 위험이 있을 수 있으니 프로젝트 특성에 맞게 조정하세요.*