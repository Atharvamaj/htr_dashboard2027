import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Clock, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from "@/utils/logger";

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

const UserNotifications = () => {
  const { user } = useAuth();
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<GlobalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadNotifications();

    // Set up real-time notifications for global notifications
    const globalChannel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          logger.log('Global notification change detected:', payload);
          loadNotifications();
        }
      )
      .subscribe();

    // Set up real-time notifications for team notifications
    const teamChannel = supabase
      .channel('team-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications'
        },
        (payload) => {
          logger.log('Team notification change detected:', payload);
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(teamChannel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setError(null);
      logger.log('Loading notifications...');

      // Load global notifications
      const { data: globalData, error: globalError } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (globalError) {
        logger.error('Global notifications error:', globalError);
        throw globalError;
      }

      // Filter out replay notifications on the client side if the column exists
      let filteredGlobalNotifications = globalData || [];
      if (globalData && globalData.length > 0 && 'is_replay' in globalData[0]) {
        filteredGlobalNotifications = globalData.filter((notification: any) => !notification.is_replay);
      }

      // Load user-specific notifications
      let userNotificationsData: UserNotification[] = [];
      if (user?.id) {
        const { data: userData, error: userError } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (userError) {
          logger.log('Team notifications table not ready:', userError);
        } else {
          userNotificationsData = userData || [];
        }
      }

      setGlobalNotifications(filteredGlobalNotifications);
      setUserNotifications(userNotificationsData);
    } catch (error) {
      logger.error('Error loading notifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to load notifications');
      setGlobalNotifications([]);
      setUserNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Combine and sort all notifications by creation date
  const allNotifications = [
    ...globalNotifications.map(n => ({ ...n, type: 'global' as const })),
    ...userNotifications.map(n => ({ ...n, type: 'team' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Stay Updated with the Latest Announcements and Important Information
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {allNotifications.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">Error: {error}</p>
            <Button onClick={loadNotifications} variant="outline">
              Try Again
            </Button>
          </div>
        )}
        
        {!error && allNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No Active Notifications at the Moment
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later for updates!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {allNotifications.map((notification) => (
              <Alert key={notification.id} className="gradient-card border-primary/20">
                <div className="flex items-start gap-3">
                  {notification.type === 'team' ? (
                    <Users className="h-4 w-4 mt-1 text-blue-600" />
                  ) : (
                    <Bell className="h-4 w-4 mt-1" />
                  )}
                  <AlertDescription className="space-y-2 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-base">{formatTitle(notification.title)}</div>
                          <Badge variant={notification.type === 'team' ? 'secondary' : 'default'} className="text-xs">
                            {notification.type === 'team' ? 'Team' : 'Global'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatText(notification.message)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(notification.created_at), 'MMMM d, yyyy \'at\' HH:mm')}</span>
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserNotifications; 