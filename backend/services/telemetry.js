// backend/services/telemetry.js
const fs = require('fs').promises;
const path = require('path');

class TelemetryService {
  constructor() {
    this.isEnabled = process.env.NODE_ENV !== 'development';
    this.logPath = path.join(__dirname, '../logs');
    this.metricsBuffer = [];
    this.maxBufferSize = 100;
    this.flushInterval = 30000; // 30 seconds
    
    this.initializeLogging();
    this.startPeriodicFlush();
  }

  /**
   * Initialize logging directory
   */
  async initializeLogging() {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  /**
   * Track Chat v2 events
   */
  trackChatEvent(eventType, data = {}) {
    if (!this.isEnabled) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type: 'chat_v2',
      event: eventType,
      sessionId: data.sessionId || 'unknown',
      userId: data.userId || null,
      contractId: data.contractId || null,
      metadata: {
        userMode: data.userMode,
        intent: data.intent,
        toolsUsed: data.toolsUsed,
        responseTime: data.responseTime,
        success: data.success,
        error: data.error
      }
    };
    
    this.bufferEvent(event);
    
    // Log to console in development
    if (process.env.DEBUG_TELEMETRY === 'true') {
      console.log('📊 Telemetry:', eventType, data);
    }
  }

  /**
   * Track RAG system performance
   */
  trackRAGEvent(eventType, data = {}) {
    if (!this.isEnabled) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type: 'rag_system',
      event: eventType,
      metadata: {
        searchMode: data.searchMode,
        queryTime: data.queryTime,
        chunksRetrieved: data.chunksRetrieved,
        embeddingProvider: data.embeddingProvider,
        similarityThreshold: data.similarityThreshold,
        error: data.error
      }
    };
    
    this.bufferEvent(event);
  }

  /**
   * Track tool execution
   */
  trackToolExecution(toolName, data = {}) {
    if (!this.isEnabled) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type: 'tool_execution',
      event: 'tool_executed',
      tool: toolName,
      metadata: {
        executionTime: data.executionTime,
        success: data.success,
        error: data.error,
        inputSize: data.inputSize,
        outputSize: data.outputSize,
        intent: data.intent
      }
    };
    
    this.bufferEvent(event);
  }

  /**
   * Track streaming performance
   */
  trackStreamingEvent(eventType, data = {}) {
    if (!this.isEnabled) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type: 'streaming',
      event: eventType,
      metadata: {
        connectionId: data.connectionId,
        duration: data.duration,
        chunksStreamed: data.chunksStreamed,
        totalBytes: data.totalBytes,
        error: data.error
      }
    };
    
    this.bufferEvent(event);
  }

  /**
   * Track errors and exceptions
   */
  trackError(error, context = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'error',
      event: 'exception',
      metadata: {
        message: error.message,
        stack: error.stack,
        component: context.component,
        operation: context.operation,
        userId: context.userId,
        contractId: context.contractId
      }
    };
    
    this.bufferEvent(event);
    
    // Always log errors immediately
    this.logError(error, context);
  }

  /**
   * Buffer event for batch processing
   */
  bufferEvent(event) {
    this.metricsBuffer.push(event);
    
    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.maxBufferSize) {
      this.flushEvents();
    }
  }

  /**
   * Start periodic flush
   */
  startPeriodicFlush() {
    setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * Flush events to storage
   */
  async flushEvents() {
    if (this.metricsBuffer.length === 0) return;
    
    const events = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      // Write to log file
      const logFile = path.join(this.logPath, `telemetry-${new Date().toISOString().split('T')[0]}.log`);
      const logData = events.map(event => JSON.stringify(event)).join('\n') + '\n';
      
      await fs.appendFile(logFile, logData);
      
      // Send to external telemetry endpoint if configured
      if (process.env.TELEMETRY_ENDPOINT) {
        await this.sendToEndpoint(events);
      }
    } catch (error) {
      console.error('Failed to flush telemetry events:', error);
      // Put events back in buffer on failure
      this.metricsBuffer.unshift(...events);
    }
  }

  /**
   * Send events to external endpoint
   */
  async sendToEndpoint(events) {
    try {
      const response = await fetch(process.env.TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ANALYTICS_KEY || ''}`
        },
        body: JSON.stringify({ events })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send telemetry to endpoint:', error);
    }
  }

  /**
   * Log error immediately
   */
  async logError(error, context = {}) {
    try {
      const errorFile = path.join(this.logPath, `errors-${new Date().toISOString().split('T')[0]}.log`);
      const errorData = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        context
      };
      
      await fs.appendFile(errorFile, JSON.stringify(errorData) + '\n');
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Generate usage report
   */
  async generateUsageReport(startDate, endDate) {
    try {
      const files = await fs.readdir(this.logPath);
      const logFiles = files.filter(file => 
        file.startsWith('telemetry-') && 
        file.endsWith('.log')
      );
      
      const events = [];
      
      for (const file of logFiles) {
        const filePath = path.join(this.logPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const fileEvents = content.trim().split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
        
        events.push(...fileEvents);
      }
      
      // Filter by date range
      const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= startDate && eventDate <= endDate;
      });
      
      // Generate report
      const report = this.analyzeEvents(filteredEvents);
      return report;
      
    } catch (error) {
      console.error('Failed to generate usage report:', error);
      throw error;
    }
  }

  /**
   * Analyze events for reporting
   */
  analyzeEvents(events) {
    const report = {
      totalEvents: events.length,
      dateRange: {
        start: events[0]?.timestamp,
        end: events[events.length - 1]?.timestamp
      },
      eventTypes: {},
      chatMetrics: {
        totalChats: 0,
        successfulChats: 0,
        averageResponseTime: 0,
        intentDistribution: {},
        toolUsage: {}
      },
      ragMetrics: {
        totalQueries: 0,
        averageQueryTime: 0,
        searchModeDistribution: {},
        embeddingProviderDistribution: {}
      },
      errorMetrics: {
        totalErrors: 0,
        errorsByComponent: {},
        mostCommonErrors: {}
      }
    };

    // Analyze events
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalQueryTime = 0;
    let queryTimeCount = 0;

    events.forEach(event => {
      // Count event types
      report.eventTypes[event.type] = (report.eventTypes[event.type] || 0) + 1;

      switch (event.type) {
        case 'chat_v2':
          if (event.event === 'chat_completed') {
            report.chatMetrics.totalChats++;
            if (event.metadata.success) {
              report.chatMetrics.successfulChats++;
            }
            if (event.metadata.responseTime) {
              totalResponseTime += event.metadata.responseTime;
              responseTimeCount++;
            }
            if (event.metadata.intent) {
              report.chatMetrics.intentDistribution[event.metadata.intent] = 
                (report.chatMetrics.intentDistribution[event.metadata.intent] || 0) + 1;
            }
            if (event.metadata.toolsUsed) {
              event.metadata.toolsUsed.forEach(tool => {
                report.chatMetrics.toolUsage[tool] = 
                  (report.chatMetrics.toolUsage[tool] || 0) + 1;
              });
            }
          }
          break;

        case 'rag_system':
          if (event.event === 'search_completed') {
            report.ragMetrics.totalQueries++;
            if (event.metadata.queryTime) {
              totalQueryTime += event.metadata.queryTime;
              queryTimeCount++;
            }
            if (event.metadata.searchMode) {
              report.ragMetrics.searchModeDistribution[event.metadata.searchMode] = 
                (report.ragMetrics.searchModeDistribution[event.metadata.searchMode] || 0) + 1;
            }
            if (event.metadata.embeddingProvider) {
              report.ragMetrics.embeddingProviderDistribution[event.metadata.embeddingProvider] = 
                (report.ragMetrics.embeddingProviderDistribution[event.metadata.embeddingProvider] || 0) + 1;
            }
          }
          break;

        case 'error':
          report.errorMetrics.totalErrors++;
          if (event.metadata.component) {
            report.errorMetrics.errorsByComponent[event.metadata.component] = 
              (report.errorMetrics.errorsByComponent[event.metadata.component] || 0) + 1;
          }
          if (event.metadata.message) {
            report.errorMetrics.mostCommonErrors[event.metadata.message] = 
              (report.errorMetrics.mostCommonErrors[event.metadata.message] || 0) + 1;
          }
          break;
      }
    });

    // Calculate averages
    if (responseTimeCount > 0) {
      report.chatMetrics.averageResponseTime = totalResponseTime / responseTimeCount;
    }
    if (queryTimeCount > 0) {
      report.ragMetrics.averageQueryTime = totalQueryTime / queryTimeCount;
    }

    return report;
  }

  /**
   * Clean old log files
   */
  async cleanOldLogs(retentionDays = 30) {
    try {
      const files = await fs.readdir(this.logPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            console.log(`Deleted old log file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
}

// Create singleton instance
const telemetry = new TelemetryService();

module.exports = telemetry;