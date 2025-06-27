import { WebSocketServer } from 'ws';
import AIService from '../ai/AIService.js';

class RealTimeCollaborationService {
  constructor(server) {
    this.aiService = new AIService();
    this.wss = new WebSocketServer({ server });
    this.clients = new Map(); // sessionId -> Set of WebSocket connections
    this.sessions = new Map(); // sessionId -> session data
    
    this.setupWebSocketHandlers();
  }
  
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('새로운 WebSocket 연결');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket 메시지 처리 오류:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: '메시지를 처리할 수 없습니다.'
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket 연결 종료');
        this.removeClientFromSessions(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket 오류:', error);
      });
    });
  }
  
  async handleMessage(ws, message) {
    const { type, sessionId, data } = message;
    
    switch (type) {
      case 'join_session':
        await this.joinSession(ws, sessionId, data);
        break;
        
      case 'leave_session':
        this.leaveSession(ws, sessionId);
        break;
        
      case 'code_change':
        await this.handleCodeChange(ws, sessionId, data);
        break;
        
      case 'cursor_position':
        this.broadcastCursorPosition(ws, sessionId, data);
        break;
        
      case 'chat_message':
        await this.handleChatMessage(ws, sessionId, data);
        break;
        
      case 'ai_request':
        await this.handleAIRequest(ws, sessionId, data);
        break;
        
      case 'file_selection':
        this.broadcastFileSelection(ws, sessionId, data);
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `알 수 없는 메시지 타입: ${type}`
        }));
    }
  }
  
  async joinSession(ws, sessionId, userData) {
    try {
      // 클라이언트를 세션에 추가
      if (!this.clients.has(sessionId)) {
        this.clients.set(sessionId, new Set());
      }
      this.clients.get(sessionId).add(ws);
      
      // WebSocket에 세션 정보 저장
      ws.sessionId = sessionId;
      ws.userId = userData.userId;
      ws.userName = userData.userName || `User_${Date.now()}`;
      
      // 세션 데이터 초기화 (없으면)
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, {
          id: sessionId,
          participants: new Map(),
          sharedCode: '',
          currentFile: null,
          cursors: new Map(),
          chatHistory: [],
          aiContext: {
            recentChanges: [],
            suggestions: []
          }
        });
      }
      
      const session = this.sessions.get(sessionId);
      session.participants.set(ws.userId, {
        userId: ws.userId,
        userName: ws.userName,
        joinTime: new Date(),
        isActive: true
      });
      
      // 참가자에게 현재 세션 상태 전송
      ws.send(JSON.stringify({
        type: 'session_joined',
        sessionId,
        currentState: {
          code: session.sharedCode,
          currentFile: session.currentFile,
          participants: Array.from(session.participants.values()),
          chatHistory: session.chatHistory.slice(-20) // 최근 20개 메시지
        }
      }));
      
      // 다른 참가자들에게 새 참가자 알림
      this.broadcastToSession(sessionId, {
        type: 'participant_joined',
        participant: {
          userId: ws.userId,
          userName: ws.userName
        }
      }, ws);
      
      console.log(`사용자 ${ws.userName}이 세션 ${sessionId}에 참가했습니다.`);
      
    } catch (error) {
      console.error('세션 참가 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '세션에 참가할 수 없습니다.'
      }));
    }
  }
  
  leaveSession(ws, sessionId) {
    try {
      if (this.clients.has(sessionId)) {
        this.clients.get(sessionId).delete(ws);
        
        // 세션에 아무도 없으면 정리
        if (this.clients.get(sessionId).size === 0) {
          this.clients.delete(sessionId);
          this.sessions.delete(sessionId);
        }
      }
      
      if (this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId);
        session.participants.delete(ws.userId);
        
        // 다른 참가자들에게 떠났음을 알림
        this.broadcastToSession(sessionId, {
          type: 'participant_left',
          userId: ws.userId,
          userName: ws.userName
        });
      }
      
      console.log(`사용자 ${ws.userName}이 세션 ${sessionId}에서 나갔습니다.`);
      
    } catch (error) {
      console.error('세션 떠나기 오류:', error);
    }
  }
  
  async handleCodeChange(ws, sessionId, data) {
    try {
      const { code, fileName, change, cursorPosition } = data;
      
      if (!this.sessions.has(sessionId)) {
        throw new Error('세션을 찾을 수 없습니다.');
      }
      
      const session = this.sessions.get(sessionId);
      session.sharedCode = code;
      session.currentFile = fileName;
      
      // 변경사항 기록
      session.aiContext.recentChanges.push({
        userId: ws.userId,
        userName: ws.userName,
        change,
        timestamp: new Date(),
        fileName
      });
      
      // 최근 변경사항은 최대 50개만 유지
      if (session.aiContext.recentChanges.length > 50) {
        session.aiContext.recentChanges = session.aiContext.recentChanges.slice(-50);
      }
      
      // 다른 참가자들에게 코드 변경사항 브로드캐스트
      this.broadcastToSession(sessionId, {
        type: 'code_changed',
        data: {
          code,
          fileName,
          change,
          author: {
            userId: ws.userId,
            userName: ws.userName
          },
          timestamp: new Date()
        }
      }, ws);
      
      // AI 실시간 분석 및 제안 (비동기)
      this.performRealTimeAIAnalysis(sessionId, code, fileName, change);
      
    } catch (error) {
      console.error('코드 변경 처리 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '코드 변경을 처리할 수 없습니다.'
      }));
    }
  }
  
  broadcastCursorPosition(ws, sessionId, data) {
    try {
      const { line, column, selection } = data;
      
      if (this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId);
        session.cursors.set(ws.userId, {
          userId: ws.userId,
          userName: ws.userName,
          line,
          column,
          selection,
          timestamp: new Date()
        });
      }
      
      // 다른 참가자들에게 커서 위치 브로드캐스트
      this.broadcastToSession(sessionId, {
        type: 'cursor_moved',
        data: {
          userId: ws.userId,
          userName: ws.userName,
          line,
          column,
          selection
        }
      }, ws);
      
    } catch (error) {
      console.error('커서 위치 브로드캐스트 오류:', error);
    }
  }
  
  async handleChatMessage(ws, sessionId, data) {
    try {
      const { message } = data;
      
      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: ws.userId,
        userName: ws.userName,
        message,
        timestamp: new Date(),
        type: 'user'
      };
      
      if (this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId);
        session.chatHistory.push(chatMessage);
        
        // 채팅 기록은 최대 100개만 유지
        if (session.chatHistory.length > 100) {
          session.chatHistory = session.chatHistory.slice(-100);
        }
      }
      
      // 모든 참가자들에게 채팅 메시지 브로드캐스트
      this.broadcastToSession(sessionId, {
        type: 'chat_message',
        data: chatMessage
      });
      
      // AI 멘션 처리 (@ai 또는 @AI로 시작하는 메시지)
      if (message.toLowerCase().startsWith('@ai ')) {
        const aiQuery = message.substring(4).trim();
        await this.handleAIMention(sessionId, aiQuery, ws.userName);
      }
      
    } catch (error) {
      console.error('채팅 메시지 처리 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '채팅 메시지를 처리할 수 없습니다.'
      }));
    }
  }
  
  async handleAIRequest(ws, sessionId, data) {
    try {
      const { request, context } = data;
      
      if (!this.sessions.has(sessionId)) {
        throw new Error('세션을 찾을 수 없습니다.');
      }
      
      const session = this.sessions.get(sessionId);
      
      // AI에게 요청 처리
      const aiResponse = await this.aiService.generateResponse(
        `실시간 협업 세션에서의 AI 요청:
         요청: ${request}
         컨텍스트: ${context}
         현재 코드: ${session.sharedCode}
         최근 변경사항: ${JSON.stringify(session.aiContext.recentChanges.slice(-5))}
         
         협업 환경에 적합한 도움이 되는 응답을 제공해주세요.`
      );
      
      const aiMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'ai',
        userName: '🤖 AI Assistant',
        message: aiResponse,
        timestamp: new Date(),
        type: 'ai',
        requestedBy: ws.userName
      };
      
      session.chatHistory.push(aiMessage);
      
      // 모든 참가자들에게 AI 응답 브로드캐스트
      this.broadcastToSession(sessionId, {
        type: 'ai_response',
        data: aiMessage
      });
      
    } catch (error) {
      console.error('AI 요청 처리 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'AI 요청을 처리할 수 없습니다.'
      }));
    }
  }
  
  broadcastFileSelection(ws, sessionId, data) {
    try {
      const { fileName, content } = data;
      
      if (this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId);
        session.currentFile = fileName;
        session.sharedCode = content || '';
      }
      
      // 다른 참가자들에게 파일 선택 브로드캐스트
      this.broadcastToSession(sessionId, {
        type: 'file_selected',
        data: {
          fileName,
          content,
          selectedBy: {
            userId: ws.userId,
            userName: ws.userName
          }
        }
      }, ws);
      
    } catch (error) {
      console.error('파일 선택 브로드캐스트 오류:', error);
    }
  }
  
  async performRealTimeAIAnalysis(sessionId, code, fileName, change) {
    try {
      // 백그라운드에서 AI 분석 수행
      setTimeout(async () => {
        const analysis = await this.aiService.generateResponse(
          `다음 코드 변경사항을 실시간으로 분석해주세요:
           파일: ${fileName}
           변경: ${JSON.stringify(change)}
           현재 코드 일부: ${code.substring(0, 500)}...
           
           간단한 실시간 피드백이나 제안을 제공해주세요.`
        );
        
        if (this.sessions.has(sessionId)) {
          const session = this.sessions.get(sessionId);
          session.aiContext.suggestions.push({
            analysis,
            timestamp: new Date(),
            fileName,
            change
          });
          
          // 제안사항은 최대 20개만 유지
          if (session.aiContext.suggestions.length > 20) {
            session.aiContext.suggestions = session.aiContext.suggestions.slice(-20);
          }
          
          // 참가자들에게 AI 분석 결과 브로드캐스트
          this.broadcastToSession(sessionId, {
            type: 'ai_analysis',
            data: {
              analysis,
              fileName,
              timestamp: new Date()
            }
          });
        }
      }, 2000); // 2초 후 분석 (너무 자주 실행되지 않도록)
      
    } catch (error) {
      console.error('실시간 AI 분석 오류:', error);
    }
  }
  
  async handleAIMention(sessionId, query, userName) {
    try {
      if (!this.sessions.has(sessionId)) return;
      
      const session = this.sessions.get(sessionId);
      
      const aiResponse = await this.aiService.generateResponse(
        `${userName}님이 실시간 협업 중에 AI에게 질문했습니다:
         질문: ${query}
         현재 컨텍스트: ${session.currentFile ? `파일 ${session.currentFile}` : '파일 없음'}
         코드: ${session.sharedCode.substring(0, 300)}...
         
         협업 환경에서 도움이 되는 답변을 제공해주세요.`
      );
      
      const aiMessage = {
        id: `ai_mention_${Date.now()}`,
        userId: 'ai',
        userName: '🤖 AI Assistant',
        message: `@${userName} ${aiResponse}`,
        timestamp: new Date(),
        type: 'ai_mention',
        replyTo: userName
      };
      
      session.chatHistory.push(aiMessage);
      
      // AI 멘션 응답 브로드캐스트
      this.broadcastToSession(sessionId, {
        type: 'ai_mention_response',
        data: aiMessage
      });
      
    } catch (error) {
      console.error('AI 멘션 처리 오류:', error);
    }
  }
  
  broadcastToSession(sessionId, message, excludeWs = null) {
    if (!this.clients.has(sessionId)) return;
    
    const clients = this.clients.get(sessionId);
    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
      if (client !== excludeWs && client.readyState === client.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('클라이언트에게 메시지 전송 오류:', error);
          // 연결이 끊어진 클라이언트 정리
          clients.delete(client);
        }
      }
    });
  }
  
  removeClientFromSessions(ws) {
    // 모든 세션에서 해당 클라이언트 제거
    for (const [sessionId, clients] of this.clients.entries()) {
      if (clients.has(ws)) {
        this.leaveSession(ws, sessionId);
        break;
      }
    }
  }
  
  // 세션 통계 조회
  getSessionStats(sessionId) {
    if (!this.sessions.has(sessionId)) {
      return null;
    }
    
    const session = this.sessions.get(sessionId);
    const clients = this.clients.get(sessionId) || new Set();
    
    return {
      sessionId,
      participantCount: clients.size,
      participants: Array.from(session.participants.values()),
      codeLength: session.sharedCode.length,
      currentFile: session.currentFile,
      recentChanges: session.aiContext.recentChanges.length,
      chatMessages: session.chatHistory.length,
      aiSuggestions: session.aiContext.suggestions.length
    };
  }
  
  // 모든 활성 세션 통계
  getAllSessionStats() {
    const stats = [];
    for (const sessionId of this.sessions.keys()) {
      stats.push(this.getSessionStats(sessionId));
    }
    return stats;
  }
}

export default RealTimeCollaborationService;
