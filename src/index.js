import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';

// 환경변수 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// WebSocket 서버 설정
const wss = new WebSocketServer({ server });

// WebSocket 연결 관리
const wsConnections = new Map();
const MAX_CONNECTIONS = 100; // 최대 연결 수 제한

wss.on('connection', (ws, req) => {
  // 연결 수 제한
  if (wsConnections.size >= MAX_CONNECTIONS) {
    ws.close(1013, 'Too many connections');
    return;
  }
  
  const connectionId = Date.now() + Math.random();
  wsConnections.set(connectionId, {
    ws,
    sessionId: null,
    lastActivity: Date.now()
  });
  
  console.log(`🔌 WebSocket 연결: ${connectionId} (총 ${wsConnections.size}개)`);
  
  // 연결 활동 갱신
  ws.on('message', (data) => {
    try {
      const connection = wsConnections.get(connectionId);
      if (connection) {
        connection.lastActivity = Date.now();
      }
      
      const message = JSON.parse(data.toString());
      handleWebSocketMessage(ws, message, connectionId);
    } catch (error) {
      console.error('WebSocket 메시지 파싱 오류:', error);
    }
  });
  
  ws.on('close', () => {
    wsConnections.delete(connectionId);
    console.log(`🔌 WebSocket 연결 종료: ${connectionId} (남은 연결: ${wsConnections.size}개)`);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket 오류:', error);
    wsConnections.delete(connectionId);
  });
  
  // ping 메시지로 연결 확인
  const pingInterval = setInterval(() => {
    if (ws.readyState === 1) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
      wsConnections.delete(connectionId);
    }
  }, 30000); // 30초마다 ping
});

// WebSocket 메시지 처리
function handleWebSocketMessage(ws, message, connectionId) {
  const connection = wsConnections.get(connectionId);
  if (!connection) return;
  
  switch (message.type) {
    case 'join_session':
      connection.sessionId = message.sessionId;
      ws.send(JSON.stringify({
        type: 'session_joined',
        sessionId: message.sessionId,
        status: 'success'
      }));
      break;
      
    case 'code_change':
      // 다른 클라이언트들에게 코드 변경사항 브로드캐스트
      broadcastToSession(message.sessionId, {
        type: 'code_update',
        code: message.code,
        userId: message.userId,
        timestamp: new Date().toISOString()
      }, connectionId);
      break;
      
    case 'chat_message':
      // 채팅 메시지 브로드캐스트
      broadcastToSession(message.sessionId, {
        type: 'chat_message',
        message: message.message,
        userId: message.userId,
        timestamp: new Date().toISOString()
      }, connectionId);
      break;
      
    default:
      console.log('알 수 없는 WebSocket 메시지 타입:', message.type);
  }
}

// 세션 내 다른 클라이언트들에게 메시지 브로드캐스트
function broadcastToSession(sessionId, message, excludeConnectionId) {
  wsConnections.forEach((connection, connId) => {
    if (connection.sessionId === sessionId && 
        connId !== excludeConnectionId && 
        connection.ws.readyState === 1) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('WebSocket 브로드캐스트 오류:', error);
        wsConnections.delete(connId);
      }
    }
  });
}

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use('/static', express.static(join(__dirname, '../public')));
app.use(express.static(join(__dirname, '../public'))); // 루트에서도 정적 파일 서빙

// API 라우트
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// API 정보 엔드포인트 (JSON)
app.get('/api', (req, res) => {
  res.json({
    message: 'AI Development System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// HTML 페이지 라우트들
app.get('/app', (req, res) => {
  res.sendFile(join(__dirname, '../public/app.html'));
});

app.get('/pair-programming', (req, res) => {
  res.sendFile(join(__dirname, '../public/pair-programming.html'));
});

app.get('/monitoring', (req, res) => {
  res.sendFile(join(__dirname, '../public/monitoring-dashboard.html'));
});

app.get('/advanced', (req, res) => {
  res.sendFile(join(__dirname, '../public/advanced-features.html'));
});

// 라우터 임포트
import aiRoutes from './routes/ai.js';
import projectRoutes from './routes/projects.js';
import automationRoutes from './routes/automation.js';
import codegenRoutes from './routes/codegen.js';
import scaffoldRoutes from './routes/scaffold.js';
import analysisRoutes from './routes/analysis.js';
import pairProgrammingRoutes from './routes/pair-programming.js';
import aiAssistantRoutes from './routes/ai-assistant.js';
import codeReviewRoutes from './routes/code-review.js';
import testGeneratorRoutes from './routes/test-generator.js';
import collaborationRoutes from './routes/collaboration.js';
import intelligentProjectRoutes from './routes/intelligent-project.js';
import monitoringRoutes from './routes/monitoring.js';
import deploymentRoutes from './routes/deployment.js';

// 실시간 협업 서비스 임포트
import RealTimeCollaborationService from './modules/realtime/RealTimeCollaborationService.js';

// 실시간 협업 서비스 초기화
const collaborationService = new RealTimeCollaborationService(server);

// AI 개발 시스템 API 라우트들
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/automation', automationRoutes);
app.use('/api/v1/codegen', codegenRoutes);
app.use('/api/v1/scaffold', scaffoldRoutes);
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/pair-programming', pairProgrammingRoutes);
app.use('/api/v1/ai-assistant', aiAssistantRoutes);
app.use('/api/v1/code-review', codeReviewRoutes);
app.use('/api/v1/test-generator', testGeneratorRoutes);
app.use('/api/v1/collaboration', collaborationRoutes);
app.use('/api/v1/intelligent-project', intelligentProjectRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);
app.use('/api/v1/deployment', deploymentRoutes);

// 별칭 라우트 (advanced-features.html 호환성을 위해)
app.use('/api/deployment', deploymentRoutes);
app.use('/api/monitoring', monitoringRoutes);

// 실시간 협업 통계 API
app.get('/api/v1/collaboration/stats', (req, res) => {
  const stats = collaborationService.getAllSessionStats();
  res.json({
    success: true,
    stats,
    totalSessions: stats.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/collaboration/session/:sessionId/stats', (req, res) => {
  const { sessionId } = req.params;
  const stats = collaborationService.getSessionStats(sessionId);
  
  if (!stats) {
    return res.status(404).json({
      success: false,
      error: '세션을 찾을 수 없습니다.'
    });
  }
  
  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
});

// 비활성 WebSocket 연결 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  const inactiveTimeout = 5 * 60 * 1000; // 5분
  
  wsConnections.forEach((connection, connectionId) => {
    if (now - connection.lastActivity > inactiveTimeout) {
      console.log(`🧹 비활성 WebSocket 연결 정리: ${connectionId}`);
      connection.ws.terminate();
      wsConnections.delete(connectionId);
    }
  });
}, 5 * 60 * 1000);

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 AI Development System started on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🤝 WebSocket Server: ws://localhost:${PORT}`);
  console.log(`🎯 Pair Programming: http://localhost:${PORT}/api/v1/pair-programming`);
});

export default app;
