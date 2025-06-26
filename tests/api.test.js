import request from 'supertest';
import app from '../src/index.js';

describe('AI Development System API', () => {
  describe('GET /', () => {
    it('시스템 정보를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status', 'running');
    });
  });

  describe('GET /health', () => {
    it('헬스체크 정보를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });
  });

  describe('AI API 엔드포인트', () => {
    describe('GET /api/v1/ai/status', () => {
      it('AI 서비스 상태를 반환해야 합니다', async () => {
        const response = await request(app)
          .get('/api/v1/ai/status')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('service', 'AI Service');
        expect(response.body.data).toHaveProperty('status', 'running');
        expect(response.body.data).toHaveProperty('features');
      });
    });

    describe('POST /api/v1/ai/generate-text', () => {
      it('프롬프트 없이 요청하면 400 에러를 반환해야 합니다', async () => {
        const response = await request(app)
          .post('/api/v1/ai/generate-text')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Bad Request');
      });
    });

    describe('POST /api/v1/ai/generate-code', () => {
      it('설명 없이 요청하면 400 에러를 반환해야 합니다', async () => {
        const response = await request(app)
          .post('/api/v1/ai/generate-code')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Bad Request');
      });
    });
  });

  describe('Projects API 엔드포인트', () => {
    describe('GET /api/v1/projects', () => {
      it('프로젝트 목록을 반환해야 합니다', async () => {
        const response = await request(app)
          .get('/api/v1/projects')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('projects');
        expect(response.body.data).toHaveProperty('count');
      });
    });

    describe('POST /api/v1/projects', () => {
      it('필수 필드 없이 요청하면 400 에러를 반환해야 합니다', async () => {
        const response = await request(app)
          .post('/api/v1/projects')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Bad Request');
      });
    });
  });

  describe('Automation API 엔드포인트', () => {
    describe('GET /api/v1/automation/status', () => {
      it('자동화 서비스 상태를 반환해야 합니다', async () => {
        const response = await request(app)
          .get('/api/v1/automation/status')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('service', 'Automation Service');
        expect(response.body.data).toHaveProperty('status', 'running');
      });
    });

    describe('GET /api/v1/automation/history', () => {
      it('명령어 히스토리를 반환해야 합니다', async () => {
        const response = await request(app)
          .get('/api/v1/automation/history')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('history');
        expect(response.body.data).toHaveProperty('count');
      });
    });
  });

  describe('404 핸들러', () => {
    it('존재하지 않는 경로에 대해 404를 반환해야 합니다', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});
