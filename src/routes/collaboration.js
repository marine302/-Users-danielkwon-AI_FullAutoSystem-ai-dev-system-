/**
 * 고급 코드 협업 API 라우터
 * 실시간 협업, 코드 공유, 프로젝트 워크스페이스 관리
 */

import express from 'express';
import { CodeCollaborationPlatform } from '../modules/collaboration/CodeCollaborationPlatform.js';

const router = express.Router();
const collaborationPlatform = new CodeCollaborationPlatform();

/**
 * POST /api/v1/collaboration/session/create
 * 새로운 협업 세션 생성
 */
router.post('/session/create', async (req, res) => {
  try {
    const {
      name,
      creator = 'anonymous',
      language = 'javascript',
      canEdit = ['creator'],
      canView = ['all'],
      isPublic = false,
      autoSave = true,
      syncCursors = true,
      realTimeCompilation = false,
      aiAssistance = true
    } = req.body;

    const session = await collaborationPlatform.createCollaborationSession({
      name,
      creator,
      language,
      canEdit,
      canView,
      isPublic,
      autoSave,
      syncCursors,
      realTimeCompilation,
      aiAssistance
    });

    res.json({
      success: true,
      data: session,
      message: '협업 세션이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('협업 세션 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '협업 세션 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/session/:sessionId/join
 * 협업 세션 참가
 */
router.post('/session/:sessionId/join', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name, email, id } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '사용자 이름이 필요합니다.'
      });
    }

    const result = await collaborationPlatform.joinSession(sessionId, {
      id, name, email
    });

    res.json({
      success: true,
      data: result,
      message: `${name}님이 세션에 참가했습니다.`
    });

  } catch (error) {
    console.error('세션 참가 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/session/:sessionId/sync-code
 * 코드 변경사항 동기화
 */
router.post('/session/:sessionId/sync-code', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, fileName, content, operation, position } = req.body;

    if (!userId || !fileName || !operation) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다. (userId, fileName, operation)'
      });
    }

    const result = await collaborationPlatform.syncCodeChange(sessionId, {
      userId, fileName, content, operation, position
    });

    res.json({
      success: true,
      data: result,
      message: '코드 변경사항이 동기화되었습니다.'
    });

  } catch (error) {
    console.error('코드 동기화 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/session/:sessionId/sync-cursor
 * 커서 위치 동기화
 */
router.post('/session/:sessionId/sync-cursor', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, position } = req.body;

    const success = await collaborationPlatform.syncCursorPosition(
      sessionId, userId, position
    );

    if (success) {
      res.json({
        success: true,
        message: '커서 위치가 동기화되었습니다.'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '사용자 또는 세션을 찾을 수 없습니다.'
      });
    }

  } catch (error) {
    console.error('커서 동기화 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/session/:sessionId/chat
 * 채팅 메시지 추가
 */
router.post('/session/:sessionId/chat', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { user, content, type, replyTo } = req.body;

    if (!user || !content) {
      return res.status(400).json({
        success: false,
        error: '사용자와 메시지 내용이 필요합니다.'
      });
    }

    const message = await collaborationPlatform.addChatMessage(sessionId, {
      user, content, type, replyTo
    });

    res.json({
      success: true,
      data: message,
      message: '채팅 메시지가 추가되었습니다.'
    });

  } catch (error) {
    console.error('채팅 메시지 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/collaboration/session/:sessionId
 * 세션 정보 조회
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = collaborationPlatform.sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('세션 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/collaboration/session/:sessionId/stats
 * 세션 통계
 */
router.get('/session/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = collaborationPlatform.getSessionStats(sessionId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('세션 통계 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/snippet/share
 * 코드 스니펫 공유
 */
router.post('/snippet/share', async (req, res) => {
  try {
    const {
      title,
      description,
      code,
      language,
      author = 'anonymous',
      tags = [],
      visibility = 'public',
      sessionId
    } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '코드 내용이 필요합니다.'
      });
    }

    const snippet = await collaborationPlatform.shareCodeSnippet({
      title, description, code, language, author, tags, visibility, sessionId
    });

    res.json({
      success: true,
      data: snippet,
      message: '코드 스니펫이 성공적으로 공유되었습니다.'
    });

  } catch (error) {
    console.error('스니펫 공유 오류:', error);
    res.status(500).json({
      success: false,
      error: '스니펫 공유 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/collaboration/snippet/search
 * 코드 스니펫 검색
 */
router.get('/snippet/search', async (req, res) => {
  try {
    const {
      q: query,
      language,
      visibility,
      tags,
      sortBy,
      sortOrder,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      language,
      visibility,
      tags: tags ? tags.split(',') : undefined,
      sortBy,
      sortOrder,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await collaborationPlatform.searchCodeSnippets(query, filters);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('스니펫 검색 오류:', error);
    res.status(500).json({
      success: false,
      error: '스니펫 검색 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/workspace/create
 * 프로젝트 워크스페이스 생성
 */
router.post('/workspace/create', async (req, res) => {
  try {
    const {
      name,
      description,
      creator = 'anonymous',
      rootPath,
      autoInvite = false,
      publicAccess = false,
      requireApproval = true,
      gitIntegration = false,
      ciCdEnabled = false,
      testingFramework = 'jest',
      lintingEnabled = true
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '프로젝트 이름이 필요합니다.'
      });
    }

    const workspace = await collaborationPlatform.createProjectWorkspace({
      name, description, creator, rootPath,
      autoInvite, publicAccess, requireApproval,
      gitIntegration, ciCdEnabled, testingFramework, lintingEnabled
    });

    res.json({
      success: true,
      data: workspace,
      message: '프로젝트 워크스페이스가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('워크스페이스 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '워크스페이스 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/execute
 * 실시간 코드 실행
 */
router.post('/execute', async (req, res) => {
  try {
    const {
      code,
      language,
      timeout = 5000,
      memoryLimit = '50MB'
    } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: '코드와 언어가 필요합니다.'
      });
    }

    // 지원 언어 확인
    const supportedLanguages = ['javascript', 'python'];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        error: `지원하지 않는 언어입니다. 지원 언어: ${supportedLanguages.join(', ')}`
      });
    }

    const result = await collaborationPlatform.executeCodeInSandbox(code, language, {
      timeout: parseInt(timeout),
      memoryLimit
    });

    res.json({
      success: true,
      data: result,
      message: '코드 실행이 완료되었습니다.'
    });

  } catch (error) {
    console.error('코드 실행 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 실행 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/collaboration/stats
 * 플랫폼 전체 통계
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = collaborationPlatform.getPlatformStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('플랫폼 통계 오류:', error);
    res.status(500).json({
      success: false,
      error: '통계 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/collaboration/sessions
 * 활성 세션 목록
 */
router.get('/sessions', async (req, res) => {
  try {
    const { status = 'active', limit = 50 } = req.query;
    
    const sessions = Array.from(collaborationPlatform.sessions.values())
      .filter(session => status === 'all' || session.status === status)
      .slice(0, parseInt(limit))
      .map(session => ({
        id: session.id,
        name: session.name,
        creator: session.creator,
        participants_count: session.participants.length,
        created_at: session.created_at,
        status: session.status,
        language: session.code_state.language
      }));

    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length
      }
    });

  } catch (error) {
    console.error('세션 목록 오류:', error);
    res.status(500).json({
      success: false,
      error: '세션 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/collaboration/session/:sessionId
 * 세션 종료
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    const session = collaborationPlatform.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '세션을 찾을 수 없습니다.'
      });
    }

    // 권한 확인 (창작자만 세션 종료 가능)
    if (userId !== session.creator) {
      return res.status(403).json({
        success: false,
        error: '세션을 종료할 권한이 없습니다.'
      });
    }

    session.status = 'ended';
    session.ended_at = new Date().toISOString();
    await collaborationPlatform.saveSessionToDisk(session);

    res.json({
      success: true,
      message: '세션이 성공적으로 종료되었습니다.'
    });

  } catch (error) {
    console.error('세션 종료 오류:', error);
    res.status(500).json({
      success: false,
      error: '세션 종료 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/collaboration/cleanup
 * 비활성 세션 정리
 */
router.post('/cleanup', async (req, res) => {
  try {
    await collaborationPlatform.cleanupInactiveSessions();

    res.json({
      success: true,
      message: '비활성 세션 정리가 완료되었습니다.'
    });

  } catch (error) {
    console.error('세션 정리 오류:', error);
    res.status(500).json({
      success: false,
      error: '세션 정리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export default router;
