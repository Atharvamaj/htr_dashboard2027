<div align="center">
  <img src="src/assets/htr_logo_transparent.svg" alt="HTR Logo" width="120" height="120">
  
  # 🚀 HTR Dashboard
  
  **A comprehensive hackathon management platform for Hack The Ridge**
  
  [![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)
  
  <p align="center">
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## 📖 About

**HTR Dashboard** is a modern, full-featured hackathon management platform designed specifically for **Hack The Ridge**. Built with cutting-edge web technologies, it provides a seamless experience for both participants and organizers to manage registrations, teams, schedules, and real-time communications.

> 🎯 **Perfect for hackathon organizers** who need a comprehensive, scalable solution with real-time features and admin controls.

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>🎪 <strong>Participant Experience</strong></h3>
      <ul>
        <li>🔐 <strong>Secure Authentication</strong> - Supabase Auth integration</li>
        <li>📝 <strong>Registration System</strong> - Complete hackathon registration flow</li>
        <li>👥 <strong>Team Management</strong> - Create, join, and manage teams</li>
        <li>📅 <strong>Event Schedule</strong> - Real-time event timeline with details</li>
        <li>🔔 <strong>Live Notifications</strong> - Instant updates and announcements</li>
        <li>📱 <strong>Mobile Responsive</strong> - Perfect on any device</li>
      </ul>
    </td>
    <td width="50%">
      <h3>⚡ <strong>Admin Controls</strong></h3>
      <ul>
        <li>👑 <strong>Admin Dashboard</strong> - Comprehensive management panel</li>
        <li>📊 <strong>User Management</strong> - Monitor registrations and check-ins</li>
        <li>🏢 <strong>Team Administration</strong> - Manage teams and invitations</li>
        <li>📢 <strong>Notification System</strong> - Broadcast to all participants</li>
        <li>📈 <strong>Analytics</strong> - Real-time data visualization</li>
        <li>⚙️ <strong>System Settings</strong> - Configure platform behavior</li>
      </ul>
    </td>
  </tr>
</table>

### 🌟 **Special Features**
- 🎮 **Built-in Flappy Bird Game** - Fun easter egg for participants
- 🔄 **Real-time Updates** - WebSocket connections for instant sync
- 🛡️ **Enterprise Security** - Comprehensive security monitoring
- 🎨 **Beautiful UI** - Modern design with dark/light theme support
- 📊 **Performance Optimized** - Built for high-concurrency events

## 🛠️ Tech Stack

<div align="center">
  <table>
    <tr>
      <th>Category</th>
      <th>Technologies</th>
    </tr>
    <tr>
      <td><strong>Frontend</strong></td>
      <td>React 18, TypeScript, Vite</td>
    </tr>
    <tr>
      <td><strong>Styling</strong></td>
      <td>Tailwind CSS, shadcn/ui, Radix UI</td>
    </tr>
    <tr>
      <td><strong>Backend</strong></td>
      <td>Supabase (PostgreSQL, Auth, Real-time)</td>
    </tr>
    <tr>
      <td><strong>State Management</strong></td>
      <td>TanStack Query (React Query)</td>
    </tr>
    <tr>
      <td><strong>Forms & Validation</strong></td>
      <td>React Hook Form, Zod</td>
    </tr>
    <tr>
      <td><strong>Charts & Icons</strong></td>
      <td>Recharts, Lucide React</td>
    </tr>
    <tr>
      <td><strong>Monitoring</strong></td>
      <td>Sentry, Custom Performance Tracking</td>
    </tr>
  </table>
</div>

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **bun** ([Bun Installation](https://bun.sh/))
- **Supabase CLI** ([Installation Guide](https://supabase.com/docs/guides/cli))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aidenpinto/htr-dashboard.git
   cd htr-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or for faster installation
   bun install
   ```

3. **Environment Setup**
   
   Create `.env.local` in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   
   **Option A: Remote Supabase** (Recommended)
   ```bash
   # Create project at supabase.com, then:
   supabase link --project-ref your-project-ref
   supabase db push
   ```
   
   **Option B: Local Development**
   ```bash
   supabase start
   # Copy the provided URLs to your .env.local
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

   🎉 **Visit http://localhost:5173** to see your app!

## 📁 Project Structure

```
htr-dashboard/
├── 📂 src/
│   ├── 📂 components/          # Reusable UI components
│   │   ├── 📂 ui/              # shadcn/ui base components
│   │   ├── Admin*.tsx          # Admin-specific components
│   │   ├── TeamManagement.tsx  # Team management features
│   │   └── EventSchedule.tsx   # Schedule components
│   ├── 📂 contexts/            # React Context providers
│   ├── 📂 hooks/               # Custom React hooks
│   ├── 📂 integrations/
│   │   └── 📂 supabase/        # Database client & queries
│   ├── 📂 pages/               # Route components
│   │   ├── Dashboard.tsx       # Main user dashboard
│   │   ├── Admin.tsx           # Admin panel
│   │   └── Auth.tsx            # Authentication
│   ├── 📂 lib/                 # Utilities & configurations
│   └── 📂 assets/              # Static files
├── 📂 public/                  # Public assets
├── 📄 package.json             # Dependencies & scripts
├── 📄 tailwind.config.ts       # Tailwind configuration
├── 📄 vite.config.ts           # Vite configuration
└── 📄 README.md                # You are here! 📍
```

## 🗄️ Database Schema

The application uses a robust PostgreSQL schema with the following core tables:

- **`profiles`** - User profile information and admin permissions
- **`registrations`** - Hackathon registration data and check-in status
- **`notifications`** - Global announcement system
- **`user_notifications`** - Personal notifications
- **`teams`** - Team information and management
- **`team_invites`** - Team invitation system
- **`schedule`** - Event schedule and timeline

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 🔥 Start development server with hot reload |
| `npm run build` | 📦 Build for production |
| `npm run build:dev` | 🛠️ Build in development mode |
| `npm run preview` | 👀 Preview production build locally |
| `npm run lint` | 🔍 Run ESLint for code quality |
| `npm run type-check` | 🏷️ Run TypeScript type checking |

## 🌍 Deployment

### 🚀 Vercel (Recommended)

1. Fork this repository
2. Connect to [Vercel](https://vercel.com)
3. Add environment variables in dashboard
4. Deploy automatically on every push! 🎉

### 🔧 Manual Deployment

```bash
npm run build
# Deploy the `dist` folder to your hosting provider
```

**Compatible with:** Netlify, Vercel, AWS S3, GitHub Pages, and more!

## 🤝 Contributing

We love contributions! Here's how to get started:

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **✨ Commit** your changes: `git commit -m 'Add amazing feature'`
4. **📤 Push** to the branch: `git push origin feature/amazing-feature`
5. **🎯 Submit** a Pull Request

### 📋 Development Guidelines

- Follow the existing code style
- Add TypeScript types for new features
- Test your changes thoroughly
- Update documentation as needed

## 📝 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ | `eyJ0eXAiOiJKV1Q...` |

## 📄 License

 This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 💬 Support & Community

Need help? We're here for you!

- 📬 **Issues**: [GitHub Issues](https://github.com/aidenpinto/htr-dashboard/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/aidenpinto/htr-dashboard/discussions)
- 📧 **Contact**: Create an issue with your question

When reporting issues, please include:
- 🔍 Detailed description
- 📋 Steps to reproduce
- 💻 Environment information
- 📸 Screenshots (if applicable)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/aidenpinto">Aiden Pinto</a> for the hackathon community</p>
  <p>
    <strong>⭐ If you found this project helpful, please give it a star! ⭐</strong>
  </p>
</div>
