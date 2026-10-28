# Notification Debugging Guide

## Testing Notifications in Background Tabs

### Quick Test
1. Visit: `http://localhost:5174/test-notifications.html`
2. Click buttons in order: 1 → 2 → 3
3. Switch to another tab
4. Notification should still appear

### Browser Requirements

#### ✅ Chrome/Edge (Recommended)
- Full Service Worker support
- Background notifications work perfectly
- Best testing experience

#### ✅ Firefox
- Full Service Worker support
- Background notifications work
- May need to manually allow notifications

#### ⚠️ Safari (Limitations)
- Service Workers supported on macOS 11.1+
- Push notifications have stricter requirements
- May need "Web Push" enabled in Safari settings
- Background notifications may not work reliably

### Common Issues

#### 1. Notifications not appearing at all
- Check permission status (should be "granted")
- Check browser notification settings
- On macOS: System Preferences → Notifications → [Browser]

#### 2. Notifications work on active tab but not background tab
- Service Worker might not be registered
- Check DevTools → Application → Service Workers
- Should see `/sw-notifications.js` with status "activated"

#### 3. Service Worker not registering
- Check Console for errors
- Try clearing browser cache
- Unregister old service workers in DevTools

### Debugging Steps

1. **Check Browser Support**
   ```javascript
   console.log('Notifications:', 'Notification' in window);
   console.log('Service Workers:', 'serviceWorker' in navigator);
   console.log('Permission:', Notification.permission);
   ```

2. **Check Service Worker Status**
   - Open DevTools → Application → Service Workers
   - Should see: `/sw-notifications.js` - Status: "activated"

3. **Check Console Logs**
   - Should see: "Service Worker registered successfully"
   - Should see: "Service Worker ready for notifications"
   - When notification triggered: "Showing notification via Service Worker"

4. **Test in Different Browser**
   - If not working in Safari, try Chrome
   - Chrome has the most reliable Service Worker implementation

### macOS-Specific Steps

If on macOS and using Safari:
1. Safari → Settings → Websites → Notifications
2. Ensure your localhost is allowed
3. May need to enable "Show Web Push Notifications" in Safari settings

If on macOS and using Chrome:
1. System Preferences → Notifications
2. Find Google Chrome
3. Ensure "Allow Notifications" is checked

### Developer Console Commands

```javascript
// Check if Service Worker is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered SWs:', registrations);
});

// Check notification permission
console.log('Permission:', Notification.permission);

// Manually test notification
if ('serviceWorker' in navigator && Notification.permission === 'granted') {
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification('Test', {
      body: 'Manual test from console',
      icon: '/htr_logo_transparent.svg'
    });
  });
}
```

### Expected Behavior

When working correctly:
1. Dashboard loads → Service Worker registers automatically
2. User grants permission (one-time prompt)
3. New notification arrives → Dashboard receives real-time update
4. Notification displayed via Service Worker
5. Works even if dashboard tab is not active
6. Clicking notification focuses dashboard tab

### Still Not Working?

Try these nuclear options:
1. Clear all browser data
2. Unregister all service workers
3. Restart browser
4. Test in incognito/private mode (will need to grant permission again)
