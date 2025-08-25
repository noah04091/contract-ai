// 📁 backend/utils/healthCheck.js - Comprehensive Health Monitoring for Contract AI Backend

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Comprehensive system health checker
 */
class HealthChecker {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      memoryThresholdMB: 500,
      diskThresholdMB: 1000,
      responseTimeThresholdMs: 5000,
      ...config
    };
    this.lastCheck = null;
    this.healthHistory = [];
  }

  /**
   * Run complete health check
   */
  async runHealthCheck() {
    const startTime = Date.now();
    const checks = {};

    try {
      // Database connectivity
      checks.database = await this.checkDatabase();
      
      // Memory usage
      checks.memory = this.checkMemory();
      
      // Disk space
      checks.disk = await this.checkDiskSpace();
      
      // Environment variables
      checks.environment = this.checkEnvironment();
      
      // OpenAI connectivity
      checks.openai = await this.checkOpenAI();
      
      // File system permissions
      checks.filesystem = await this.checkFileSystem();
      
      // Process health
      checks.process = this.checkProcess();

    } catch (error) {
      console.error('Health check failed:', error);
      checks.error = error.message;
    }

    const responseTime = Date.now() - startTime;
    const overallStatus = this.calculateOverallStatus(checks);
    
    const healthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      version: process.env.APP_VERSION || '5.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks,
      warnings: this.extractWarnings(checks),
      recommendations: this.generateRecommendations(checks)
    };

    this.lastCheck = healthReport;
    this.healthHistory.push(healthReport);
    
    // Keep only last 24 checks
    if (this.healthHistory.length > 24) {
      this.healthHistory = this.healthHistory.slice(-24);
    }

    return healthReport;
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabase() {
    try {
      const startTime = Date.now();
      
      // Basic ping
      await this.db.admin().ping();
      const pingTime = Date.now() - startTime;
      
      // Collection counts
      const collections = await this.db.listCollections().toArray();
      
      // Sample query performance
      const queryStart = Date.now();
      await this.db.collection('users').findOne({}, { projection: { _id: 1 } });
      const queryTime = Date.now() - queryStart;

      return {
        status: 'healthy',
        pingTimeMs: pingTime,
        queryTimeMs: queryTime,
        collectionsCount: collections.length,
        connected: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false
      };
    }
  }

  /**
   * Check memory usage
   */
  checkMemory() {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);

    const status = heapUsedMB > this.config.memoryThresholdMB ? 'warning' : 'healthy';

    return {
      status,
      heapUsedMB,
      heapTotalMB,
      rssMB,
      externalMB: Math.round(usage.external / 1024 / 1024),
      arrayBuffersMB: Math.round((usage.arrayBuffers || 0) / 1024 / 1024),
      threshold: this.config.memoryThresholdMB
    };
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace() {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      // Ensure uploads directory exists
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      const stats = await fs.stat(uploadsDir);
      
      // Count files in uploads
      const files = await fs.readdir(uploadsDir);
      const totalFiles = files.length;

      // Calculate approximate disk usage (rough estimate)
      let totalSizeMB = 0;
      for (const file of files.slice(0, 10)) { // Sample first 10 files
        try {
          const fileStat = await fs.stat(path.join(uploadsDir, file));
          totalSizeMB += fileStat.size / 1024 / 1024;
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      const estimatedTotalMB = totalFiles > 10 ? (totalSizeMB / 10) * totalFiles : totalSizeMB;
      const status = estimatedTotalMB > this.config.diskThresholdMB ? 'warning' : 'healthy';

      return {
        status,
        uploadsDirectory: uploadsDir,
        totalFiles,
        estimatedSizeMB: Math.round(estimatedTotalMB),
        threshold: this.config.diskThresholdMB,
        accessible: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        accessible: false
      };
    }
  }

  /**
   * Check critical environment variables
   */
  checkEnvironment() {
    const criticalVars = [
      'MONGO_URI',
      'JWT_SECRET',
      'OPENAI_API_KEY'
    ];

    const optionalVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'STRIPE_SECRET_KEY',
      'EMAIL_HOST'
    ];

    const missing = [];
    const present = [];
    const optional = [];

    for (const varName of criticalVars) {
      if (process.env[varName]) {
        present.push(varName);
      } else {
        missing.push(varName);
      }
    }

    for (const varName of optionalVars) {
      if (process.env[varName]) {
        optional.push(varName);
      }
    }

    const status = missing.length > 0 ? 'unhealthy' : 'healthy';

    return {
      status,
      critical: {
        present: present.length,
        missing: missing.length,
        missingVars: missing
      },
      optional: {
        present: optional.length,
        configured: optional
      },
      nodeEnv: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Check OpenAI API connectivity
   */
  async checkOpenAI() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: 'unhealthy',
          error: 'OPENAI_API_KEY not configured',
          configured: false
        };
      }

      // Simple test to check if API key works
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const startTime = Date.now();
      
      // Test with a minimal request
      try {
        const response = await openai.models.list();
        const responseTime = Date.now() - startTime;
        
        return {
          status: 'healthy',
          responseTimeMs: responseTime,
          configured: true,
          modelsAvailable: response.data?.length || 0
        };
      } catch (apiError) {
        if (apiError.status === 401) {
          return {
            status: 'unhealthy',
            error: 'Invalid OpenAI API key',
            configured: true
          };
        }
        throw apiError;
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        configured: !!process.env.OPENAI_API_KEY
      };
    }
  }

  /**
   * Check file system permissions
   */
  async checkFileSystem() {
    const testFile = path.join(__dirname, '..', 'uploads', '.health_test');
    
    try {
      // Test write
      await fs.writeFile(testFile, 'health test');
      
      // Test read
      await fs.readFile(testFile, 'utf8');
      
      // Test delete
      await fs.unlink(testFile);

      return {
        status: 'healthy',
        readable: true,
        writable: true,
        deletable: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        readable: false,
        writable: false,
        deletable: false
      };
    }
  }

  /**
   * Check process health
   */
  checkProcess() {
    const cpuUsage = process.cpuUsage();
    const platform = process.platform;
    const nodeVersion = process.version;
    const pid = process.pid;

    return {
      status: 'healthy',
      pid,
      platform,
      nodeVersion,
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      versions: process.versions
    };
  }

  /**
   * Calculate overall system status
   */
  calculateOverallStatus(checks) {
    let healthyCount = 0;
    let warningCount = 0;
    let unhealthyCount = 0;
    let totalChecks = 0;

    for (const [name, check] of Object.entries(checks)) {
      if (name === 'error') continue;
      totalChecks++;
      
      switch (check.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'warning':
          warningCount++;
          break;
        case 'unhealthy':
          unhealthyCount++;
          break;
      }
    }

    if (unhealthyCount > 0) return 'unhealthy';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  }

  /**
   * Extract warnings from checks
   */
  extractWarnings(checks) {
    const warnings = [];

    for (const [name, check] of Object.entries(checks)) {
      if (check.status === 'warning' || check.status === 'unhealthy') {
        warnings.push({
          component: name,
          status: check.status,
          message: check.error || `${name} check failed`,
          details: check
        });
      }
    }

    return warnings;
  }

  /**
   * Generate recommendations based on check results
   */
  generateRecommendations(checks) {
    const recommendations = [];

    if (checks.memory?.status === 'warning') {
      recommendations.push({
        priority: 'high',
        component: 'memory',
        action: 'Consider implementing memory optimization or increasing server resources',
        details: `Current heap usage: ${checks.memory.heapUsedMB}MB (threshold: ${checks.memory.threshold}MB)`
      });
    }

    if (checks.disk?.status === 'warning') {
      recommendations.push({
        priority: 'medium',
        component: 'disk',
        action: 'Clean up old upload files or implement automatic cleanup',
        details: `Estimated disk usage: ${checks.disk.estimatedSizeMB}MB (threshold: ${checks.disk.threshold}MB)`
      });
    }

    if (checks.database?.queryTimeMs > 1000) {
      recommendations.push({
        priority: 'medium',
        component: 'database',
        action: 'Database queries are slow. Consider optimizing indexes.',
        details: `Average query time: ${checks.database.queryTimeMs}ms`
      });
    }

    if (checks.openai?.status === 'unhealthy') {
      recommendations.push({
        priority: 'critical',
        component: 'openai',
        action: 'Fix OpenAI API configuration to restore AI functionality',
        details: checks.openai.error
      });
    }

    return recommendations;
  }

  /**
   * Get health history
   */
  getHealthHistory() {
    return this.healthHistory;
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck() {
    return this.lastCheck;
  }
}

module.exports = HealthChecker;