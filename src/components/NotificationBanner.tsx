import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from "@/utils/logger";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active?: boolean;
  is_replay?: boolean;
}

interface NotificationBannerProps {
  notifications: Notification[];
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications }) => {
  const { user } = useAuth();
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [replayNotifications, setReplayNotifications] = useState<Notification[]>([]);
  const previousNotificationsRef = useRef<Notification[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Function to format and capitalize text professionally
  const formatText = (text: string): string => {
    if (!text) return '';
    
    // Trim whitespace and capitalize first letter of each sentence
    return text
      .trim()
      .split('. ')
      .map(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length === 0) return '';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      })
      .join('. ')
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  };

  // Function to format titles professionally
  const formatTitle = (title: string): string => {
    if (!title) return '';
    
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => {
        // Don't capitalize short articles, conjunctions, prepositions unless they're the first word
        const lowercaseWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'up'];
        if (lowercaseWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ')
      // Ensure first word is always capitalized
      .replace(/^./, match => match.toUpperCase());
  };

  // Initialize audio context automatically (mobile-friendly)
  const initializeAudio = useCallback(async () => {
    if (!audioInitialized && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          
          // Resume audio context if suspended (mobile requirement)
          if (ctx.state === 'suspended') {
            await ctx.resume();
            logger.log('Global notification audio context resumed');
          }
          
          setAudioContext(ctx);
          setAudioInitialized(true);
          logger.log('Global notification audio context initialized, state:', ctx.state);
          
          return ctx; // Return the context for immediate use
        }
      } catch (error) {
        logger.log('Global notification audio initialization failed:', error);
        // Fallback: try to use browser notification sound or vibration
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    } else if (audioContext) {
      // If already initialized, just return the existing context
      return audioContext;
    }
    return null;
  }, [audioInitialized, audioContext]);

  // Auto-initialize audio on component mount and user interaction
  useEffect(() => {
    const handleUserInteraction = async () => {
      logger.log('User interaction detected, initializing global notification audio...');
      await initializeAudio();
      
      // Try to resume audio context immediately on interaction
      if (audioContext && audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          logger.log('Global notification audio context resumed after user interaction');
        } catch (error) {
          logger.log('Failed to resume global notification audio context:', error);
        }
      }
      
      // Remove listeners after first successful interaction
      if (audioInitialized && audioContext && audioContext.state === 'running') {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };

    // Try to initialize immediately (might work in some browsers)
    initializeAudio();
    
    // Set up interaction listeners (required for mobile/strict browsers)
    document.addEventListener('click', handleUserInteraction, { once: false });
    document.addEventListener('touchstart', handleUserInteraction, { once: false });
    document.addEventListener('keydown', handleUserInteraction, { once: false });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [audioInitialized, audioContext, initializeAudio]);

  // Sound functions
  const playNotificationSound = useCallback(async () => {
    logger.log('Playing global notification sound...');
    try {
      // Always try to ensure audio is properly initialized and context is running
      let contextToUse = audioContext;
      
      // If no context or context is not running, initialize/resume
      if (!audioInitialized || !contextToUse || contextToUse.state !== 'running') {
        logger.log('Audio context not ready, initializing/resuming...');
        const newContext = await initializeAudio();
        contextToUse = newContext || audioContext;
        
        // Wait a bit for the context to be set if it's still not available
        if (!contextToUse) {
          await new Promise(resolve => setTimeout(resolve, 100));
          contextToUse = audioContext;
        }
        
        // Try to resume the context if suspended
        if (contextToUse && contextToUse.state === 'suspended') {
          logger.log('Global notification audio context suspended, resuming...');
          await contextToUse.resume();
        }
        
        // Small delay to let audio context stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.log(`Global notification audio context state: ${contextToUse?.state}, initialized: ${audioInitialized}`);

      if (contextToUse && contextToUse.state === 'running') {
        const oscillator = contextToUse.createOscillator();
        const gainNode = contextToUse.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(contextToUse.destination);
        
        // Create a pleasant notification sound
        oscillator.frequency.setValueAtTime(800, contextToUse.currentTime);
        oscillator.frequency.setValueAtTime(1000, contextToUse.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, contextToUse.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.2, contextToUse.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, contextToUse.currentTime + 0.3);
        
        oscillator.start(contextToUse.currentTime);
        oscillator.stop(contextToUse.currentTime + 0.3);
        
        logger.log('Global notification sound played successfully');
      } else {
        logger.log('Global notification AudioContext not running, using vibration fallback. State:', contextToUse?.state);
        // Fallback for mobile: use vibration if available
        if ('vibrate' in navigator) {
          navigator.vibrate([150, 50, 150]);
          logger.log('Vibration triggered as fallback for global notification');
        }
      }
    } catch (error) {
      logger.log('Global notification audio playback failed:', error);
      // Final fallback: vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([200]);
        logger.log('Emergency vibration fallback triggered for global notification');
      }
    }
  }, [audioInitialized, audioContext, initializeAudio]);

  const playReplaySound = useCallback(async () => {
    logger.log('Playing global notification replay sound...');
    try {
      // Always try to ensure audio is properly initialized and context is running
      let contextToUse = audioContext;
      
      // If no context or context is not running, initialize/resume
      if (!audioInitialized || !contextToUse || contextToUse.state !== 'running') {
        logger.log('Audio context not ready for replay, initializing/resuming...');
        const newContext = await initializeAudio();
        contextToUse = newContext || audioContext;
        
        // Wait a bit for the context to be set if it's still not available
        if (!contextToUse) {
          await new Promise(resolve => setTimeout(resolve, 100));
          contextToUse = audioContext;
        }
        
        // Try to resume the context if suspended
        if (contextToUse && contextToUse.state === 'suspended') {
          logger.log('Replay audio context suspended, resuming...');
          await contextToUse.resume();
        }
        
        // Small delay to let audio context stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.log(`Replay audio context state: ${contextToUse?.state}, initialized: ${audioInitialized}`);

      if (contextToUse && contextToUse.state === 'running') {
        const oscillator = contextToUse.createOscillator();
        const gainNode = contextToUse.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(contextToUse.destination);
        
        // Create an attention-grabbing sound for replay notifications
        oscillator.frequency.setValueAtTime(600, contextToUse.currentTime);
        oscillator.frequency.setValueAtTime(800, contextToUse.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1000, contextToUse.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(800, contextToUse.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(600, contextToUse.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.3, contextToUse.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, contextToUse.currentTime + 0.5);
        
        oscillator.start(contextToUse.currentTime);
        oscillator.stop(contextToUse.currentTime + 0.5);
        
        logger.log('Global notification replay sound played successfully');
      } else {
        logger.log('Replay AudioContext not running, using vibration fallback. State:', contextToUse?.state);
        // Fallback for mobile: stronger vibration for replay notifications
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
          logger.log('Vibration triggered as fallback for replay notification');
        }
      }
    } catch (error) {
      logger.log('Replay audio playback failed:', error);
      // Final fallback: vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([200]);
        logger.log('Emergency vibration fallback triggered for replay');
      }
    }
  }, [audioInitialized, audioContext, initializeAudio]);

  // For now, use a simpler approach with localStorage but make it more persistent
  // Load user's read notifications from localStorage (persists across sessions)
  useEffect(() => {
    if (!user) return;

    const loadReadNotifications = () => {
      try {
        const storedReads = localStorage.getItem(`global_notification_reads_${user.id}`);
        if (storedReads) {
          const readIds = JSON.parse(storedReads);
          setReadNotifications(readIds);
        }
      } catch (error) {
        logger.error('Error loading read notifications from localStorage:', error);
      }
    };

    loadReadNotifications();
  }, [user]);

  // Mark global notification as read in localStorage (persists across sessions)
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      // Add to local state to immediately hide the notification
      setReadNotifications(prev => {
        const newReads = [...prev, notificationId];
        // Store in localStorage with user-specific key
        localStorage.setItem(`global_notification_reads_${user.id}`, JSON.stringify(newReads));
        logger.log('Marked global notification as read:', notificationId, 'for user:', user.id);
        return newReads;
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }, [user]);

  // Clear read status when notification is replayed (allows it to show again)
  const clearReadStatus = useCallback((notificationId: string) => {
    if (!user) return;

    logger.log('Clearing read status for notification:', notificationId, 'for user:', user.id);
    setReadNotifications(prev => {
      const newReads = prev.filter(id => id !== notificationId);
      localStorage.setItem(`global_notification_reads_${user.id}`, JSON.stringify(newReads));
      return newReads;
    });
  }, [user]);

  const dismissReplayNotification = useCallback((id: string) => {
    setReplayNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Listen for broadcast replay events
  useEffect(() => {
    const channel = supabase.channel('notification-replay');
    
    channel
      .on('broadcast', { event: 'replay-notification' }, (payload) => {
        logger.log('Received replay broadcast:', payload);
        const replayNotification = payload.payload.notification;
        
        // Extract the original notification ID from the replay notification ID
        // Format is: replay_{originalId}_{timestamp}
        const replayIdParts = replayNotification.id.split('_');
        let originalNotificationId = replayNotification.id;
        
        if (replayIdParts.length >= 3 && replayIdParts[0] === 'replay') {
          // Extract original ID (everything between 'replay_' and the last '_timestamp')
          const partsWithoutPrefix = replayIdParts.slice(1); // Remove 'replay'
          const partsWithoutTimestamp = partsWithoutPrefix.slice(0, -1); // Remove timestamp
          originalNotificationId = partsWithoutTimestamp.join('_');
        }
        
        logger.log('Extracted original notification ID for replay:', originalNotificationId);
        
        // Clear read status for the original notification so it can be shown again
        clearReadStatus(originalNotificationId);
        
        // Play sound and show popup
        playReplaySound();
        
        // Add to replay notifications state
        setReplayNotifications(prev => {
          // Check if this notification is already in the list to avoid duplicates
          const exists = prev.find(n => n.id === replayNotification.id);
          if (exists) return prev;
          
          return [...prev, replayNotification];
        });
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          dismissReplayNotification(replayNotification.id);
        }, 10000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playReplaySound, dismissReplayNotification, clearReadStatus]);

  // Filter out replay notifications from regular notifications
  const regularNotifications = notifications.filter(notification => {
    return !notification.is_replay;
  });

  // Handle new regular notifications (play sound when new notifications arrive)
  useEffect(() => {
    logger.log('NotificationBanner: regularNotifications changed', {
      count: regularNotifications.length,
      notifications: regularNotifications.map(n => ({ id: n.id, title: n.title, created_at: n.created_at }))
    });
    
    // Check for new notifications by comparing IDs
    const newNotifications = regularNotifications.filter(notification => 
      !previousNotificationsRef.current.find(prev => prev.id === notification.id)
    );

    logger.log('NotificationBanner: new notifications detected', {
      count: newNotifications.length,
      newNotifications: newNotifications.map(n => ({ id: n.id, title: n.title, created_at: n.created_at }))
    });

    if (newNotifications.length > 0) {
      // New notification received - play sound
      logger.log('NotificationBanner: playing sound for new notifications');
      // Delay slightly to ensure audio context is ready
      setTimeout(async () => {
        try {
          await initializeAudio();
          // Add a small delay to ensure audio context is ready
          await new Promise(resolve => setTimeout(resolve, 50));
          await playNotificationSound();
        } catch (error) {
          logger.log('Error playing sound for new notification:', error);
        }
      }, 100);
    }

    previousNotificationsRef.current = regularNotifications;
  }, [regularNotifications, playNotificationSound, initializeAudio]);

  const visibleNotifications = regularNotifications.filter(
    notification => !readNotifications.includes(notification.id)
  );

  const visibleReplayNotifications = replayNotifications.filter(
    notification => true // Replay notifications are always visible until dismissed
  );

  // Don't render anything if no notifications
  if (visibleNotifications.length === 0 && visibleReplayNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Regular notifications banner */}
      {visibleNotifications.length > 0 && (
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="py-2">
              <div className="space-y-2 p-2 sm:p-4">
                {visibleNotifications.map((notification) => (
                  <Alert key={notification.id} className="gradient-card border-primary/20">
                    <Bell className="h-4 w-4 flex-shrink-0" />
                    <AlertDescription className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm sm:text-base break-words">{formatTitle(notification.title)}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                          {formatText(notification.message)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="flex-shrink-0 text-xs sm:text-sm sm:ml-4"
                      >
                        Mark as Read
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replay notifications as popups */}
      {visibleReplayNotifications.map((notification) => (
        <div
          key={notification.id}
          className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-right duration-300"
        >
          <Alert className="gradient-card border-blue-500/30 shadow-lg bg-blue-50 dark:bg-blue-950/20">
            {/* No bell icon for replay notifications as requested */}
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  {formatTitle(notification.title)}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  {formatText(notification.message)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {format(new Date(notification.created_at), 'HH:mm')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissReplayNotification(notification.id)}
                className="ml-4 text-blue-600 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ))}
    </>
  );
};

export default NotificationBanner;
