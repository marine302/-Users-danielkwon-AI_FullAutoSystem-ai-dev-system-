/**
 * 자동화된 배포 시스템 API 라우터
 * CI/CD 파이프라인 관리 엔드포인트
 */

import express from 'express';
import AutomatedDeploymentService from '../modules/deployment/AutomatedDeploymentService.js';

const router = express.Router();
const deploymentService = new AutomatedDeploymentService();

/**
 * GET /api/deployment/health
 * 배포 서비스 상태 확인
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'active',
    service: 'Automated Deployment Service',
    timestamp: new Date().toISOString(),
    features: [
      'CI/CD pipeline automation',
      'Multi-environment deployment',
      'Automatic rollback',
      'Health checks',
      'Deployment history',
      'Real-time monitoring'
    ]
  });
});

/**
 * GET /api/deployment/stats
 * 배포 통계 조회
 */
router.get('/stats', (req, res) => {
  try {
    const stats = deploymentService.getDeploymentStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('배포 통계 조회 오류:', error);
    res.status(500).json({
      error: '배포 통계 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/pipelines
 * 파이프라인 목록 조회
 */
router.get('/pipelines', (req, res) => {
  try {
    const pipelines = deploymentService.getPipelines();
    
    res.json({
      success: true,
      count: pipelines.length,
      pipelines: pipelines.map(pipeline => ({
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        environment: pipeline.environment,
        status: pipeline.status,
        branch: pipeline.branch,
        created_at: pipeline.created_at,
        updated_at: pipeline.updated_at
      }))
    });
  } catch (error) {
    console.error('파이프라인 목록 조회 오류:', error);
    res.status(500).json({
      error: '파이프라인 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/deployment/pipelines
 * 새로운 파이프라인 생성
 */
router.post('/pipelines', async (req, res) => {
  try {
    const {
      name,
      description,
      repository,
      branch,
      environment,
      stages,
      triggers,
      notifications,
      deploymentStrategy,
      healthCheck,
      autoRollback
    } = req.body;

    if (!name || !repository || !environment) {
      return res.status(400).json({
        error: '파이프라인명, 저장소, 환경은 필수입니다.'
      });
    }

    const pipelineConfig = {
      name,
      description,
      repository,
      branch,
      environment,
      stages,
      triggers,
      notifications,
      deploymentStrategy,
      healthCheck,
      autoRollback
    };

    const pipeline = await deploymentService.createDeploymentPipeline(pipelineConfig);

    res.json({
      success: true,
      message: '파이프라인이 성공적으로 생성되었습니다.',
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        environment: pipeline.environment,
        stages: pipeline.stages.map(s => s.name),
        created_at: pipeline.created_at
      }
    });
  } catch (error) {
    console.error('파이프라인 생성 오류:', error);
    res.status(500).json({
      error: '파이프라인 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 별칭 라우트 (단수형) - advanced-features.html 호환성을 위해
router.post('/pipeline', async (req, res) => {
  try {
    const { name, repository, branch, buildEnvironment, deploymentTarget, environment, healthCheck, autoRollback } = req.body;

    if (!name || !repository || !branch || !buildEnvironment || !deploymentTarget) {
      return res.status(400).json({
        error: '필수 필드가 누락되었습니다.',
        required: ['name', 'repository', 'branch', 'buildEnvironment', 'deploymentTarget']
      });
    }

    const pipelineConfig = {
      name,
      description: `${name} CI/CD 파이프라인`,
      repository,
      branch,
      environment: environment || 'production',
      buildEnvironment,
      deploymentTarget,
      healthCheck: healthCheck || false,
      autoRollback: autoRollback || false
    };

    const pipeline = await deploymentService.createDeploymentPipeline(pipelineConfig);

    res.json({
      success: true,
      message: '파이프라인이 성공적으로 생성되었습니다.',
      pipelineId: pipeline.id,
      status: 'created',
      repository,
      branch,
      buildEnvironment,
      deploymentTarget,
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        environment: pipeline.environment,
        stages: pipeline.stages.map(s => s.name),
        created_at: pipeline.created_at
      }
    });
  } catch (error) {
    console.error('파이프라인 생성 오류:', error);
    res.status(500).json({
      error: '파이프라인 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/pipelines/:id
 * 특정 파이프라인 상세 조회
 */
router.get('/pipelines/:id', (req, res) => {
  try {
    const pipeline = deploymentService.pipelines.get(req.params.id);
    
    if (!pipeline) {
      return res.status(404).json({
        error: '파이프라인을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      pipeline
    });
  } catch (error) {
    console.error('파이프라인 조회 오류:', error);
    res.status(500).json({
      error: '파이프라인 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/deployment/pipelines/:id/deploy
 * 배포 실행
 */
router.post('/pipelines/:id/deploy', async (req, res) => {
  try {
    const pipelineId = req.params.id;
    const { branch, commit, triggeredBy } = req.body;

    const deployment = await deploymentService.executeDeploy(pipelineId, {
      branch,
      commit,
      triggeredBy: triggeredBy || 'api'
    });

    res.json({
      success: true,
      message: '배포가 시작되었습니다.',
      deployment: {
        id: deployment.id,
        pipelineId: deployment.pipelineId,
        environment: deployment.environment,
        status: deployment.status,
        startTime: deployment.startTime
      }
    });
  } catch (error) {
    console.error('배포 실행 오류:', error);
    res.status(500).json({
      error: '배포 실행 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/deployments
 * 배포 목록 조회
 */
router.get('/deployments', (req, res) => {
  try {
    const { pipelineId, environment, status, limit = 50 } = req.query;
    
    const filters = {};
    if (pipelineId) filters.pipelineId = pipelineId;
    if (environment) filters.environment = environment;
    if (status) filters.status = status;

    let deployments = deploymentService.getDeployments(filters);
    deployments = deployments.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: deployments.length,
      deployments: deployments.map(deployment => ({
        id: deployment.id,
        pipelineId: deployment.pipelineId,
        pipelineName: deployment.pipelineName,
        environment: deployment.environment,
        status: deployment.status,
        startTime: deployment.startTime,
        endTime: deployment.endTime,
        duration: deployment.duration,
        triggeredBy: deployment.triggeredBy,
        branch: deployment.branch,
        commit: deployment.commit
      }))
    });
  } catch (error) {
    console.error('배포 목록 조회 오류:', error);
    res.status(500).json({
      error: '배포 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/deployments/:id
 * 특정 배포 상세 조회
 */
router.get('/deployments/:id', (req, res) => {
  try {
    const deployment = deploymentService.deployments.get(req.params.id);
    
    if (!deployment) {
      return res.status(404).json({
        error: '배포를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      deployment
    });
  } catch (error) {
    console.error('배포 조회 오류:', error);
    res.status(500).json({
      error: '배포 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/deployments/:id/logs
 * 배포 로그 조회
 */
router.get('/deployments/:id/logs', (req, res) => {
  try {
    const deployment = deploymentService.deployments.get(req.params.id);
    
    if (!deployment) {
      return res.status(404).json({
        error: '배포를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      logs: deployment.logs,
      count: deployment.logs.length
    });
  } catch (error) {
    console.error('배포 로그 조회 오류:', error);
    res.status(500).json({
      error: '배포 로그 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/environments
 * 환경 목록 조회
 */
router.get('/environments', (req, res) => {
  try {
    const environments = deploymentService.getEnvironments();
    
    res.json({
      success: true,
      count: environments.length,
      environments
    });
  } catch (error) {
    console.error('환경 목록 조회 오류:', error);
    res.status(500).json({
      error: '환경 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/dashboard
 * 배포 대시보드 데이터
 */
router.get('/dashboard', (req, res) => {
  try {
    const stats = deploymentService.getDeploymentStats();
    const recentDeployments = deploymentService.getDeployments({}).slice(0, 10);
    const pipelines = deploymentService.getPipelines();
    const environments = deploymentService.getEnvironments();

    // 환경별 배포 현황
    const deploymentsByEnvironment = {};
    environments.forEach(env => {
      const envDeployments = recentDeployments.filter(d => d.environment === env.id);
      deploymentsByEnvironment[env.id] = {
        name: env.name,
        total: envDeployments.length,
        success: envDeployments.filter(d => d.status === 'success').length,
        failed: envDeployments.filter(d => d.status === 'failed').length,
        running: envDeployments.filter(d => d.status === 'running').length
      };
    });

    // 파이프라인별 성공률
    const pipelineStats = pipelines.map(pipeline => {
      const pipelineDeployments = recentDeployments.filter(d => d.pipelineId === pipeline.id);
      const success = pipelineDeployments.filter(d => d.status === 'success').length;
      const total = pipelineDeployments.length;
      
      return {
        id: pipeline.id,
        name: pipeline.name,
        environment: pipeline.environment,
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
        totalDeployments: total
      };
    });

    const dashboard = {
      overview: stats,
      recentDeployments: recentDeployments.slice(0, 5).map(d => ({
        id: d.id,
        pipelineName: d.pipelineName,
        environment: d.environment,
        status: d.status,
        startTime: d.startTime,
        duration: d.duration,
        triggeredBy: d.triggeredBy
      })),
      environmentStatus: deploymentsByEnvironment,
      pipelinePerformance: pipelineStats,
      activeDeployments: recentDeployments.filter(d => d.status === 'running').length
    };

    res.json({
      success: true,
      dashboard,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('배포 대시보드 조회 오류:', error);
    res.status(500).json({
      error: '배포 대시보드 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/deployment/test-pipeline
 * 테스트 파이프라인 생성 (데모용)
 */
router.post('/test-pipeline', async (req, res) => {
  try {
    const { name = '테스트 파이프라인', environment = 'development' } = req.body;

    const testConfig = {
      name,
      description: 'API를 통해 생성된 테스트 파이프라인',
      repository: 'https://github.com/example/test-repo.git',
      branch: 'main',
      environment,
      stages: [
        {
          name: 'build',
          description: '소스 코드 빌드',
          commands: ['echo "Building..."', 'sleep 2', 'echo "Build complete"'],
          timeout: 60
        },
        {
          name: 'test',
          description: '테스트 실행',
          commands: ['echo "Running tests..."', 'sleep 1', 'echo "Tests passed"'],
          timeout: 30
        },
        {
          name: 'deploy',
          description: '배포 실행',
          commands: ['echo "Deploying..."', 'sleep 3', 'echo "Deployment complete"'],
          timeout: 90
        }
      ],
      triggers: {
        push: true,
        pullRequest: false,
        schedule: null
      },
      deploymentStrategy: 'rolling',
      healthCheck: true,
      autoRollback: true
    };

    const pipeline = await deploymentService.createDeploymentPipeline(testConfig);

    res.json({
      success: true,
      message: '테스트 파이프라인이 생성되었습니다.',
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        environment: pipeline.environment
      }
    });
  } catch (error) {
    console.error('테스트 파이프라인 생성 오류:', error);
    res.status(500).json({
      error: '테스트 파이프라인 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 추가 별칭 라우트들 (advanced-features.html 호환성을 위해)

/**
 * POST /api/deployment/deploy
 * 배포 실행 (별칭)
 */
router.post('/deploy', async (req, res) => {
  try {
    const { pipelineId, environment, deploymentType, branch, commit, triggeredBy } = req.body;

    if (!pipelineId) {
      return res.status(400).json({
        error: '파이프라인 ID가 필요합니다.',
        required: ['pipelineId']
      });
    }

    const deployment = await deploymentService.executeDeploy(pipelineId, {
      environment: environment || 'production',
      deploymentType: deploymentType || 'rolling',
      branch: branch || 'main',
      commit,
      triggeredBy: triggeredBy || 'api'
    });

    res.json({
      success: true,
      message: '배포가 시작되었습니다.',
      deploymentId: deployment.id,
      status: 'started',
      progress: 0,
      estimatedTime: '5-10분',
      deployment: {
        id: deployment.id,
        pipelineId: deployment.pipelineId,
        environment: deployment.environment,
        status: deployment.status,
        startTime: deployment.startTime
      }
    });
  } catch (error) {
    console.error('배포 실행 오류:', error);
    res.status(500).json({
      error: '배포 실행 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/status/:id
 * 배포 상태 확인 (별칭)
 */
router.get('/status/:id', (req, res) => {
  try {
    const deploymentId = req.params.id;
    const deployment = deploymentService.getDeploymentStatus(deploymentId);

    if (!deployment) {
      return res.status(404).json({
        error: '배포를 찾을 수 없습니다.',
        deploymentId
      });
    }

    res.json({
      success: true,
      deploymentId: deployment.id,
      status: deployment.status,
      progress: deployment.progress || 0,
      health: deployment.health || 'checking',
      url: deployment.url || null,
      startTime: deployment.startTime,
      endTime: deployment.endTime,
      duration: deployment.duration
    });
  } catch (error) {
    console.error('배포 상태 확인 오류:', error);
    res.status(500).json({
      error: '배포 상태 확인 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/deployment/rollback
 * 롤백 실행 (별칭)
 */
router.post('/rollback', async (req, res) => {
  try {
    const { deploymentId, version } = req.body;

    if (!deploymentId) {
      return res.status(400).json({
        error: '배포 ID가 필요합니다.',
        required: ['deploymentId']
      });
    }

    const rollback = await deploymentService.rollbackDeployment(deploymentId, version);

    res.json({
      success: true,
      message: '롤백이 시작되었습니다.',
      rollback: {
        id: rollback.id,
        deploymentId: rollback.deploymentId,
        status: rollback.status,
        startTime: rollback.startTime
      }
    });
  } catch (error) {
    console.error('롤백 실행 오류:', error);
    res.status(500).json({
      error: '롤백 실행 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/logs/:id
 * 배포 로그 조회 (별칭)
 */
router.get('/logs/:id', (req, res) => {
  try {
    const deploymentId = req.params.id;
    const { limit = 100 } = req.query;

    const logs = deploymentService.getDeploymentLogs(deploymentId, parseInt(limit));

    res.json({
      success: true,
      deploymentId,
      logs: logs || '로그를 찾을 수 없습니다.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('배포 로그 조회 오류:', error);
    res.status(500).json({
      error: '배포 로그 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/metrics/:id
 * 배포 메트릭 조회 (별칭)
 */
router.get('/metrics/:id', (req, res) => {
  try {
    const deploymentId = req.params.id;
    const { timeRange = '24h' } = req.query;

    const metrics = deploymentService.getDeploymentMetrics(deploymentId, timeRange);

    res.json({
      success: true,
      deploymentId,
      metrics: {
        successRate: metrics.successRate || 95,
        averageTime: metrics.averageTime || 120,
        totalDeployments: metrics.totalDeployments || 15,
        ...metrics
      },
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('배포 메트릭 조회 오류:', error);
    res.status(500).json({
      error: '배포 메트릭 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/history
 * 배포 기록 조회 (데이터베이스 기반)
 */
router.get('/history', async (req, res) => {
  try {
    const { pipelineId, limit = 50 } = req.query;
    
    const history = await deploymentService.getDeploymentHistory(pipelineId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        history,
        total: history.length,
        filter: pipelineId ? { pipelineId } : null
      }
    });
  } catch (error) {
    console.error('배포 기록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 기록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/deployment/analytics
 * 배포 분석 및 통계 (향상된 버전)
 */
router.get('/analytics', async (req, res) => {
  try {
    const statistics = await deploymentService.getDeploymentStatistics();
    
    res.json({
      success: true,
      data: {
        statistics,
        analytics: {
          deployment_health: statistics.success_rate >= 90 ? 'excellent' : 
                           statistics.success_rate >= 70 ? 'good' : 'needs_improvement',
          performance: {
            speed: statistics.average_duration < 300000 ? 'fast' : 'slow', // 5분
            frequency: statistics.deployments_today > 0 ? 'active' : 'inactive'
          },
          trend_analysis: {
            trend: statistics.deployment_trend.length > 1 ? 'stable' : 'insufficient_data',
            data_points: statistics.deployment_trend.length
          }
        },
        recommendations: [
          statistics.success_rate < 70 ? 'Improve deployment process reliability' : null,
          statistics.average_duration > 600000 ? 'Optimize deployment speed' : null,
          statistics.deployments_today === 0 ? 'Consider more frequent deployments' : null
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('배포 분석 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 분석 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export default router;
