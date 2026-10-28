import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/utils/logger";

interface ConnectionSession {
  id: string;
  user_id: string;
  session_start: string;
  last_heartbeat: string;
  user_agent: string;
  ip_address?: string;
  page_url: string;
}

class ConnectionTracker {
  private sessionId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly SESSION_TIMEOUT = 120000; // 2 minutes
  private isActive = false;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserAgent(): string {
    return navigator.userAgent || 'Unknown';
  }

  private getCurrentUrl(): string {
    return window.location.href;
  }

  async startTracking(userId: string): Promise<void> {
    if (this.isActive) {
      return;
    }

    try {
      // Create session record
      const sessionData: Partial<ConnectionSession> = {
        id: this.sessionId,
        user_id: userId,
        session_start: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        user_agent: this.getUserAgent(),
        page_url: this.getCurrentUrl()
      };

      // In a real implementation, you'd store this in a dedicated table
      // For now, we'll use localStorage and periodic cleanup
      await this.updateActiveSession(sessionData);

      this.isActive = true;
      this.startHeartbeat(userId);

      // Listen for page visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      
      // Listen for beforeunload to clean up session
      window.addEventListener('beforeunload', this.stopTracking.bind(this));

      logger.log('Connection tracking started for session:', this.sessionId);
    } catch (error) {
      logger.error('Failed to start connection tracking:', error);
    }
  }

  private async updateActiveSession(sessionData: Partial<ConnectionSession>): Promise<void> {
    try {
      // Store session data in localStorage for now
      const activeSessions = this.getActiveSessionsFromStorage();
      activeSessions[this.sessionId] = {
        ...sessionData,
        last_heartbeat: new Date().toISOString()
      } as ConnectionSession;

      localStorage.setItem('htr_active_sessions', JSON.stringify(activeSessions));

      // Clean up expired sessions
      await this.cleanupExpiredSessions();
    } catch (error) {
      logger.error('Failed to update active session:', error);
    }
  }

  private getActiveSessionsFromStorage(): Record<string, ConnectionSession> {
    try {
      const stored = localStorage.getItem('htr_active_sessions');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      logger.error('Failed to get active sessions:', error);
      return {};
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const activeSessions = this.getActiveSessionsFromStorage();
      const now = Date.now();
      let hasChanges = false;

      for (const [sessionId, session] of Object.entries(activeSessions)) {
        const lastHeartbeat = new Date(session.last_heartbeat).getTime();
        if (now - lastHeartbeat > this.SESSION_TIMEOUT) {
          delete activeSessions[sessionId];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        localStorage.setItem('htr_active_sessions', JSON.stringify(activeSessions));
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  private startHeartbeat(userId: string): void {
    this.heartbeatInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await this.sendHeartbeat(userId);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private async sendHeartbeat(userId: string): Promise<void> {
    try {
      const sessionData: Partial<ConnectionSession> = {
        id: this.sessionId,
        user_id: userId,
        last_heartbeat: new Date().toISOString(),
        page_url: this.getCurrentUrl()
      };

      await this.updateActiveSession(sessionData);
    } catch (error) {
      logger.error('Failed to send heartbeat:', error);
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      // Page is hidden, we'll rely on the timeout mechanism
      logger.log('Page hidden, heartbeat will timeout naturally');
    } else {
      // Page is visible again, heartbeat will resume
      logger.log('Page visible again, heartbeat resumed');
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      // Clear heartbeat interval
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Remove session from storage
      const activeSessions = this.getActiveSessionsFromStorage();
      delete activeSessions[this.sessionId];
      localStorage.setItem('htr_active_sessions', JSON.stringify(activeSessions));

      this.isActive = false;

      // Remove event listeners
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      window.removeEventListener('beforeunload', this.stopTracking.bind(this));

      logger.log('Connection tracking stopped for session:', this.sessionId);
    } catch (error) {
      logger.error('Failed to stop connection tracking:', error);
    }
  }

  getActiveConnectionsCount(): number {
    try {
      const activeSessions = this.getActiveSessionsFromStorage();
      const now = Date.now();
      let activeCount = 0;

      for (const session of Object.values(activeSessions)) {
        const lastHeartbeat = new Date(session.last_heartbeat).getTime();
        if (now - lastHeartbeat <= this.SESSION_TIMEOUT) {
          activeCount++;
        }
      }

      return activeCount;
    } catch (error) {
      logger.error('Failed to get active connections count:', error);
      return 0;
    }
  }

  getActiveConnectionsDetails(): ConnectionSession[] {
    try {
      const activeSessions = this.getActiveSessionsFromStorage();
      const now = Date.now();
      const activeConnections: ConnectionSession[] = [];

      for (const session of Object.values(activeSessions)) {
        const lastHeartbeat = new Date(session.last_heartbeat).getTime();
        if (now - lastHeartbeat <= this.SESSION_TIMEOUT) {
          activeConnections.push(session);
        }
      }

      return activeConnections.sort((a, b) => 
        new Date(b.last_heartbeat).getTime() - new Date(a.last_heartbeat).getTime()
      );
    } catch (error) {
      logger.error('Failed to get active connections details:', error);
      return [];
    }
  }

  // For admin dashboard - get aggregated stats
  getConnectionStats(): {
    totalActive: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    activeSessions: ConnectionSession[];
  } {
    try {
      const activeSessions = this.getActiveConnectionsDetails();
      const uniqueUsers = new Set(activeSessions.map(s => s.user_id)).size;
      
      const totalDuration = activeSessions.reduce((sum, session) => {
        const sessionStart = new Date(session.session_start).getTime();
        const now = Date.now();
        return sum + (now - sessionStart);
      }, 0);

      const averageSessionDuration = activeSessions.length > 0 
        ? totalDuration / activeSessions.length 
        : 0;

      return {
        totalActive: activeSessions.length,
        uniqueUsers,
        averageSessionDuration: Math.round(averageSessionDuration / 1000), // in seconds
        activeSessions
      };
    } catch (error) {
      logger.error('Failed to get connection stats:', error);
      return {
        totalActive: 0,
        uniqueUsers: 0,
        averageSessionDuration: 0,
        activeSessions: []
      };
    }
  }
}

// Create a global instance
export const connectionTracker = new ConnectionTracker();

// Hook for React components
export const useConnectionTracker = () => {
  return {
    startTracking: connectionTracker.startTracking.bind(connectionTracker),
    stopTracking: connectionTracker.stopTracking.bind(connectionTracker),
    getActiveConnectionsCount: connectionTracker.getActiveConnectionsCount.bind(connectionTracker),
    getConnectionStats: connectionTracker.getConnectionStats.bind(connectionTracker)
  };
};

export default connectionTracker;