// Replace the inviteToTeam function in AdminTeams.tsx with this fixed version
// This function uses the new database functions to avoid 406 errors

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
    const errorMessages: string[] = [];

    for (const email of validEmails) {
      console.log('AdminTeams: Inviting user:', email);
      
      try {
        // Use the new create_team_invite function which handles all validation
        const { data: result, error: inviteError } = await supabase
          .rpc('create_team_invite', {
            p_team_id: teamId,
            p_inviter_id: team.leader_id,
            p_invitee_email: email.trim()
          });

        console.log('AdminTeams: Invite result for', email, ':', result);

        if (inviteError) {
          console.error('AdminTeams: RPC error for', email, ':', inviteError);
          const errorMsg = `Failed to invite ${email}: ${inviteError.message}`;
          errorMessages.push(errorMsg);
          errorCount++;
        } else if (result && result.success) {
          console.log('AdminTeams: Invite sent successfully to:', email);
          successCount++;
        } else if (result && !result.success) {
          console.log('AdminTeams: Invite failed for', email, ':', result.error);
          const errorMsg = result.error || `Failed to invite ${email}`;
          errorMessages.push(errorMsg);
          errorCount++;
        }
      } catch (error) {
        console.error('AdminTeams: Unexpected error inviting', email, ':', error);
        const errorMsg = `Unexpected error inviting ${email}`;
        errorMessages.push(errorMsg);
        errorCount++;
      }
    }

    // Show summary messages
    if (successCount > 0 && errorCount === 0) {
      toast({ 
        title: "Success", 
        description: `All ${successCount} invites sent successfully!` 
      });
    } else if (successCount > 0 && errorCount > 0) {
      toast({ 
        title: "Partial Success", 
        description: `${successCount} invites sent successfully, ${errorCount} failed. See console for details.`,
        variant: "destructive"
      });
    } else if (errorCount > 0) {
      toast({ 
        title: "Failed", 
        description: "All invites failed. " + errorMessages.slice(0, 2).join('. '),
        variant: "destructive" 
      });
    }

    // Show detailed error messages for each failure
    errorMessages.forEach(msg => {
      console.error('AdminTeams Invite Error:', msg);
    });

    setInviteEmails(['']);
    setInvitingTeam(null); // Close the invite dialog
  } catch (error) {
    console.error('Error inviting users:', error);
    toast({ title: "Error", description: "Failed to send invites", variant: "destructive" });
  }
};