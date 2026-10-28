import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/utils/logger";

export const useCheckinStatus = () => {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkUserCheckinStatus();
    } else {
      setIsCheckedIn(null);
      setLoading(false);
    }
  }, [user]);

  const checkUserCheckinStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        logger.error('Error checking check-in status:', error);
        setIsCheckedIn(false); // Default to not checked in if there's an error
      } else {
        // Check if checked_in column exists, otherwise default to false
        const checkedIn = data && 'checked_in' in data ? (data as any).checked_in : false;
        setIsCheckedIn(checkedIn || false);
      }
    } catch (error) {
      logger.error('Error checking check-in status:', error);
      setIsCheckedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshCheckinStatus = () => {
    if (user) {
      setLoading(true);
      checkUserCheckinStatus();
    }
  };

  return {
    isCheckedIn,
    loading,
    refreshCheckinStatus
  };
};
