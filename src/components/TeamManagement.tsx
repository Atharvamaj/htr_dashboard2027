import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, UserCheck, UserX, Crown, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { validateTeamName, validateInviteEmails, safeStorage, withRetry } from '@/lib/form-utils';
import { logger } from "@/utils/logger";

interface Team {
  id: string;
  name: string;
  leader_id: string;
  room: string;
  is_finalized: boolean;
  created_at: string;
  members: TeamMember[];
}

interface TeamMember {
  id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  profile: {
    full_name: string;
    email: string;
  };
}



const ROOM_OPTIONS = [
  '124', '123', '121', '119', '115', '103', '105', '107',
  '201', '203', '205', '207', '209', '202', '204', '206',
  '216', '211', '213', '215', '217', '219', '223', '225',
  '227', '220', '222', '228', '230', 'Library Conference Room', 'Library'
];

interface RoomAvailability {
  name: string;
  currentTeams: number;
  maxTeams: number;
  available: boolean;
}

const TeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [invitingMembers, setInvitingMembers] = useState(false);
  const [finalizingTeam, setFinalizingTeam] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<string[]>([]);
  const hasLoadedInitialTeam = useRef(false);
  const teamFormKey = `team_creation_draft_${user?.id || 'anonymous'}`;
  const inviteFormKey = `team_invite_draft_${user?.id || 'anonymous'}`;

  // Form states with localStorage backup
  const [teamName, setTeamName] = useState(() => {
    const saved = safeStorage.getObject<{teamName: string}>(teamFormKey);
    return saved?.teamName || '';
  });
  
  const [inviteEmails, setInviteEmails] = useState<string[]>(() => {
    const saved = safeStorage.getObject<{inviteEmails: string[]}>(inviteFormKey);
    return saved?.inviteEmails || [''];
  });
  
  const [selectedRoom, setSelectedRoom] = useState('');
  const [availableRooms, setAvailableRooms] = useState<RoomAvailability[]>([]);
  const [roomSelectionEnabled, setRoomSelectionEnabled] = useState(true);

  // Auto-save team creation draft
  const saveTeamCreationDraft = useCallback(() => {
    if (user?.id && teamName.trim()) {
      safeStorage.setObject(teamFormKey, { teamName });
    }
  }, [teamName, teamFormKey, user?.id]);

  // Auto-save invite emails draft
  const saveInviteDraft = useCallback(() => {
    if (user?.id && userTeam?.id) {
      safeStorage.setObject(inviteFormKey, { inviteEmails });
    }
  }, [inviteEmails, inviteFormKey, user?.id, userTeam?.id]);

  // Save drafts when form data changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(saveTeamCreationDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [saveTeamCreationDraft]);

  useEffect(() => {
    const timeoutId = setTimeout(saveInviteDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [saveInviteDraft]);

  useEffect(() => {
    if (user) {
      loadUserTeam();
      loadRoomAvailability();
      loadRoomSelectionSetting();
      
      // Set up real-time updates
      const channel = supabase
        .channel('team_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teams'
          },
          () => {
            logger.log('Teams table changed, reloading team data');
            loadUserTeam();
            loadRoomAvailability(); // Also reload room availability when teams change
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_members'
          },
          () => {
            logger.log('Team members table changed, reloading team data');
            loadUserTeam();
          }
        )
        .subscribe();

      // Listen for custom team data change events
      const handleTeamDataChange = (event: CustomEvent) => {
        logger.log('Custom team data change event received:', event.detail);
        if (event.detail?.userId === user.id) {
          logger.log('Reloading team data due to custom event');
          setTimeout(() => {
            loadUserTeam();
            loadRoomAvailability();
          }, 500); // Small delay to ensure database is updated
        }
      };

      window.addEventListener('teamDataChanged', handleTeamDataChange as EventListener);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('teamDataChanged', handleTeamDataChange as EventListener);
      };
    }
  }, [user]);

  // Manage email fields based on team capacity - but preserve user input
  useEffect(() => {
    if (userTeam && hasLoadedInitialTeam.current) {
      const remainingSlots = 4 - userTeam.members.length;
      
      // If no remaining slots, clear all email fields
      if (remainingSlots <= 0) {
        setInviteEmails([]);
        safeStorage.removeItem(inviteFormKey);
      } else {
        // Only adjust if we have too many fields, but preserve content
        if (inviteEmails.length > remainingSlots) {
          const trimmedEmails = inviteEmails.slice(0, remainingSlots);
          setInviteEmails(trimmedEmails);
        }
        // Ensure we have at least one email field if there are remaining slots and no emails
        else if (inviteEmails.length === 0 && remainingSlots > 0) {
          setInviteEmails(['']);
        }
      }
    }
  }, [userTeam?.members?.length, hasLoadedInitialTeam.current]);

  const loadRoomSelectionSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'room_selection_enabled')
        .maybeSingle();

      if (!error && data) {
        const value = data?.value;
        setRoomSelectionEnabled(value === true || value === 'true');
      } else {
        // Default to true if setting doesn't exist
        setRoomSelectionEnabled(true);
      }
    } catch (error) {
      logger.error('Error loading room selection setting:', error);
      // Default to true on error
      setRoomSelectionEnabled(true);
    }
  };

  const loadRoomAvailability = async () => {
    try {
      logger.log('Loading room availability data');
      
      // Get all finalized teams and their room assignments
      const { data: finalizedTeams, error } = await supabase
        .from('teams')
        .select('room')
        .eq('is_finalized', true)
        .not('room', 'is', null);

      if (error) {
        logger.error('Error loading finalized teams for room availability:', error);
        // Set all rooms as available if we can't check capacity
        const fallbackRooms: RoomAvailability[] = ROOM_OPTIONS.map(room => ({
          name: room,
          currentTeams: 0,
          maxTeams: room === 'Library' ? 999 : 2,
          available: true
        }));
        setAvailableRooms(fallbackRooms);
        return;
      }

      // Count teams per room
      const roomCounts: { [key: string]: number } = {};
      finalizedTeams?.forEach(team => {
        if (team.room) {
          roomCounts[team.room] = (roomCounts[team.room] || 0) + 1;
        }
      });

      // Create room availability data
      const roomAvailability: RoomAvailability[] = ROOM_OPTIONS.map(roomName => {
        const currentTeams = roomCounts[roomName] || 0;
        const maxTeams = roomName === 'Library' ? 999 : 2;
        const available = currentTeams < maxTeams;
        
        return {
          name: roomName,
          currentTeams,
          maxTeams,
          available
        };
      });

      logger.log('Room availability calculated:', roomAvailability);
      setAvailableRooms(roomAvailability);
    } catch (error) {
      logger.error('Error loading room availability:', error);
      // Set all rooms as available if we encounter an error
      const fallbackRooms: RoomAvailability[] = ROOM_OPTIONS.map(room => ({
        name: room,
        currentTeams: 0,
        maxTeams: room === 'Library' ? 999 : 2,
        available: true
      }));
      setAvailableRooms(fallbackRooms);
    }
  };

  const loadUserTeam = async () => {
    try {
      // Get team where user is a member with status 'accepted'
      logger.log('Loading team for user:', user?.id);
      
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          status,
          teams (
            id,
            name,
            leader_id,
            room,
            is_finalized,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'accepted')
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      logger.log('Team query result:', { teamMembers, teamError });

      if (teamError) {
        logger.error('Error querying team members:', teamError);
        setUserTeam(null);
        setLoading(false);
        return;
      }

      if (!teamMembers || !teamMembers.teams) {
        logger.log('No team found for user');
        setUserTeam(null);
        setLoading(false);
        return;
      }

      if (teamMembers?.teams) {
        // Get team members
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            status
          `)
          .eq('team_id', teamMembers.teams.id);

        if (membersError) {
          logger.error('Error loading team members:', membersError);
        }

        // Get member profiles
        const memberProfiles = await Promise.all(
          (members || []).map(async (member) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', member.user_id)
              .single();

            return {
              ...member,
              status: member.status as 'pending' | 'accepted' | 'declined',
              profile: profile || { full_name: 'Unknown', email: 'unknown@example.com' }
            };
          })
        );

        const teamData = {
          ...teamMembers.teams,
          members: memberProfiles || []
        };
        
        logger.log('Setting team data:', {
          teamId: teamData.id,
          teamName: teamData.name,
          memberCount: teamData.members.length,
          members: teamData.members.map(m => ({ userId: m.user_id, status: m.status, email: m.profile?.email }))
        });
        
        setUserTeam(teamData);
      }
    } catch (error) {
      logger.error('Error loading user team:', error);
      setUserTeam(null);
    } finally {
      setLoading(false);
      hasLoadedInitialTeam.current = true;
    }
  };



  const createTeam = async () => {
    // Validate team name
    const validation = validateTeamName(teamName);
    if (!validation.isValid) {
      toast({
        title: "Team Name Error",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setCreatingTeam(true);
    try {
      logger.log('Creating team with user ID:', user?.id);
      
      await withRetry(async () => {
        // Create team - single member teams start with Library as default
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName.trim(),
            leader_id: user?.id,
            room: 'TBD' // Will be set to Library when finalized if still single member
          })
          .select()
          .single();

        if (teamError) {
          logger.error('Team creation error:', teamError);
          throw teamError;
        }

        logger.log('Team created:', team);

        // Add leader as first member
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: team.id,
            user_id: user?.id,
            status: 'accepted'
          });

        if (memberError) {
          logger.error('Member creation error:', memberError);
          throw memberError;
        }
      }, 3, 1000, (attempt, error) => {
        logger.warn(`Team creation attempt ${attempt} failed:`, error.message);
        toast({
          title: `Attempt ${attempt} failed`,
          description: `Retrying team creation... (${error.message})`,
          variant: "default",
        });
      });

      toast({
        title: "Success",
        description: "Team created successfully!",
      });

      setTeamName('');
      // Clear the team creation draft after successful creation
      safeStorage.removeItem(teamFormKey);
      loadUserTeam();
    } catch (error) {
      logger.error('Error creating team:', error);
      toast({
        title: "Error",
        description: `Failed to create team: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setCreatingTeam(false);
    }
  };

  const inviteMembers = async () => {
    // Validate emails
    const validation = validateInviteEmails(inviteEmails);
    if (!validation.isValid) {
      toast({
        title: "Email Validation Error",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }
    
    const validEmails = inviteEmails.filter(email => email.trim()).map(email => email.trim());
    
    // Clear previous errors
    setInviteErrors([]);

    if (!userTeam) return;

    setInvitingMembers(true);
    const errors: string[] = [];
    
    try {
      // Debug: Let's see what emails are in the profiles table
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('email')
        .limit(10);
      logger.log('Available profiles:', allProfiles);
      // Check current member count
      const currentCount = userTeam.members.length;
      if (currentCount + validEmails.length > 4) {
        toast({
          title: "Error",
          description: "Teams can have a maximum of 4 members",
          variant: "destructive"
        });
        return;
      }

      // Use our custom function to send invites
      for (const email of validEmails) {
        logger.log('TeamManagement: Sending invite to:', email);
        
        try {
          const { data: result, error: inviteError } = await supabase
            .rpc('create_team_invite', {
              p_team_id: userTeam.id,
              p_inviter_id: user?.id,
              p_invitee_email: email
            });

          logger.log('TeamManagement: Invite result for', email, ':', result);

          if (inviteError) {
            logger.error('TeamManagement: RPC error for', email, ':', inviteError);
            const errorMsg = `Failed to invite ${email}: ${inviteError.message}`;
            errors.push(errorMsg);
            toast({
              title: "Error",
              description: errorMsg,
              variant: "destructive"
            });
          } else if (result && result.success) {
            logger.log('TeamManagement: Invite sent successfully to:', email);
            toast({
              title: "Success",
              description: `Invite sent to ${email}`,
            });
          } else if (result && !result.success) {
            logger.log('TeamManagement: Invite failed for', email, ':', result.error);
            const errorMsg = result.error || `Failed to invite ${email}`;
            errors.push(errorMsg);
            toast({
              title: "Error",
              description: errorMsg,
              variant: "destructive"
            });
          }
        } catch (error) {
          logger.error('TeamManagement: Unexpected error inviting', email, ':', error);
          const errorMsg = `Unexpected error inviting ${email}`;
          errors.push(errorMsg);
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive"
          });
        }
      }

      // Update error state
      setInviteErrors(errors);

      // Only show success if there were no errors
      if (errors.length === 0) {
        toast({
          title: "Success",
          description: "All invites sent successfully!",
        });
        setInviteEmails(['']); // Reset to one empty field
        // Clear the invite draft after successful send
        safeStorage.removeItem(inviteFormKey);
      } else if (errors.length < validEmails.length) {
        toast({
          title: "Partial Success",
          description: "Some invites were sent successfully, but some failed. Check the errors below.",
          variant: "destructive"
        });
      }

      loadUserTeam(); // Refresh team data
    } catch (error) {
      logger.error('Error inviting members:', error);
      const errorMsg = "Failed to send invites";
      setInviteErrors([errorMsg]);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setInvitingMembers(false);
    }
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const removeEmailField = (index: number) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index));
    }
  };

  const updateEmailField = (index: number, value: string) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = value;
    setInviteEmails(newEmails);
    
    // Clear invite errors when user starts typing
    if (inviteErrors.length > 0) {
      setInviteErrors([]);
    }
  };

  const finalizeTeam = async () => {
    if (!userTeam) return;

    // Check if team has under 3 members - auto-assign to Library
    const acceptedMembers = userTeam.members.filter(m => m.status === 'accepted');
    const isSingleMemberTeam = acceptedMembers.length < 3;
    
    let roomToAssign = selectedRoom;
    if (isSingleMemberTeam) {
      roomToAssign = 'Library';
    } else if (!roomSelectionEnabled) {
      // If room selection is disabled, set to TBD for admin assignment
      roomToAssign = 'TBD';
    } else if (!selectedRoom) {
      toast({
        title: "Error",
        description: "Please select a room",
        variant: "destructive"
      });
      return;
    }

    setFinalizingTeam(true);
    try {
      // Check room capacity (only for non-Library rooms or non-single-member teams)
      if (!isSingleMemberTeam) {
        const roomInfo = availableRooms.find(room => room.name === roomToAssign);
        
        if (!roomInfo) {
          // Refresh room availability data if room not found
          await loadRoomAvailability();
          const updatedRoomInfo = availableRooms.find(room => room.name === roomToAssign);
          
          if (!updatedRoomInfo || !updatedRoomInfo.available) {
            toast({
              title: "Error",
              description: `Room ${roomToAssign} is no longer available or at full capacity`,
              variant: "destructive"
            });
            return;
          }
        } else if (!roomInfo.available) {
          toast({
            title: "Error",
            description: `Room ${roomToAssign} is at full capacity (${roomInfo.currentTeams}/${roomInfo.maxTeams})`,
            variant: "destructive"
          });
          return;
        }
      }

      // Finalize team
      await supabase
        .from('teams')
        .update({
          room: roomToAssign,
          is_finalized: true
        })
        .eq('id', userTeam.id);

      toast({
        title: "Success",
        description: isSingleMemberTeam 
          ? "Team finalized and automatically assigned to the Library!"
          : "Team finalized successfully!",
      });

      loadUserTeam();
      // Refresh room availability since a room slot was just taken
      loadRoomAvailability();
    } catch (error) {
      logger.error('Error finalizing team:', error);
      toast({
        title: "Error",
        description: "Failed to finalize team",
        variant: "destructive"
      });
    } finally {
      setFinalizingTeam(false);
    }
  };



  const isTeamLeader = userTeam?.leader_id === user?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Note: Team invites are now handled in the main dashboard notification area */}

      {/* User's Team */}
      {userTeam ? (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 text-base sm:text-lg">
              <Users className="w-5 h-5" />
              <span>{userTeam.name}</span>
              {isTeamLeader && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Crown className="w-3 h-3" />
                  <span>Leader</span>
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {userTeam.is_finalized ? (
                <span className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalized - Room: {userTeam.room}</span>
                </span>
              ) : (
                <div className="space-y-1">
                  <span className="flex items-center space-x-2 text-yellow-600">
                    <XCircle className="w-4 h-4" />
                    <span>Not finalized</span>
                  </span>
                  {(() => {
                    const acceptedMembers = userTeam.members.filter(m => m.status === 'accepted');
                    const isSingleMemberTeam = acceptedMembers.length === 1;
                    if (isSingleMemberTeam) {
                      return (
                  <Badge variant="outline" className="text-xs">
                          Under 3 members → Library assignment
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            {/* Team Members */}
            <div>
              <h4 className="font-medium mb-3 text-sm sm:text-base">Team Members ({userTeam.members.length}/4)</h4>
              <div className="space-y-2">
                {userTeam.members.map((member) => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg space-y-2 sm:space-y-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{member.profile.full_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.profile.email}</p>
                    </div>
                    <Badge variant={member.status === 'accepted' ? 'default' : 'secondary'} className="text-xs self-start sm:self-auto">
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Actions */}
            {isTeamLeader && !userTeam.is_finalized && (
              <div className="space-y-4">
                {/* Invite Members */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Invite Members</Label>
                    <Badge variant="outline" className="text-xs">
                      {4 - userTeam.members.length} slots remaining
                    </Badge>
                  </div>
                  
                  {/* Display invitation errors */}
                  {inviteErrors.length > 0 && (
                    <Alert className="border-destructive">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <AlertDescription>
                        <div className="font-medium text-destructive mb-1">
                          Unable to invite the following users:
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {inviteErrors.map((error, index) => (
                            <li key={index} className="text-destructive">{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    {inviteEmails.map((email, index) => (
                      <div key={index} className="flex space-x-2">
                        <Input
                          value={email}
                          onChange={(e) => updateEmailField(index, e.target.value)}
                          placeholder="email@example.com"
                          className="flex-1 min-h-[44px]"
                          disabled={invitingMembers || loading}
                        />
                        {inviteEmails.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEmailField(index)}
                            className="px-3 min-h-[44px] min-w-[44px]"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {4 - userTeam.members.length <= 0 ? (
                      <Alert>
                        <Users className="h-4 w-4" />
                        <AlertDescription>
                          Your team is at full capacity (4/4 members). No more invitations can be sent.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        {(() => {
                          const currentMemberCount = userTeam.members.length;
                          const remainingSlots = 4 - currentMemberCount;
                          const maxEmailFields = remainingSlots;
                          const currentEmailFields = inviteEmails.length;
                          
                          return (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addEmailField}
                              disabled={currentEmailFields >= maxEmailFields}
                              className="flex items-center justify-center space-x-1 min-h-[44px]"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span className="text-xs sm:text-sm">Add Another Email ({currentEmailFields}/{maxEmailFields})</span>
                            </Button>
                          );
                        })()}
                        <Button
                          onClick={inviteMembers}
                          disabled={invitingMembers || inviteEmails.every(email => !email.trim()) || loading}
                          className="flex items-center justify-center space-x-1 min-h-[44px]"
                        >
                          {invitingMembers ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>Send Invites</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Finalize Team */}
                <div className="space-y-2">
                  {(() => {
                    const acceptedMembers = userTeam.members.filter(m => m.status === 'accepted');
                    const hasUnder3Members = acceptedMembers.length < 3;
                    
                    // Always show Library assignment for teams with under 3 members
                    if (hasUnder3Members) {
                      return (
                        <div>
                          <Label className="text-sm sm:text-base">Room Assignment</Label>
                          <Alert className="mt-2">
                            <MapPin className="h-4 w-4" />
                            <AlertDescription className="text-xs sm:text-sm">
                              Teams with under 3 members are automatically assigned to the <strong>Library</strong>. No room selection needed.
                            </AlertDescription>
                          </Alert>
                          <Button
                            onClick={finalizeTeam}
                            disabled={finalizingTeam || loading}
                            className="flex items-center justify-center space-x-1 mt-2 w-full sm:w-auto min-h-[44px]"
                          >
                            {finalizingTeam ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Finalizing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Finalize Team (Library)</span>
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    }
                    
                    // For teams with 3+ members, check if room selection is disabled by admin
                    if (!roomSelectionEnabled) {
                      return (
                        <div>
                          <Label className="text-sm sm:text-base">Room Assignment</Label>
                          <Alert className="mt-2">
                            <MapPin className="h-4 w-4" />
                            <AlertDescription className="text-xs sm:text-sm">
                              Room selection is currently disabled.
                            </AlertDescription>
                          </Alert>
                          <Button
                            onClick={finalizeTeam}
                            disabled={finalizingTeam || loading}
                            className="flex items-center justify-center space-x-1 mt-2 w-full sm:w-auto min-h-[44px]"
                          >
                            {finalizingTeam ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Finalizing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Finalize Team</span>
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    }
                    
                    // For teams with 3+ members and room selection enabled, show room selector
                    return (
                      <div>
                        <Label htmlFor="room-select" className="text-sm sm:text-base">Select Room</Label>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <Select value={selectedRoom} onValueChange={setSelectedRoom} disabled={finalizingTeam || loading}>
                            <SelectTrigger className="w-full min-h-[44px]" disabled={finalizingTeam || loading}>
                              <SelectValue placeholder="Choose a room" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRooms
                                .filter(room => room.available) // Only show rooms with available capacity
                                .map((room) => (
                                  <SelectItem key={room.name} value={room.name}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{room.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({room.currentTeams}/{room.maxTeams === 999 ? '∞' : room.maxTeams})
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              {availableRooms.filter(room => room.available).length === 0 && (
                                <SelectItem value="" disabled>
                                  <span className="text-muted-foreground text-sm">No rooms available</span>
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={finalizeTeam}
                            disabled={finalizingTeam || !selectedRoom || loading}
                            className="flex items-center justify-center space-x-1 w-full sm:w-auto min-h-[44px]"
                          >
                            {finalizingTeam ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Finalizing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Finalize</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {userTeam.is_finalized && (
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Your team is finalized and assigned to room <strong>{userTeam.room}</strong>. 
                  No further changes can be made.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Create Team */
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Users className="w-5 h-5" />
              <span>Create a Team</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Create a team and invite up to 3 other members (4 total including you)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="space-y-2">
              <Label htmlFor="team-name" className="text-sm sm:text-base">Team Name (max 15 characters)</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                maxLength={15}
                className="min-h-[44px]"
                disabled={creatingTeam || loading}
              />
              <div className="text-xs text-muted-foreground">
                {teamName.length}/15 characters
              </div>
            </div>
            <Button
              onClick={createTeam}
              disabled={creatingTeam || !teamName.trim() || loading}
              className="flex items-center justify-center space-x-1 w-full sm:w-auto min-h-[44px]"
            >
              {creatingTeam ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Create Team</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamManagement; 