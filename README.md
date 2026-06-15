# TaskFlow - Task Management System

A full-stack task management system built with React, Express, and SQLite. Features a Kanban board with drag & drop, team collaboration, authentication, and a premium modern UI.

## Tech Stack

**Frontend:** React 19 + TypeScript + Vite + Tailwind CSS  
**Backend:** Node.js + Express + TypeScript  
**Database:** SQLite (via Prisma ORM)  
**Auth:** JWT + bcrypt

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### 1. Setup Server

```bash
cd server
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 2. Setup Client

```bash
cd client
npm install
```

### 3. Run Development

Open two terminals:

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```

The app will be available at **http://localhost:5173**

## Features

- **Authentication** - Register, login, JWT tokens, password management
- **Dashboard** - Task statistics, upcoming deadlines, project overview
- **Kanban Board** - Drag & drop task cards between status columns
- **Task Management** - Create, edit, assign, set priorities and due dates
- **Team Collaboration** - Invite members, assign roles (Owner/Admin/Member)
- **Comments** - Add comments to tasks for team communication
- **Dark/Light Mode** - Toggle theme with system preference detection
- **Responsive Design** - Works on desktop, tablet, and mobile

## Project Structure

```
├── client/                # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # Auth & Theme context
│   │   ├── services/      # API service layer
│   │   └── types/         # TypeScript interfaces
│   └── package.json
├── server/                # Express Backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/     # Auth & error middleware
│   │   └── lib/           # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Seed data
│   └── package.json
└── README.md
```

## Deployment

### Frontend
Build the static files and deploy to Vercel, Netlify, or any static hosting:

```bash
cd client
npm run build
```

### Backend
Deploy the Express server to Railway, Render, or any Node.js hosting.

### Database
For production, change the Prisma datasource provider from `sqlite` to `postgresql` in `server/prisma/schema.prisma` and update the `DATABASE_URL` in your environment.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id/tasks | Get project tasks |
| POST | /api/projects/:id/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| PATCH | /api/tasks/:id/position | Update task position (drag & drop) |
| GET | /api/projects/:id/members | Get project members |
| POST | /api/projects/:id/members | Add member |
| GET | /api/tasks/:id/comments | Get task comments |
| POST | /api/tasks/:id/comments | Add comment |
