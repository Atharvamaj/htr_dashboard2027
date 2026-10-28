import { supabase } from '@/integrations/supabase/client';

export const getRegistrationStatus = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('key', 'registration_open')
      .single();

    if (error) {
      // If no row found, registration is closed by default
      if (error.code === 'PGRST116') {
        return false;
      }
      
      // For other errors, also default to closed - safer approach
      return false;
    }

    if (!data) {
      return false;
    }

    // Handle JSONB value - it could be a boolean or string 'true'/'false'
    const value = data.value;
    
    // Handle different possible formats
    let isOpen = false;
    if (typeof value === 'boolean') {
      isOpen = value;
    } else if (typeof value === 'string') {
      isOpen = value.toLowerCase() === 'true';
    } else if (value === true || value === 'true') {
      isOpen = true;
    }
    
    return isOpen;
  } catch (error) {
    // Default to closed if there's an error - safer approach
    return false;
  }
};
