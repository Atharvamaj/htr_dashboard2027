import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Crown, MapPin, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { logger } from "@/utils/logger";

interface Team {
  id: string;
  name: string;
  leader_id: string;
  room: string;
  is_finalized: boolean;
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

const AdminRoomManagement = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTeams();
    
    // Set up real-time updates
    const channel = supabase
      .channel('room-management')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (teams.length > 0) {
      organizeTeamsByRoom();
    }
  }, [teams]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          leader_id,
          room,
          is_finalized,
          created_at
        `)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Error loading teams:', error);
        toast({
          title: "Error",
          description: "Failed to load teams",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        // Get members and leader profiles for each team
        const teamsWithMembers = await Promise.all(
          data.map(async (team) => {
            // Get team members
            const { data: members } = await supabase
              .from('team_members')
              .select(`
                id,
                user_id,
                status
              `)
              .eq('team_id', team.id);

            // Get leader profile
            const { data: leaderProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', team.leader_id)
              .single();

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
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const organizeTeamsByRoom = () => {
    const roomData: RoomData[] = ROOMS.map(room => ({
      ...room,
      teams: teams.filter(team => {
        if (room.id === 'unassigned') {
          return !team.room || team.room === '';
        }
        return team.room === room.id;
      })
    }));

    setRooms(roomData);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceRoomId = source.droppableId;
    const destinationRoomId = destination.droppableId;
    const teamId = draggableId;

    // Find the destination room info
    const destinationRoom = ROOMS.find(room => room.id === destinationRoomId);
    if (!destinationRoom) return;

    // Check capacity (except for unassigned and library)
    if (destinationRoomId !== 'unassigned' && destinationRoomId !== 'Library') {
      const destinationRoomData = rooms.find(room => room.id === destinationRoomId);
      if (destinationRoomData && destinationRoomData.teams.length >= destinationRoom.maxTeams) {
        toast({
          title: "Room Full",
          description: `${destinationRoom.name} is already at capacity (${destinationRoom.maxTeams} teams)`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setUpdating(true);

      // Update the team's room in the database
      const newRoom = destinationRoomId === 'unassigned' ? null : destinationRoomId;
      const { error } = await supabase
        .from('teams')
        .update({ room: newRoom })
        .eq('id', teamId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Team moved to ${destinationRoom.name}`,
      });

      // Reload teams to reflect changes
      await loadTeams();
    } catch (error) {
      logger.error('Error updating team room:', error);
      toast({
        title: "Error",
        description: "Failed to update team room",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const TeamCard = ({ team, index }: { team: Team; index: number }) => (
    <Draggable draggableId={team.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 transform transition-all duration-200 ${
            snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl z-50' : 'hover:scale-[1.02] hover:shadow-md'
          }`}
        >
          <Card className={`cursor-move border-l-4 ${
            team.is_finalized 
              ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' 
              : 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
          } ${
            snapshot.isDragging ? 'shadow-xl border-primary bg-background' : ''
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium truncate pr-2">
                  {team.name}
                </CardTitle>
                <div className="flex items-center space-x-1">
                  {team.is_finalized && (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      Final
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex items-center text-muted-foreground text-xs">
                <Crown className="w-3 h-3 mr-1 text-yellow-600" />
                <span className="truncate">{team.leader_profile.full_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center text-muted-foreground">
                  <Users className="w-3 h-3 mr-1" />
                  <span>{team.members.filter(m => m.status === 'accepted').length + 1}/4</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(team.created_at).toLocaleDateString()}
                </div>
              </div>
              {team.members.length > 0 && (
                <div className="pt-1 border-t border-border/50">
                  <div className="text-xs text-muted-foreground">
                    Members: {team.members
                      .filter(m => m.status === 'accepted')
                      .map(m => m.profile.full_name.split(' ')[0])
                      .join(', ')
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );

  const RoomColumn = ({ room }: { room: RoomData }) => (
    <Card className="min-h-[600px] w-80 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            <span className="truncate">{room.name}</span>
          </div>
          <Badge 
            variant={
              room.teams.length >= room.maxTeams && room.maxTeams !== 999 
                ? "destructive" 
                : room.teams.length > 0 
                ? "default" 
                : "secondary"
            }
          >
            {room.teams.length}/{room.maxTeams === 999 ? '∞' : room.maxTeams}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <Droppable droppableId={room.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[500px] p-2 rounded-lg transition-all duration-200 ${
                snapshot.isDraggingOver 
                  ? 'bg-primary/10 border-2 border-primary border-dashed shadow-inner' 
                  : 'bg-muted/30 border-2 border-transparent'
              }`}
            >
              {room.teams.map((team, index) => (
                <TeamCard key={team.id} team={team} index={index} />
              ))}
              {provided.placeholder}
              {room.teams.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-2">
                    <MapPin className="w-6 h-6" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Room Management</h2>
          <p className="text-muted-foreground">Drag and drop teams to assign them to different rooms</p>
        </div>
        <Button 
          onClick={loadTeams} 
          disabled={updating}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{teams.length}</p>
                <p className="text-sm text-muted-foreground">Total Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.room && t.room !== '').length}
                </p>
                <p className="text-sm text-muted-foreground">Assigned Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teams.filter(t => !t.room || t.room === '').length}
                </p>
                <p className="text-sm text-muted-foreground">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {teams.filter(t => t.is_finalized).length}
                </p>
                <p className="text-sm text-muted-foreground">Finalized</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex space-x-6 min-w-max">
            {rooms.map(room => (
              <RoomColumn key={room.id} room={room} />
            ))}
          </div>
        </div>
      </DragDropContext>

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
    </div>
  );
};

export default AdminRoomManagement;
