import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Download, Loader2, ChevronDown, ChevronUp, Copy, Save, X, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from "@/utils/logger";

interface Registration {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  grade: string;
  school_name: string;
  school_name_other: string;
  hackathons_attended: number;
  dietary_restrictions: string;
  dietary_restrictions_other: string;
  registered_at: string;
  checked_in: boolean;
}

interface EditingRegistration extends Registration {
  isEditing?: boolean;
}

const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked-in' | 'not-checked-in'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRegistrations, setEditingRegistrations] = useState<{ [key: string]: EditingRegistration }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [deletingRegistration, setDeletingRegistration] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRegistrations();
  }, []);

  useEffect(() => {
    let filtered = registrations;
    
    // Apply search filter
    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.toLowerCase().replace(/[-\s]/g, '');
      
      filtered = filtered.filter(reg => {
        // Normalize all searchable fields by removing dashes and spaces
        const normalizedName = reg.full_name.toLowerCase().replace(/[-\s]/g, '');
        const normalizedEmail = reg.email.toLowerCase().replace(/[-\s]/g, '');
        const normalizedSchoolName = reg.school_name.toLowerCase().replace(/[-\s]/g, '');
        const normalizedSchoolOther = reg.school_name_other ? reg.school_name_other.toLowerCase().replace(/[-\s]/g, '') : '';
        
        return normalizedName.includes(normalizedSearchTerm) ||
               normalizedEmail.includes(normalizedSearchTerm) ||
               normalizedSchoolName.includes(normalizedSearchTerm) ||
               normalizedSchoolOther.includes(normalizedSearchTerm);
      });
    }
    
    // Apply check-in filter
    if (checkInFilter === 'checked-in') {
      filtered = filtered.filter(reg => reg.checked_in);
    } else if (checkInFilter === 'not-checked-in') {
      filtered = filtered.filter(reg => !reg.checked_in);
    }
    
    setFilteredRegistrations(filtered);
  }, [searchTerm, checkInFilter, registrations]);

  const toggleRowExpansion = (registrationId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(registrationId)) {
      newExpandedRows.delete(registrationId);
    } else {
      newExpandedRows.add(registrationId);
    }
    setExpandedRows(newExpandedRows);
  };

  const isRowExpanded = (registrationId: string) => {
    return expandedRows.has(registrationId);
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const shouldShowExpandButton = (text: string, maxLength: number = 30) => {
    return text.length > maxLength;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const startEditing = (registration: Registration) => {
    setEditingRegistrations(prev => ({
      ...prev,
      [registration.id]: { ...registration, isEditing: true }
    }));
  };

  const cancelEditing = (registrationId: string) => {
    setEditingRegistrations(prev => {
      const newState = { ...prev };
      delete newState[registrationId];
      return newState;
    });
  };

  const updateEditingField = (registrationId: string, field: keyof Registration, value: string | number) => {
    setEditingRegistrations(prev => ({
      ...prev,
      [registrationId]: {
        ...prev[registrationId],
        [field]: value
      }
    }));
  };

  const saveRegistration = async (registrationId: string) => {
    const editingRegistration = editingRegistrations[registrationId];
    if (!editingRegistration) return;

    setSaving(prev => ({ ...prev, [registrationId]: true }));

    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          full_name: editingRegistration.full_name,
          email: editingRegistration.email,
          grade: editingRegistration.grade,
          school_name: editingRegistration.school_name,
          school_name_other: editingRegistration.school_name_other,
          hackathons_attended: editingRegistration.hackathons_attended,
          dietary_restrictions: editingRegistration.dietary_restrictions,
          dietary_restrictions_other: editingRegistration.dietary_restrictions_other
        })
        .eq('id', registrationId);

      if (error) throw error;

      // Update the main registrations state
      setRegistrations(prev => 
        prev.map(reg => 
          reg.id === registrationId 
            ? { ...editingRegistration, isEditing: false }
            : reg
        )
      );

      // Remove from editing state
      setEditingRegistrations(prev => {
        const newState = { ...prev };
        delete newState[registrationId];
        return newState;
      });
    } catch (error) {
      logger.error('Error saving registration:', error);
    } finally {
      setSaving(prev => ({ ...prev, [registrationId]: false }));
    }
  };

  const deleteRegistration = async (registrationId: string, userEmail: string) => {
    setDeletingRegistration(registrationId);

    try {
      // Delete only the registration data
      const { error: regError } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registrationId);

      if (regError) {
        throw regError;
      }

      toast({
        title: "Registration Removed",
        description: `${userEmail}'s registration has been deleted. Their account remains intact.`,
      });

      // Reload registrations list
      loadRegistrations();
    } catch (error: any) {
      logger.error('Error deleting registration:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete registration",
        variant: "destructive",
      });
    } finally {
      setDeletingRegistration(null);
    }
  };

  const toggleCheckInStatus = async (registrationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ checked_in: !currentStatus } as any)
        .eq('id', registrationId);

      if (error) throw error;

      // Update the local state
      setRegistrations(prev => 
        prev.map(reg => 
          reg.id === registrationId 
            ? { ...reg, checked_in: !currentStatus }
            : reg
        )
      );
      setFilteredRegistrations(prev => 
        prev.map(reg => 
          reg.id === registrationId 
            ? { ...reg, checked_in: !currentStatus }
            : reg
        )
      );

      toast({
        title: "Check-in Status Updated",
        description: `Participant ${!currentStatus ? 'checked in' : 'check-in removed'} successfully.`,
      });
    } catch (error: any) {
      logger.error('Error updating check-in status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update check-in status",
        variant: "destructive",
      });
    }
  };



  const loadRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw error;

      // Handle cases where checked_in field might not exist yet
      const registrationsWithCheckedIn = (data || []).map(reg => ({
        ...reg,
        checked_in: (reg as any).checked_in ?? false
      }));

      setRegistrations(registrationsWithCheckedIn);
      setFilteredRegistrations(registrationsWithCheckedIn);
    } catch (error) {
      logger.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Helper function to escape CSV fields
    const escapeCSVField = (field: any): string => {
      if (field === null || field === undefined) {
        return '';
      }
      const stringField = String(field);
      // If field contains comma, quote, or newline, wrap it in quotes and escape internal quotes
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
        return '"' + stringField.replace(/"/g, '""') + '"';
      }
      return stringField;
    };

    const headers = [
      'Name', 'Email', 'Grade', 'School', 'Hackathons Attended', 
      'Dietary Restrictions', 'Checked In', 'Registration Date'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredRegistrations.map(reg => [
        escapeCSVField(reg.full_name),
        escapeCSVField(reg.email),
        escapeCSVField(reg.grade),
        escapeCSVField(reg.school_name === 'other' ? reg.school_name_other : reg.school_name),
        escapeCSVField(reg.hackathons_attended),
        escapeCSVField(reg.dietary_restrictions === 'other' ? reg.dietary_restrictions_other : reg.dietary_restrictions),
        escapeCSVField(reg.checked_in ? 'Yes' : 'No'),
        escapeCSVField(format(new Date(reg.registered_at), 'yyyy-MM-dd HH:mm:ss'))
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hack-the-ridge-registrations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getGradeDisplay = (grade: string) => {
    const gradeMap: { [key: string]: string } = {
      'elementary-6-8': 'Elementary 6-8',
      '9': 'Grade 9',
      '10': 'Grade 10',
      '11': 'Grade 11',
      '12': 'Grade 12'
    };
    return gradeMap[grade] || grade;
  };

  const getSchoolDisplay = (registration: Registration) => {
    if (registration.school_name === 'other') {
      return registration.school_name_other || 'Other';
    }
    const schoolMap: { [key: string]: string } = {
      'iroquois-ridge-high-school': 'Iroquois Ridge High School',
      'white-oaks-secondary-school': 'White Oaks Secondary School',
      'abbey-park-high-school': 'Abbey Park High School',
      'oakville-trafalgar-high-school': 'Oakville Trafalgar High School',
      'ta-blakelock-high-school': 'TA Blakelock High School',
      'garth-webb-secondary-school': 'Garth Webb Secondary School',
      'joshua-creek-public-school': 'Joshua Creek Public School',
      'falgarwood-public-school': 'Falgarwood Public School',
      'wh-morden-public-school': 'W.H. Morden Public School',
      'munns-public-school': 'Munn\'s Public School'
    };
    return schoolMap[registration.school_name] || registration.school_name;
  };

  const getDietaryDisplay = (registration: Registration) => {
    if (registration.dietary_restrictions === 'other') {
      return registration.dietary_restrictions_other || 'Other';
    }
    const dietaryMap: { [key: string]: string } = {
      'none': 'None',
      'vegetarian': 'Vegetarian',
      'vegan': 'Vegan',
      'kosher': 'Kosher',
      'gluten-free': 'Gluten Free',
      'halal': 'Halal'
    };
    return dietaryMap[registration.dietary_restrictions] || registration.dietary_restrictions;
  };

  const renderEditableField = (registration: Registration, field: keyof Registration, label: string, type: 'text' | 'number' | 'select' = 'text', options?: { value: string; label: string }[]) => {
    const isEditing = editingRegistrations[registration.id]?.isEditing;
    const editingRegistration = editingRegistrations[registration.id];
    const currentValue = isEditing ? editingRegistration[field] : registration[field];
    const displayValue = field === 'grade' ? getGradeDisplay(currentValue as string) :
                        field === 'school_name' ? getSchoolDisplay(registration) :
                        field === 'dietary_restrictions' ? getDietaryDisplay(registration) :
                        currentValue;

    // Check if we need to show custom input for "other" options
    const showCustomInput = isEditing && 
      ((field === 'school_name' && currentValue === 'other') ||
       (field === 'dietary_restrictions' && currentValue === 'other'));

    const customField = field === 'school_name' ? 'school_name_other' : 'dietary_restrictions_other';
    const customValue = isEditing ? editingRegistration[customField] : registration[customField];

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            {isEditing ? (
              type === 'select' && options ? (
                <Select
                  value={currentValue as string}
                  onValueChange={(value) => updateEditingField(registration.id, field, value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={type}
                  value={currentValue as string}
                  onChange={(e) => updateEditingField(registration.id, field, type === 'number' ? parseInt(e.target.value) : e.target.value)}
                  className="text-sm"
                />
              )
            ) : (
              <div className="p-2 bg-background border rounded text-sm font-mono">
                {displayValue}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(displayValue as string)}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Show custom input field when "other" is selected */}
        {showCustomInput && (
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                type="text"
                value={customValue || ''}
                onChange={(e) => updateEditingField(registration.id, customField, e.target.value)}
                placeholder={`Enter custom ${field === 'school_name' ? 'school name' : 'dietary restriction'}`}
                className="text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(customValue || '')}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Participant Registrations</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Users className="w-5 h-5" />
              <span>Participant Registrations</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Manage and export participant registration data
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
              {filteredRegistrations.filter(reg => reg.checked_in).length} checked in
            </Badge>
            <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1">
              {filteredRegistrations.length} participants
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={checkInFilter} onValueChange={(value: 'all' | 'checked-in' | 'not-checked-in') => setCheckInFilter(value)}>
              <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
                <SelectValue placeholder="Filter by check-in status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Participants</SelectItem>
                <SelectItem value="checked-in">Checked In</SelectItem>
                <SelectItem value="not-checked-in">Not Checked In</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center justify-center space-x-2 min-h-[44px] w-full sm:w-auto"
              disabled={filteredRegistrations.length === 0}
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {filteredRegistrations.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No registrations match your search.' : 'No registrations yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-lg overflow-x-auto">
              <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Checked In</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Hackathons</TableHead>
                  <TableHead>Dietary</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((registration) => (
                  <React.Fragment key={registration.id}>
                    <TableRow className={registration.checked_in ? "bg-green-50 dark:bg-green-950/20" : ""}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={registration.checked_in}
                            onCheckedChange={() => toggleCheckInStatus(registration.id, registration.checked_in)}
                            className="w-5 h-5"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {truncateText(registration.full_name, 25)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {truncateText(registration.email, 25)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getGradeDisplay(registration.grade)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {truncateText(getSchoolDisplay(registration), 20)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {registration.hackathons_attended}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {truncateText(getDietaryDisplay(registration), 15)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(registration.registered_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(registration.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isRowExpanded(registration.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isRowExpanded(registration.id) && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/50">
                          <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                              <h4 className="text-base sm:text-lg font-semibold">Participant Details</h4>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const details = `Name: ${registration.full_name}\nEmail: ${registration.email}\nGrade: ${getGradeDisplay(registration.grade)}\nSchool: ${getSchoolDisplay(registration)}\nHackathons Attended: ${registration.hackathons_attended}\nDietary Restrictions: ${getDietaryDisplay(registration)}\nCheck-in Status: ${registration.checked_in ? 'Checked In' : 'Not Checked In'}\nRegistration Date: ${format(new Date(registration.registered_at), 'MMM d, yyyy')}`;
                                    navigator.clipboard.writeText(details);
                                  }}
                                >
                                  Copy All
                                </Button>
                                {editingRegistrations[registration.id]?.isEditing ? (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => saveRegistration(registration.id)}
                                      disabled={saving[registration.id]}
                                    >
                                      {saving[registration.id] ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Save className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => cancelEditing(registration.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditing(registration)}
                                  >
                                    Edit
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={deletingRegistration === registration.id}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      {deletingRegistration === registration.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Registration</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete <strong>{registration.full_name}</strong>'s registration?
                                        <br /><br />
                                        This action will:
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                          <li>Remove their registration data from the event</li>
                                          <li>Keep their account intact (they can still log in)</li>
                                          <li>Allow them to register again if needed</li>
                                          <li>This action cannot be undone</li>
                                        </ul>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteRegistration(registration.id, registration.email)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete Registration
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:gap-6">
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                  {renderEditableField(registration, 'full_name', 'Full Name')}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                                  {renderEditableField(registration, 'email', 'Email Address')}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Grade Level</label>
                                  {renderEditableField(registration, 'grade', 'Grade Level', 'select', [
                                    { value: 'elementary-6-8', label: 'Elementary 6-8' },
                                    { value: '9', label: 'Grade 9' },
                                    { value: '10', label: 'Grade 10' },
                                    { value: '11', label: 'Grade 11' },
                                    { value: '12', label: 'Grade 12' }
                                  ])}
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">School</label>
                                  {renderEditableField(registration, 'school_name', 'School', 'select', [
                                    { value: 'iroquois-ridge-high-school', label: 'Iroquois Ridge High School' },
                                    { value: 'white-oaks-secondary-school', label: 'White Oaks Secondary School' },
                                    { value: 'abbey-park-high-school', label: 'Abbey Park High School' },
                                    { value: 'oakville-trafalgar-high-school', label: 'Oakville Trafalgar High School' },
                                    { value: 'ta-blakelock-high-school', label: 'TA Blakelock High School' },
                                    { value: 'garth-webb-secondary-school', label: 'Garth Webb Secondary School' },
                                    { value: 'joshua-creek-public-school', label: 'Joshua Creek Public School' },
                                    { value: 'falgarwood-public-school', label: 'Falgarwood Public School' },
                                    { value: 'wh-morden-public-school', label: 'W.H. Morden Public School' },
                                    { value: 'munns-public-school', label: 'Munn\'s Public School' },
                                    { value: 'other', label: 'Other' }
                                  ])}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Hackathons Attended</label>
                                  {renderEditableField(registration, 'hackathons_attended', 'Hackathons Attended', 'number')}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Dietary Restrictions</label>
                                  {renderEditableField(registration, 'dietary_restrictions', 'Dietary Restrictions', 'select', [
                                    { value: 'none', label: 'None' },
                                    { value: 'vegetarian', label: 'Vegetarian' },
                                    { value: 'vegan', label: 'Vegan' },
                                    { value: 'kosher', label: 'Kosher' },
                                    { value: 'gluten-free', label: 'Gluten Free' },
                                    { value: 'halal', label: 'Halal' },
                                    { value: 'other', label: 'Other' }
                                  ])}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 p-2 bg-background border rounded text-sm">
                                  {format(new Date(registration.registered_at), 'MMMM d, yyyy \'at\' HH:mm')}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(format(new Date(registration.registered_at), 'MMMM d, yyyy \'at\' HH:mm'))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Check-in Status</label>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 p-2 bg-background border rounded text-sm flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={registration.checked_in}
                                      onCheckedChange={() => toggleCheckInStatus(registration.id, registration.checked_in)}
                                      className="w-4 h-4"
                                    />
                                    <span className={registration.checked_in ? "text-green-600 font-medium" : "text-gray-500"}>
                                      {registration.checked_in ? 'Checked In' : 'Not Checked In'}
                                    </span>
                                  </div>
                                  {registration.checked_in && (
                                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      ✓ Present
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(registration.checked_in ? 'Checked In' : 'Not Checked In')}
                                  className="h-8 w-8 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredRegistrations.map((registration) => (
              <Card key={registration.id} className={registration.checked_in ? "border-green-500" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={registration.checked_in}
                        onCheckedChange={() => toggleCheckInStatus(registration.id, registration.checked_in)}
                        className="mt-1"
                      />
                      <div>
                        <CardTitle className="text-base">{registration.full_name}</CardTitle>
                        <CardDescription className="text-xs">{registration.email}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(registration.id)}
                      className="h-8 w-8 p-0"
                    >
                      {isRowExpanded(registration.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Grade:</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {getGradeDisplay(registration.grade)}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hackathons:</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {registration.hackathons_attended}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">School:</span>
                      <span className="ml-2 text-xs">{getSchoolDisplay(registration)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Dietary:</span>
                      <span className="ml-2 text-xs">{getDietaryDisplay(registration)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Registered:</span>
                      <span className="ml-2 text-xs">{format(new Date(registration.registered_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  
                  {isRowExpanded(registration.id) && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const details = `Name: ${registration.full_name}\nEmail: ${registration.email}\nGrade: ${getGradeDisplay(registration.grade)}\nSchool: ${getSchoolDisplay(registration)}\nHackathons Attended: ${registration.hackathons_attended}\nDietary Restrictions: ${getDietaryDisplay(registration)}\nCheck-in Status: ${registration.checked_in ? 'Checked In' : 'Not Checked In'}\nRegistration Date: ${format(new Date(registration.registered_at), 'MMM d, yyyy')}`;
                            navigator.clipboard.writeText(details);
                          }}
                          className="flex-1"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy All
                        </Button>
                        {editingRegistrations[registration.id]?.isEditing ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => saveRegistration(registration.id)}
                              disabled={saving[registration.id]}
                            >
                              {saving[registration.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelEditing(registration.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(registration)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingRegistration === registration.id}
                              className="text-destructive"
                            >
                              {deletingRegistration === registration.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Registration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{registration.full_name}</strong>'s registration?
                                <br /><br />
                                This action will:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Remove their registration data from the event</li>
                                  <li>Keep their account intact (they can still log in)</li>
                                  <li>Allow them to register again if needed</li>
                                  <li>This action cannot be undone</li>
                                </ul>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRegistration(registration.id, registration.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Registration
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      {editingRegistrations[registration.id]?.isEditing && (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Full Name</Label>
                            <Input
                              value={editingRegistrations[registration.id].full_name}
                              onChange={(e) => updateEditingField(registration.id, 'full_name', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Email</Label>
                            <Input
                              value={editingRegistrations[registration.id].email}
                              onChange={(e) => updateEditingField(registration.id, 'email', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Grade</Label>
                            <Select
                              value={editingRegistrations[registration.id].grade}
                              onValueChange={(value) => updateEditingField(registration.id, 'grade', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="elementary-6-8">Elementary 6-8</SelectItem>
                                <SelectItem value="9">Grade 9</SelectItem>
                                <SelectItem value="10">Grade 10</SelectItem>
                                <SelectItem value="11">Grade 11</SelectItem>
                                <SelectItem value="12">Grade 12</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminRegistrations;