/**
 * 실시간 코드 협업 및 공유 플랫폼
 * 팀 개발을 위한 고급 협업 기능
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class CodeCollaborationPlatform {
  constructor() {
    this.sessions = new Map(); // 활성 협업 세션
    this.codeSnippets = new Map(); // 공유 코드 스니펫
    this.rooms = new Map(); // 협업 룸
    this.userProfiles = new Map(); // 사용자 프로필
    this.projectWorkspaces = new Map(); // 프로젝트 워크스페이스
    
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      const collaborationDir = path.join(process.cwd(), 'data', 'collaboration');
      await fs.mkdir(collaborationDir, { recursive: true });
      
      const subdirs = ['sessions', 'snippets', 'projects', 'templates'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(collaborationDir, subdir), { recursive: true });
      }
    } catch (error) {
      console.error('협업 저장소 초기화 오류:', error);
    }
  }

  /**
   * 새로운 협업 세션 생성
   */
  async createCollaborationSession(options = {}) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      name: options.name || `협업 세션 ${sessionId.slice(0, 8)}`,
      creator: options.creator || 'anonymous',
      created_at: new Date().toISOString(),
      participants: [],
      code_state: {
        files: {},
        current_file: null,
        language: options.language || 'javascript'
      },
      chat_history: [],
      permissions: {
        can_edit: options.canEdit || ['creator'],
        can_view: options.canView || ['all'],
        is_public: options.isPublic || false
      },
      settings: {
        auto_save: options.autoSave !== false,
        sync_cursors: options.syncCursors !== false,
        real_time_compilation: options.realTimeCompilation || false,
        ai_assistance: options.aiAssistance !== false
      },
      activity_log: [],
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    await this.saveSessionToDisk(session);

    console.log(`새 협업 세션 생성됨: ${sessionId}`);
    return session;
  }

  /**
   * 협업 세션에 참가
   */
  async joinSession(sessionId, userInfo) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('세션을 찾을 수 없습니다.');
    }

    const participant = {
      id: userInfo.id || uuidv4(),
      name: userInfo.name || 'Anonymous',
      email: userInfo.email,
      joined_at: new Date().toISOString(),
      cursor_position: { line: 0, column: 0 },
      current_file: null,
      status: 'online',
      role: this.determineUserRole(session, userInfo)
    };

    session.participants.push(participant);
    session.activity_log.push({
      timestamp: new Date().toISOString(),
      type: 'user_joined',
      user: participant.name,
      details: `${participant.name}님이 세션에 참가했습니다.`
    });

    await this.saveSessionToDisk(session);
    return { session, participant };
  }

  /**
   * 사용자 역할 결정
   */
  determineUserRole(session, userInfo) {
    if (userInfo.id === session.creator) return 'creator';
    if (session.permissions.can_edit.includes(userInfo.id) || 
        session.permissions.can_edit.includes('all')) return 'editor';
    return 'viewer';
  }

  /**
   * 코드 변경 사항 동기화
   */
  async syncCodeChange(sessionId, change) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('세션을 찾을 수 없습니다.');
    }

    const { userId, fileName, content, operation, position } = change;
    
    // 파일 상태 업데이트
    if (!session.code_state.files[fileName]) {
      session.code_state.files[fileName] = {
        content: '',
        language: this.detectLanguage(fileName),
        last_modified: new Date().toISOString(),
        version: 1
      };
    }

    const file = session.code_state.files[fileName];
    
    switch (operation) {
      case 'insert':
        file.content = this.applyInsert(file.content, content, position);
        break;
      case 'delete':
        file.content = this.applyDelete(file.content, position);
        break;
      case 'replace':
        file.content = content;
        break;
    }

    file.last_modified = new Date().toISOString();
    file.version += 1;

    // 활동 로그 추가
    session.activity_log.push({
      timestamp: new Date().toISOString(),
      type: 'code_change',
      user: userId,
      file: fileName,
      operation,
      details: `${fileName} 파일이 수정되었습니다.`
    });

    // 자동 저장
    if (session.settings.auto_save) {
      await this.saveSessionToDisk(session);
    }

    return {
      success: true,
      file_state: file,
      session_version: session.activity_log.length
    };
  }

  /**
   * 언어 감지
   */
  detectLanguage(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml'
    };
    return languageMap[ext] || 'text';
  }

  /**
   * 텍스트 삽입 적용
   */
  applyInsert(content, insertText, position) {
    const lines = content.split('\n');
    const { line, column } = position;
    
    if (line >= lines.length) {
      // 새 라인 추가
      while (lines.length <= line) {
        lines.push('');
      }
    }
    
    const targetLine = lines[line] || '';
    const beforeCursor = targetLine.slice(0, column);
    const afterCursor = targetLine.slice(column);
    
    lines[line] = beforeCursor + insertText + afterCursor;
    return lines.join('\n');
  }

  /**
   * 텍스트 삭제 적용
   */
  applyDelete(content, position) {
    const lines = content.split('\n');
    const { line, column, length = 1 } = position;
    
    if (line >= lines.length) return content;
    
    const targetLine = lines[line];
    const beforeCursor = targetLine.slice(0, column);
    const afterCursor = targetLine.slice(column + length);
    
    lines[line] = beforeCursor + afterCursor;
    return lines.join('\n');
  }

  /**
   * 커서 위치 동기화
   */
  async syncCursorPosition(sessionId, userId, position) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.find(p => p.id === userId);
    if (participant) {
      participant.cursor_position = position;
      participant.current_file = position.file;
      return true;
    }
    return false;
  }

  /**
   * 채팅 메시지 추가
   */
  async addChatMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('세션을 찾을 수 없습니다.');
    }

    const chatMessage = {
      id: uuidv4(),
      user: message.user,
      content: message.content,
      type: message.type || 'text', // text, code, system
      timestamp: new Date().toISOString(),
      reply_to: message.replyTo || null
    };

    session.chat_history.push(chatMessage);
    
    // 최근 100개 메시지만 유지
    if (session.chat_history.length > 100) {
      session.chat_history = session.chat_history.slice(-100);
    }

    await this.saveSessionToDisk(session);
    return chatMessage;
  }

  /**
   * 코드 스니펫 공유
   */
  async shareCodeSnippet(snippet) {
    const snippetId = uuidv4();
    const codeSnippet = {
      id: snippetId,
      title: snippet.title || 'Untitled Snippet',
      description: snippet.description || '',
      code: snippet.code,
      language: snippet.language || 'text',
      author: snippet.author || 'anonymous',
      created_at: new Date().toISOString(),
      tags: snippet.tags || [],
      visibility: snippet.visibility || 'public', // public, private, session
      session_id: snippet.sessionId || null,
      likes: 0,
      views: 0,
      comments: []
    };

    this.codeSnippets.set(snippetId, codeSnippet);
    await this.saveSnippetToDisk(codeSnippet);

    console.log(`코드 스니펫 공유됨: ${snippetId}`);
    return codeSnippet;
  }

  /**
   * 코드 스니펫 검색
   */
  async searchCodeSnippets(query, filters = {}) {
    const snippets = Array.from(this.codeSnippets.values());
    
    let filtered = snippets.filter(snippet => {
      // 가시성 필터
      if (filters.visibility && snippet.visibility !== filters.visibility) {
        return false;
      }
      
      // 언어 필터
      if (filters.language && snippet.language !== filters.language) {
        return false;
      }
      
      // 태그 필터
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          snippet.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      
      // 텍스트 검색
      if (query) {
        const searchText = query.toLowerCase();
        return (
          snippet.title.toLowerCase().includes(searchText) ||
          snippet.description.toLowerCase().includes(searchText) ||
          snippet.code.toLowerCase().includes(searchText) ||
          snippet.tags.some(tag => tag.toLowerCase().includes(searchText))
        );
      }
      
      return true;
    });

    // 정렬
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // 페이지네이션
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      snippets: filtered.slice(start, end),
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limit)
    };
  }

  /**
   * 프로젝트 워크스페이스 생성
   */
  async createProjectWorkspace(projectInfo) {
    const workspaceId = uuidv4();
    const workspace = {
      id: workspaceId,
      name: projectInfo.name,
      description: projectInfo.description || '',
      created_at: new Date().toISOString(),
      creator: projectInfo.creator,
      members: [projectInfo.creator],
      project_structure: {
        root: projectInfo.rootPath || `/workspace/${workspaceId}`,
        files: {},
        directories: []
      },
      collaboration_settings: {
        auto_invite: projectInfo.autoInvite || false,
        public_access: projectInfo.publicAccess || false,
        require_approval: projectInfo.requireApproval || true
      },
      development_tools: {
        git_integration: projectInfo.gitIntegration || false,
        ci_cd_enabled: projectInfo.ciCdEnabled || false,
        testing_framework: projectInfo.testingFramework || 'jest',
        linting_enabled: projectInfo.lintingEnabled || true
      },
      active_sessions: [],
      activity_feed: [],
      status: 'active'
    };

    this.projectWorkspaces.set(workspaceId, workspace);
    await this.saveWorkspaceToDisk(workspace);

    console.log(`프로젝트 워크스페이스 생성됨: ${workspaceId}`);
    return workspace;
  }

  /**
   * 실시간 코드 실행 (샌드박스)
   */
  async executeCodeInSandbox(code, language, options = {}) {
    try {
      // 보안을 위한 기본 제한사항
      const restrictions = {
        timeout: options.timeout || 5000,
        memory_limit: options.memoryLimit || '50MB',
        network_access: false,
        file_access: false
      };

      const execution = {
        id: uuidv4(),
        code,
        language,
        restrictions,
        started_at: new Date().toISOString(),
        status: 'running'
      };

      // 언어별 실행 로직 (실제 구현에서는 Docker 컨테이너 사용 권장)
      let result;
      switch (language) {
        case 'javascript':
          result = await this.executeJavaScript(code, restrictions);
          break;
        case 'python':
          result = await this.executePython(code, restrictions);
          break;
        default:
          throw new Error(`지원하지 않는 언어: ${language}`);
      }

      execution.completed_at = new Date().toISOString();
      execution.status = 'completed';
      execution.result = result;

      return execution;
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        completed_at: new Date().toISOString()
      };
    }
  }

  /**
   * JavaScript 코드 실행 (제한된 환경)
   */
  async executeJavaScript(code, restrictions) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('실행 시간 초과'));
      }, restrictions.timeout);

      try {
        // 안전한 실행을 위한 제한된 컨텍스트
        const safeGlobals = {
          console: {
            log: (...args) => console.log('[SANDBOX]', ...args)
          },
          Math,
          Date,
          JSON,
          setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 1000))
        };

        // eval 대신 Function 생성자 사용 (더 안전)
        const result = new Function('globals', `
          with (globals) {
            ${code}
          }
        `)(safeGlobals);

        clearTimeout(timeout);
        resolve({
          output: result,
          type: 'success'
        });
      } catch (error) {
        clearTimeout(timeout);
        resolve({
          output: error.message,
          type: 'error'
        });
      }
    });
  }

  /**
   * Python 코드 실행 (모의 구현)
   */
  async executePython(code, restrictions) {
    // 실제 구현에서는 Python 샌드박스 환경 필요
    return {
      output: '# Python 실행은 현재 모의 구현입니다\n# 실제 환경에서는 Docker 컨테이너를 사용하세요',
      type: 'info'
    };
  }

  /**
   * 세션 디스크 저장
   */
  async saveSessionToDisk(session) {
    try {
      const filePath = path.join(
        process.cwd(), 'data', 'collaboration', 'sessions', 
        `${session.id}.json`
      );
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error('세션 저장 오류:', error);
    }
  }

  /**
   * 스니펫 디스크 저장
   */
  async saveSnippetToDisk(snippet) {
    try {
      const filePath = path.join(
        process.cwd(), 'data', 'collaboration', 'snippets',
        `${snippet.id}.json`
      );
      await fs.writeFile(filePath, JSON.stringify(snippet, null, 2));
    } catch (error) {
      console.error('스니펫 저장 오류:', error);
    }
  }

  /**
   * 워크스페이스 디스크 저장
   */
  async saveWorkspaceToDisk(workspace) {
    try {
      const filePath = path.join(
        process.cwd(), 'data', 'collaboration', 'projects',
        `${workspace.id}.json`
      );
      await fs.writeFile(filePath, JSON.stringify(workspace, null, 2));
    } catch (error) {
      console.error('워크스페이스 저장 오류:', error);
    }
  }

  /**
   * 세션 통계
   */
  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      session_id: sessionId,
      name: session.name,
      participants_count: session.participants.length,
      files_count: Object.keys(session.code_state.files).length,
      messages_count: session.chat_history.length,
      activity_count: session.activity_log.length,
      created_at: session.created_at,
      duration: this.calculateSessionDuration(session),
      status: session.status
    };
  }

  /**
   * 전체 플랫폼 통계
   */
  getPlatformStats() {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'active');

    return {
      total_sessions: this.sessions.size,
      active_sessions: activeSessions.length,
      total_snippets: this.codeSnippets.size,
      total_workspaces: this.projectWorkspaces.size,
      total_participants: activeSessions.reduce(
        (sum, session) => sum + session.participants.length, 0
      ),
      popular_languages: this.getPopularLanguages(),
      recent_activity: this.getRecentActivity()
    };
  }

  /**
   * 인기 프로그래밍 언어 통계
   */
  getPopularLanguages() {
    const languageCount = {};
    
    this.sessions.forEach(session => {
      Object.values(session.code_state.files).forEach(file => {
        const lang = file.language;
        languageCount[lang] = (languageCount[lang] || 0) + 1;
      });
    });

    return Object.entries(languageCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([language, count]) => ({ language, count }));
  }

  /**
   * 최근 활동 가져오기
   */
  getRecentActivity() {
    const allActivities = [];
    
    this.sessions.forEach(session => {
      session.activity_log.forEach(activity => {
        allActivities.push({
          ...activity,
          session_id: session.id,
          session_name: session.name
        });
      });
    });

    return allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
  }

  /**
   * 세션 지속 시간 계산
   */
  calculateSessionDuration(session) {
    const start = new Date(session.created_at);
    const end = session.status === 'active' ? new Date() : new Date(session.ended_at || session.created_at);
    return Math.round((end - start) / 1000); // 초 단위
  }

  /**
   * 세션 정리 (비활성 세션 자동 종료)
   */
  async cleanupInactiveSessions() {
    const now = new Date();
    const maxInactiveTime = 24 * 60 * 60 * 1000; // 24시간

    for (const [sessionId, session] of this.sessions) {
      const lastActivity = session.activity_log.length > 0 
        ? new Date(session.activity_log[session.activity_log.length - 1].timestamp)
        : new Date(session.created_at);

      if (now - lastActivity > maxInactiveTime && session.status === 'active') {
        session.status = 'inactive';
        session.ended_at = now.toISOString();
        await this.saveSessionToDisk(session);
        console.log(`비활성 세션 정리됨: ${sessionId}`);
      }
    }
  }
}

export default CodeCollaborationPlatform;
