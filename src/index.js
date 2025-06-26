import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 환경변수 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use('/static', express.static(join(__dirname, '../public')));

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

// AI 개발 시스템 API 라우트들
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/automation', automationRoutes);
app.use('/api/v1/codegen', codegenRoutes);
app.use('/api/v1/scaffold', scaffoldRoutes);
app.use('/api/v1/analysis', analysisRoutes);

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
app.listen(PORT, () => {
  console.log(`🚀 AI Development System started on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
});

export default app;
