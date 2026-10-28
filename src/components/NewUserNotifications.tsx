import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckinStatus } from '@/hooks/use-checkin-status';
import { useToast } from '@/hooks/use-toast';
import { Bell, Clock, Loader2, Users, Mail, Volume2 } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from "@/utils/logger";
import { initializePushNotifications, showTeamNotification, showGlobalNotification } from '@/utils/pushNotifications';

interface UserNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  is_active: boolean;
  team_id: string | null;
}

interface GlobalNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
}

const NewUserNotifications = () => {
  const { user } = useAuth();
  const { isCheckedIn } = useCheckinStatus();
  const { toast } = useToast();
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<GlobalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const lastNotificationCountRef = useRef<{ user: number; global: number }>({ user: 0, global: 0 });
  
  // Initialize audio context automatically (mobile-friendly)
  const initializeAudio = async () => {
    if (!audioInitialized && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          
          // Resume audio context if suspended (mobile requirement)
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          
          setAudioContext(ctx);
          setAudioInitialized(true);
          logger.log('Audio context initialized');
        }
      } catch (error) {
        logger.log('Audio initialization failed:', error);
        // Fallback: try to use browser notification sound or vibration
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }
  };

  // Auto-initialize audio and push notifications on component mount
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudio();
      initializePushNotifications(); // Request push notification permission
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // Try to initialize immediately
    initializeAudio();
    initializePushNotifications();
    
    // Also initialize on first user interaction for mobile browsers
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Function to play notification sound (mobile-optimized)
  const playNotificationSound = async () => {
    try {
      // Ensure audio is initialized
      if (!audioInitialized) {
        await initializeAudio();
      }

      if (audioContext && audioContext.state !== 'suspended') {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant notification sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } else {
        // Fallback for mobile: use vibration if available
        if ('vibrate' in navigator) {
          navigator.vibrate([150, 50, 150]);
        }
      }
    } catch (error) {
      logger.log('Audio playback failed:', error);
      // Final fallback: vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([200]);
      }
    }
  };

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

  // Function to show notification popup
  const showNotificationPopup = (notification: UserNotification | GlobalNotification, type: 'team' | 'global') => {
    const notificationTitle = type === 'team' 
      ? `Team Notification: ${formatTitle(notification.title)}` 
      : `Admin Alert: ${formatTitle(notification.title)}`;
    
    toast({
      title: notificationTitle,
      description: formatText(notification.message),
      duration: 6000, // 6 seconds
    });
  };

  useEffect(() => {
    if (user && isCheckedIn) {
      loadNotifications();
    } else if (user && isCheckedIn === false) {
      // Clear notifications for non-checked-in users
      setUserNotifications([]);
      setGlobalNotifications([]);
      setLoading(false);
    }

    // Set up real-time notifications only for checked-in users
    let userNotificationsChannel: any = null;
    let globalNotificationsChannel: any = null;

    if (user && isCheckedIn) {
      userNotificationsChannel = supabase
        .channel('user-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications'
          },
          (payload) => {
            logger.log('User notification change:', payload);
            loadNotifications();
            
            // Check if it's a new notification for the current user
            if (payload.eventType === 'INSERT' && payload.new && payload.new.user_id === user?.id) {
              playNotificationSound();
              showNotificationPopup(payload.new as UserNotification, 'team');
              // Show browser push notification
              showTeamNotification(payload.new.title, payload.new.message);
            }
          }
        )
        .subscribe();

      globalNotificationsChannel = supabase
        .channel('global-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications'
          },
          (payload) => {
            logger.log('Global notification change:', payload);
            loadNotifications();
            
            // Check if it's a new notification
            if (payload.eventType === 'INSERT' && payload.new) {
              playNotificationSound();
              showNotificationPopup(payload.new as GlobalNotification, 'global');
              // Show browser push notification
              showGlobalNotification(payload.new.title, payload.new.message);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (userNotificationsChannel) {
        supabase.removeChannel(userNotificationsChannel);
      }
      if (globalNotificationsChannel) {
        supabase.removeChannel(globalNotificationsChannel);
      }
    };
  }, [user, isCheckedIn]);

  const loadNotifications = async () => {
    if (!user || !isCheckedIn) return;
    
    setLoading(true);
    setError(null);

    try {
      // Try to load user-specific notifications (team notifications, etc.)
      // This will fail gracefully if the table doesn't exist yet
      let userNotifs: UserNotification[] = [];
      try {
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error) {
          userNotifs = data || [];
        }
      } catch (err) {
        logger.log('User notifications table not ready yet:', err);
      }

      // Load global notifications (admin announcements)
      const { data: globalNotifs, error: globalError } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (globalError) throw globalError;

      setUserNotifications(userNotifs);
      setGlobalNotifications(globalNotifs || []);
    } catch (error) {
      logger.error('Error loading notifications:', error);
      setError('Failed to Load Notifications - Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Update local state
      setUserNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  };

  const allNotifications = [
    ...userNotifications.map(n => ({ ...n, type: 'team' as const })),
    ...globalNotifications.map(n => ({ ...n, type: 'global' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading Notifications...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Notifications</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your team and admin notifications
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={playNotificationSound}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
            Test Sound
          </Button>
          <Badge variant="secondary" className="text-xs">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">Total: </span>{allNotifications.length}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">Unread: </span>{userNotifications.filter(n => !n.read_at).length}
          </Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && allNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <Bell className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2 text-center">No Notifications Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              You'll see team notifications and admin announcements here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {allNotifications.map((notification) => (
            <Card 
              key={`${notification.type}-${notification.id}`} 
              className={`transition-all ${
                notification.type === 'team' && !(notification as any).read_at
                  ? 'border-l-4 border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/20' 
                  : ''
              }`}
            >
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      {notification.type === 'team' ? (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Team Notification</span>
                          <span className="sm:hidden">Team</span>
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          <Mail className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Admin Announcement</span>
                          <span className="sm:hidden">Admin</span>
                        </Badge>
                      )}
                      {notification.type === 'team' && !(notification as any).read_at && (
                        <Badge variant="destructive" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base sm:text-lg leading-tight break-words">
                      {formatTitle(notification.title)}
                    </CardTitle>
                    <div className="flex items-center text-muted-foreground text-xs sm:text-sm mt-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                  {notification.type === 'team' && !(notification as any).read_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs whitespace-nowrap"
                    >
                      Mark as Read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {formatText(notification.message)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewUserNotifications;
