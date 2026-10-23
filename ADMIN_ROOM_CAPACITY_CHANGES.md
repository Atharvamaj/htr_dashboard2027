# Admin Room Capacity Override - Changes Summary

## Overview
Modified the admin team management interface to allow admins to place unlimited teams in rooms, while regular users still see the 2-team capacity limit during team finalization.

---

## Changes Made

### 1. **Removed Capacity Check in Admin Drag & Drop** 
**File:** `src/components/AdminTeams.tsx`  
**Line:** ~217

**Before:**
```typescript
if (destinationRoomId !== 'unassigned' && destinationRoomId !== 'Library') {
  const destinationRoomData = rooms.find(room => room.id === destinationRoomId);
  if (destinationRoomData && destinationRoomData.teams.length >= destinationRoom.maxTeams) {
    toast({
      title: "Room Full",
      description: `${destinationRoom.name} is at capacity`,
      variant: "destructive"
    });
    return;
  }
}
```

**After:**
```typescript
// Admins can place unlimited teams in rooms (no capacity check)
```

**Impact:** Admins can now drag and drop any number of teams into any room without restriction.

---

### 2. **Updated Room Badge Display**
**File:** `src/components/AdminTeams.tsx`  
**Lines:** ~845-849

**Changes:**
- Badge now shows `3/2` instead of just `2/2` when over capacity
- Badge turns red (`destructive` variant) when exceeding recommended capacity
- Added tooltip on hover: "Over recommended capacity (2)"
- For Library/unlimited rooms, shows just the count without denominator

**Visual Indicators:**
- **Grey badge:** Empty room
- **Blue badge:** Room has teams, at or under capacity
- **Red badge:** Room exceeds recommended capacity (still allowed for admins)

---

### 3. **Added Admin Information Alert**
**File:** `src/components/AdminTeams.tsx`  
**Lines:** ~992-998

**Added:**
```tsx
<Alert className="bg-blue-50 border-blue-200">
  <MapPin className="h-4 w-4 text-blue-600" />
  <AlertDescription>
    <strong>Admin Override:</strong> You can place more than 2 teams in any room. 
    Room capacities shown are recommendations only. Teams will see capacity limits 
    when finalizing, but you have full control.
  </AlertDescription>
</Alert>
```

**Impact:** Clear notification to admins that they have override privileges.

---

## What Wasn't Changed

### Team Finalization (Regular Users)
**File:** `src/components/TeamManagement.tsx`  
**Lines:** ~514-533

**Preserved Behavior:**
```typescript
const maxCapacity = roomToAssign === 'Library' ? 999 : 2;
if (currentCount >= maxCapacity) {
  toast({
    title: "Error",
    description: `Room ${roomToAssign} is at full capacity`,
    variant: "destructive"
  });
  return;
}
```

**Impact:** Regular users still cannot finalize their team into a room that already has 2 teams (unless it's the Library). This prevents accidental over-booking by participants.

---

## Behavioral Summary

### Admin Side (AdminTeams component):
✅ **Can drag teams into any room, regardless of capacity**  
✅ **Visual feedback when exceeding recommended capacity (red badge)**  
✅ **Clear alert explaining admin override privileges**  
✅ **Badge shows actual count vs recommended (e.g., "3/2")**  

### User Side (TeamManagement component):
✅ **Still blocked from finalizing into full rooms (2 team limit)**  
✅ **Sees error message if room is at capacity**  
✅ **Single-member teams auto-assigned to Library (no restrictions)**  
✅ **Library has unlimited capacity for all users**  

---

## Testing Recommendations

### Test as Admin:
1. ✅ Drag 3+ teams into a regular room (e.g., Room 124)
2. ✅ Verify badge shows "3/2" in red
3. ✅ Hover over badge to see tooltip
4. ✅ Verify teams are successfully placed
5. ✅ Check that info alert is visible above room grid

### Test as Regular User:
1. ✅ Create/join a team with 2+ members
2. ✅ Try to finalize into a room that already has 2 teams
3. ✅ Verify you see "Room is at full capacity" error
4. ✅ Can still finalize into Library or empty rooms
5. ✅ Single member teams auto-assign to Library

---

## Benefits

1. **Admin Flexibility:** Admins can manually override room assignments for special circumstances (e.g., room change, equipment issues, last-minute adjustments)

2. **User Protection:** Regular participants still see capacity limits to prevent confusion and ensure organized room assignments

3. **Clear Communication:** Visual indicators (red badges, alerts) make it obvious when rooms are over recommended capacity

4. **Graceful Degradation:** Rooms can exceed capacity without breaking functionality; it's just a visual indicator

---

## Future Considerations

- Could add a warning dialog when placing 3+ teams in a room
- Could track "admin override" events for audit purposes
- Could add a "rebalance rooms" feature to redistribute teams evenly
- Could make recommended capacity configurable per room

---

**Date:** 2025-10-06  
**Component:** Admin Team Management  
**Impact:** Admin workflow only (no impact on participant experience)
