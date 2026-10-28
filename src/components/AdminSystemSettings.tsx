import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Loader2 } from 'lucide-react';

const AdminSystemSettings = () => {
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [roomSelectionEnabled, setRoomSelectionEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Query system_config table for both settings
      const { data: registrationData, error: regError } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'registration_open')
        .single();

      if (regError) throw regError;
      
      // Handle JSONB value - it could be a boolean or string 'true'/'false'
      const regValue = registrationData?.value;
      setRegistrationOpen(regValue === true || regValue === 'true');

      // Query room selection setting
      const { data: roomData, error: roomError } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'room_selection_enabled')
        .maybeSingle();

      // Default to true if setting doesn't exist
      if (!roomError && roomData) {
        const roomValue = roomData?.value;
        setRoomSelectionEnabled(roomValue === true || roomValue === 'true');
      } else {
        setRoomSelectionEnabled(true);
      }
    } catch (error: any) {
      // Default to true if there's an error loading
      setRegistrationOpen(true);
      setRoomSelectionEnabled(true);
      toast({
        title: "Error loading settings",
        description: "Using default settings. " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (isOpen: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ 
          value: isOpen,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('key', 'registration_open');

      if (error) throw error;

      setRegistrationOpen(isOpen);
      toast({
        title: "Settings updated",
        description: `Registration has been ${isOpen ? 'opened' : 'closed'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateRoomSelectionStatus = async (isEnabled: boolean) => {
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Check if the setting exists
      const { data: existing } = await supabase
        .from('system_config')
        .select('id')
        .eq('key', 'room_selection_enabled')
        .maybeSingle();

      if (existing) {
        // Update existing setting
        const { error } = await supabase
          .from('system_config')
          .update({ 
            value: isEnabled,
            updated_by: userId
          })
          .eq('key', 'room_selection_enabled');

        if (error) throw error;
      } else {
        // Insert new setting
        const { error } = await supabase
          .from('system_config')
          .insert({ 
            key: 'room_selection_enabled',
            value: isEnabled,
            updated_by: userId
          });

        if (error) throw error;
      }

      setRoomSelectionEnabled(isEnabled);
      toast({
        title: "Settings updated",
        description: `Room selection has been ${isEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>System Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <Settings className="w-5 h-5" />
          <span>System Settings</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Manage global system configuration and feature toggles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-4 border rounded-lg">
          <div className="space-y-1 flex-1">
            <Label htmlFor="registration-toggle" className="text-sm sm:text-base font-medium">
              Registration Open
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {registrationOpen 
                ? 'Participants can register and edit their registration details' 
                : 'Registration is closed. Participants cannot register or edit their details'}
            </p>
            {!registrationOpen && (
              <p className="text-xs text-orange-600 mt-1">
                Participants will see a message directing them to hi@hacktheridge.ca for inquiries
              </p>
            )}
          </div>
          <Switch
            id="registration-toggle"
            checked={registrationOpen}
            onCheckedChange={updateRegistrationStatus}
            disabled={saving}
            className="self-start sm:self-auto"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-4 border rounded-lg">
          <div className="space-y-1 flex-1">
            <Label htmlFor="room-selection-toggle" className="text-sm sm:text-base font-medium">
              Room Selection Enabled
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {roomSelectionEnabled 
                ? 'Team leaders can select rooms when finalizing their teams (teams with 3+ members)' 
                : 'Room selection is disabled. Team leaders cannot select rooms when finalizing'}
            </p>
            {!roomSelectionEnabled && (
              <p className="text-xs text-orange-600 mt-1">
                All teams will be auto-assigned (Library for teams under 3 members, TBD for others)
              </p>
            )}
          </div>
          <Switch
            id="room-selection-toggle"
            checked={roomSelectionEnabled}
            onCheckedChange={updateRoomSelectionStatus}
            disabled={saving}
            className="self-start sm:self-auto"
          />
        </div>
        
        {saving && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Updating settings...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSystemSettings;
