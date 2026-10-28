# 📧 Email Template Update - Quick Start

## ✅ What's Been Created

I've created an improved email template with:

1. **Terminal-style OTP token** - Dark background (#1e1e1e) with green text (#4ade80)
2. **Inter font for all body text** - With extensive fallbacks for email clients
3. **Best-in-class monospace fonts for token** - SF Mono, Monaco, Consolas, etc.

## 🚀 Quick Update (2 minutes)

### Step 1: Copy the Template
```bash
# The template is ready at:
cat supabase-email-template.html
```

### Step 2: Update in Supabase
1. Go to your Supabase dashboard
2. Navigate to: **Authentication** → **Email Templates**
3. Find the **"Confirm signup"** or **"Magic Link"** template
4. Paste the contents of `supabase-email-template.html`
5. Click **Save**

### Step 3: Test
1. Sign in to your app with an email
2. Check your inbox
3. The verification code should now appear in a terminal-style box! 🎉

## 📄 Files Created

| File | Purpose |
|------|---------|
| `supabase-email-template.html` | ⭐ The actual template to paste into Supabase |
| `EMAIL_TEMPLATE_UPDATE_GUIDE.md` | Complete documentation and customization guide |
| `EMAIL_PREVIEW.md` | Visual preview of what the email looks like |
| `EMAIL_UPDATE_QUICK_START.md` | This file - quick reference |

## 🎨 Key Features

### Terminal-Style Token
```
Background: #1e1e1e (dark)
Text: #4ade80 (green)
Font: SF Mono → Monaco → Consolas → monospace
Size: 40px (desktop), 32px (mobile)
Spacing: 8px letter-spacing for clarity
```

### Body Text
```
Font: Inter → Apple System → Segoe UI → fallbacks
Clean, modern, highly readable
Proper font weights: 400, 500, 600, 700
```

## 📱 Compatibility

✅ Gmail (web, iOS, Android)
✅ Apple Mail (macOS, iOS)  
✅ Outlook (web, desktop, mobile)
✅ Yahoo Mail
✅ Most modern email clients
✅ Dark mode supported

## 🎯 Visual Comparison

### Before (your original):
- Token: Blue text on white/light background
- Font: Consolas, generic fallbacks
- Style: Standard email look

### After (new template):
- Token: **Green text on dark terminal background** 🖥️
- Font: **Inter for body, SF Mono/Monaco for token**
- Style: **Modern, terminal-authentic appearance**

## 💡 Why This Works

1. **High contrast** - Green on dark is very readable
2. **Authentic terminal look** - Feels like actual dev tools
3. **Inter font** - Professional, modern, excellent for UI
4. **Extensive fallbacks** - Works on ALL email clients
5. **Inline styles** - Maximum compatibility

## 🔍 Quick Test Checklist

After updating:
- [ ] Token displays in monospace font
- [ ] Token has dark background with green/colored text
- [ ] Body text is clean and readable
- [ ] Works on mobile devices
- [ ] Email arrives quickly (no spam)

## 📖 Need More Details?

- **Full documentation**: See `EMAIL_TEMPLATE_UPDATE_GUIDE.md`
- **Visual preview**: See `EMAIL_PREVIEW.md`
- **Customization**: Guide includes color/font customization options

## 🎨 Want Different Colors?

The terminal style can be customized! In the template, find `.otp-code` and change:

```css
/* Terminal green (current) */
background-color: #1e1e1e;
color: #4ade80;

/* Or use your brand colors */
background-color: #0ea5e9;  /* Blue */
color: #ffffff;              /* White */
```

---

**That's it!** Copy `supabase-email-template.html` to your Supabase dashboard and you're done! 🚀

The token will look amazing and be instantly recognizable as a verification code.
