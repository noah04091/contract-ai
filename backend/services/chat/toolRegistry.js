// backend/services/chat/toolRegistry.js
const ClauseFinder = require('../tools/clauseFinder');
const DeadlineScanner = require('../tools/deadlineScanner');
const TableExtractor = require('../tools/tableExtractor');
const PIIRedactor = require('../tools/piiRedactor');
const LetterGenerator = require('../tools/letterGenerator');
const Redliner = require('../tools/redliner');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.initializeTools();
  }

  initializeTools() {
    // Register all available tools
    this.registerTool('clauseFinder', new ClauseFinder());
    this.registerTool('deadlineScanner', new DeadlineScanner());
    this.registerTool('tableExtractor', new TableExtractor());
    this.registerTool('piiRedactor', new PIIRedactor());
    this.registerTool('letterGenerator', new LetterGenerator());
    this.registerTool('redliner', new Redliner());
    
    console.log(`🔧 Registered ${this.tools.size} tools`);
  }

  /**
   * Register a tool with the registry
   */
  registerTool(name, toolInstance) {
    if (!toolInstance || typeof toolInstance.execute !== 'function') {
      throw new Error(`Invalid tool: ${name} must have execute method`);
    }
    
    this.tools.set(name, {
      instance: toolInstance,
      name,
      description: toolInstance.description || 'No description available',
      capabilities: toolInstance.capabilities || [],
      registeredAt: new Date()
    });
  }

  /**
   * Get a tool instance by name
   */
  getTool(name) {
    const tool = this.tools.get(name);
    return tool ? tool.instance : null;
  }

  /**
   * Check if a tool is available
   */
  isAvailable(name) {
    return this.tools.has(name);
  }

  /**
   * Get all available tool names
   */
  getAvailableTools() {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool information
   */
  getToolInfo(name) {
    return this.tools.get(name);
  }

  /**
   * Get all tools information
   */
  getAllToolsInfo() {
    return Array.from(this.tools.values());
  }

  /**
   * Health check for all tools
   */
  async healthCheck() {
    const results = {};
    
    for (const [name, toolInfo] of this.tools.entries()) {
      try {
        if (typeof toolInfo.instance.healthCheck === 'function') {
          results[name] = await toolInfo.instance.healthCheck();
        } else {
          results[name] = { status: 'healthy', info: 'No health check implemented' };
        }
      } catch (error) {
        results[name] = { status: 'unhealthy', error: error.message };
      }
    }
    
    return results;
  }
}

module.exports = ToolRegistry;