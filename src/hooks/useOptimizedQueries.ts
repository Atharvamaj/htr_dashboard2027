import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabaseOptimized, createOptimizedQuery, connectionPool } from '@/lib/supabase-optimized';
import { useAuth } from '@/contexts/AuthContext';

// Query keys factory for better cache management
export const queryKeys = {
  all: ['queries'] as const,
  teams: () => [...queryKeys.all, 'teams'] as const,
  team: (id: string) => [...queryKeys.teams(), id] as const,
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), id] as const,
  registrations: () => [...queryKeys.all, 'registrations'] as const,
  registration: (id: string) => [...queryKeys.registrations(), id] as const,
  notifications: () => [...queryKeys.all, 'notifications'] as const,
  schedule: () => [...queryKeys.all, 'schedule'] as const,
  profiles: () => [...queryKeys.all, 'profiles'] as const,
  profile: (id: string) => [...queryKeys.profiles(), id] as const,
};

// Optimized teams query with aggressive caching
export const useTeamsOptimized = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.teams(),
    queryFn: createOptimizedQuery(
      'teams-with-members',
      async () => {
        const { data: teams, error: teamsError } = await supabaseOptimized
          .from('teams')
          .select('*')
          .order('name', { ascending: true });

        if (teamsError) throw teamsError;

        // Batch load all team members and profiles
        const teamIds = teams?.map(team => team.id) || [];
        const memberBatches = await Promise.all(
          teamIds.map(async (teamId) => {
            const { data } = await supabaseOptimized
              .from('team_members')
              .select(`
                id, user_id, status,
                profiles:user_id (full_name, email)
              `)
              .eq('team_id', teamId);
            return { teamId, members: data || [] };
          })
        );

        // Create members map
        const membersMap = new Map(
          memberBatches.map(batch => [batch.teamId, batch.members])
        );

        // Batch load leader profiles
        const leaderIds = teams?.map(team => team.leader_id) || [];
        const { data: leaderProfiles } = await supabaseOptimized
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', leaderIds);

        const leadersMap = new Map(
          leaderProfiles?.map(profile => [profile.user_id, profile]) || []
        );

        return teams?.map(team => ({
          ...team,
          members: membersMap.get(team.id) || [],
          leader_profile: leadersMap.get(team.leader_id) || { full_name: 'Unknown', email: 'unknown@example.com' }
        })) || [];
      },
      10 * 60 * 1000 // 10 minutes cache
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!user,
  });
};

// Optimized registrations query
export const useRegistrationsOptimized = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.registrations(),
    queryFn: createOptimizedQuery(
      'registrations-with-profiles',
      async () => {
        const { data, error } = await supabaseOptimized
          .from('registrations')
          .select(`
            *,
            profiles:user_id (full_name, email, is_admin)
          `)
          .order('registered_at', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      5 * 60 * 1000 // 5 minutes cache
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user,
  });
};

// Optimized schedule query
export const useScheduleOptimized = () => {
  return useQuery({
    queryKey: queryKeys.schedule(),
    queryFn: createOptimizedQuery(
      'schedule-events',
      async () => {
        const { data, error } = await supabaseOptimized
          .from('schedule')
          .select('*')
          .order('start_time', { ascending: true });

        if (error) throw error;
        return data || [];
      },
      15 * 60 * 1000 // 15 minutes cache (schedule changes less frequently)
    ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// Optimized notifications query
export const useNotificationsOptimized = () => {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: createOptimizedQuery(
      'active-notifications',
      async () => {
        const { data, error } = await supabaseOptimized
          .from('notifications')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      2 * 60 * 1000 // 2 minutes cache
    ),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Optimized user profile query
export const useProfileOptimized = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  return useQuery({
    queryKey: queryKeys.profile(targetUserId || ''),
    queryFn: createOptimizedQuery(
      `profile-${targetUserId}`,
      async () => {
        const { data, error } = await supabaseOptimized
          .from('profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        if (error) throw error;
        return data;
      },
      10 * 60 * 1000 // 10 minutes cache
    ),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!targetUserId,
  });
};

// Optimized mutations with cache invalidation
export const useCreateTeamOptimized = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teamData: any) => {
      return await connectionPool.executeQuery(async () => {
        const { data, error } = await supabaseOptimized
          .from('teams')
          .insert([teamData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      // Invalidate and refetch teams
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
    },
  });
};

// Batch update mutation for better performance
export const useBatchUpdateTeams = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: any }>) => {
      return await connectionPool.executeQuery(async () => {
        const results = await Promise.all(
          updates.map(({ id, data }) =>
            supabaseOptimized
              .from('teams')
              .update(data)
              .eq('id', id)
              .select()
          )
        );
        
        return results;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
    },
  });
};

// Connection monitoring hook
export const useConnectionMonitor = () => {
  return useQuery({
    queryKey: ['connection-monitor'],
    queryFn: () => ({
      activeConnections: connectionPool.getActiveConnectionsCount(),
      timestamp: Date.now(),
    }),
    refetchInterval: 5000, // Update every 5 seconds
    staleTime: 0, // Always fetch fresh data
  });
};