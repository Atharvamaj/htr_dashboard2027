import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Plus, Edit, Trash2, Loader2, Send, Volume2, Play, Users, Globe, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
  is_replay?: boolean;
}

interface UserNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  user_id: string;
  team_id: string | null;
  is_active: boolean;
  read_at: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [viewMode, setViewMode] = useState<'global' | 'team'>('global');
  const [globalNotificationFilter, setGlobalNotificationFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [teamNotificationFilter, setTeamNotificationFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    is_active: true,
  });
  const { toast } = useToast();

  // Function to play notification sound using Web Audio API
  const playNotificationSound = () => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant notification sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Start at 800Hz
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1); // Rise to 1000Hz
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2); // Back to 800Hz
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Start volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        // Audio playback failed silently
      }
    }
  };

  // Function to replay notification with sound and popup
  const replayNotification = async (notification: Notification) => {
    try {
      // Play sound immediately for admin
      playNotificationSound();

      // Use Supabase real-time to broadcast replay event instead of creating persistent notifications
      const replayEvent = {
        type: 'notification_replay',
        notification: {
          id: `replay_${notification.id}_${Date.now()}`, // Temporary unique ID
          title: notification.title,
          message: notification.message,
          created_at: new Date().toISOString(),
          is_replay: true,
        },
        timestamp: new Date().toISOString(),
      };

      // Create and subscribe to the channel, then broadcast
      const channel = supabase.channel('notification-replay');
      
      // Subscribe first, then send
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const broadcastStatus = await channel.send({
            type: 'broadcast',
            event: 'replay-notification',
            payload: replayEvent,
          });
          
          
          // Clean up the channel after sending
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        }
      });

      toast({
        title: "Notification replayed!",
        description: "The notification has been replayed with sound and popup for all participants.",
      });

    } catch (error: any) {
      toast({
        title: "Error replaying notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Function to replay team notification with sound and popup
  const replayTeamNotification = async (notification: UserNotification) => {
    try {
      
      // Don't play sound on admin side - only broadcast to participants

      // Use Supabase real-time to broadcast team replay event instead of creating persistent notifications
      const replayEvent = {
        type: 'team_notification_replay',
        notification: {
          id: notification.id, // Use original notification ID, not a new one
          title: notification.title, // Use original title without [REPLAY] prefix
          message: notification.message,
          created_at: notification.created_at,
          user_id: notification.user_id,
          team_id: notification.team_id,
          is_active: true,
        },
        timestamp: new Date().toISOString(),
      };


      // Create and subscribe to the channel, then broadcast
      const channel = supabase.channel('team-notification-replay');
      
      // Subscribe first, then send
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const broadcastStatus = await channel.send({
            type: 'broadcast',
            event: 'replay-team-notification',
            payload: replayEvent,
          });
          
          // Clean up the channel after sending
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        }
      });

      toast({
        title: "Team notification replayed!",
        description: "The team notification has been replayed with sound and popup for the participant.",
      });

    } catch (error: any) {
      toast({
        title: "Error replaying team notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Test function for sound debugging
  const testGlobalNotificationSend = async () => {
    try {
      const testNotification = {
        title: `Test Notification ${Date.now()}`,
        message: `This is a test notification sent at ${new Date().toLocaleTimeString()} to verify sound functionality.`,
        created_by: user?.id,
        is_active: true,
      };

      const { error } = await supabase
        .from('notifications')
        .insert([testNotification]);

      if (error) throw error;
      
      toast({ 
        title: "Test notification sent!",
        description: "Check the participant dashboard to see if the sound plays."
      });
    } catch (error: any) {
      toast({
        title: "Error sending test notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadNotifications();
    loadTeamNotifications();

    // Set up real-time subscriptions
    const globalChannel = supabase
      .channel('admin-global-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          loadNotifications();
        }
      )
      .subscribe();

    const teamChannel = supabase
      .channel('admin-team-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications'
        },
        (payload) => {
          loadTeamNotifications();
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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out replay notifications on the client side if the column exists
      let filteredData = data || [];
      if (data && data.length > 0 && 'is_replay' in data[0]) {
        filteredData = data.filter((notification: any) => !notification.is_replay);
      }
      
      setNotifications(filteredData || []);
    } catch (error: any) {
      toast({
        title: "Error loading notifications",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamNotifications = async () => {
    try {
      // First, get all user notifications
      const { data: notifications, error: notificationsError } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notificationsError) {
        setUserNotifications([]);
        return;
      }

      if (!notifications || notifications.length === 0) {
        setUserNotifications([]);
        return;
      }

      // Get unique user IDs to fetch registration data
      const userIds = [...new Set(notifications.map(n => n.user_id))];
      
      // Fetch registration data for all users (name and email from registrations table)
      const { data: registrations, error: registrationsError } = await supabase
        .from('registrations')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (registrationsError) {
        // Set notifications without registration data
        setUserNotifications(notifications.map(item => ({
          ...item,
          profiles: undefined
        })) as UserNotification[]);
        return;
      }

      // Create a map for quick registration lookup
      const registrationMap = new Map();
      registrations?.forEach(registration => {
        registrationMap.set(registration.user_id, {
          full_name: registration.full_name,
          email: registration.email
        });
      });

      // Merge notifications with registration data
      const formattedData = notifications.map(notification => ({
        ...notification,
        profiles: registrationMap.get(notification.user_id) || null
      }));
      
      setUserNotifications(formattedData as UserNotification[]);
    } catch (error) {
      setUserNotifications([]);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      is_active: true,
    });
    setEditingNotification(null);
  };

  const openEditDialog = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      is_active: notification.is_active,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        created_by: user?.id,
      };

      if (editingNotification) {
        const { error } = await supabase
          .from('notifications')
          .update(payload)
          .eq('id', editingNotification.id);

        if (error) throw error;
        toast({ title: "Notification updated successfully!" });
      } else {
        const { error } = await supabase
          .from('notifications')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Notification created successfully!" });
      }

      closeDialog();
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error saving notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Notification deleted successfully!" });
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error deleting notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleNotificationVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('notifications')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ 
        title: `Notification ${newStatus ? 'shown' : 'hidden'} successfully!`,
        description: newStatus ? "Notification is now visible to participants." : "Notification is now hidden from participants."
      });
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Error updating notification visibility",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTeamNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Team notification deleted successfully!" });
      loadTeamNotifications();
    } catch (error: any) {
      toast({
        title: "Error deleting team notification",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markTeamNotificationAsRead = async (id: string, currentReadStatus: string | null) => {
    try {
      const newReadStatus = currentReadStatus ? null : new Date().toISOString();
      
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: newReadStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ 
        title: currentReadStatus ? "Marked as unread" : "Marked as read",
        description: "Team notification status updated successfully!"
      });
      loadTeamNotifications();
    } catch (error: any) {
      toast({
        title: "Error updating notification status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAllTeamNotificationsAsRead = async () => {
    try {
      const unreadNotifications = userNotifications.filter(n => !n.read_at);
      
      if (unreadNotifications.length === 0) {
        toast({
          title: "No unread notifications",
          description: "All team notifications are already marked as read."
        });
        return;
      }

      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadNotifications.map(n => n.id));

      if (error) throw error;
      
      toast({ 
        title: "Success",
        description: `Marked ${unreadNotifications.length} notifications as read!`
      });
      loadTeamNotifications();
    } catch (error: any) {
      toast({
        title: "Error marking notifications as read",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentNotifications = viewMode === 'global' ? 
    notifications.filter(notification => {
      switch (globalNotificationFilter) {
        case 'visible':
          return notification.is_active;
        case 'hidden':
          return !notification.is_active;
        default:
          return true;
      }
    }) : [];
  const filteredTeamNotifications = viewMode === 'team' ? 
    userNotifications.filter(notification => {
      switch (teamNotificationFilter) {
        case 'read':
          return notification.read_at !== null;
        case 'unread':
          return notification.read_at === null;
        default:
          return true;
      }
    }) : [];
  const currentTeamNotifications = filteredTeamNotifications;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
            Notifications
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage global and team notifications
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-full sm:w-auto">
            <Button
              variant={viewMode === 'global' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('global')}
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <Globe className="h-4 w-4" />
              <span>Global</span>
            </Button>
            <Button
              variant={viewMode === 'team' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('team')}
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <Users className="h-4 w-4" />
              <span>Team</span>
            </Button>
          </div>

          {viewMode === 'global' && (
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsDialogOpen(true)} className="flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Create Notification</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[525px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                  <div className="p-4 sm:p-6">
                    <DialogHeader className="mb-4 sm:mb-6">
                      <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        {editingNotification ? 'Edit Notification' : 'Create Notification'}
                      </DialogTitle>
                      <DialogDescription className="text-sm sm:text-base mt-2">
                        {editingNotification 
                          ? 'Update the notification details below.' 
                          : 'Create a new global notification for all participants.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1">
                          Title
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Lunch Break, Important Update..."
                          className="min-h-[44px] text-base"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-medium flex items-center gap-1">
                          Message
                          <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Enter your notification message here..."
                          rows={5}
                          className="min-h-[120px] text-base resize-none"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.message.length} characters
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-start space-x-3">
                          <Switch
                            id="is-active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <Label htmlFor="is-active" className="text-sm font-medium cursor-pointer">
                              Visible to participants
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formData.is_active 
                                ? 'This notification will be immediately visible to all participants' 
                                : 'This notification will be hidden from participants until you enable it'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={closeDialog} 
                          className="min-h-[44px] w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="min-h-[44px] w-full sm:w-auto gradient-primary text-white"
                        >
                          {editingNotification ? (
                            <>
                              <Edit className="h-4 w-4 mr-2" />
                              Update Notification
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Notification
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                onClick={testGlobalNotificationSend}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <Volume2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Test Sound</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'global' && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-5 w-5" />
                  Global Notifications
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  System-wide notifications visible to all participants
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={globalNotificationFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGlobalNotificationFilter('all')}
                    className="text-xs"
                  >
                    All
                  </Button>
                  <Button
                    variant={globalNotificationFilter === 'visible' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGlobalNotificationFilter('visible')}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Visible</span>
                  </Button>
                  <Button
                    variant={globalNotificationFilter === 'hidden' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGlobalNotificationFilter('hidden')}
                    className="text-xs"
                  >
                    <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Hidden</span>
                  </Button>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {currentNotifications.length} notifications
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {currentNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {globalNotificationFilter === 'all' ? 'No global notifications created yet.' : 
                 globalNotificationFilter === 'visible' ? 'No visible notifications found.' :
                 'No hidden notifications found.'}
              </p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="max-w-md truncate">{notification.message}</TableCell>
                      <TableCell>
                        <Badge variant={notification.is_active ? "default" : "secondary"}>
                          {notification.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleNotificationVisibility(notification.id, notification.is_active)}
                            title={notification.is_active ? "Hide notification from participants" : "Show notification to participants"}
                          >
                            {notification.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => replayNotification(notification)}
                            title="Replay with sound and popup"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(notification)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {currentNotifications.map((notification) => (
                <Card key={notification.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm flex-1">{notification.title}</CardTitle>
                      <Badge variant={notification.is_active ? "default" : "secondary"} className="ml-2 text-xs">
                        {notification.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-2">
                      {notification.message}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground mb-3">
                      {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleNotificationVisibility(notification.id, notification.is_active)}
                        className="flex-1 min-w-[80px]"
                      >
                        {notification.is_active ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Show
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => replayNotification(notification)}
                        className="flex-1 min-w-[80px]"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Replay
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(notification)}
                        className="flex-1 min-w-[80px]"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'team' && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-5 w-5" />
                  Team Notifications
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Notifications sent to specific team members via the team management system
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={teamNotificationFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTeamNotificationFilter('all')}
                    className="text-xs"
                  >
                    All
                  </Button>
                  <Button
                    variant={teamNotificationFilter === 'unread' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTeamNotificationFilter('unread')}
                    className="text-xs"
                  >
                    Unread
                  </Button>
                  <Button
                    variant={teamNotificationFilter === 'read' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTeamNotificationFilter('read')}
                    className="text-xs"
                  >
                    Read
                  </Button>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {currentTeamNotifications.length} total
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {userNotifications.filter(n => !n.read_at).length} unread
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTeamNotifications}
                  title="Refresh team notifications"
                  className="p-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                {userNotifications.filter(n => !n.read_at).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllTeamNotificationsAsRead}
                    title="Mark all as read"
                    className="text-xs whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Mark All Read</span>
                    <span className="sm:hidden">Mark Read</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {currentTeamNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                {teamNotificationFilter === 'all' ? (
                  <>
                    <p className="text-muted-foreground mb-2">
                      No team notifications sent yet.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Team notifications are sent from the Team Management page or when admins send notifications to specific teams.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-2">
                      No {teamNotificationFilter} team notifications found.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setTeamNotificationFilter('all')}
                    >
                      View All Notifications
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Team ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTeamNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="max-w-md truncate">{notification.message}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{notification.profiles?.full_name || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">{notification.profiles?.email || notification.user_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {notification.team_id || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={notification.read_at ? "default" : "secondary"}>
                          {notification.read_at ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => replayTeamNotification(notification)}
                            title="Replay team notification"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markTeamNotificationAsRead(notification.id, notification.read_at)}
                            title={notification.read_at ? "Mark as unread" : "Mark as read"}
                          >
                            {notification.read_at ? "👁️" : "👁️‍🗨️"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTeamNotification(notification.id)}
                            title="Delete team notification"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {currentTeamNotifications.map((notification) => (
                <Card key={notification.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">{notification.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {notification.profiles?.full_name || 'Unknown User'}
                        </CardDescription>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {notification.profiles?.email || notification.user_id}
                        </div>
                      </div>
                      <Badge variant={notification.read_at ? "default" : "secondary"} className="ml-2 text-xs flex-shrink-0">
                        {notification.read_at ? "Read" : "Unread"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs mb-3">
                      {notification.message}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}</span>
                      {notification.team_id && (
                        <Badge variant="outline" className="text-xs">
                          Team: {notification.team_id}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => replayTeamNotification(notification)}
                        className="flex-1"
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        Replay
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markTeamNotificationAsRead(notification.id, notification.read_at)}
                        className="flex-1"
                      >
                        {notification.read_at ? "Unread" : "Read"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTeamNotification(notification.id)}
                        className="text-destructive p-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminNotifications;
