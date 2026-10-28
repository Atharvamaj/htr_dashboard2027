import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, UserPlus, Lock, Mail, Info } from 'lucide-react';
import { getRegistrationStatus } from '@/lib/registration-utils';
import { validateRegistrationForm, safeStorage, withRetry, type RegistrationData } from '@/lib/form-utils';
import { logger } from "@/utils/logger";
import EventDetailsDialog from '@/components/EventDetailsDialog';

const RegistrationForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [showEventInfo, setShowEventInfo] = useState(false);
  const formStateKey = `registration_draft_${user?.id || 'anonymous'}`;
  const hasLoadedFromServer = useRef(false);
  const isUserTyping = useRef(false);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const isDialogOpen = useRef(false);
  const [formData, setFormData] = useState(() => {
    // Try to load from localStorage first
    const saved = safeStorage.getObject<RegistrationData>(formStateKey);
    if (saved) {
      return saved;
    }
    return {
      full_name: '',
      grade: '',
      school_name: '',
      hackathons_attended: '',
      dietary_restrictions: '',
      school_name_other: '',
      dietary_restrictions_other: '',
    };
  });

  // Auto-save form data to localStorage whenever it changes
  const saveFormDraft = useCallback(() => {
    if (user?.id) {
      safeStorage.setObject(formStateKey, formData);
    }
  }, [formData, formStateKey, user?.id]);

  // Save draft whenever form data changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(saveFormDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [saveFormDraft]);

  useEffect(() => {
    if (user && !hasLoadedFromServer.current) {
      checkRegistrationStatus();
      checkSystemRegistrationStatus();
      hasLoadedFromServer.current = true;
    }
  }, [user]);

  // Separate effect for real-time updates to prevent form resets
  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time changes in system_config
    const systemConfigChannel = supabase
      .channel('system_config_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config',
          filter: 'key=eq.registration_open'
        },
        (payload) => {
          // Only refresh if user isn't actively typing or dialog is open
          if (!isUserTyping.current && !isDialogOpen.current) {
            setTimeout(() => checkSystemRegistrationStatus(), 1000);
          }
        }
      )
      .subscribe();

    // Fallback: Poll for registration status changes very infrequently
    // Reduced frequency to prevent interference with form filling
    const pollInterval = setInterval(() => {
      // Only check status if user isn't actively interacting with the form or dialog is open
      if (!isUserTyping.current && !isDialogOpen.current) {
        checkSystemRegistrationStatus();
      }
    }, 300000); // Check every 5 minutes (300 seconds) to be very conservative

    // Also check when the window regains focus (user returns to tab)
    // But avoid checking while user is actively typing or dialog is open
    const handleWindowFocus = () => {
      if (!isUserTyping.current && !isDialogOpen.current) {
        setTimeout(() => checkSystemRegistrationStatus(), 2000); // Increased delay
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && !isUserTyping.current && !isDialogOpen.current) {
        setTimeout(() => checkSystemRegistrationStatus(), 3000); // Increased delay
      }
    };
    
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(systemConfigChannel);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up typing timeout
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, [user?.id]); // Only depend on user.id to prevent unnecessary re-runs

  const checkSystemRegistrationStatus = async () => {
    // Don't show checking status for background polling
    const wasPolling = !checkingStatus;
    
    // Debug: Log when status check occurs
    logger.log('Registration status check:', {
      isUserTyping: isUserTyping.current,
      isDialogOpen: isDialogOpen.current,
      wasPolling,
      timestamp: new Date().toISOString()
    });
    
    // Skip status check if user is actively typing or dialog is open
    if (isUserTyping.current || isDialogOpen.current) {
      logger.log('Skipping registration status check - user is typing or dialog is open');
      return;
    }
    
    if (!wasPolling) {
      setCheckingStatus(true);
    }
    
    try {
      const isOpen = await getRegistrationStatus();
      // Only update if the status actually changed to prevent unnecessary re-renders
      if (isOpen !== registrationOpen) {
        logger.log('Registration status changed:', { from: registrationOpen, to: isOpen });
        setRegistrationOpen(isOpen);
      }
    } catch (error) {
      // Only update if status is different to prevent unnecessary re-renders
      if (registrationOpen !== false) {
        logger.log('Registration status error, closing registration');
        setRegistrationOpen(false); // Default to closed for safety
      }
    } finally {
      if (!wasPolling) {
        setCheckingStatus(false);
      }
    }
  };

  const checkRegistrationStatus = async () => {
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setIsRegistered(true);
      // Only update form data if we haven't loaded from server yet or if form is empty
      const isFormEmpty = Object.values(formData).every(value => !value.trim());
      if (!hasLoadedFromServer.current || isFormEmpty) {
        const serverData = {
          full_name: data.full_name || '',
          grade: data.grade || '',
          school_name: data.school_name || '',
          hackathons_attended: data.hackathons_attended?.toString() || '',
          dietary_restrictions: data.dietary_restrictions || '',
          school_name_other: data.school_name_other || '',
          dietary_restrictions_other: data.dietary_restrictions_other || '',
        };
        setFormData(serverData);
        // Clear the draft since we have server data
        safeStorage.removeItem(formStateKey);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data first
    const validation = validateRegistrationForm(formData);
    if (!validation.isValid) {
      toast({
        title: "Form Validation Error",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }
    
    // Check if registration is still open before allowing submission
    const isOpen = await getRegistrationStatus();
    if (!isOpen) {
      toast({
        title: "Registration Closed",
        description: "Registration is currently closed. Please contact hi@hacktheridge.ca for additional inquiries.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        user_id: user?.id,
        email: user?.email,
        full_name: formData.full_name,
        grade: formData.grade,
        school_name: formData.school_name,
        hackathons_attended: parseInt(formData.hackathons_attended) || 0,
        dietary_restrictions: formData.dietary_restrictions,
        school_name_other: formData.school_name_other,
        dietary_restrictions_other: formData.dietary_restrictions_other,
      };

      await withRetry(async () => {
        if (isRegistered) {
          const { error } = await supabase
            .from('registrations')
            .update(registrationData)
            .eq('user_id', user?.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('registrations')
            .insert([registrationData]);

          if (error) throw error;
          
          setIsRegistered(true);
        }
      }, 3, 1000, (attempt, error) => {
        logger.warn(`Registration attempt ${attempt} failed:`, error.message);
        toast({
          title: `Attempt ${attempt} failed`,
          description: `Retrying registration... (${error.message})`,
          variant: "default",
        });
      });

      // Show event details dialog
      setIsNewRegistration(!isRegistered);
      isDialogOpen.current = true;
      setShowEventDetailsDialog(true);
      
      // Clear the draft after successful registration
      safeStorage.removeItem(formStateKey);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      // Keep the draft in case user wants to retry
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Mark user as actively typing
    isUserTyping.current = true;
    
    // Clear any existing timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    // Set a timeout to mark typing as finished after 10 seconds of inactivity
    // This prevents status checks from running while user is actively filling the form
    typingTimeout.current = setTimeout(() => {
      isUserTyping.current = false;
    }, 10000); // Increased from 3 seconds to 10 seconds
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Show loading state while checking registration status
  if (checkingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Show registration closed message
  if (!registrationOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-orange-600" />
            <span>Registration Closed</span>
          </CardTitle>
          <CardDescription>
            Registration is currently closed and participants cannot register or edit their registration details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Have additional inquiries?</p>
                <p className="text-sm text-muted-foreground">
                  Please email us at{' '}
                  <a 
                    href="mailto:hi@hacktheridge.ca" 
                    className="text-primary hover:underline"
                  >
                    hi@hacktheridge.ca
                  </a>
                </p>
              </div>
            </div>
          </div>
          {isRegistered && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-medium text-green-800 dark:text-green-200">
                  You are already registered for Hack the Ridge!
                </p>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your registration is saved and you're all set for the event. You cannot modify your registration while registration is closed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // At this point, registrationOpen is true, so show the form
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2">
              {isRegistered ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              <span>
                {isRegistered ? 'Update Registration' : 'Register for Hack the Ridge'}
              </span>
            </CardTitle>
            <CardDescription className="mt-1.5">
              {isRegistered 
                ? 'Update your registration details below.'
                : 'Complete your registration to participate in the hackathon.'
              }
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowEventInfo(true);
              isDialogOpen.current = true;
            }}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Event Info</span>
          </Button>
        </div>
      </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  maxLength={35}
                  required
                  disabled={loading || checkingStatus}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grade">Grade *</Label>
                <Select value={formData.grade} onValueChange={(value) => handleInputChange('grade', value)} disabled={loading || checkingStatus}>
                  <SelectTrigger disabled={loading || checkingStatus}>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elementary-6-8">Elementary 6-8</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="11">11</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school_name">School Name *</Label>
                <Select value={formData.school_name} onValueChange={(value) => handleInputChange('school_name', value)} disabled={loading || checkingStatus}>
                  <SelectTrigger disabled={loading || checkingStatus}>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iroquois-ridge-high-school">Iroquois Ridge High School</SelectItem>
                    <SelectItem value="white-oaks-secondary-school">White Oaks Secondary School</SelectItem>
                    <SelectItem value="abbey-park-high-school">Abbey Park High School</SelectItem>
                    <SelectItem value="oakville-trafalgar-high-school">Oakville Trafalgar High School</SelectItem>
                    <SelectItem value="ta-blakelock-high-school">TA Blakelock High School</SelectItem>
                    <SelectItem value="garth-webb-secondary-school">Garth Webb Secondary School</SelectItem>
                    <SelectItem value="joshua-creek-public-school">Joshua Creek Public School</SelectItem>
                    <SelectItem value="falgarwood-public-school">Falgarwood Public School</SelectItem>
                    <SelectItem value="wh-morden-public-school">W.H. Morden Public School</SelectItem>
                    <SelectItem value="munns-public-school">Munn's Public School</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.school_name === 'other' && (
                  <Input
                    placeholder="Enter your school name"
                    value={formData.school_name_other || ''}
                    onChange={(e) => handleInputChange('school_name_other', e.target.value)}
                    maxLength={40}
                    className="mt-2"
                    disabled={loading || checkingStatus}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="hackathons_attended">Number of Hackathons Attended *</Label>
                <Input
                  id="hackathons_attended"
                  type="number"
                  min="0"
                  value={formData.hackathons_attended}
                  onChange={(e) => handleInputChange('hackathons_attended', e.target.value)}
                  required
                  disabled={loading || checkingStatus}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dietary_restrictions">Dietary Restrictions *</Label>
                <Select value={formData.dietary_restrictions} onValueChange={(value) => handleInputChange('dietary_restrictions', value)} disabled={loading || checkingStatus}>
                  <SelectTrigger disabled={loading || checkingStatus}>
                    <SelectValue placeholder="Select dietary restrictions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="kosher">Kosher</SelectItem>
                    <SelectItem value="gluten-free">Gluten Free</SelectItem>
                    <SelectItem value="halal">Halal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.dietary_restrictions === 'other' && (
                  <Input
                    placeholder="Please specify dietary restrictions"
                    value={formData.dietary_restrictions_other || ''}
                    onChange={(e) => handleInputChange('dietary_restrictions_other', e.target.value)}
                    maxLength={40}
                    className="mt-2"
                    disabled={loading || checkingStatus}
                  />
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-primary text-white min-h-[44px]"
              disabled={loading || !registrationOpen || checkingStatus}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRegistered ? 'Updating...' : 'Registering...'}
                </>
              ) : checkingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking status...
                </>
              ) : (
                isRegistered ? 'Update Registration' : 'Complete Registration'
              )}
            </Button>
        </form>
      </CardContent>

      {/* Event Details Dialog - After Registration */}
      <EventDetailsDialog
        open={showEventDetailsDialog}
        onOpenChange={(open) => {
          setShowEventDetailsDialog(open);
          isDialogOpen.current = open;
        }}
        showCongratulations={true}
        isUpdate={!isNewRegistration}
      />

      {/* Event Details Dialog - Info Button */}
      <EventDetailsDialog
        open={showEventInfo}
        onOpenChange={(open) => {
          setShowEventInfo(open);
          isDialogOpen.current = open;
        }}
        showCongratulations={false}
      />
    </Card>
  );
};

export default RegistrationForm;
