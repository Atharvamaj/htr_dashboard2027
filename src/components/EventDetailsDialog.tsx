import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, PartyPopper } from 'lucide-react';

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showCongratulations?: boolean;
  isUpdate?: boolean;
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({ 
  open, 
  onOpenChange,
  showCongratulations = false,
  isUpdate = false 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-w-[95vw] p-4 sm:p-6 gap-3">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            {showCongratulations ? (
              <>
                <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <span className="leading-tight">
                  {isUpdate ? 'Registration Updated!' : 'Congratulations!'}
                </span>
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <span className="leading-tight">Event Details</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {showCongratulations && !isUpdate
              ? "You're all set for Hack the Ridge!"
              : showCongratulations && isUpdate
              ? "Your registration has been updated."
              : "View important information about Hack the Ridge"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2.5">
          {/* Date & Time Combined */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/50 border">
              <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold text-xs text-muted-foreground">Date</h3>
                <p className="text-sm font-medium leading-tight">Dec 6, 2025</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/50 border">
              <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold text-xs text-muted-foreground">Time</h3>
                <p className="text-sm font-medium leading-tight">9 AM - 9 PM</p>
              </div>
            </div>
          </div>

          {/* Location Section - Compact */}
          <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/50 border">
            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs text-muted-foreground">Location</h3>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=Iroquois+Ridge+High+School,1123+Glenashton+Dr,Oakville,ON+L6H+5M1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium leading-tight text-primary hover:underline cursor-pointer block"
              >
                Iroquois Ridge High School
              </a>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=1123+Glenashton+Dr,Oakville,ON+L6H+5M1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary hover:underline mt-0.5 block"
              >
                1123 Glenashton Dr, Oakville, ON L6H 5M1
              </a>
            </div>
          </div>

          {/* Google Maps Embed - Smaller on mobile */}
          <div className="rounded-lg overflow-hidden border">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2896.8278754!2d-79.6904433!3d43.4474499!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b5e043f63a9a5%3A0x5b2f3d8f6d5d8c5a!2s1123%20Glenashton%20Dr%2C%20Oakville%2C%20ON%20L6H%205M1!5e0!3m2!1sen!2sca!4v1234567890123!5m2!1sen!2sca"
              width="100%"
              height="180"
              className="sm:h-[220px]"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Event Location Map"
            />
          </div>

          {/* Action Button */}
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full gradient-primary text-white mt-1"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;
