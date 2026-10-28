import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
// Import removed - using direct connection pool access instead
import { PerformanceMonitor as PerfMonitor, CacheManager, NetworkMonitor } from '@/utils/serviceWorker';
import { useConnectionTracker } from '@/lib/connectionTracker';
import { Activity, Database, Wifi, WifiOff, RefreshCw, Trash2, TrendingUp, Clock, Zap, Users, Monitor } from 'lucide-react';
import { logger } from "@/utils/logger";

interface PerformanceMetrics {
  memoryUsage?: number;
  cacheSize: number;
  networkStatus: boolean;
  loadTime?: number;
  renderTime?: number;
  bundleSize?: string;
}

const PerformanceMonitorComponent: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheSize: 0,
    networkStatus: true,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    totalActive: 0,
    uniqueUsers: 0,
    averageSessionDuration: 0,
    activeSessions: [] as any[]
  });
  
  const { getConnectionStats } = useConnectionTracker();

  useEffect(() => {
    updateMetrics();
    
    // Set up network monitoring
    const networkMonitor = NetworkMonitor.getInstance();
    const handleNetworkChange = (isOnline: boolean) => {
      setMetrics(prev => ({ ...prev, networkStatus: isOnline }));
    };
    
    networkMonitor.addListener(handleNetworkChange);
    
    return () => {
      networkMonitor.removeListener(handleNetworkChange);
    };
  }, []);

  const updateMetrics = async () => {
    try {
      // Get cache size
      const cacheSize = await CacheManager.getCacheSize();
      
      // Get memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize;
      
      // Get performance metrics
      const performanceEntries = PerfMonitor.getPerformanceMetrics();
      const loadTime = performanceEntries.find(entry => entry.name === 'app-load')?.duration;
      const renderTime = performanceEntries.find(entry => entry.name === 'component-render')?.duration;
      
      // Get connection statistics
      const connStats = getConnectionStats();
      setConnectionStats(connStats);
      
      setMetrics(prev => ({
        ...prev,
        cacheSize,
        memoryUsage,
        loadTime,
        renderTime,
      }));
    } catch (error) {
      logger.error('Failed to update performance metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await updateMetrics();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const clearAllCaches = async () => {
    await CacheManager.clearAllCaches();
    await updateMetrics();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPerformanceScore = (): number => {
    let score = 100;
    
    // Deduct for high memory usage (if available)
    if (metrics.memoryUsage) {
      const memoryMB = metrics.memoryUsage / (1024 * 1024);
      if (memoryMB > 100) score -= 20;
      else if (memoryMB > 50) score -= 10;
    }
    
    // Deduct for slow load times
    if (metrics.loadTime) {
      if (metrics.loadTime > 3000) score -= 30;
      else if (metrics.loadTime > 1000) score -= 15;
    }
    
    // Deduct for offline status
    if (!metrics.networkStatus) score -= 25;
    
    // Deduct for large cache size
    const cacheMB = metrics.cacheSize / (1024 * 1024);
    if (cacheMB > 100) score -= 10;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const performanceScore = getPerformanceScore();

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Performance Monitor</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Performance Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Performance Score</span>
                <Badge variant="secondary" className={getScoreColor(performanceScore)}>
                  {performanceScore}/100
                </Badge>
              </div>
              <Progress value={performanceScore} className="h-2" />
            </div>

            {/* Network Status */}
            <div className="flex items-center space-x-3">
              {metrics.networkStatus ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium">Network</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.networkStatus ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Cache Size */}
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Cache Size</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(metrics.cacheSize)}
                </p>
              </div>
            </div>

            {/* Active Connections */}
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Active Connections</p>
                <p className="text-xs text-muted-foreground">
                  {connectionStats.totalActive} sessions ({connectionStats.uniqueUsers} users)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.memoryUsage && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Memory Usage</span>
                <Badge variant="outline">
                  {formatBytes(metrics.memoryUsage)}
                </Badge>
              </div>
            )}
            
            {metrics.loadTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm">App Load Time</span>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{Math.round(metrics.loadTime)}ms</span>
                </Badge>
              </div>
            )}
            
            {metrics.renderTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Component Render Time</span>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{Math.round(metrics.renderTime)}ms</span>
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm">Network Status</span>
              <Badge variant={metrics.networkStatus ? "default" : "destructive"}>
                {metrics.networkStatus ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cache Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Cache Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Cache Size</span>
                <Badge variant="outline">
                  {formatBytes(metrics.cacheSize)}
                </Badge>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((metrics.cacheSize / (50 * 1024 * 1024)) * 100, 100)}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended maximum: 50MB
              </p>
            </div>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllCaches}
              className="w-full flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Caches</span>
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Clearing caches will improve performance but may slow down initial loads.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <span>Active Connections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold text-primary">{connectionStats.totalActive}</span>
                </div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">{connectionStats.uniqueUsers}</span>
                </div>
                <p className="text-sm text-muted-foreground">Unique Users</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {Math.round(connectionStats.averageSessionDuration / 60)}m
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Avg Session</p>
              </div>
            </div>
            
            {connectionStats.activeSessions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recent Sessions</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {connectionStats.activeSessions.slice(0, 10).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-mono">{session.user_id.slice(0, 8)}...</span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(session.last_heartbeat).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {performanceScore < 80 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Performance Warning:</strong> Your app performance score is below optimal.
                </p>
              </div>
            )}
            
            {metrics.cacheSize > 50 * 1024 * 1024 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Cache Warning:</strong> Cache size is large. Consider clearing caches.
                </p>
              </div>
            )}
            
            {!metrics.networkStatus && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Offline Mode:</strong> You're currently offline. Some features may not work.
                </p>
              </div>
            )}
            
            {performanceScore >= 80 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Excellent Performance:</strong> Your app is performing optimally!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Export the component as PerformanceMonitor for compatibility
export const PerformanceMonitor = PerformanceMonitorComponent;

// Custom hook for performance monitoring
export const usePerformanceMonitoring = (componentName: string) => {
  const measureAsyncOperation = (operationName: string) => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      logger.log(`${componentName} - ${operationName}: ${duration.toFixed(2)}ms`);
      
      // Record performance mark if available
      if ('mark' in performance && 'measure' in performance) {
        const markName = `${componentName}-${operationName}`;
        performance.mark(markName);
        performance.measure(markName, markName);
      }
    };
  };

  return {
    measureAsyncOperation
  };
};

export default PerformanceMonitorComponent;
