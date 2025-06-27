import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

// 환경변수 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use('/static', express.static(join(__dirname, '../public')));
app.use(express.static(join(__dirname, '../public'))); // 루트에서도 정적 파일 서빙

// API 라우트
app.get('/', (req, res) => {
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
