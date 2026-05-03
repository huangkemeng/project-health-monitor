// Global error event system for API errors
// This allows non-React code (like API interceptors) to trigger UI notifications

type ErrorListener = (message: string, type?: 'error' | 'warning' | 'success') => void;

class ErrorEventEmitter {
  private listeners: ErrorListener[] = [];

  subscribe(listener: ErrorListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(message: string, type: 'error' | 'warning' | 'success' = 'error'): void {
    this.listeners.forEach(listener => listener(message, type));
  }
}

export const errorEvents = new ErrorEventEmitter();

// Helper function to emit rate limit errors
export function emitRateLimitError(message: string): void {
  errorEvents.emit(message, 'warning');
}

// Helper function to emit general errors
export function emitError(message: string): void {
  errorEvents.emit(message, 'error');
}
