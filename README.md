# Jinal Bots — Autonomous Multi-Agent AI System
**Engineered by Jinal Digital Solutions (JDS)**  
**Version**: 1.0.0  
**Stack**: Rust (Axum, Tokio, SQLite) + React 18, TypeScript, Tailwind CSS, Vite + Supabase  

---

## 🤖 Overview

**Jinal Bots** is an enterprise-grade multi-agent collaboration platform designed for high-velocity teams and digital agencies. Instead of relying on a single conversational chatbot, Jinal Bots gives you a coordinated squad of specialized AI agents that:
- Share conversation context and task history.
- Hand off complex work to one another via `@mentions`.
- Formally verify deliverables and check code/documents before marking tasks as done.
- Operate on scheduled autonomous routines or respond in real-time.
- Support direct user-to-user and user-to-agent private messaging powered by **Supabase**.

---

## ⚡ Key Capabilities

### 1. Collaborative Multi-Bot Workspace
- **Specialized Roles**: Deploy bots configured for Architecture, Frontend Engineering, Code Review, Security Auditing, and Content Strategy.
- **Mission Board**: Track agent assignments on a visual Kanban board where cards only transition to **Verified** when automated verification checks pass.
- **Human-in-the-Loop Approvals**: High-impact actions (deployments, refunds, API rotations, external broadcasts) pause for human approval with 1-tap review cards.

### 2. Private Web Messaging (Supabase Integration)
- Built-in private chat at `/messages.html` supporting user-to-user and user-to-agent communication.
- Row-Level Security (RLS) policies protecting participant privacy.
- Live real-time message sync via Supabase Realtime channels.
- Unread message counters and instant notifications.

### 3. Cross-Platform & Progressive Web App (PWA)
- Fully responsive web UI optimized for both desktop command centers and mobile smartphones.
- Installable as a standalone PWA on iOS and Android devices.
- Hardware-accelerated, clean slate & electric blue visual identity.

### 4. Engine & Model Independence
- Connect to your preferred AI providers: Claude (Anthropic), OpenAI Codex / GPT-4o, Grok (xAI), Gemini, or self-hosted local models via Ollama.
- Failover routing: If an API quota is exhausted, tasks automatically cascade to designated secondary engines without interruption.
- Model Context Protocol (MCP) server support for custom tools and enterprise databases.

---

## 📁 Repository Structure

```
J:\Jinal bots\
├── frontend/               # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/     # UI Components (Sidebar, Mission Board, Review Cards)
│   │   ├── directMessages.tsx # Supabase Private Chat Engine
│   │   └── App.tsx         # Main Application Workspace
│   ├── public/             # PWA Manifest & Icons
│   ├── messages.html       # Supabase Messaging Entrypoint
│   ├── index.html          # Main Web Workspace Entrypoint
│   └── package.json        # Frontend Dependencies
│
├── src/                    # High-Performance Rust Backend Server
│   ├── serve/              # Axum HTTP & WebSocket Server
│   ├── db/                 # SQLite State & Task Storage
│   └── tools/              # MCP & Agent Execution Harness
│
├── supabase/               # Database Migrations & Schemas
│   └── migrations/         # Direct messaging & RLS policies
│
├── docs/                   # Documentation & Integration Guides
│   └── jinal-messages.md   # Supabase Messaging Setup Guide
│
├── docker/                 # Production Container Configurations
│   └── render.Dockerfile   # Dockerfile for Render Cloud Deployments
│
└── render.yaml             # Render Blueprint Specification
```

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Rust Toolchain**: 1.78+ (optional, required only for native binary compilation)
- **Supabase Account**: (for `/messages.html` real-time chat)

### 2. Frontend Development Server
```bash
cd "frontend"
npm install
npm run dev
```
Open `http://localhost:5199` to access the Jinal Bots command center.

### 3. Setting Up Supabase Web Messaging
1. Create a Supabase project at [database.new](https://database.new).
2. Execute the migration in `supabase/migrations/20261117000000_direct_messages.sql` in the Supabase SQL Editor.
3. Create `frontend/.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```
4. Access `http://localhost:5199/messages.html` for direct messaging.

### 4. Production Build
```bash
cd "frontend"
npm run build
```
Compiled static assets are generated in `frontend/dist/`.

---

## ☁️ Cloud Deployment on Render

This repository includes a native [`render.yaml`](./render.yaml) blueprint for instant one-click deployment:
1. Push your changes to your GitHub repository: `https://github.com/jash1509/jinal-bot.git`.
2. Navigate to [dashboard.render.com](https://dashboard.render.com/) -> **New +** -> **Blueprint**.
3. Select `jash1509/jinal-bot` and click **Apply**.

---

## 🛡️ License & White-Label Rights
Proprietary software engineered for **Jinal Digital Solutions (JDS)**. Built on open standards under the AGPL-3.0 License.
