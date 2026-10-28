import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Loader2, Trash2, UserX, Shield, Mail, Download } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from "@/utils/logger";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  full_name: string | null;
  has_registration: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminsOnly, setShowAdminsOnly] = useState(false);
  const [showRegularUsersOnly, setShowRegularUsersOnly] = useState(false);
  const [showAccountOnlyUsers, setShowAccountOnlyUsers] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply role filters
    if (showAdminsOnly && !showRegularUsersOnly) {
      filtered = filtered.filter(user => user.is_admin);
    } else if (showRegularUsersOnly && !showAdminsOnly) {
      filtered = filtered.filter(user => !user.is_admin);
    }
    // If both are checked or both are unchecked, show all users (no filter)

    // Apply account-only filter (users with account but no registration)
    if (showAccountOnlyUsers) {
      filtered = filtered.filter(user => !user.has_registration);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, users, showAdminsOnly, showRegularUsersOnly, showAccountOnlyUsers]);

  const loadUsers = async () => {
    try {
      logger.log('AdminUsers: Loading users using custom function...');
      
      // Use our custom function instead of auth.admin API
      const { data: users, error } = await supabase
        .rpc('get_all_users_for_admin');
      
      if (error) {
        logger.error('Error loading users with RPC:', error);
        throw error;
      }

      // Fetch registration data for all users
      const userIds = (users || []).map((u: any) => u.id);
      const { data: registrations } = await supabase
        .from('registrations')
        .select('user_id')
        .in('user_id', userIds);

      const registeredUserIds = new Set((registrations || []).map(r => r.user_id));

      logger.log('AdminUsers: Users loaded successfully', {
        count: users?.length || 0,
        users: users?.slice(0, 3).map(u => ({ email: u.email, is_admin: u.is_admin }))
      });

      const usersData = (users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,  // Now comes as TEXT from function
        last_sign_in_at: user.last_sign_in_at,  // Now comes as TEXT
        is_admin: user.is_admin || false,
        full_name: user.full_name || 'No name',
        has_registration: registeredUserIds.has(user.id)
      }));

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      logger.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Make sure you're logged in as an admin.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    setDeletingUser(userId);

    try {
      // Call the database function to completely remove the user
      const { data, error } = await (supabase as any)
        .rpc('delete_user_completely', {
          user_id_to_delete: userId
        });

      if (error) {
        logger.error('Error calling delete function:', error);
        throw error;
      }

      // Check the result from the function
      const result = data as string;
      if (result && typeof result === 'string') {
        if (result.includes('Error:')) {
          throw new Error(result);
        } else {
          toast({
            title: "User Completely Removed",
            description: result,
          });
        }
      } else {
        toast({
          title: "User Removed",
          description: `${userEmail} has been completely removed from the system.`,
        });
      }

      // Reload users list
      loadUsers();
    } catch (error: any) {
      logger.error('Error deleting user:', error);
      
      // Fallback to manual deletion if the function fails
      try {
        // Delete user registration
        const { error: regError } = await supabase
          .from('registrations')
          .delete()
          .eq('user_id', userId);

        // Delete user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', userId);

        if (!regError && !profileError) {
          toast({
            title: "User Data Removed",
            description: `${userEmail}'s registration and profile data have been deleted.`,
          });
          loadUsers();
        } else {
          throw error; // Re-throw the original error
        }
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete user data",
          variant: "destructive",
        });
      }
    } finally {
      setDeletingUser(null);
    }
  };

  const deleteRegistrationOnly = async (userId: string, userEmail: string) => {
    setDeletingUser(userId);
  
    try {
      // Delete only the registration data
      const { error: regError } = await supabase
        .from('registrations')
        .delete()
        .eq('user_id', userId);
  
      if (regError) {
        throw regError;
      }
  
      toast({
        title: "Registration Removed",
        description: `${userEmail}'s registration data has been deleted. Their account remains intact.`,
      });
  
      // Reload users list
      loadUsers();
    } catch (error: any) {
      logger.error('Error deleting registration:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete registration data",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(null);
    }
  };

  const exportToCSV = () => {
    if (filteredUsers.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no users matching your current filters.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV header
    const headers = ['Email', 'Full Name', 'Role', 'Has Registration', 'Joined Date', 'Last Sign In'];
    
    // Create CSV rows
    const rows = filteredUsers.map(user => [
      user.email,
      user.full_name || 'No name',
      user.is_admin ? 'Admin' : 'User',
      user.has_registration ? 'Yes' : 'No',
      user.created_at ? format(new Date(user.created_at), 'yyyy-MM-dd') : 'Unknown',
      user.last_sign_in_at && user.last_sign_in_at !== 'null'
        ? format(new Date(user.last_sign_in_at), 'yyyy-MM-dd')
        : 'Never'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `users-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${filteredUsers.length} user(s) to CSV.`,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <Users className="w-5 h-5" />
            <span>User Management</span>
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
              <span>User Management</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Manage user accounts and permissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1">
              {filteredUsers.length} users
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="admins-only"
              checked={showAdminsOnly}
              onCheckedChange={(checked) => setShowAdminsOnly(checked as boolean)}
            />
            <label
              htmlFor="admins-only"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Admins only
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="regular-users-only"
              checked={showRegularUsersOnly}
              onCheckedChange={(checked) => setShowRegularUsersOnly(checked as boolean)}
            />
            <label
              htmlFor="regular-users-only"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Regular users only
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="account-only-users"
              checked={showAccountOnlyUsers}
              onCheckedChange={(checked) => setShowAccountOnlyUsers(checked as boolean)}
            />
            <label
              htmlFor="account-only-users"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Account only (no registration)
            </label>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No users match your search.' : 'No users found.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-lg overflow-x-auto">
              <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_admin ? "default" : "secondary"}>
                        {user.is_admin ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          'User'
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.created_at 
                        ? format(new Date(user.created_at), 'MMM d, yyyy')
                        : 'Unknown'
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.last_sign_in_at && user.last_sign_in_at !== 'null'
                        ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingUser === user.id}
                              className="text-destructive hover:text-destructive"
                              title="Delete user completely"
                            >
                              {deletingUser === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserX className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove User Completely</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to completely remove <strong>{user.email}</strong> from the system?
                                <br /><br />
                                This action will:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Delete their registration data</li>
                                  <li>Delete their profile</li>
                                  <li>Remove their authentication account</li>
                                  <li>This action cannot be undone</li>
                                </ul>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(user.id, user.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove User Completely
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingUser === user.id}
                              className="text-orange-600 hover:text-orange-700"
                              title="Delete registration only"
                            >
                              {deletingUser === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Registration Only</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{user.email}</strong>'s registration only?
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
                                onClick={() => deleteRegistrationOnly(user.id, user.email)}
                                className="bg-orange-600 text-white hover:bg-orange-700"
                              >
                                Delete Registration Only
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{user.full_name || 'No name'}</CardTitle>
                      <CardDescription className="text-xs flex items-center mt-1">
                        <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={user.is_admin ? "default" : "secondary"} className="ml-2 flex-shrink-0">
                      {user.is_admin ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        'User'
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Joined:</span>
                      <div className="font-medium mt-1">
                        {user.created_at 
                          ? format(new Date(user.created_at), 'MMM d, yyyy')
                          : 'Unknown'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Sign In:</span>
                      <div className="font-medium mt-1">
                        {user.last_sign_in_at && user.last_sign_in_at !== 'null'
                          ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy')
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingUser === user.id}
                          className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          {deletingUser === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserX className="w-4 h-4 mr-1" />
                              <span>Remove User</span>
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove User Completely</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to completely remove <strong>{user.email}</strong> from the system?
                            <br /><br />
                            This action will:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>Delete their registration data</li>
                              <li>Delete their profile</li>
                              <li>Remove their authentication account</li>
                              <li>This action cannot be undone</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUser(user.id, user.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove User Completely
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingUser === user.id}
                          className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          {deletingUser === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              <span>Delete Reg</span>
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Registration Only</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>{user.email}</strong>'s registration only?
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
                            onClick={() => deleteRegistrationOnly(user.id, user.email)}
                            className="bg-orange-600 text-white hover:bg-orange-700"
                          >
                            Delete Registration Only
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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

export default AdminUsers;
