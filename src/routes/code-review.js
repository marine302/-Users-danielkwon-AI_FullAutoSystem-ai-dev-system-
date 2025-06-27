/**
 * 코드 리뷰 API 라우터
 * AI 기반 자동 코드 리뷰 서비스
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { CodeReviewService } from '../modules/ai/CodeReviewService.js';

const router = express.Router();
const codeReviewService = new CodeReviewService();

// 파일 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다.'), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB 제한
  }
});

/**
 * POST /api/code-review/text
 * 텍스트 코드 리뷰
 */
router.post('/text', async (req, res) => {
  try {
    const { code, filePath, options = {} } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: '코드 내용이 필요합니다.'
      });
    }

    if (code.length > 100000) {
      return res.status(400).json({
        success: false,
        error: '코드가 너무 깁니다. (최대 100KB)'
      });
    }

    console.log(`코드 리뷰 시작: ${filePath || 'inline code'}`);
    const reviewResult = await codeReviewService.reviewCode(code, filePath, options);

    res.json({
      success: true,
      data: reviewResult,
      message: '코드 리뷰가 완료되었습니다.'
    });

  } catch (error) {
    console.error('텍스트 코드 리뷰 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 리뷰 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/code-review/file
 * 파일 업로드 코드 리뷰
 */
router.post('/file', upload.single('codeFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '파일이 업로드되지 않았습니다.'
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    console.log(`파일 코드 리뷰 시작: ${originalName}`);

    // 파일 내용 읽기
    const codeContent = await fs.readFile(filePath, 'utf-8');
    
    // 코드 리뷰 실행
    const reviewResult = await codeReviewService.reviewCode(codeContent, originalName, options);

    // 임시 파일 삭제
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error('임시 파일 삭제 오류:', cleanupError);
    }

    res.json({
      success: true,
      data: reviewResult,
      message: `파일 "${originalName}" 코드 리뷰가 완료되었습니다.`
    });

  } catch (error) {
    console.error('파일 코드 리뷰 오류:', error);
    
    // 임시 파일 정리
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('임시 파일 삭제 오류:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: '파일 코드 리뷰 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/code-review/project
 * 프로젝트 전체 코드 리뷰
 */
router.post('/project', async (req, res) => {
  try {
    const { projectPath, options = {} } = req.body;

    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({
        success: false,
        error: '프로젝트 경로가 필요합니다.'
      });
    }

    // 경로 유효성 검사
    try {
      await fs.access(projectPath);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 프로젝트 경로입니다.'
      });
    }

    console.log(`프로젝트 코드 리뷰 시작: ${projectPath}`);
    
    // 프로젝트 리뷰 실행 (비동기로 처리하고 즉시 응답)
    const reviewPromise = codeReviewService.reviewProject(projectPath, options);

    // 즉시 응답 (백그라운드에서 처리)
    res.json({
      success: true,
      message: '프로젝트 코드 리뷰가 시작되었습니다. 완료되면 결과를 확인할 수 있습니다.',
      data: {
        project_path: projectPath,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }
    });

    // 백그라운드에서 리뷰 완료 처리
    try {
      const reviewResult = await reviewPromise;
      console.log(`프로젝트 리뷰 완료: ${projectPath}`, {
        files_reviewed: reviewResult.file_reviews.length,
        overall_score: reviewResult.overall_score
      });
    } catch (error) {
      console.error('백그라운드 프로젝트 리뷰 오류:', error);
    }

  } catch (error) {
    console.error('프로젝트 코드 리뷰 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 코드 리뷰 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/code-review/history
 * 코드 리뷰 기록 조회
 */
router.get('/history', async (req, res) => {
  try {
    const { filePath, limit = 50 } = req.query;
    
    const history = await codeReviewService.getReviewHistory(filePath, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        history,
        total: history.length,
        filter: filePath ? { filePath } : null
      }
    });
  } catch (error) {
    console.error('리뷰 기록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 기록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/code-review/analytics
 * 코드 리뷰 분석 및 통계 (향상된 버전)
 */
router.get('/analytics', async (req, res) => {
  try {
    const statistics = await codeReviewService.getReviewStatistics();
    
    res.json({
      success: true,
      data: {
        statistics,
        analytics: {
          quality_score: statistics.average_score,
          improvement_potential: statistics.total_issues > 0 ? 'high' : 'low',
          review_frequency: statistics.recent_reviews > 0 ? 'active' : 'inactive',
          trend_analysis: {
            trend: statistics.review_trend.length > 1 ? 'improving' : 'stable',
            data_points: statistics.review_trend.length
          }
        },
        recommendations: [
          statistics.average_score < 70 ? 'Focus on code quality improvements' : null,
          statistics.total_issues > 50 ? 'Consider implementing automated linting' : null,
          statistics.recent_reviews === 0 ? 'Schedule regular code reviews' : null
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('리뷰 분석 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '리뷰 분석 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export default router;
