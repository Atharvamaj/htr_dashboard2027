# Email Template Update Guide

## ✨ What's Improved

The new email template features:

### 🔤 Typography
- **Inter font** for all body text with extensive fallbacks for email clients
- **Terminal-style monospace font** for the OTP code (SF Mono, Monaco, Inconsolata, etc.)
- Proper font weights: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)

### 🎨 Visual Enhancements
- **Terminal-style token display**: Dark background (#1e1e1e) with green text (#4ade80) - looks like actual terminal output
- Gradient header for a modern look
- Better spacing and typography
- Subtle box shadow for depth
- Dark mode support for compatible email clients

### 📱 Compatibility
- Extensive inline styles for maximum email client compatibility
- MSO conditional comments for Outlook
- Responsive design for mobile devices
- Font fallbacks for email clients that strip custom fonts

## 🔧 How to Update in Supabase

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**

### Step 2: Update the Confirm Signup Template
1. Find the **"Confirm signup"** or **"Magic Link"** template
2. Click to edit it

### Step 3: Replace the HTML
1. Open the file `supabase-email-template.html` in this directory
2. Copy the entire contents
3. Paste it into the template editor in Supabase
4. Make sure the `{{ .Token }}` placeholder is preserved

### Step 4: Save and Test
1. Click **Save**
2. Test by signing in to your app with an email
3. Check your inbox - the code should now look like terminal text!

## 🎯 Key Features

### Terminal-Style Token
```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 
             'Fira Mono', 'Roboto Mono', 'Consolas', 'Courier New', 
             monospace;
background-color: #1e1e1e;  /* Dark terminal background */
color: #4ade80;              /* Green terminal text */
```

### Inter Font for Body
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, 'Helvetica Neue', Arial, 
             sans-serif;
```

### Responsive Design
- Desktop: 40px token, 8px letter spacing
- Mobile: 32px token, 6px letter spacing

## 📧 Email Client Compatibility

The template has been optimized for:
- ✅ Gmail (web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Outlook (web, desktop, mobile)
- ✅ Yahoo Mail
- ✅ ProtonMail
- ✅ Most other modern email clients

### Fallback Strategy
If an email client doesn't support:
- **Inter font** → Falls back to system fonts (-apple-system, Segoe UI, etc.)
- **SF Mono** → Falls back to Monaco → Consolas → Courier New
- **Web fonts** → Inline styles ensure proper rendering
- **CSS gradients** → Solid color fallback

## 🧪 Testing Checklist

After updating the template, test with:

- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Apple Mail (macOS)
- [ ] Apple Mail (iOS)
- [ ] Outlook (web)
- [ ] Dark mode enabled devices

### What to Look For
1. **Token appearance**: Should look terminal-like with dark background and green text
2. **Body text**: Should use Inter or clean sans-serif font
3. **Spacing**: Should be clean and readable on all devices
4. **Mobile view**: Token should be slightly smaller but still readable

## 🎨 Customization Options

### Change Token Colors
To match your brand, modify these values:

```css
/* Current: terminal green on dark */
background-color: #1e1e1e;  /* Dark background */
color: #4ade80;              /* Green text */

/* Option 2: Blue theme */
background-color: #f0f9ff;  /* Light blue background */
color: #0ea5e9;              /* Blue text */

/* Option 3: Minimal */
background-color: #ffffff;  /* White background */
color: #1e1e1e;              /* Dark text */
border: 2px solid #0ea5e9;  /* Blue border */
```

### Adjust Font Sizes
```css
/* Desktop */
.otp-code {
  font-size: 40px;           /* Make bigger: 48px */
  letter-spacing: 8px;       /* Make wider: 10px */
}

/* Mobile (in @media query) */
.otp-code {
  font-size: 32px;           /* Make bigger: 36px */
  letter-spacing: 6px;       /* Make wider: 8px */
}
```

## 💡 Pro Tips

1. **Keep {{ .Token }} intact** - This is the Supabase placeholder for the actual code
2. **Test before deploying** - Use Supabase's "Send test email" feature
3. **Check spam folders** - New templates might trigger filters initially
4. **Monitor delivery rates** - Ensure the changes don't affect deliverability

## 🐛 Troubleshooting

### Token doesn't look like terminal font
- Check if inline styles are preserved
- Verify font-family includes monospace fallbacks
- Some email clients may override fonts - the fallbacks should still look good

### Body text not using Inter
- Inter is loaded via Google Fonts - some corporate email clients block external fonts
- Fallbacks ensure it still looks professional

### Colors look wrong
- Email clients may adjust colors for dark mode
- The dark mode media query handles this automatically

## 📝 Notes

- The template uses both `<style>` tags and inline styles for maximum compatibility
- Inline styles take precedence and are preserved by most email clients
- The template is fully responsive and mobile-friendly
- Dark mode support is automatic where the email client supports it

---

**Ready to update?** Just copy `supabase-email-template.html` and paste it into your Supabase email template editor! 🚀
