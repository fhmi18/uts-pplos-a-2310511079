const axios = require('axios');

/**
 * Circuit Breaker states
 */
const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

/**
 * ML Service Client dengan Circuit Breaker Pattern
 * 
 * Fungsi: Mengirim request ke Python ML Service dengan circuit breaker
 * untuk menangani failure secara graceful
 */
class MLClient {
  constructor(baseURL, timeout, failureThreshold, resetTimeout) {
    this.baseURL = baseURL || process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.timeout = timeout || parseInt(process.env.ML_TIMEOUT_MS) || 5000;
    this.failureThreshold = failureThreshold || parseInt(process.env.ML_CIRCUIT_FAILURE_THRESHOLD) || 3;
    this.resetTimeout = resetTimeout || parseInt(process.env.ML_CIRCUIT_RESET_TIMEOUT_MS) || 30000;
    
    // Circuit breaker state
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`[MLClient] Initialized with URL: ${this.baseURL}`);
    console.log(`[MLClient] Timeout: ${this.timeout}ms, Failure Threshold: ${this.failureThreshold}`);
  }

  /**
   * Check apakah circuit breaker perlu di-reset dari HALF_OPEN ke CLOSED/OPEN
   */
  checkCircuitState() {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      // Timer sudah expired, transition ke HALF_OPEN untuk test
      return; // Biarkan HALF_OPEN untuk test request berikutnya
    }

    if (this.circuitState === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        console.log(`[MLClient] Circuit breaker OPEN -> HALF_OPEN (timeout expired)`);
        this.circuitState = CircuitState.HALF_OPEN;
      }
    }
  }

  /**
   * Record successful request - reset circuit breaker
   */
  recordSuccess() {
    if (this.circuitState !== CircuitState.CLOSED) {
      console.log(`[MLClient] Circuit breaker HALF_OPEN -> CLOSED (success)`);
    }
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
  }

  /**
   * Record failed request - update circuit breaker
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      console.log(
        `[MLClient] Circuit breaker CLOSED -> OPEN ` +
        `(failure count: ${this.failureCount}/${this.failureThreshold})`
      );
      this.circuitState = CircuitState.OPEN;
    }
  }

  /**
   * Check health endpoint
   */
  async checkHealth() {
    try {
      const response = await this.axiosInstance.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Predict room recommendation
   * 
   * @param {Object} payload - Request payload untuk Python /predict
   * @returns {Promise<Object>} - Response dari Python ML Service
   */
  async predict(payload) {
    // Check circuit breaker state
    this.checkCircuitState();

    // Jika circuit OPEN, reject immediately tanpa call service
    if (this.circuitState === CircuitState.OPEN) {
      console.log(`[MLClient] Circuit breaker OPEN - rejecting request`);
      const error = new Error('Circuit breaker OPEN - ML Service unavailable');
      error.isCircuitOpen = true;
      error.circuitState = this.circuitState;
      error.failureCount = this.failureCount;
      throw error;
    }

    try {
      console.log(`[MLClient] Sending predict request (state: ${this.circuitState})`);
      
      const response = await this.axiosInstance.post('/predict', payload);
      
      // Success - reset circuit breaker
      this.recordSuccess();
      
      console.log(`[MLClient] Predict success`);
      return response.data;

    } catch (error) {
      // Record failure
      this.recordFailure();

      console.error(`[MLClient] Predict failed - ${error.message}`);
      
      // Enrich error object
      error.circuitState = this.circuitState;
      error.failureCount = this.failureCount;
      error.isMLServiceError = true;
      
      throw error;
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitStatus() {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      baseURL: this.baseURL,
      timeout: this.timeout
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset() {
    console.log(`[MLClient] Circuit breaker manually reset`);
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}

// Export single instance
module.exports = new MLClient();
