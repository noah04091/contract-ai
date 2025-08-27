// backend/utils/sse.js
class SSEConnection {
  constructor(res, options = {}) {
    this.res = res;
    this.isConnected = true;
    this.heartbeatInterval = null;
    this.options = {
      heartbeatInterval: options.heartbeatInterval || 30000, // 30 seconds
      compressionEnabled: options.compressionEnabled || false,
      retryTime: options.retryTime || 3000, // 3 seconds
      ...options
    };
    
    this.initializeConnection();
  }

  /**
   * Initialize SSE connection with proper headers
   */
  initializeConnection() {
    // Set SSE headers
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });

    // Send initial connection event
    this.sendEvent('connected', {
      timestamp: new Date().toISOString(),
      retryTime: this.options.retryTime
    });

    // Set up heartbeat to keep connection alive
    this.startHeartbeat();

    // Handle client disconnect
    this.res.on('close', () => {
      this.handleDisconnect();
    });

    this.res.on('error', (error) => {
      console.error('SSE connection error:', error);
      this.handleDisconnect();
    });
  }

  /**
   * Send an event to the client
   */
  sendEvent(type, data = null, options = {}) {
    if (!this.isConnected) {
      return false;
    }

    try {
      let message = '';
      
      // Add event ID if provided
      if (options.id) {
        message += `id: ${options.id}\n`;
      }
      
      // Add retry time if provided
      if (options.retry) {
        message += `retry: ${options.retry}\n`;
      }
      
      // Add event type
      message += `event: ${type}\n`;
      
      // Add data
      if (data !== null) {
        const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
        // Handle multi-line data
        serializedData.split('\n').forEach(line => {
          message += `data: ${line}\n`;
        });
      } else {
        message += 'data: \n';
      }
      
      // End event with double newline
      message += '\n';
      
      this.res.write(message);
      return true;
    } catch (error) {
      console.error('Error sending SSE event:', error);
      this.handleDisconnect();
      return false;
    }
  }

  /**
   * Send a text chunk (for streaming responses)
   */
  sendChunk(text, metadata = {}) {
    return this.sendEvent('chunk', {
      text,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Send progress update
   */
  sendProgress(stage, progress = 0, message = '') {
    return this.sendEvent('progress', {
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error event
   */
  sendError(error, recoverable = false) {
    const errorData = {
      message: error.message || error,
      recoverable,
      timestamp: new Date().toISOString()
    };

    if (error.stack && process.env.NODE_ENV === 'development') {
      errorData.stack = error.stack;
    }

    return this.sendEvent('error', errorData);
  }

  /**
   * Send insights update
   */
  sendInsights(insights) {
    return this.sendEvent('insights', {
      insights,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send citations
   */
  sendCitations(citations) {
    return this.sendEvent('citations', {
      citations,
      count: citations.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send final completion event
   */
  sendComplete(result = {}) {
    return this.sendEvent('complete', {
      ...result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send heartbeat to keep connection alive
   */
  sendHeartbeat() {
    if (this.isConnected) {
      this.sendEvent('heartbeat', { timestamp: new Date().toISOString() });
    }
  }

  /**
   * Start heartbeat interval
   */
  startHeartbeat() {
    if (this.options.heartbeatInterval > 0) {
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, this.options.heartbeatInterval);
    }
  }

  /**
   * Stop heartbeat interval
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect() {
    if (this.isConnected) {
      console.log('SSE client disconnected');
      this.isConnected = false;
      this.stopHeartbeat();
    }
  }

  /**
   * Close the connection
   */
  close() {
    if (this.isConnected) {
      this.sendEvent('close', { reason: 'Server closed connection' });
      this.res.end();
      this.handleDisconnect();
    }
  }

  /**
   * Check if connection is still active
   */
  isActive() {
    return this.isConnected && !this.res.destroyed;
  }
}

/**
 * Utility class for streaming text responses
 */
class TextStreamer {
  constructor(sseConnection, options = {}) {
    this.sse = sseConnection;
    this.options = {
      chunkSize: options.chunkSize || 50, // Characters per chunk
      chunkDelay: options.chunkDelay || 50, // ms between chunks
      wordBoundary: options.wordBoundary !== false, // Break at word boundaries
      ...options
    };
    
    this.buffer = '';
    this.isStreaming = false;
  }

  /**
   * Stream text in chunks
   */
  async streamText(text) {
    if (this.isStreaming) {
      throw new Error('Already streaming text');
    }

    this.isStreaming = true;
    
    try {
      const chunks = this.chunkText(text);
      
      for (let i = 0; i < chunks.length; i++) {
        if (!this.sse.isActive()) {
          break;
        }
        
        const chunk = chunks[i];
        const success = this.sse.sendChunk(chunk, {
          chunkIndex: i,
          totalChunks: chunks.length,
          isLast: i === chunks.length - 1
        });
        
        if (!success) {
          break;
        }
        
        // Add delay between chunks (except for the last one)
        if (i < chunks.length - 1 && this.options.chunkDelay > 0) {
          await this.delay(this.options.chunkDelay);
        }
      }
    } finally {
      this.isStreaming = false;
    }
  }

  /**
   * Chunk text into appropriate sizes
   */
  chunkText(text) {
    const chunks = [];
    let currentPos = 0;
    
    while (currentPos < text.length) {
      let chunkEnd = Math.min(currentPos + this.options.chunkSize, text.length);
      
      // If word boundary is enabled and we're not at the end, find last space
      if (this.options.wordBoundary && chunkEnd < text.length) {
        const lastSpace = text.lastIndexOf(' ', chunkEnd);
        if (lastSpace > currentPos) {
          chunkEnd = lastSpace;
        }
      }
      
      const chunk = text.substring(currentPos, chunkEnd);
      chunks.push(chunk);
      
      currentPos = chunkEnd;
      
      // Skip leading whitespace for next chunk
      while (currentPos < text.length && text[currentPos] === ' ') {
        currentPos++;
      }
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Connection manager for handling multiple SSE connections
 */
class SSEManager {
  constructor() {
    this.connections = new Map();
    this.connectionCounter = 0;
  }

  /**
   * Create a new SSE connection
   */
  createConnection(res, userId = null, options = {}) {
    const connectionId = `sse_${++this.connectionCounter}_${Date.now()}`;
    
    const connection = new SSEConnection(res, options);
    
    this.connections.set(connectionId, {
      connection,
      userId,
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    // Clean up on disconnect
    res.on('close', () => {
      this.connections.delete(connectionId);
    });
    
    return {
      connectionId,
      connection
    };
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId) {
    const connData = this.connections.get(connectionId);
    return connData ? connData.connection : null;
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId) {
    const userConnections = [];
    
    for (const [connectionId, connData] of this.connections.entries()) {
      if (connData.userId === userId && connData.connection.isActive()) {
        userConnections.push({
          connectionId,
          connection: connData.connection,
          createdAt: connData.createdAt
        });
      }
    }
    
    return userConnections;
  }

  /**
   * Broadcast to all active connections
   */
  broadcast(eventType, data, userId = null) {
    let sentCount = 0;
    
    for (const [connectionId, connData] of this.connections.entries()) {
      if (userId && connData.userId !== userId) {
        continue;
      }
      
      if (connData.connection.isActive()) {
        if (connData.connection.sendEvent(eventType, data)) {
          sentCount++;
        }
      }
    }
    
    return sentCount;
  }

  /**
   * Clean up inactive connections
   */
  cleanupConnections() {
    const now = new Date();
    const maxAge = 1000 * 60 * 60; // 1 hour
    let cleanedUp = 0;
    
    for (const [connectionId, connData] of this.connections.entries()) {
      if (!connData.connection.isActive() || 
          (now - connData.lastActivity) > maxAge) {
        
        connData.connection.close();
        this.connections.delete(connectionId);
        cleanedUp++;
      }
    }
    
    if (cleanedUp > 0) {
      console.log(`Cleaned up ${cleanedUp} inactive SSE connections`);
    }
    
    return cleanedUp;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const total = this.connections.size;
    let active = 0;
    const userCounts = {};
    
    for (const connData of this.connections.values()) {
      if (connData.connection.isActive()) {
        active++;
      }
      
      if (connData.userId) {
        userCounts[connData.userId] = (userCounts[connData.userId] || 0) + 1;
      }
    }
    
    return {
      total,
      active,
      inactive: total - active,
      userCounts
    };
  }
}

// Global SSE manager instance
const sseManager = new SSEManager();

// Cleanup inactive connections every 15 minutes
setInterval(() => {
  sseManager.cleanupConnections();
}, 15 * 60 * 1000);

module.exports = {
  SSEConnection,
  TextStreamer,
  SSEManager,
  sseManager
};