/**
 * 실시간 시스템 모니터링 서비스
 * CPU, 메모리, 디스크, 네트워크 사용량 추적
 */

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import DatabaseService from '../../services/DatabaseService.js';

export class SystemMonitoringService {
  constructor() {
    this.db = new DatabaseService();
    this.metrics = {
      system: new Map(),
      performance: new Map(),
      application: new Map(),
      errors: [],
      alerts: []
    };
    
    this.thresholds = {
      cpuUsage: 80, // 80%
      memoryUsage: 85, // 85%
      diskUsage: 90, // 90%
      responseTime: 1000, // 1초
      errorRate: 5 // 5%
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.metricsHistory = [];
    
    this.initializeMonitoring();
  }

  /**
   * 모니터링 시스템 초기화
   */
  async initializeMonitoring() {
    try {
      const dataDir = path.join(process.cwd(), 'data', 'monitoring');
      await fs.mkdir(dataDir, { recursive: true });
      
      console.log('📊 시스템 모니터링 서비스 초기화 완료');
    } catch (error) {
      console.error('모니터링 시스템 초기화 오류:', error);
    }
  }

  /**
   * 모니터링 시작
   */
  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring) {
      console.log('⚠️ 모니터링이 이미 실행 중입니다.');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);

    console.log(`📊 시스템 모니터링 시작 (${intervalMs}ms 간격)`);
  }

  /**
   * 모니터링 중지
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('⚠️ 모니터링이 실행되고 있지 않습니다.');
      return;
    }

    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
    console.log('📊 시스템 모니터링 중지');
  }

  /**
   * 시스템 메트릭 수집
   */
  async collectMetrics() {
    const timestamp = new Date().toISOString();
    const startTime = performance.now();

    try {
      // 시스템 정보 수집
      const systemMetrics = await this.collectSystemMetrics();
      const performanceMetrics = await this.collectPerformanceMetrics();
      const applicationMetrics = await this.collectApplicationMetrics();

      const metrics = {
        timestamp,
        system: systemMetrics,
        performance: performanceMetrics,
        application: applicationMetrics,
        collectionTime: performance.now() - startTime
      };

      // 메트릭 저장
      this.storeMetrics(metrics);
      
      // 알림 체크
      await this.checkAlerts(metrics);

      // 히스토리 관리 (최근 1000개만 유지)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory.shift();
      }

    } catch (error) {
      console.error('메트릭 수집 오류:', error);
      this.recordError('metric_collection', error.message);
    }
  }

  /**
   * 시스템 메트릭 수집
   */
  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // CPU 사용률 계산 (간단한 방식)
    const cpuUsage = await this.getCPUUsage();

    // 디스크 사용량 (간단한 구현)
    const diskUsage = await this.getDiskUsage();

    return {
      cpu: {
        cores: cpus.length,
        model: cpus[0].model,
        usage: cpuUsage,
        loadavg: os.loadavg()
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: Math.round((usedMem / totalMem) * 100)
      },
      disk: diskUsage,
      network: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime()
      }
    };
  }

  /**
   * 성능 메트릭 수집
   */
  async collectPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        cpu: process.cpuUsage()
      },
      node: {
        version: process.version,
        versions: process.versions
      }
    };
  }

  /**
   * 애플리케이션 메트릭 수집
   */
  async collectApplicationMetrics() {
    // 활성 연결, 요청 수 등을 추적할 수 있음
    return {
      activeConnections: this.getActiveConnections(),
      requestCount: this.getRequestCount(),
      errorCount: this.getErrorCount(),
      responseTimeAvg: this.getAverageResponseTime()
    };
  }

  /**
   * CPU 사용률 계산
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = process.cpuUsage();
      const startTime = performance.now();

      setTimeout(() => {
        const endMeasure = process.cpuUsage(startMeasure);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const userCPU = endMeasure.user / 1000; // microseconds to milliseconds
        const systemCPU = endMeasure.system / 1000;
        const totalCPU = userCPU + systemCPU;

        const usage = Math.min(100, (totalCPU / duration) * 100);
        resolve(Math.round(usage * 100) / 100);
      }, 100);
    });
  }

  /**
   * 디스크 사용량 확인
   */
  async getDiskUsage() {
    try {
      const stats = await fs.stat(process.cwd());
      // 실제 구현에서는 statvfs나 다른 시스템 호출을 사용해야 함
      return {
        total: 1000000000, // 1GB (모의값)
        used: 500000000,   // 500MB (모의값)
        free: 500000000,   // 500MB (모의값)
        usage: 50          // 50% (모의값)
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        error: error.message
      };
    }
  }

  /**
   * 메트릭 저장
   */
  storeMetrics(metrics) {
    // 최근 메트릭을 메모리에 저장
    this.metrics.system.set('latest', metrics.system);
    this.metrics.performance.set('latest', metrics.performance);
    this.metrics.application.set('latest', metrics.application);

    // 데이터베이스에 메트릭 저장 (5분마다만 저장하여 성능 최적화)
    const now = Date.now();
    const lastSaved = this.lastDbSave || 0;
    const fiveMinutes = 5 * 60 * 1000; // 5분

    if (now - lastSaved > fiveMinutes) {
      try {
        this.db.saveSystemMetrics({
          cpu_usage: metrics.system.cpu.usage,
          memory_usage: metrics.system.memory.usage,
          disk_usage: metrics.system.disk.usage,
          network_info: metrics.system.network,
          performance_data: metrics.performance
        });
        this.lastDbSave = now;
        console.log('💾 시스템 메트릭 데이터베이스 저장 완료');
      } catch (dbError) {
        console.warn(`⚠️ 시스템 메트릭 저장 실패: ${dbError.message}`);
      }
    }
  }

  /**
   * 알림 체크
   */
  async checkAlerts(metrics) {
    const alerts = [];

    // CPU 사용률 체크
    if (metrics.system.cpu.usage > this.thresholds.cpuUsage) {
      alerts.push({
        type: 'CPU_HIGH',
        level: 'WARNING',
        message: `CPU 사용률이 높습니다: ${metrics.system.cpu.usage}%`,
        threshold: this.thresholds.cpuUsage,
        current: metrics.system.cpu.usage,
        timestamp: metrics.timestamp
      });
    }

    // 메모리 사용률 체크
    if (metrics.system.memory.usage > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'MEMORY_HIGH',
        level: 'WARNING',
        message: `메모리 사용률이 높습니다: ${metrics.system.memory.usage}%`,
        threshold: this.thresholds.memoryUsage,
        current: metrics.system.memory.usage,
        timestamp: metrics.timestamp
      });
    }

    // 디스크 사용률 체크
    if (metrics.system.disk.usage > this.thresholds.diskUsage) {
      alerts.push({
        type: 'DISK_HIGH',
        level: 'CRITICAL',
        message: `디스크 사용률이 높습니다: ${metrics.system.disk.usage}%`,
        threshold: this.thresholds.diskUsage,
        current: metrics.system.disk.usage,
        timestamp: metrics.timestamp
      });
    }

    // 알림 저장
    if (alerts.length > 0) {
      this.metrics.alerts.push(...alerts);
      
      // 최근 100개 알림만 유지
      if (this.metrics.alerts.length > 100) {
        this.metrics.alerts = this.metrics.alerts.slice(-100);
      }

      console.log(`🚨 ${alerts.length}개의 새로운 알림이 생성되었습니다.`);
    }
  }

  /**
   * 현재 시스템 상태 조회
   */
  getCurrentStatus() {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    
    return {
      isMonitoring: this.isMonitoring,
      lastUpdate: latest?.timestamp || null,
      current: latest || null,
      alerts: this.metrics.alerts.slice(-10), // 최근 10개 알림
      summary: this.generateSummary()
    };
  }

  /**
   * 요약 정보 생성
   */
  generateSummary() {
    if (this.metricsHistory.length === 0) {
      return {
        status: 'NO_DATA',
        message: '수집된 데이터가 없습니다.'
      };
    }

    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const criticalAlerts = this.metrics.alerts.filter(a => a.level === 'CRITICAL').length;
    const warningAlerts = this.metrics.alerts.filter(a => a.level === 'WARNING').length;

    let status = 'HEALTHY';
    let message = '시스템이 정상적으로 작동 중입니다.';

    if (criticalAlerts > 0) {
      status = 'CRITICAL';
      message = `${criticalAlerts}개의 심각한 문제가 발견되었습니다.`;
    } else if (warningAlerts > 0) {
      status = 'WARNING';
      message = `${warningAlerts}개의 경고가 있습니다.`;
    }

    return {
      status,
      message,
      metrics: {
        cpuUsage: latest.system.cpu.usage,
        memoryUsage: latest.system.memory.usage,
        diskUsage: latest.system.disk.usage,
        uptime: latest.system.network.uptime
      },
      alerts: {
        critical: criticalAlerts,
        warning: warningAlerts,
        total: this.metrics.alerts.length
      }
    };
  }

  /**
   * 히스토리 데이터 조회
   */
  getMetricsHistory(minutes = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    return this.metricsHistory.filter(metric => 
      new Date(metric.timestamp) > cutoff
    );
  }

  /**
   * 오류 기록
   */
  recordError(type, message) {
    this.metrics.errors.push({
      type,
      message,
      timestamp: new Date().toISOString()
    });

    // 최근 100개 오류만 유지
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  // 애플리케이션 메트릭 헬퍼 메소드들
  getActiveConnections() {
    // 실제 구현에서는 서버 연결 수를 추적
    return Math.floor(Math.random() * 100);
  }

  getRequestCount() {
    // 실제 구현에서는 요청 카운터를 유지
    return Math.floor(Math.random() * 1000);
  }

  getErrorCount() {
    return this.metrics.errors.length;
  }

  getAverageResponseTime() {
    // 실제 구현에서는 응답 시간을 추적
    return Math.floor(Math.random() * 500) + 50;
  }

  /**
   * 임계값 설정 업데이트
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 모니터링 임계값이 업데이트되었습니다:', this.thresholds);
  }

  /**
   * 모니터링 데이터 내보내기
   */
  async exportMetrics(filePath) {
    try {
      const data = {
        exportTime: new Date().toISOString(),
        summary: this.generateSummary(),
        history: this.metricsHistory,
        alerts: this.metrics.alerts,
        errors: this.metrics.errors,
        thresholds: this.thresholds
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`📊 모니터링 데이터를 ${filePath}로 내보냈습니다.`);
      
      return filePath;
    } catch (error) {
      console.error('데이터 내보내기 오류:', error);
      throw error;
    }
  }

  /**
   * 메트릭 히스토리 조회
   */
  async getMetricsHistory(limit = 50) {
    try {
      return this.db.getSystemMetrics(limit);
    } catch (error) {
      console.error('메트릭 히스토리 조회 오류:', error);
      return [];
    }
  }

  /**
   * 모니터링 통계 조회
   */
  async getMonitoringStatistics() {
    try {
      const metrics = this.db.getAllSystemMetrics();
      
      if (metrics.length === 0) {
        return {
          total_metrics: 0,
          average_cpu: 0,
          average_memory: 0,
          average_disk: 0,
          metrics_trend: []
        };
      }

      const totalCpu = metrics.reduce((sum, metric) => sum + metric.cpu_usage, 0);
      const totalMemory = metrics.reduce((sum, metric) => sum + metric.memory_usage, 0);
      const totalDisk = metrics.reduce((sum, metric) => sum + metric.disk_usage, 0);

      return {
        total_metrics: metrics.length,
        average_cpu: Math.round(totalCpu / metrics.length),
        average_memory: Math.round(totalMemory / metrics.length),
        average_disk: Math.round(totalDisk / metrics.length),
        metrics_trend: this.calculateMetricsTrend(metrics)
      };
    } catch (error) {
      console.error('모니터링 통계 조회 오류:', error);
      return {
        total_metrics: 0,
        average_cpu: 0,
        average_memory: 0,
        average_disk: 0,
        metrics_trend: []
      };
    }
  }

  /**
   * 메트릭 트렌드 계산
   */
  calculateMetricsTrend(metrics) {
    // 최근 24시간 동안의 시간별 평균 계산
    const hourlyData = {};
    
    metrics.forEach(metric => {
      const hour = new Date(metric.timestamp).getHours();
      const key = `${hour}:00`;
      
      if (!hourlyData[key]) {
        hourlyData[key] = { cpu: [], memory: [], disk: [] };
      }
      
      hourlyData[key].cpu.push(metric.cpu_usage);
      hourlyData[key].memory.push(metric.memory_usage);
      hourlyData[key].disk.push(metric.disk_usage);
    });

    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour,
      average_cpu: Math.round(data.cpu.reduce((a, b) => a + b, 0) / data.cpu.length),
      average_memory: Math.round(data.memory.reduce((a, b) => a + b, 0) / data.memory.length),
      average_disk: Math.round(data.disk.reduce((a, b) => a + b, 0) / data.disk.length)
    })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }
}

export default SystemMonitoringService;
