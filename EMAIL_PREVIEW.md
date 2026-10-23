# Email Template Visual Preview

## 🎨 What It Looks Like

### Desktop View (560px wide)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🌊 Hack the Ridge 🌊                       │
│           (Gradient Blue Header)                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Hello,                                                 │
│                                                         │
│  Use the verification code below to sign in to your    │
│  account:                                               │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         VERIFICATION CODE                         │ │
│  │                                                   │ │
│  │    ┌───────────────────────────────┐             │ │
│  │    │  🖥️  123456  🖥️                │             │ │
│  │    │  (Terminal Style!)             │             │ │
│  │    │  Dark background, green text   │             │ │
│  │    └───────────────────────────────┘             │ │
│  │                                                   │ │
│  │         Valid for 10 minutes                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Need help? Contact us at hi@hacktheridge.ca           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Made with ❤️ by the Hack the Ridge team               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🔤 Font Details

### Body Text (Inter or fallbacks)
- **Main text**: 15px, Inter Regular (400)
- **Labels**: 12px, Inter Semi-Bold (600), UPPERCASE
- **Helper text**: 13px, Inter Regular (400)
- **Footer**: 12px, Inter Regular (400)

**Font Stack:**
```
'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
'Helvetica Neue', Arial, sans-serif
```

### OTP Token (Terminal-style monospace)
- **Size**: 40px (desktop), 32px (mobile)
- **Weight**: Bold (700)
- **Letter spacing**: 8px (desktop), 6px (mobile)
- **Background**: #1e1e1e (dark terminal background)
- **Color**: #4ade80 (terminal green)
- **Padding**: 12px 20px
- **Border**: 1px solid #2d2d2d
- **Border radius**: 6px

**Font Stack (Terminal fonts):**
```
'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 
'Roboto Mono', 'Consolas', 'Courier New', 'Courier', monospace
```

## 🎨 Color Palette

### Header
- Background: Linear gradient `#0ea5e9 → #0284c7`
- Text: `#ffffff` (white)

### Body
- Background: `#ffffff` (white)
- Text: `#333333` (dark gray)
- Helper text: `#6c757d` (muted gray)
- Links: `#0ea5e9` (blue)

### Token Box
- Box background: `#f8f9fa` (light gray)
- Box border: `#e9ecef` (border gray)
- Token background: `#1e1e1e` (terminal dark) ⭐
- Token text: `#4ade80` (terminal green) ⭐

### Footer
- Background: `#f8f9fa` (light gray)
- Border: `#e9ecef` (border gray)

## 📱 Responsive Breakpoints

### Desktop (> 600px)
- Container: 560px max-width
- Token: 40px font, 8px letter-spacing
- Padding: 32px

### Mobile (≤ 600px)
- Container: Full width, no border radius
- Token: 32px font, 6px letter-spacing
- Padding: 24px

## 🌙 Dark Mode Support

When user has dark mode enabled:

```
Background colors:
- Wrapper: #1a1a1a
- Container: #2d2d2d
- Text: #e5e5e5
- OTP box: #1e1e1e
- Footer: #1e1e1e
```

## ✨ Key Visual Features

1. **Terminal-style token** - Looks like actual terminal output
2. **Gradient header** - Modern, eye-catching blue gradient
3. **Clean typography** - Inter font with proper weights and spacing
4. **Subtle shadows** - Adds depth without being distracting
5. **Responsive design** - Perfect on all screen sizes
6. **High contrast** - Green on dark makes code very readable

## 📊 Font Weight Usage

- **Regular (400)**: Body text, helper text
- **Medium (500)**: Links, expiration text
- **Semi-Bold (600)**: Labels, important text
- **Bold (700)**: Header title, OTP code

## 🎯 Typography Best Practices Applied

✅ **Proper line height** (1.5) for readability
✅ **Appropriate font sizes** for hierarchy
✅ **Letter spacing** on uppercase labels (0.08em)
✅ **Negative letter spacing** on header (-0.02em)
✅ **Wide letter spacing** on token (8px) for clarity
✅ **Font smoothing** enabled for crispness
✅ **Tabular numbers** on token for alignment

---

The terminal-style token will truly stand out and be immediately recognizable! 🚀
