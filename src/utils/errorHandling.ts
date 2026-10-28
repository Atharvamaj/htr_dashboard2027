// Error handling utilities

export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: any) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorInfo,
    };

    if (process.env.NODE_ENV === 'development') {
      logger.error('Error caught by useErrorHandler:', errorDetails);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // monitoringService.captureError(errorDetails);
    }
  };

  return { handleError };
};