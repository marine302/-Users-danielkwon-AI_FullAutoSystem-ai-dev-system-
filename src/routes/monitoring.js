/**
 * 시스템 모니터링 API 라우터
 * 실시간 시스템 성능 모니터링 엔드포인트
 */

import express from 'express';
import SystemMonitoringService from '../modules/monitoring/SystemMonitoringService.js';

const router = express.Router();
const monitoringService = new SystemMonitoringService();

// 모니터링 시작 (서버 시작 시 자동 시작)
monitoringService.startMonitoring(5000); // 5초 간격

/**
 * GET /api/monitoring/health
 * 모니터링 서비스 상태 확인
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'active',
    service: 'System Monitoring Service',
    timestamp: new Date().toISOString(),
    features: [
      'Real-time system metrics',
      'CPU and memory monitoring',
      'Disk usage tracking',
      'Performance analytics',
      'Alert system',
      'Historical data'
    ]
  });
});

/**
 * GET /api/monitoring/status
 * 현재 시스템 상태 조회
 */
router.get('/status', (req, res) => {
  try {
    const status = monitoringService.getCurrentStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('시스템 상태 조회 오류:', error);
    res.status(500).json({
      error: '시스템 상태 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * 실시간 시스템 메트릭 조회
 */
router.get('/metrics', (req, res) => {
  try {
    const { duration = 60 } = req.query; // 기본 60분
    const metrics = monitoringService.getMetricsHistory(parseInt(duration));
    
    res.json({
      success: true,
      duration: parseInt(duration),
      count: metrics.length,
      metrics
    });
  } catch (error) {
    console.error('메트릭 조회 오류:', error);
    res.status(500).json({
      error: '메트릭 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/metrics/latest
 * 최신 시스템 메트릭 조회
 */
router.get('/metrics/latest', (req, res) => {
  try {
    const status = monitoringService.getCurrentStatus();
    
    if (!status.current) {
      return res.status(404).json({
        error: '수집된 메트릭이 없습니다.'
      });
    }
    
    res.json({
      success: true,
      metrics: status.current,
      lastUpdate: status.lastUpdate
    });
  } catch (error) {
    console.error('최신 메트릭 조회 오류:', error);
    res.status(500).json({
      error: '최신 메트릭 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * 시스템 알림 조회
 */
router.get('/alerts', (req, res) => {
  try {
    const { level, limit = 50 } = req.query;
    const status = monitoringService.getCurrentStatus();
    
    let alerts = [...monitoringService.metrics.alerts];
    
    // 레벨 필터링
    if (level) {
      alerts = alerts.filter(alert => alert.level === level.toUpperCase());
    }
    
    // 제한
    alerts = alerts.slice(-parseInt(limit));
    
    res.json({
      success: true,
      count: alerts.length,
      alerts: alerts.reverse() // 최신순으로 정렬
    });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({
      error: '알림 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/dashboard
 * 모니터링 대시보드 데이터
 */
router.get('/dashboard', (req, res) => {
  try {
    const status = monitoringService.getCurrentStatus();
    const recentMetrics = monitoringService.getMetricsHistory(10); // 최근 10분
    
    // 평균값 계산
    const avgMetrics = recentMetrics.length > 0 ? {
      avgCpuUsage: Math.round(
        recentMetrics.reduce((sum, m) => sum + m.system.cpu.usage, 0) / recentMetrics.length
      ),
      avgMemoryUsage: Math.round(
        recentMetrics.reduce((sum, m) => sum + m.system.memory.usage, 0) / recentMetrics.length
      ),
      avgDiskUsage: Math.round(
        recentMetrics.reduce((sum, m) => sum + m.system.disk.usage, 0) / recentMetrics.length
      )
    } : { avgCpuUsage: 0, avgMemoryUsage: 0, avgDiskUsage: 0 };
    
    const dashboard = {
      systemStatus: status.summary.status,
      isMonitoring: status.isMonitoring,
      lastUpdate: status.lastUpdate,
      
      // 현재 메트릭
      current: status.current ? {
        cpu: status.current.system.cpu.usage,
        memory: status.current.system.memory.usage,
        disk: status.current.system.disk.usage,
        uptime: status.current.system.network.uptime,
        processMemory: Math.round(
          status.current.performance.process.memory.heapUsed / 1024 / 1024
        ) // MB
      } : null,
      
      // 평균값
      averages: avgMetrics,
      
      // 알림 요약
      alerts: {
        critical: status.summary.alerts.critical,
        warning: status.summary.alerts.warning,
        total: status.summary.alerts.total,
        recent: status.alerts.slice(0, 5)
      },
      
      // 시스템 정보
      systemInfo: status.current ? {
        hostname: status.current.system.network.hostname,
        platform: status.current.system.network.platform,
        arch: status.current.system.network.arch,
        cpuCores: status.current.system.cpu.cores,
        totalMemory: Math.round(status.current.system.memory.total / 1024 / 1024 / 1024) // GB
      } : null
    };
    
    res.json({
      success: true,
      dashboard,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error);
    res.status(500).json({
      error: '대시보드 데이터 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/monitoring/start
 * 모니터링 시작
 */
router.post('/start', (req, res) => {
  try {
    const { interval = 5000 } = req.body;
    
    monitoringService.startMonitoring(interval);
    
    res.json({
      success: true,
      message: '모니터링이 시작되었습니다.',
      interval
    });
  } catch (error) {
    console.error('모니터링 시작 오류:', error);
    res.status(500).json({
      error: '모니터링 시작 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * POST /api/monitoring/stop
 * 모니터링 중지
 */
router.post('/stop', (req, res) => {
  try {
    monitoringService.stopMonitoring();
    
    res.json({
      success: true,
      message: '모니터링이 중지되었습니다.'
    });
  } catch (error) {
    console.error('모니터링 중지 오류:', error);
    res.status(500).json({
      error: '모니터링 중지 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * PUT /api/monitoring/thresholds
 * 모니터링 임계값 설정
 */
router.put('/thresholds', (req, res) => {
  try {
    const { cpuUsage, memoryUsage, diskUsage, responseTime, errorRate } = req.body;
    
    const newThresholds = {};
    if (cpuUsage !== undefined) newThresholds.cpuUsage = cpuUsage;
    if (memoryUsage !== undefined) newThresholds.memoryUsage = memoryUsage;
    if (diskUsage !== undefined) newThresholds.diskUsage = diskUsage;
    if (responseTime !== undefined) newThresholds.responseTime = responseTime;
    if (errorRate !== undefined) newThresholds.errorRate = errorRate;
    
    monitoringService.updateThresholds(newThresholds);
    
    res.json({
      success: true,
      message: '임계값이 업데이트되었습니다.',
      thresholds: monitoringService.thresholds
    });
  } catch (error) {
    console.error('임계값 설정 오류:', error);
    res.status(500).json({
      error: '임계값 설정 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/export
 * 모니터링 데이터 내보내기
 */
router.get('/export', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `monitoring-data-${timestamp}.json`;
    const filePath = `./temp/${filename}`;
    
    await monitoringService.exportMetrics(filePath);
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('파일 다운로드 오류:', err);
        res.status(500).json({
          error: '파일 다운로드 중 오류가 발생했습니다.'
        });
      }
    });
  } catch (error) {
    console.error('데이터 내보내기 오류:', error);
    res.status(500).json({
      error: '데이터 내보내기 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/system-info
 * 시스템 정보 조회
 */
router.get('/system-info', (req, res) => {
  try {
    const status = monitoringService.getCurrentStatus();
    
    if (!status.current) {
      return res.status(404).json({
        error: '시스템 정보를 조회할 수 없습니다.'
      });
    }
    
    const systemInfo = {
      system: status.current.system,
      performance: status.current.performance,
      timestamp: status.current.timestamp
    };
    
    res.json({
      success: true,
      systemInfo
    });
  } catch (error) {
    console.error('시스템 정보 조회 오류:', error);
    res.status(500).json({
      error: '시스템 정보 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/system
 * 시스템 종합 상태 조회 (advanced-features.html 호환성을 위해)
 */
router.get('/system', (req, res) => {
  try {
    const status = monitoringService.getCurrentStatus();
    
    if (!status.current) {
      return res.status(404).json({
        error: '수집된 시스템 데이터가 없습니다.'
      });
    }
    
    res.json({
      success: true,
      system: status.current,
      lastUpdate: status.lastUpdate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('시스템 상태 조회 오류:', error);
    res.status(500).json({
      error: '시스템 상태 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/metrics/history
 * 시스템 메트릭 히스토리 조회
 */
router.get('/metrics/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const history = await monitoringService.getMetricsHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        history,
        total: history.length
      }
    });
  } catch (error) {
    console.error('메트릭 히스토리 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '메트릭 히스토리 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * GET /api/monitoring/analytics
 * 시스템 모니터링 분석 및 통계
 */
router.get('/analytics', async (req, res) => {
  try {
    const statistics = await monitoringService.getMonitoringStatistics();
    
    res.json({
      success: true,
      data: {
        statistics,
        analytics: {
          system_health: statistics.average_cpu < 80 ? 'healthy' : 'warning',
          memory_status: statistics.average_memory < 80 ? 'optimal' : 'high',
          disk_status: statistics.average_disk < 90 ? 'safe' : 'critical',
          performance_trend: {
            trend: statistics.metrics_trend.length > 1 ? 'tracked' : 'insufficient_data',
            data_points: statistics.metrics_trend.length
          }
        },
        recommendations: [
          statistics.average_cpu > 80 ? 'High CPU usage detected - consider optimization' : null,
          statistics.average_memory > 80 ? 'High memory usage - check for memory leaks' : null,
          statistics.average_disk > 90 ? 'Disk space critically low - cleanup required' : null
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('모니터링 분석 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '모니터링 분석 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

export default router;
