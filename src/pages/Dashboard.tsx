import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckinStatus } from '@/hooks/use-checkin-status';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MessageSquare, Package, Bell, LogOut, Users, Trophy, UserPlus, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import htrLogo from '../assets/htr_logo_transparent.svg';
import RegistrationForm from '@/components/RegistrationForm';
import EventSchedule from '@/components/EventSchedule';
import NotificationBanner from '@/components/NotificationBanner';
import TeamNotificationBanner from '@/components/TeamNotificationBanner';
import NewUserNotifications from '@/components/NewUserNotifications';
import TeamManagement from '@/components/TeamManagement';
import TeamInviteNotification from '@/components/TeamInviteNotification';
import { SimpleThemeToggle } from '@/components/theme-toggle';
import { usePerformanceMonitoring } from '@/components/PerformanceMonitor';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { realtimeManager } from '@/lib/supabase-optimized';
import OptimizedImage from '@/components/OptimizedImage';
import { useConnectionTracker } from '@/lib/connectionTracker';
import { logger } from "@/utils/logger";
import { initializePushNotifications, showGlobalNotification } from '@/utils/pushNotifications';
import EventDetailsDialog from '@/components/EventDetailsDialog';
import Attribution from '@/components/Attribution';
const Dashboard = memo(() => {
  const { user, signOut } = useAuth();
  // Authentication check is now handled by ProtectedRoute wrapper
  const { isCheckedIn, loading: checkinLoading } = useCheckinStatus();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [teamNotifications, setTeamNotifications] = useState<any[]>([]);
  const [teamInvites, setTeamInvites] = useState<any[]>([]);
  const [previousNotifications, setPreviousNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [showEventDetails, setShowEventDetails] = useState(false);
  
  // Performance monitoring
  const { measureAsyncOperation } = usePerformanceMonitoring('Dashboard');
  
  // Connection tracking
  const { startTracking, stopTracking } = useConnectionTracker();
  
  // Start connection tracking when user is authenticated
  useEffect(() => {
    if (user?.id) {
      startTracking(user.id);
    }
    
    return () => {
      stopTracking();
    };
  }, [user?.id, startTracking, stopTracking]);

  // Initialize push notifications on mount
  useEffect(() => {
    initializePushNotifications();
  }, []);

  // Monitor notifications for changes and show browser push notifications for new ones
  useEffect(() => {
    if (!isCheckedIn || notifications.length === 0) return;

    // Find new notifications by comparing with previous state
    const newNotifications = notifications.filter(notification => 
      !previousNotifications.find(prev => prev.id === notification.id)
    );

    // Show browser push notification for each new global notification
    if (newNotifications.length > 0 && previousNotifications.length > 0) {
      logger.log('Dashboard: New global notifications detected', {
        count: newNotifications.length,
        notifications: newNotifications.map(n => ({ id: n.id, title: n.title }))
      });
      
      newNotifications.forEach(notification => {
        showGlobalNotification(notification.title, notification.message);
      });
    }

    // Update previous notifications
    setPreviousNotifications(notifications);
  }, [notifications, isCheckedIn]);
  
  // Memoized tab computation for performance
  const getCurrentTab = useMemo(() => {
    if (activeTab !== "") {
      logger.log('Dashboard: Using actively selected tab:', activeTab);
      return activeTab;
    }
    // If no tab is actively selected, use default based on check-in status
    if (!checkinLoading && isCheckedIn !== null) {
      const defaultTab = isCheckedIn === true ? "teams" : "registration";
      logger.log('Dashboard: Using default tab based on check-in status:', {
        isCheckedIn,
        defaultTab,
        user: user?.email
      });
      return defaultTab;
    }
    // Fallback during loading
    logger.log('Dashboard: Using fallback tab during loading');
    return "registration";
  }, [activeTab, checkinLoading, isCheckedIn, user?.email]);
  
  // Memoized tab change handler
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  useEffect(() => {
    if (user && isCheckedIn) {
      // Only load notifications and team data for checked-in users
      loadNotifications();
      loadTeamNotifications();
      loadTeamInvites();

      // Set up optimized real-time notifications with throttling
      realtimeManager.subscribe(
        'dashboard-notifications',
        'notifications',
        (payload) => {
          logger.log('Dashboard: Real-time notification received', payload);
          loadNotifications();
        }
      );
      
      realtimeManager.subscribe(
        'dashboard-team-notifications',
        'user_notifications',
        (payload) => {
          logger.log('Dashboard: Real-time team notification received', payload);
          loadTeamNotifications();
        },
        { user_id: user.id }
      );
      
      realtimeManager.subscribe(
        'dashboard-team-invites',
        'team_invites',
        (payload) => {
          logger.log('Dashboard: Real-time team invite received', payload);
          loadTeamInvites();
        },
        { invitee_email: user.email }
      );

      return () => {
        realtimeManager.unsubscribe('dashboard-notifications');
        realtimeManager.unsubscribe('dashboard-team-notifications');
        realtimeManager.unsubscribe('dashboard-team-invites');
      };
    } else if (user && isCheckedIn === false) {
      // Clear notifications and team data for non-checked-in users
      setNotifications([]);
      setTeamNotifications([]);
      setTeamInvites([]);
    }
  }, [user, isCheckedIn]);

  // Debounced loading functions to prevent excessive API calls
  const loadNotifications = useDebouncedCallback(async () => {
    const endMeasure = measureAsyncOperation('loadNotifications');
    
    try {
      logger.log('Dashboard: Loading notifications...');
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to reduce payload
      
      if (data) {
        logger.log('Dashboard: Notifications loaded', {
          count: data.length,
          notifications: data.map(n => ({ id: n.id, title: n.title, is_replay: n.is_replay }))
        });
        
        // Filter out replay notifications on the client side if the column exists
        let filteredData = data || [];
        if (data && data.length > 0 && 'is_replay' in data[0]) {
          filteredData = data.filter((notification: any) => !notification.is_replay);
          logger.log('Dashboard: Filtered out replay notifications', {
            original: data.length,
            filtered: filteredData.length
          });
        }
        
        setNotifications(filteredData);
      }
    } catch (error) {
      logger.error('Failed to load notifications:', error);
    } finally {
      endMeasure();
    }
  }, 300);

  const loadTeamNotifications = useDebouncedCallback(async () => {
    if (!user?.id) return;
    
    const endMeasure = measureAsyncOperation('loadTeamNotifications');
    
    try {
      logger.log('Dashboard: Loading team notifications for user:', user.id);
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20); // Limit to reduce payload
      
      if (error) {
        logger.log('Team notifications table not ready:', error);
      } else if (data) {
        logger.log('Dashboard: Team notifications loaded', {
          count: data.length,
          notifications: data.map(n => ({ id: n.id, title: n.title }))
        });
        setTeamNotifications(data);
      }
    } catch (error) {
      logger.error('Failed to load team notifications:', error);
    } finally {
      endMeasure();
    }
  }, 300);

  const loadTeamInvites = useDebouncedCallback(async () => {
    if (!user?.email) return;
    
    const endMeasure = measureAsyncOperation('loadTeamInvites');
    
    try {
      logger.log('Dashboard: Loading team invites for email:', user.email);
      const { data, error } = await supabase
        .from('team_invites')
        .select('*')
        .eq('invitee_email', user.email)
        .eq('status', 'pending')
        .limit(10); // Limit to reduce payload
      
      if (error) {
        logger.error('Dashboard: Error loading team invites:', error);
      } else {
        logger.log('Dashboard: Team invites loaded', {
          count: data?.length || 0,
          invites: data?.map(i => ({ id: i.id, team_id: i.team_id, invitee_email: i.invitee_email })) || []
        });
        setTeamInvites(data || []);
      }
    } catch (error) {
      logger.error('Failed to load team invites:', error);
    } finally {
      endMeasure();
    }
  }, 300);

  if (checkinLoading) {
    logger.log('Dashboard: Loading check-in status', { checkinLoading, isCheckedIn, activeTab });
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-100 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Team Invite Notifications - Must be responded to */}
      {teamInvites.length > 0 && (
        <div className="bg-primary/10 border-b border-primary/20 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-4">
              {teamInvites.map((invite) => (
                <TeamInviteNotification
                  key={invite.id}
                  invite={invite}
                  onRespond={() => {
                    logger.log('Team invite response received, refreshing dashboard data');
                    loadTeamInvites();
                    loadTeamNotifications();
                    
                    // Force a refresh of the team management component by triggering window event
                    window.dispatchEvent(new CustomEvent('teamDataChanged', {
                      detail: { userId: user?.id, action: 'invite_responded' }
                    }));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Regular Notifications Banner */}
      {notifications.length > 0 && (
        <NotificationBanner notifications={notifications} />
      )}

      {/* Team Notifications as Popups */}
      {teamNotifications.length > 0 && (
        <TeamNotificationBanner notifications={teamNotifications} />
      )}

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18 sm:h-16 py-2 sm:py-0">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <OptimizedImage 
                src={htrLogo} 
                alt="HTR Logo" 
                width={64} 
                height={64}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain -mt-2 sm:mt-0"
                priority={true}
              />
              <div>
                <h1 className="text-base sm:text-xl font-bold">Hack the Ridge</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden xs:block">Participant Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Badge variant="secondary" className="hidden md:flex text-xs">
                {user.email}
              </Badge>
              <SimpleThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-1 sm:space-x-2 h-9 sm:h-10"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Tabs 
          value={getCurrentTab}
          onValueChange={handleTabChange}
          className="space-y-4 sm:space-y-6"
        >
          {isCheckedIn !== true ? (
            // Tabs for users who are NOT checked in (or loading)
            <TabsList className="grid w-full grid-cols-3 gap-1 h-auto p-1">
              <TabsTrigger value="registration" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Register">
                <UserPlus className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger value="discord" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Discord">
                <MessageSquare className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Resources">
                <Package className="w-5 h-5" />
              </TabsTrigger>
            </TabsList>
          ) : (
            // Tabs for users who ARE checked in
            <TabsList className="grid w-full grid-cols-6 gap-1 h-auto p-1">
              <TabsTrigger value="teams" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Teams">
                <Users className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Schedule">
                <Calendar className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Notifications">
                <Bell className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger value="devpost" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Devpost">
                <Trophy className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger value="discord" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Discord">
                <MessageSquare className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Resources">
                <Package className="w-5 h-5" />
              </TabsTrigger>
            </TabsList>
          )}

          {isCheckedIn !== true ? (
            // Content for users who are NOT checked in (or loading)
            <>
              <TabsContent value="registration">
                <RegistrationForm />
              </TabsContent>

              <TabsContent value="discord">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5" />
                      <span>Join Our Discord Community</span>
                    </CardTitle>
                    <CardDescription>
                      Connect with fellow hackers, mentors, and organizers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Join our Discord server to get real-time updates, ask questions, 
                      find teammates, and connect with the Hack the Ridge community.
                    </p>
                    <Button 
                      asChild
                      className="gradient-primary text-white"
                    >
                      <a 
                        href="https://discord.gg/zYhzM6RsSC"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Join Discord Server</span>
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Hacker Package</span>
                    </CardTitle>
                    <CardDescription>
                      Essential resources and tools for your hackathon journey
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Access APIs, developer tools, design resources, and more to help 
                      you build amazing projects during Hack the Ridge.
                    </p>
                    <Button 
                      asChild
                      className="gradient-primary text-white"
                    >
                      <a 
                        href="https://docs.google.com/document/d/1PjCoLNA9839xi202VPxOmzJK9H9g2ebOi6HqmCfhgA0/preview?usp=sharing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <Package className="w-4 h-4" />
                        <span>View Hacker Package</span>
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          ) : (
            // Content for users who ARE checked in
            <>
              <TabsContent value="teams">
                <TeamManagement />
              </TabsContent>

              <TabsContent value="schedule">
                <EventSchedule />
              </TabsContent>

              <TabsContent value="notifications">
                <div className="space-y-6">
                  <NewUserNotifications />
                </div>
              </TabsContent>

              <TabsContent value="devpost">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5" />
                      <span>Submit Your Project</span>
                    </CardTitle>
                    <CardDescription>
                      Submit your hackathon project to Devpost
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Ready to showcase your amazing project? Submit it to our official 
                      Devpost page to participate in judging and compete for prizes!
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Submission Requirements:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                        <li>Project description and what it does</li>
                        <li>How you built it (technologies used)</li>
                        <li>Challenges you ran into</li>
                        <li>Accomplishments you're proud of</li>
                        <li>What you learned</li>
                        <li>Screenshots or demo video</li>
                        <li>Links to code repository</li>
                      </ul>
                    </div>
                    <Button 
                      asChild
                      className="gradient-primary text-white"
                    >
                      <a 
                        href="https://hack-the-ridge.devpost.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>Submit on Devpost</span>
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discord">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5" />
                      <span>Join Our Discord Community</span>
                    </CardTitle>
                    <CardDescription>
                      Connect with fellow hackers, mentors, and organizers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Join our Discord server to get real-time updates, ask questions, 
                      find teammates, and connect with the Hack the Ridge community.
                    </p>
                    <Button 
                      asChild
                      className="gradient-primary text-white"
                    >
                      <a 
                        href="https://discord.gg/zYhzM6RsSC"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Join Discord Server</span>
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Hacker Package</span>
                    </CardTitle>
                    <CardDescription>
                      Essential resources and tools for your hackathon journey
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Access APIs, developer tools, design resources, and more to help 
                      you build amazing projects during Hack the Ridge.
                    </p>
                    <Button 
                      asChild
                      className="gradient-primary text-white"
                    >
                      <a 
                        href="https://docs.google.com/document/d/1PjCoLNA9839xi202VPxOmzJK9H9g2ebOi6HqmCfhgA0/preview?usp=sharing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <Package className="w-4 h-4" />
                        <span>View Hacker Package</span>
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
      <Attribution />

      {/* Event Details Dialog */}
      <EventDetailsDialog
        open={showEventDetails}
        onOpenChange={setShowEventDetails}
        showCongratulations={false}
      />
    </div>
  );
});

export default Dashboard;