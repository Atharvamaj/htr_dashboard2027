import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, Bell, LogOut, Settings, UserX, UserPlus, Activity } from 'lucide-react';
import htrLogo from '../assets/htr_logo_transparent.svg';
import AdminRegistrations from '@/components/AdminRegistrations';
import AdminSchedule from '@/components/AdminSchedule';
import AdminNotifications from '@/components/AdminNotifications';
import AdminUsers from '@/components/AdminUsers';
import AdminTeams from '@/components/AdminTeams';
import AdminSystemSettings from '@/components/AdminSystemSettings';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import OptimizedImage from '@/components/OptimizedImage';
import { SimpleThemeToggle } from '@/components/theme-toggle';
import { logger } from "@/utils/logger";
import Attribution from '@/components/Attribution';


const Admin = () => {
  const { user, signOut } = useAuth();
  // Authentication and admin checks are now handled by AdminRoute wrapper

  return (
    <div className="min-h-screen gradient-subtle">
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
                <p className="text-xs sm:text-sm text-muted-foreground hidden xs:block">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Badge variant="secondary" className="hidden lg:flex text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Admin
              </Badge>
              <Badge variant="outline" className="hidden md:flex text-xs">
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
        <Tabs defaultValue="registrations" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-7 gap-1 h-auto p-1">
            <TabsTrigger value="registrations" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Registrations">
              <UserPlus className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Teams">
              <Users className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Users">
              <UserX className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Schedule">
              <Calendar className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Notifications">
              <Bell className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Settings">
              <Settings className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center min-h-[44px] min-w-[44px]" title="Performance">
              <Activity className="w-5 h-5" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <AdminRegistrations />
          </TabsContent>

          <TabsContent value="teams">
            <AdminTeams />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="schedule">
            <AdminSchedule />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotifications />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSystemSettings />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceMonitor />
          </TabsContent>
        </Tabs>
      </main>
      <Attribution />
    </div>
  );
};

export default Admin;