import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail } from 'lucide-react';
import htrLogo from '../assets/htr_logo_transparent.svg';
import { SimpleThemeToggle } from '@/components/theme-toggle';
import Attribution from '@/components/Attribution';
import FlappyBird from '@/components/FlappyBird';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Clear any stale auth data on mount
  useEffect(() => {
    const clearStaleAuth = async () => {
      try {
        // Clear any invalid session data
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Clear localStorage if no valid session
          const authKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key === 'supabase.auth.token'
          );
          authKeys.forEach(key => localStorage.removeItem(key));
        }
      } catch (error) {
        // If there's an error getting session, clear all auth data
        const authKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key === 'supabase.auth.token'
        );
        authKeys.forEach(key => localStorage.removeItem(key));
      }
    };
    
    clearStaleAuth();
  }, []);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Easter egg detection
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Check for exact easter egg phrase (case-sensitive)
    if (value === 'mangomustard6741') {
      setShowEasterEgg(true);
      setEmail(''); // Clear the input
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting || loading) {
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
    );

    try {
      // Race between the actual request and timeout
      const result = await Promise.race([
        supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          },
        }),
        timeoutPromise
      ]) as { error: any };

      if (result.error) throw result.error;

      setIsOtpSent(true);
      toast({
        title: "Code sent!",
        description: "Check your email for the 6-digit verification code.",
      });
    } catch (error: any) {
      let errorMessage = error.message || "Failed to send code";
      
      // Provide more helpful error messages
      if (error.message === 'Request timeout') {
        errorMessage = "The request timed out. Please check your internet connection and try again.";
      } else if (error.message?.includes('rate limit')) {
        errorMessage = "Too many attempts. Please wait a few minutes before trying again.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Error sending code",
        description: errorMessage,
        variant: "destructive",
      });
      // Only reset submitting state on error so user can retry
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsOtpSent(false);
    setOtp('');
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen gradient-subtle flex flex-col">
      {/* Theme toggle in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <SimpleThemeToggle />
      </div>
      
      {/* Main content area - flex-1 centers the card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md gradient-card border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <img src={htrLogo} alt="HTR Logo" className="mx-auto w-20 h-20 object-contain" />
          <div>
            <CardTitle className="text-2xl font-bold">Hack the Ridge</CardTitle>
            <CardDescription className="text-base">
              {isOtpSent ? 'Enter the 6-digit code sent to your email' : 'Sign in to access your dashboard'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  We'll send you a 6-digit verification code via email
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 gradient-primary text-white font-semibold"
                disabled={loading || isSubmitting || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send verification code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    maxLength={6}
                    render={({ slots }) => (
                      <InputOTPGroup>
                        {slots.map((slot, index) => (
                          <InputOTPSlot key={index} {...slot} />
                        ))}
                      </InputOTPGroup>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 gradient-primary text-white font-semibold"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify and sign in'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resetForm}
              >
                Use different email
              </Button>
            </form>
          )}
        </CardContent>
        </Card>
      </div>
      
      {/* Attribution at bottom */}
      <div className="pb-4">
        <Attribution />
      </div>

      {/* Easter egg game */}
      {showEasterEgg && (
        <FlappyBird onClose={() => setShowEasterEgg(false)} />
      )}
    </div>
  );
};

export default Auth;
