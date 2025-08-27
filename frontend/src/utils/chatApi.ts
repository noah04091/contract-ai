// frontend/src/utils/chatApi.ts
export interface ContractIndexRequest {
  file: File;
  contractId?: string;
}

export interface ContractIndexResponse {
  success: boolean;
  data?: {
    contractId: string;
    fileName: string;
    chunksProcessed: number;
    chunksIndexed: number;
    processingTime: number;
  };
  message: string;
  error?: string;
}

export interface ChatAskRequest {
  question: string;
  contractId?: string;
  userMode?: 'laie' | 'business' | 'jurist';
}

export interface Insight {
  kind: 'party' | 'amount' | 'deadline' | 'risk';
  label: string;
  value: string;
  page?: number;
  span?: [number, number];
  severity?: 'low' | 'medium' | 'high';
}

export interface Citation {
  id: string;
  type: 'contract_source' | 'analysis_result' | 'tool_reference';
  page: number;
  text: string;
  score?: number;
  confidence?: number;
  chunkId?: string;
}

export interface StreamEvent {
  type: 'connected' | 'progress' | 'chunk' | 'insights' | 'citations' | 'complete' | 'error' | 'heartbeat';
  data?: any;
  timestamp?: string;
}

export interface ChatStreamResult {
  answer?: string;
  insights?: Insight[];
  citations?: Citation[];
  telemetry?: {
    retrievalMs: number;
    intentMs: number;
    toolsMs: number;
    generationMs: number;
    totalLatency: number;
    tokensIn: number;
    tokensOut: number;
    citationsCount: number;
  };
  intentAnalysis?: {
    primary: string;
    confidence: number;
  };
  toolsUsed?: string[];
  error?: string;
  fallback?: boolean;
}

export class ChatStreamReader {
  private eventSource: EventSource | null = null;
  private abortController: AbortController | null = null;
  private onEvent?: (event: StreamEvent) => void;
  private onError?: (error: Error) => void;
  private onComplete?: (result: ChatStreamResult) => void;

  constructor(
    private onEventCallback?: (event: StreamEvent) => void,
    private onErrorCallback?: (error: Error) => void,
    private onCompleteCallback?: (result: ChatStreamResult) => void
  ) {
    this.onEvent = onEventCallback;
    this.onError = onErrorCallback;
    this.onComplete = onCompleteCallback;
  }

  async start(request: ChatAskRequest): Promise<void> {
    this.abortController = new AbortController();
    
    try {
      // Create SSE connection
      const params = new URLSearchParams({
        question: request.question,
        userMode: request.userMode || 'business'
      });
      
      if (request.contractId) {
        params.set('contractId', request.contractId);
      }

      const url = `/api/chat/ask?${params.toString()}`;
      
      // Use EventSource for SSE
      this.eventSource = new EventSource(url, {
        withCredentials: true
      });

      let result: ChatStreamResult = {};
      let fullAnswer = '';
      
      this.eventSource.onopen = () => {
        console.log('🔌 SSE connection opened');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const streamEvent: StreamEvent = {
            type: event.type as any || 'message',
            data,
            timestamp: new Date().toISOString()
          };
          
          this.onEvent?.(streamEvent);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      // Handle specific event types
      this.eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        this.onEvent?.({ type: 'connected', data });
      });

      this.eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        this.onEvent?.({ type: 'progress', data });
      });

      this.eventSource.addEventListener('chunk', (event) => {
        const data = JSON.parse(event.data);
        fullAnswer += data.text || '';
        result.answer = fullAnswer;
        this.onEvent?.({ type: 'chunk', data });
      });

      this.eventSource.addEventListener('insights', (event) => {
        const data = JSON.parse(event.data);
        result.insights = data.insights;
        this.onEvent?.({ type: 'insights', data });
      });

      this.eventSource.addEventListener('citations', (event) => {
        const data = JSON.parse(event.data);
        result.citations = data.citations;
        this.onEvent?.({ type: 'citations', data });
      });

      this.eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);
        Object.assign(result, data);
        this.onEvent?.({ type: 'complete', data });
        this.onComplete?.(result);
        this.cleanup();
      });

      this.eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        const error = new Error(data.message || 'Stream error');
        this.onEvent?.({ type: 'error', data });
        this.onError?.(error);
        this.cleanup();
      });

      this.eventSource.onerror = (event) => {
        console.error('SSE error:', event);
        const error = new Error('Connection error');
        this.onError?.(error);
        this.cleanup();
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.onError?.(err);
      this.cleanup();
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.cleanup();
  }

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.abortController = null;
  }

  isActive(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export class ChatApi {
  private static baseUrl = '/api';

  /**
   * Index a contract for RAG search
   */
  static async indexContract(request: ContractIndexRequest): Promise<ContractIndexResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    
    if (request.contractId) {
      formData.append('contractId', request.contractId);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/index`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Contract indexing failed:', error);
      throw error;
    }
  }

  /**
   * Create a streaming chat session
   */
  static createStreamReader(
    onEvent?: (event: StreamEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: (result: ChatStreamResult) => void
  ): ChatStreamReader {
    return new ChatStreamReader(onEvent, onError, onComplete);
  }

  /**
   * Get suggested questions
   */
  static async getSuggestions(contractId?: string): Promise<{
    success: boolean;
    data?: {
      suggestions: Array<{
        text: string;
        category: string;
        icon: string;
      }>;
      contractSpecific: boolean;
    };
  }> {
    try {
      const params = contractId ? `?contractId=${contractId}` : '';
      const response = await fetch(`${this.baseUrl}/chat/suggest${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return { success: false };
    }
  }

  /**
   * Get user's indexed contracts
   */
  static async getContracts(): Promise<{
    success: boolean;
    data?: {
      contracts: Array<{
        id: string;
        fileName: string;
        pageCount: number;
        chunkCount: number;
        status: string;
        createdAt: string;
        lastAccessedAt: string;
      }>;
      total: number;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/contracts`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get contracts:', error);
      return { success: false };
    }
  }

  /**
   * Delete a contract
   */
  static async deleteContract(contractId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/contracts/${contractId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete contract:', error);
      throw error;
    }
  }

  /**
   * Get chat health status
   */
  static async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, any>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        services: {}
      };
    }
  }

  /**
   * Retry with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if feature flag is enabled
   */
  static isChatV2Enabled(): boolean {
    // Check environment variable or config
    return process.env.REACT_APP_CHAT_V2 === 'enabled' || 
           localStorage.getItem('chatV2Enabled') === 'true';
  }

  /**
   * Enable/disable chat v2 (for testing)
   */
  static setChatV2Enabled(enabled: boolean): void {
    if (enabled) {
      localStorage.setItem('chatV2Enabled', 'true');
    } else {
      localStorage.removeItem('chatV2Enabled');
    }
  }
}

export default ChatApi;