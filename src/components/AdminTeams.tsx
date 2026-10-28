import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Edit, CheckCircle, MessageSquare, Crown, MapPin, UserPlus, UserX, Trash2, XCircle, RefreshCw, Mail, Search, Download } from 'lucide-react';
import { logger } from "@/utils/logger";

interface Team {
  id: string;
  name: string;
  leader_id: string;
  room: string;
  is_finalized: boolean;
  confirmed: boolean;
  created_at: string;
  members: TeamMember[];
  leader_profile: {
    full_name: string;
    email: string;
  };
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

interface RoomData {
  id: string;
  name: string;
  teams: Team[];
  maxTeams: number;
}

const ROOMS = [
  { id: '124', name: 'Room 124', maxTeams: 2 },
  { id: '123', name: 'Room 123', maxTeams: 2 },
  { id: '121', name: 'Room 121', maxTeams: 2 },
  { id: '119', name: 'Room 119', maxTeams: 2 },
  { id: '115', name: 'Room 115', maxTeams: 2 },
  { id: '103', name: 'Room 103', maxTeams: 2 },
  { id: '105', name: 'Room 105', maxTeams: 2 },
  { id: '107', name: 'Room 107', maxTeams: 2 },
  { id: '201', name: 'Room 201', maxTeams: 2 },
  { id: '203', name: 'Room 203', maxTeams: 2 },
  { id: '205', name: 'Room 205', maxTeams: 2 },
  { id: '207', name: 'Room 207', maxTeams: 2 },
  { id: '209', name: 'Room 209', maxTeams: 2 },
  { id: '202', name: 'Room 202', maxTeams: 2 },
  { id: '204', name: 'Room 204', maxTeams: 2 },
  { id: '206', name: 'Room 206', maxTeams: 2 },
  { id: '216', name: 'Room 216', maxTeams: 2 },
  { id: '211', name: 'Room 211', maxTeams: 2 },
  { id: '213', name: 'Room 213', maxTeams: 2 },
  { id: '215', name: 'Room 215', maxTeams: 2 },
  { id: '217', name: 'Room 217', maxTeams: 2 },
  { id: '219', name: 'Room 219', maxTeams: 2 },
  { id: '223', name: 'Room 223', maxTeams: 2 },
  { id: '225', name: 'Room 225', maxTeams: 2 },
  { id: '227', name: 'Room 227', maxTeams: 2 },
  { id: '220', name: 'Room 220', maxTeams: 2 },
  { id: '222', name: 'Room 222', maxTeams: 2 },
  { id: '228', name: 'Room 228', maxTeams: 2 },
  { id: '230', name: 'Room 230', maxTeams: 2 },
  { id: 'Library Conference Room', name: 'Library Conference Room', maxTeams: 2 },
  { id: 'Library', name: 'Library', maxTeams: 999 },
  { id: 'unassigned', name: 'Unassigned Teams', maxTeams: 999 }
];

const AdminTeams = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'rooms' | 'list'>('rooms');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>(['']);
  const [invitingTeam, setInvitingTeam] = useState<string | null>(null);
  const [notifyingTeam, setNotifyingTeam] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadTeams();
    
    const channel = supabase
      .channel('admin-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => loadTeams())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (teams.length > 0) organizeTeamsByRoom();
  }, [teams]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, leader_id, room, is_finalized, confirmed, created_at')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const teamsWithMembers = await Promise.all(
          data.map(async (team) => {
            const { data: members } = await supabase
              .from('team_members')
              .select('id, user_id, status')
              .eq('team_id', team.id);

            const { data: leaderProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', team.leader_id)
              .single();

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

            return {
              ...team,
              leader_profile: leaderProfile || { full_name: 'Unknown', email: 'unknown@example.com' },
              members: memberProfiles || []
            };
          })
        );

        setTeams(teamsWithMembers);
      }
    } catch (error) {
      logger.error('Error loading teams:', error);
      toast({ title: "Error", description: "Failed to load teams", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const organizeTeamsByRoom = () => {
    const roomData: RoomData[] = ROOMS.map(room => ({
      ...room,
      teams: teams.filter(team => {
        if (room.id === 'unassigned') return !team.room || team.room === '';
        return team.room === room.id;
      })
    }));
    setRooms(roomData);
  };

  const exportToCSV = () => {
    try {
      // CSV Headers
      const headers = ['Team Name', 'Team Members', 'Room'];
      
      // Build CSV rows
      const rows = teams.map(team => {
        const teamName = `"${team.name.replace(/"/g, '""')}"`; // Escape quotes
        
        // Get all team members (leader + accepted members)
        const allMembers = [];
        
        // Add leader
        allMembers.push(`${team.leader_profile.full_name} (Leader)`);
        
        // Add accepted members
        team.members
          .filter(m => m.status === 'accepted')
          .forEach(member => {
            allMembers.push(member.profile.full_name);
          });
        
        const membersStr = `"${allMembers.join(', ').replace(/"/g, '""')}"`;
        const room = team.room || 'Unassigned';
        const roomStr = `"${room.replace(/"/g, '""')}"`;
        
        return [teamName, membersStr, roomStr].join(',');
      });
      
      // Combine headers and rows
      const csv = [headers.join(','), ...rows].join('\n');
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `teams_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: `Exported ${teams.length} teams to CSV`,
      });
    } catch (error) {
      logger.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const destinationRoomId = destination.droppableId;
    const destinationRoom = ROOMS.find(room => room.id === destinationRoomId);
    if (!destinationRoom) return;

    // Note: Admins can move single-member teams to any room - participants are restricted to Library only

    // Admins can place unlimited teams in rooms (no capacity check)

    try {
      setUpdating(true);
      const newRoom = destinationRoomId === 'unassigned' ? null : destinationRoomId;
      const { error } = await supabase.from('teams').update({ room: newRoom }).eq('id', draggableId);
      if (error) throw error;
      toast({ title: "Success", description: `Team moved to ${destinationRoom.name}` });
      await loadTeams();
    } catch (error) {
      logger.error('Error updating team room:', error);
      toast({ title: "Error", description: "Failed to update team room", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const updateTeamRoom = async (teamId: string, newRoom: string) => {
    try {
      await supabase.from('teams').update({ room: newRoom }).eq('id', teamId);
      toast({ title: "Success", description: "Team room updated successfully!" });
      loadTeams();
    } catch (error) {
      logger.error('Error updating room:', error);
      toast({ title: "Error", description: "Failed to update team room", variant: "destructive" });
    }
  };

  const updateTeamName = async (teamId: string, newName: string) => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Team name cannot be empty", variant: "destructive" });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: newName.trim() })
        .eq('id', teamId);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Team name updated successfully!" });
      loadTeams();
    } catch (error) {
      logger.error('Error updating team name:', error);
      toast({ title: "Error", description: "Failed to update team name", variant: "destructive" });
    }
  };

  const changeTeamLeader = async (teamId: string, newLeaderUserId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ leader_id: newLeaderUserId })
        .eq('id', teamId);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Team leader changed successfully!" });
      loadTeams();
    } catch (error) {
      logger.error('Error changing team leader:', error);
      toast({ title: "Error", description: "Failed to change team leader", variant: "destructive" });
    }
  };

  const removeTeamMember = async (teamId: string, memberId: string) => {
    try {
      const team = teams.find(t => t.id === teamId);
      if (!team) {
        toast({ title: "Error", description: "Team not found", variant: "destructive" });
        return;
      }

      const memberToRemove = team.members.find(m => m.id === memberId);
      if (!memberToRemove) {
        toast({ title: "Error", description: "Team member not found", variant: "destructive" });
        return;
      }

      // Check if the member being removed is the team leader
      const isLeader = memberToRemove.user_id === team.leader_id;
      
      if (isLeader) {
        // Find remaining accepted members to transfer leadership to
        const remainingMembers = team.members.filter(
          m => m.id !== memberId && m.status === 'accepted'
        );
        
        if (remainingMembers.length === 0) {
          toast({ 
            title: "Cannot Remove Leader", 
            description: "Cannot remove the team leader when there are no other members to transfer leadership to. Consider deleting the team instead.",
            variant: "destructive" 
          });
          return;
        }
        
        if (remainingMembers.length === 1) {
          // Only one member left, automatically transfer to them
          const newLeader = remainingMembers[0];
          
          const { error: leaderError } = await supabase
            .from('teams')
            .update({ leader_id: newLeader.user_id })
            .eq('id', teamId);
          
          if (leaderError) {
            logger.error('Error transferring leadership:', leaderError);
            toast({ title: "Error", description: "Failed to transfer team leadership", variant: "destructive" });
            return;
          }
        } else {
          // Multiple members available - ask admin to choose manually
          toast({ 
            title: "Leadership Transfer Required", 
            description: `Before removing the team leader, please select a new leader from the remaining ${remainingMembers.length} members using the "Make Leader" button.`,
            variant: "destructive" 
          });
          return;
        }
      }
      
      // Remove the team member
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      const successMessage = isLeader 
        ? "Team leader removed and leadership transferred successfully!"
        : "Team member removed successfully!";
      
      toast({ title: "Success", description: successMessage });
      loadTeams();
    } catch (error) {
      logger.error('Error removing team member:', error);
      toast({ title: "Error", description: "Failed to remove team member", variant: "destructive" });
    }
  };

  const sendTeamNotification = async (team: Team) => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({ title: "Error", description: "Please fill in both title and message", variant: "destructive" });
      return;
    }

    setSendingNotification(true);
    try {
      // Get all team members (accepted members + leader)
      const teamMemberIds = [team.leader_id];
      team.members
        .filter(member => member.status === 'accepted')
        .forEach(member => {
          if (!teamMemberIds.includes(member.user_id)) {
            teamMemberIds.push(member.user_id);
          }
        });

      // Create notifications for each team member
      const notifications = teamMemberIds.map(userId => ({
        user_id: userId,
        title: `[${team.name}] ${notificationTitle}`,
        message: notificationMessage,
        created_by: user?.id || team.leader_id,
        team_id: team.id
      }));

      const { error } = await supabase.from('user_notifications').insert(notifications);
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `Notification sent to ${teamMemberIds.length} team members of ${team.name}!` 
      });
      setNotificationTitle('');
      setNotificationMessage('');
    } catch (error) {
      logger.error('Error sending team notification:', error);
      toast({ title: "Error", description: "Failed to send team notification", variant: "destructive" });
    } finally {
      setSendingNotification(false);
    }
  };

  const confirmTeamPlacement = async (teamId: string) => {
    try {
      const team = teams.find(t => t.id === teamId);
      const newConfirmedStatus = !team?.confirmed;
      
      await supabase.from('teams').update({ confirmed: newConfirmedStatus }).eq('id', teamId);
      toast({ 
        title: "Success", 
        description: newConfirmedStatus ? "Team confirmed!" : "Team confirmation removed" 
      });
      loadTeams();
    } catch (error) {
      logger.error('Error updating team confirmation:', error);
      toast({ title: "Error", description: "Failed to update team confirmation", variant: "destructive" });
    }
  };

  const deleteTeam = async (teamId: string) => {
    setDeletingTeam(teamId);
    try {
      await supabase.from('team_members').delete().eq('team_id', teamId);
      await supabase.from('team_invites').delete().eq('team_id', teamId);
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      toast({ title: "Success", description: "Team deleted successfully" });
      setShowDeleteDialog(null);
      loadTeams();
    } catch (error) {
      logger.error('Error deleting team:', error);
      toast({ title: "Error", description: "Failed to delete team", variant: "destructive" });
    } finally {
      setDeletingTeam(null);
    }
  };

  const inviteToTeam = async (teamId: string) => {
    const validEmails = inviteEmails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      toast({ title: "Error", description: "Please enter at least one email address", variant: "destructive" });
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const email of validEmails) {
        logger.log('AdminTeams: Checking profile for email:', email);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, email')
          .eq('email', email.trim())
          .single();

        logger.log('AdminTeams: Profile query result:', { profile, profileError });

        if (profileError || !profile) {
          logger.error('AdminTeams: Profile not found for email:', email, profileError);
          toast({ title: "Warning", description: `User with email ${email} not found. Make sure they have an account on the platform.`, variant: "destructive" });
          errorCount++;
          continue;
        }

        // Check if the user is registered and checked in
        logger.log('AdminTeams: Checking registration for user_id:', profile.user_id);
        
        const { data: registrations, error: regError } = await supabase
          .from('registrations')
          .select('user_id, email, full_name, checked_in')
          .eq('user_id', profile.user_id);

        logger.log('AdminTeams: Registration query result:', { registrations, regError });

        if (regError) {
          logger.error('AdminTeams: Error checking registration for user:', email, regError);
          toast({ title: "Error", description: `Error checking registration status for ${email}: ${regError.message}`, variant: "destructive" });
          errorCount++;
          continue;
        }

        if (!registrations || registrations.length === 0) {
          logger.log('AdminTeams: No registration found for user:', email, 'user_id:', profile.user_id);
          toast({ 
            title: "Registration Required", 
            description: `User ${email} has an account but is not registered for the hackathon. They need to complete registration first.`, 
            variant: "destructive" 
          });
          errorCount++;
          continue;
        }

        // Get the first registration (should only be one per user)
        const registration = registrations[0];
        logger.log('AdminTeams: Found registration:', registration);

        // Check if the user is checked in
        const isCheckedIn = registration?.checked_in === true;
        logger.log('AdminTeams: Check-in status:', isCheckedIn);

        if (!isCheckedIn) {
          toast({ 
            title: "Check-in Required", 
            description: `${email} is registered but has not been checked in to the event yet. Please check them in before inviting to a team.`, 
            variant: "destructive" 
          });
          errorCount++;
          continue;
        }

        logger.log('AdminTeams: User passed all checks:', email);

        const { error } = await supabase.from('team_invites').insert({
          team_id: teamId,
          inviter_id: team.leader_id,
          invitee_email: email.trim()
        });

        if (error) {
          logger.error('Error creating invite:', error);
          toast({ title: "Error", description: `Failed to invite ${email}`, variant: "destructive" });
          errorCount++;
        } else {
          successCount++;
        }
      }

      // Show summary message
      if (successCount > 0 && errorCount === 0) {
        toast({ title: "Success", description: `All ${successCount} invites sent successfully!` });
      } else if (successCount > 0 && errorCount > 0) {
        toast({ title: "Partial Success", description: `${successCount} invites sent successfully, ${errorCount} failed (only checked-in users can be invited)` });
      } else if (errorCount > 0) {
        toast({ title: "Failed", description: `All invites failed. Only checked-in users can be invited to teams.`, variant: "destructive" });
      }

      setInviteEmails(['']);
      setInvitingTeam(null); // Close the invite dialog
    } catch (error) {
      logger.error('Error inviting users:', error);
      toast({ title: "Error", description: "Failed to send invites", variant: "destructive" });
    }
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const removeEmailField = (index: number) => {
    if (inviteEmails.length > 1) {
      const newEmails = inviteEmails.filter((_, i) => i !== index);
      setInviteEmails(newEmails);
    }
  };

  const updateEmailField = (index: number, value: string) => {
    setInviteEmails(prevEmails => {
      const newEmails = [...prevEmails];
      newEmails[index] = value;
      return newEmails;
    });
  };

  const TeamCard = ({ team, index, isInRoomView = false }: { team: Team; index: number; isInRoomView?: boolean }) => {
    if (isInRoomView) {
      return (
        <Draggable draggableId={team.id} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`mb-3 transform transition-all duration-200 ${
                snapshot.isDragging ? 'rotate-1 scale-105 shadow-xl z-50' : 'hover:scale-[1.02] hover:shadow-md'
              }`}
            >
              <Card className={`cursor-move border-l-4 ${
                team.confirmed 
                  ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' 
                  : 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
              } ${snapshot.isDragging ? 'shadow-xl border-primary bg-background' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-sm font-medium">{team.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {team.is_finalized && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        Finalized
                      </Badge>
                    )}
                    {(() => {
                      const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                      const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                      const totalMembers = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                      if (totalMembers === 1) {
                        return (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                            Solo Team
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                    {team.confirmed ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                        Unconfirmed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center text-muted-foreground text-xs">
                    <Crown className="w-3 h-3 mr-1 text-yellow-600" />
                    <span className="truncate">{team.leader_profile.full_name}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    <span>{(() => {
                      const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                      const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                      return leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                    })()}/4</span>
                  </div>
                  {/* Confirm/Unconfirm toggle button for room view */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmTeamPlacement(team.id);
                    }}
                    className={`w-full text-xs h-8 border transition-colors ${
                      team.confirmed 
                        ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:border-red-300' 
                        : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:border-green-300'
                    }`}
                  >
                    {team.confirmed ? (
                      <>
                        <XCircle className="w-3 h-3 mr-1.5" />
                        <span className="text-xs">Remove Confirmation</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        <span className="text-xs">Confirm Team</span>
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </Draggable>
      );
    }

    return (
      <Card className="mb-2 sm:mb-4">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-2 sm:pt-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg truncate flex-1">{team.name}</CardTitle>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {(() => {
                  const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                  const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                  return leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                })()}/4
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="flex items-center space-x-1 text-[10px] sm:text-xs">
                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">{team.room || 'Unassigned'}</span>
                <span className="sm:hidden">{team.room ? team.room.replace('Room ', '') : 'N/A'}</span>
              </Badge>
              {team.is_finalized && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  Finalized
                </Badge>
              )}
              {(() => {
                const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                const totalMembers = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                if (totalMembers === 1) {
                  return (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                      Solo Team
                    </Badge>
                  );
                }
                return null;
              })()}
              {team.confirmed ? (
                <Badge variant="default" className="text-[10px] sm:text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  ✓
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] sm:text-xs">
                  ✗
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-2 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {/* Leader and Members - Collapsible on Mobile */}
            <div className="flex items-center gap-2 text-[11px] sm:text-xs">
              <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 flex-shrink-0" />
              <span className="font-medium truncate">{team.leader_profile.full_name}</span>
              {team.members.filter(member => member.status === 'accepted').length > 0 && (
                <span className="text-muted-foreground">+{team.members.filter(member => member.status === 'accepted').length}</span>
              )}
            </div>

            {/* Action Buttons - More compact grid on mobile */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center justify-center gap-1 h-8 sm:h-9 px-2 sm:px-3"
                onClick={() => {
                  setEditingTeam(team.id);
                  setEditingTeamName(team.name);
                }}
              >
                <Edit className="w-3 h-3" />
                <span className="text-[10px] sm:text-xs">Edit</span>
              </Button>

              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center justify-center gap-1 h-8 sm:h-9 px-2 sm:px-3"
                onClick={() => {
                  setNotifyingTeam(team.id);
                  setNotificationTitle('');
                  setNotificationMessage('');
                }}
              >
                <MessageSquare className="w-3 h-3" />
                <span className="text-[10px] sm:text-xs hidden sm:inline">Notify</span>
              </Button>

              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center justify-center gap-1 h-8 sm:h-9 px-2 sm:px-3"
                onClick={() => {
                  setInvitingTeam(team.id);
                  setInviteEmails(['']);
                }}
              >
                <UserPlus className="w-3 h-3" />
                <span className="text-[10px] sm:text-xs hidden sm:inline">Invite</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => confirmTeamPlacement(team.id)}
                className={`flex items-center justify-center gap-1 h-8 sm:h-9 px-2 sm:px-3 col-span-2 sm:col-span-1 ${
                  team.confirmed 
                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' 
                    : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'
                }`}
              >
                {team.confirmed ? (
                  <>
                    <XCircle className="w-3 h-3" />
                    <span className="text-[10px] sm:text-xs">Unconfirm</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-[10px] sm:text-xs">Confirm</span>
                  </>
                )}
              </Button>

              <Dialog open={showDeleteDialog === team.id} onOpenChange={(open) => setShowDeleteDialog(open ? team.id : null)}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="flex items-center justify-center gap-1 h-8 sm:h-9 px-2 sm:px-3">
                    <Trash2 className="w-3 h-3" />
                    <span className="text-[10px] sm:text-xs hidden sm:inline">Delete</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Delete Team</DialogTitle>
                    <DialogDescription className="text-sm">
                      Are you sure you want to delete "{team.name}"? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowDeleteDialog(null)} disabled={deletingTeam === team.id} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => deleteTeam(team.id)} disabled={deletingTeam === team.id} className="w-full sm:w-auto">
                      {deletingTeam === team.id ? 'Deleting...' : 'Delete Team'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RoomColumn = ({ room }: { room: RoomData }) => (
    <Card className="mb-4 sm:mb-6 min-h-[300px] sm:min-h-[400px]">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0 flex-1">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            <span className="truncate">{room.name}</span>
          </div>
          <Badge 
            variant={
              room.teams.length > room.maxTeams && room.maxTeams !== 999 
                ? "destructive" 
                : room.teams.length === room.maxTeams && room.maxTeams !== 999
                ? "default"
                : room.teams.length > 0 
                ? "default" 
                : "secondary"
            }
            className="text-xs flex-shrink-0"
            title={room.maxTeams !== 999 && room.teams.length > room.maxTeams ? `Over recommended capacity (${room.maxTeams})` : undefined}
          >
            {room.teams.length}{room.maxTeams !== 999 ? `/${room.maxTeams}` : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Droppable droppableId={room.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[200px] sm:min-h-[300px] p-2 sm:p-3 rounded-lg transition-all duration-200 ${
                snapshot.isDraggingOver 
                  ? 'bg-primary/10 border-2 border-primary border-dashed shadow-inner' 
                  : 'bg-muted/30 border-2 border-transparent'
              }`}
            >
              {room.teams.map((team, index) => (
                <TeamCard key={team.id} team={team} index={index} isInRoomView={true} />
              ))}
              {provided.placeholder}
              {room.teams.length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 sm:h-32 text-muted-foreground text-xs sm:text-sm">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-2">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span>Drop teams here</span>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Team Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {viewMode === 'rooms' 
              ? 'Assign teams to rooms' 
              : 'Manage teams and members'
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg w-full sm:w-auto">
            <Button
              size="sm"
              variant={viewMode === 'rooms' ? 'default' : 'ghost'}
              onClick={() => setViewMode('rooms')}
              className="text-xs flex-1 sm:flex-none"
            >
              <MapPin className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Room View</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="text-xs flex-1 sm:flex-none"
            >
              <Users className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">List View</span>
            </Button>
          </div>
          <Button 
            onClick={loadTeams} 
            disabled={updating}
            variant="outline"
            className="flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{teams.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {teams.filter(t => t.room && t.room !== '').length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {teams.filter(t => !t.room || t.room === '').length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {teams.filter(t => t.confirmed).length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'rooms' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {rooms.map(room => (
              <RoomColumn key={room.id} room={room} />
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* Search Bar and Export Button for List View */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search teams by name, leader, or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
            </div>
            <Button
              onClick={exportToCSV}
              disabled={teams.length === 0}
              variant="outline"
              className="flex items-center justify-center space-x-2 h-10"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
          </div>

          {/* Filtered Teams List */}
          {(() => {
            const filteredTeams = teams.filter(team => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              
              // Search by team name
              if (team.name.toLowerCase().includes(query)) return true;
              
              // Search by leader name or email
              if (team.leader_profile.full_name.toLowerCase().includes(query)) return true;
              if (team.leader_profile.email.toLowerCase().includes(query)) return true;
              
              // Search by member names or emails
              const memberMatch = team.members.some(member => 
                member.profile.full_name.toLowerCase().includes(query) ||
                member.profile.email.toLowerCase().includes(query)
              );
              if (memberMatch) return true;
              
              // Search by room
              if (team.room && team.room.toLowerCase().includes(query)) return true;
              
              return false;
            });

            if (filteredTeams.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 px-4">
                    <Search className="w-10 h-10 text-muted-foreground mb-3" />
                    <h3 className="text-base font-medium mb-2">No teams found</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      {searchQuery ? `No teams match "${searchQuery}"` : 'No teams available'}
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return filteredTeams.map((team, index) => (
              <TeamCard key={team.id} team={team} index={index} isInRoomView={false} />
            ));
          })()}
        </div>
      )}

      {/* Empty State */}
      {teams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">No Teams Yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Teams will appear here once participants start creating them.
            </p>
          </CardContent>
        </Card>
      )}

      {updating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Updating team assignment...</span>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => {
        if (!open) {
          setEditingTeam(null);
          setEditingTeamName('');
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Team: {teams.find(t => t.id === editingTeam)?.name}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update team name, manage members, and assign rooms.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Team Name</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Enter team name"
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (editingTeam) {
                      updateTeamName(editingTeam, editingTeamName);
                    }
                  }}
                  disabled={!editingTeamName.trim() || editingTeamName === teams.find(t => t.id === editingTeam)?.name}
                  className="w-full sm:w-auto"
                >
                  Update
                </Button>
              </div>
            </div>

            {(() => {
              const team = teams.find(t => t.id === editingTeam);
              if (team && team.members.length > 0) {
                return (
                  <div className="space-y-2">
                    <Label className="text-sm">Team Members</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Use "Make Leader" to transfer leadership to a different member.
                    </p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {/* Show team leader first */}
                      <div className="flex items-start justify-between p-3 border rounded-md bg-yellow-50 dark:bg-yellow-950/20">
                        <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                          <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{team.leader_profile.full_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{team.leader_profile.email}</div>
                            <Badge variant="secondary" className="text-xs mt-1">Team Leader</Badge>
                          </div>
                        </div>
                        {(() => {
                          // Check if leader is also in members (meaning they joined after creating)
                          const leaderAsMember = team.members.find(m => m.user_id === team.leader_id);
                          if (leaderAsMember) {
                            return (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeTeamMember(team.id, leaderAsMember.id)}
                                className="flex items-center justify-center space-x-1 text-xs"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Remove</span>
                              </Button>
                            );
                          }
                          return null;
                        })()
                        }
                      </div>
                      
                      {/* Show other team members */}
                      {team.members.filter(member => member.status === 'accepted' && member.user_id !== team.leader_id).map((member) => (
                        <div key={member.id} className="flex items-start justify-between p-3 border rounded-md">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-medium text-sm truncate">{member.profile.full_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{member.profile.email}</div>
                            <Badge variant="outline" className="text-xs mt-1">Member</Badge>
                          </div>
                          <div className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changeTeamLeader(team.id, member.user_id)}
                              className="flex items-center justify-center space-x-1 text-xs"
                            >
                              <Crown className="w-3 h-3" />
                              <span>Make Leader</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeTeamMember(team.id, member.id)}
                              className="flex items-center justify-center space-x-1 text-xs"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Remove</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-2">
              <Label className="text-sm">Room Assignment</Label>
              {(() => {
                const team = teams.find(t => t.id === editingTeam);
                if (team) {
                  const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                  const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                  const totalMembers = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                  
                  if (totalMembers === 1) {
                    return (
                      <div>
                        <Alert className="text-sm mb-3">
                          <MapPin className="h-3.5 w-3.5" />
                          <AlertDescription className="text-xs">
                            <strong>Admin Override:</strong> This single-member team can be assigned to any room. Note that participants are restricted to Library only for single-member teams.
                          </AlertDescription>
                        </Alert>
                        <Select
                          value={team.room || 'unassigned'}
                          onValueChange={(value) => updateTeamRoom(editingTeam, value === 'unassigned' ? '' : value)}
                        >
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {ROOMS.filter(r => r.id !== 'unassigned').map((room) => (
                              <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                }
                
                return (
                  <Select
                    value={teams.find(t => t.id === editingTeam)?.room || 'unassigned'}
                    onValueChange={(value) => updateTeamRoom(editingTeam, value === 'unassigned' ? '' : value)}
                  >
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {ROOMS.filter(r => r.id !== 'unassigned').map((room) => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Team Members Dialog */}
      <Dialog open={!!invitingTeam} onOpenChange={(open) => setInvitingTeam(open ? invitingTeam : null)}>
        <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Invite Members to {teams.find(t => t.id === invitingTeam)?.name}</DialogTitle>
            {(() => {
              const team = teams.find(t => t.id === invitingTeam);
              if (team) {
                const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                const currentTeamSize = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                const maxSlotsAvailable = 4 - currentTeamSize;
                
                return (
                  <DialogDescription className="text-xs sm:text-sm">
                    {maxSlotsAvailable > 0 
                      ? `Add up to ${maxSlotsAvailable} team members by entering their email addresses. Only users who are checked in to the event can be invited to teams.`
                      : "This team is at maximum capacity (4 members). Remove a member first to invite new ones."
                    }
                  </DialogDescription>
                );
              }
              return (
                <DialogDescription className="text-xs sm:text-sm">
                  Add team members by entering their email addresses. Only users who are checked in to the event can be invited to teams.
                </DialogDescription>
              );
            })()}
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            {(() => {
              const team = teams.find(t => t.id === invitingTeam);
              if (team) {
                const acceptedMembers = team.members.filter(m => m.status === 'accepted');
                const leaderInMembers = acceptedMembers.some(m => m.user_id === team.leader_id);
                const currentTeamSize = leaderInMembers ? acceptedMembers.length : acceptedMembers.length + 1;
                const maxSlotsAvailable = 4 - currentTeamSize;
                
                if (maxSlotsAvailable <= 0) {
                  return (
                    <div className="text-center py-6">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-2">Team Full</h3>
                      <p className="text-muted-foreground">
                        This team is at maximum capacity (4 members). Remove a member first to invite new ones.
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    <Label className="text-sm">Team Member Emails</Label>
                    {inviteEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Enter email address"
                          value={email}
                          onChange={(e) => updateEmailField(index, e.target.value)}
                          type="email"
                          className="text-sm"
                        />
                        {inviteEmails.length > 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeEmailField(index)}
                            className="flex-shrink-0"
                          >
                            <UserX className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addEmailField}
                        disabled={inviteEmails.length >= maxSlotsAvailable}
                        className="flex items-center justify-center space-x-1 w-full sm:w-auto"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span className="text-xs">Add Email ({inviteEmails.length}/{maxSlotsAvailable})</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => inviteToTeam(invitingTeam)}
                        className="flex items-center justify-center space-x-1 w-full sm:w-auto"
                      >
                        <Mail className="w-3 h-3" />
                        <span className="text-xs">Send Invites</span>
                      </Button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Notification Dialog */}
      <Dialog open={!!notifyingTeam} onOpenChange={(open) => setNotifyingTeam(open ? notifyingTeam : null)}>
        <DialogContent className="w-[95vw] max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Send Notification to {teams.find(t => t.id === notifyingTeam)?.name}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Send a notification to all members of this team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Notification Title</Label>
              <Input
                placeholder="Enter notification title"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Notification Message</Label>
              <Textarea
                placeholder="Enter notification message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
            <Button
              onClick={() => {
                const team = teams.find(t => t.id === notifyingTeam);
                if (team) {
                  sendTeamNotification(team);
                  setNotifyingTeam(null); // Close the dialog after sending
                }
              }}
              disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
              className="w-full flex items-center justify-center space-x-2 h-10"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">{sendingNotification ? 'Sending...' : 'Send Notification'}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeams;