# TRACKLY — Track Everything, Deliver Anything

> **Project Management Information System** for IT Consultant firms  
> Built with pure HTML, CSS, and JavaScript — runs fully offline, no backend required (MVP Phase)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Vision & Goals](#2-vision--goals)
3. [Design System](#3-design-system)
4. [Architecture](#4-architecture)
5. [Feature Specification](#5-feature-specification)
6. [Role & Permission Matrix](#6-role--permission-matrix)
7. [Data Models](#7-data-models)
8. [Page & Module Map](#8-page--module-map)
9. [Development Phases (1–17)](#9-development-phases-117)
10. [Development Log](#10-development-log)
11. [UI/UX Guidelines](#11-uiux-guidelines)
12. [File Structure](#12-file-structure)
13. [Local Setup & PWA](#13-local-setup--pwa)
14. [Naming Conventions](#14-naming-conventions)
15. [Contribution Guidelines for AI](#15-contribution-guidelines-for-ai)

---

## 1. Project Overview

| Field | Detail |
|---|---|
| **System Name** | TRACKLY |
| **Tagline** | Track Everything, Deliver Anything |
| **Type** | Project Management Information System (PMIS) |
| **Current Version** | `v0.9.0-alpha` |
| **Current Phase** | Phase 10 — Sprint Management |
| **Tech Stack** | HTML5, CSS3 (Custom Properties), Vanilla JavaScript (ES6+) |
| **Storage** | `localStorage` + `IndexedDB` (client-side only, no backend) |
| **PWA** | Yes — installable, works fully offline |
| **Target User** | Internal IT Consultant company (PM, Developer, Viewer/Client) |
| **References** | Trello, Jira, Asana, Linear, Basecamp |
| **Deployment** | Local / GitHub Pages (static) |

### What is TRACKLY?

TRACKLY is a fully client-side Project Management Information System designed for IT consultant startups. It manages the complete project lifecycle — from initial setup, sprint planning, board tracking, Gantt scheduling, all the way through to post-delivery maintenance reporting and billing. All data is stored locally in the browser using `localStorage` and `IndexedDB`, making it fully functional without a server, internet connection, or database setup.

---

## 2. Vision & Goals

### Vision
Empower IT consultant teams with a comprehensive, intuitive, and professional project management tool that works out of the box — no installation, no server, no dependencies.

### Goals

- Replace spreadsheet-based project tracking with a structured, role-aware system
- Provide end-to-end project visibility from backlog to maintenance
- Enable PM to generate maintenance reports and billing estimates in one place
- Deliver a polished, interactive UI that rivals SaaS tools — on a zero-infrastructure budget
- Be fully usable offline and installable as a PWA on any device

---

## 3. Design System

### Theme

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#2563EB` | Brand, CTAs, active states |
| `--color-primary-dark` | `#1D4ED8` | Hover states |
| `--color-secondary` | `#7C3AED` | Accents, tags, badges |
| `--color-success` | `#16A34A` | Done, active, healthy |
| `--color-warning` | `#D97706` | In-progress, pending |
| `--color-danger` | `#DC2626` | Overdue, bug, critical |
| `--color-info` | `#0891B2` | Information, viewer role |
| `--color-surface` | `#F8FAFC` | Page background |
| `--color-card` | `#FFFFFF` | Card/panel background |
| `--color-border` | `#E2E8F0` | Borders, dividers |
| `--color-text` | `#0F172A` | Primary text |
| `--color-text-muted` | `#64748B` | Secondary text, labels |
| `--radius-sm` | `6px` | Badges, tags |
| `--radius-md` | `10px` | Cards, inputs |
| `--radius-lg` | `16px` | Modals, panels |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | Card elevation |
| `--shadow-modal` | `0 20px 60px rgba(0,0,0,0.15)` | Modal elevation |

### Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display / Page Title | Inter | 700 | 28–32px |
| Section Heading | Inter | 600 | 18–22px |
| Body | Inter | 400 | 14px |
| Label / Caption | Inter | 500 | 12px |
| Code / ID | JetBrains Mono | 400 | 12px |

### Icon System

- Use **Lucide Icons** (SVG sprite or CDN) as the primary icon set
- Icons must be used instead of emojis throughout the UI
- Exception: Status indicators may use color-coded dots (CSS only), not emoji
- Icon size standard: `16px` (inline), `20px` (button), `24px` (page header)

### Animation

- Page transitions: `fade + slide-up` (150ms ease-out)
- Modals: `scale(0.96) → scale(1)` + `opacity` (200ms ease)
- Cards: `transform: translateY(-2px)` on hover (100ms)
- Skeleton loaders for any operation that reads from storage
- No janky or looping animations — subtle and purposeful only

---

## 4. Architecture

### Storage Strategy

```
TRACKLY Storage Architecture (Client-Side Only)

┌─────────────────────────────────────────────────┐
│                  TRACKLY APP                    │
│                                                 │
│  ┌─────────────────┐    ┌────────────────────┐  │
│  │   localStorage   │    │    IndexedDB       │  │
│  │                  │    │                    │  │
│  │  - auth session  │    │  - projects        │  │
│  │  - app settings  │    │  - tasks / sprints │  │
│  │  - theme prefs   │    │  - members         │  │
│  │  - sidebar state │    │  - clients         │  │
│  │  - active user   │    │  - assets          │  │
│  └─────────────────┘    │  - maintenance logs│  │
│                          │  - invoices        │  │
│                          │  - activity logs   │  │
│                          └────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │            JS Module Layer               │   │
│  │  db.js │ auth.js │ router.js │ utils.js  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Module System

All JavaScript must use **ES Modules** (`type="module"`). No build tools. No bundlers.

```
js/
├── core/
│   ├── db.js           # IndexedDB wrapper (CRUD helpers for all stores)
│   ├── router.js       # Hash-based SPA router
│   ├── auth.js         # Session management via localStorage
│   ├── store.js        # Reactive state (observer pattern)
│   └── utils.js        # Formatting, date helpers, ID generators
├── modules/
│   ├── dashboard.js
│   ├── projects.js
│   ├── board.js        # Kanban drag-and-drop
│   ├── backlog.js
│   ├── sprint.js
│   ├── gantt.js
│   ├── maintenance.js
│   ├── assets.js
│   ├── clients.js
│   ├── members.js
│   ├── reports.js
│   └── settings.js
└── components/
    ├── modal.js
    ├── toast.js
    ├── sidebar.js
    ├── topbar.js
    ├── avatar.js
    ├── badge.js
    └── confirm.js
```

### Routing

Hash-based routing (`window.location.hash`) — no server required.

```
#/dashboard
#/projects
#/projects/:id
#/projects/:id/board
#/projects/:id/backlog
#/projects/:id/sprint
#/projects/:id/gantt
#/projects/:id/maintenance
#/projects/:id/reports
#/clients
#/assets
#/members
#/settings
#/login
```

---

## 5. Feature Specification

### 5.1 Authentication (Local)

- Login with username + password stored in IndexedDB (hashed with SHA-256 via Web Crypto API)
- Session stored in `localStorage` (token + expiry)
- Auto-logout after inactivity (configurable, default 8 hours)
- First-run wizard creates the first Admin account
- "Remember me" toggle

### 5.2 Dashboard

- Summary cards: Active Projects, Overdue Tasks, Open Bugs, Pending Maintenance
- My Tasks widget (tasks assigned to logged-in user, grouped by project)
- Recent Activity Feed
- Project progress bars
- Upcoming sprint deadlines
- Quick-add task button

### 5.3 Project Management

Each project has the following attributes:

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (e.g., `PRJ-0001`) |
| `name` | String | Required |
| `code` | String | Short code (e.g., `TRK`) |
| `description` | Text | Markdown-supported |
| `status` | Enum | `planning`, `active`, `maintenance`, `on_hold`, `completed`, `cancelled` |
| `phase` | Enum | `development`, `uat`, `deployment`, `running`, `maintenance` |
| `client_id` | Ref | Linked from Client module |
| `start_date` | Date | |
| `end_date` | Date | Target delivery |
| `actual_end_date` | Date | When actually completed |
| `budget` | Number | Estimated budget |
| `actual_cost` | Number | Running cost |
| `priority` | Enum | `low`, `medium`, `high`, `critical` |
| `members` | Array | User IDs with project roles |
| `tags` | Array | Free-form labels |
| `cover_color` | String | Hex color for project card |
| `created_by` | Ref | User ID |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 5.4 Board (Kanban)

- Drag-and-drop task cards across columns
- Default columns: `Backlog`, `To Do`, `In Progress`, `In Review`, `Done`
- Custom columns configurable per project
- Task card shows: assignee avatar, priority badge, due date, tags, subtask count
- Swimlane view (group by assignee or epic)
- Filter by: assignee, priority, label, sprint
- Quick-edit on card hover

### 5.5 Backlog

- Flat list view of all tasks not in a sprint
- Bulk-select and assign to sprint
- Sort by: priority, date, assignee, status
- Inline edit task title and priority
- Estimate points (story points) per task

### 5.6 Sprint Management

- Create named sprints with start/end dates per project
- Sprint planning view: drag tasks from backlog to sprint
- Sprint board (subset of full board filtered to active sprint)
- Sprint velocity and burndown chart
- Sprint retrospective notes field
- Sprint status: `planning`, `active`, `completed`

### 5.7 Gantt Chart

- Timeline view of tasks grouped by sprint or phase
- Horizontal bars showing duration
- Dependencies (task A must finish before task B)
- Milestones markers
- Drag to resize/move tasks on timeline
- Zoom: Day / Week / Month
- Export to PNG

### 5.8 Task Details

Each task contains:

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (e.g., `TASK-0042`) |
| `project_id` | Ref | |
| `title` | String | Required |
| `description` | Text | Rich text / Markdown |
| `type` | Enum | `story`, `task`, `bug`, `enhancement`, `epic` |
| `status` | Enum | `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled` |
| `priority` | Enum | `low`, `medium`, `high`, `critical` |
| `assignees` | Array | User IDs (supports multiple) |
| `reporter` | Ref | User ID |
| `sprint_id` | Ref | Optional |
| `epic_id` | Ref | Optional parent epic |
| `story_points` | Number | Estimate |
| `start_date` | Date | |
| `due_date` | Date | |
| `completed_at` | Timestamp | |
| `tags` | Array | |
| `attachments` | Array | File metadata (stored as base64 or object URL) |
| `checklist` | Array | Sub-items with done state |
| `comments` | Array | Threaded comments with timestamp |
| `time_logged` | Number | Minutes |
| `dependencies` | Array | Task IDs |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 5.9 Member / User Management

Each user contains:

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated |
| `username` | String | Unique, required |
| `full_name` | String | Required |
| `email` | String | Unique, required |
| `password_hash` | String | SHA-256 via Web Crypto API |
| `phone_number` | String | |
| `avatar` | String | Base64 image or URL |
| `company` | String | |
| `department` | String | |
| `position` | String | Job title (e.g., "Backend Developer") |
| `role` | Enum | `admin`, `pm`, `developer`, `viewer` |
| `project_roles` | Object | Per-project role overrides |
| `bio` | Text | Short profile bio |
| `linkedin` | String | |
| `github` | String | |
| `status` | Enum | `active`, `inactive`, `invited` |
| `last_login` | Timestamp | |
| `timezone` | String | e.g., `Asia/Jakarta` |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 5.10 Client Management (CRUD)

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (e.g., `CLT-0001`) |
| `company_name` | String | Required |
| `industry` | String | |
| `contact_person` | String | Primary PIC name |
| `contact_email` | String | |
| `contact_phone` | String | |
| `address` | Text | |
| `website` | String | |
| `logo` | String | Base64 image |
| `notes` | Text | |
| `status` | Enum | `active`, `inactive`, `prospect` |
| `projects` | Array | Linked project IDs (auto-populated) |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 5.11 Asset Management (CRUD)

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (e.g., `AST-0001`) |
| `name` | String | Required |
| `category` | Enum | `hardware`, `software`, `license`, `document`, `other` |
| `description` | Text | |
| `serial_number` | String | |
| `purchase_date` | Date | |
| `purchase_price` | Number | |
| `vendor` | String | |
| `assigned_to` | Ref | User ID (optional) |
| `project_id` | Ref | Project association (optional) |
| `status` | Enum | `available`, `in_use`, `maintenance`, `retired` |
| `warranty_expiry` | Date | |
| `notes` | Text | |
| `image` | String | Base64 |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 5.12 Maintenance Module

This module activates when a project is in `running` or `maintenance` phase.

#### Maintenance Ticket

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (e.g., `MNT-0001`) |
| `project_id` | Ref | Required |
| `title` | String | Required |
| `description` | Text | |
| `type` | Enum | `bug`, `adjustment`, `enhancement`, `user_request`, `incident` |
| `priority` | Enum | `low`, `medium`, `high`, `critical` |
| `status` | Enum | `open`, `in_progress`, `resolved`, `closed`, `rejected` |
| `reported_by` | String | Can be client name or user ref |
| `reported_date` | Date | |
| `resolved_date` | Date | |
| `assigned_to` | Ref | User ID |
| `estimated_hours` | Number | |
| `actual_hours` | Number | |
| `cost_estimate` | Number | PM-set billing estimate |
| `notes` | Text | Internal notes |
| `resolution_notes` | Text | What was done to fix |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

#### Maintenance Report & Invoice

- PM can generate a **Maintenance Report** for a date range per project
- Report includes: ticket list, summary by type, total hours, open vs resolved counts
- PM inputs **hourly rate** or **flat cost per ticket** to generate a **Maintenance Invoice**
- Invoice includes: company logo, client info, itemized ticket table, subtotal, tax (configurable %), total
- **Export to PDF** via browser print API (`window.print()` with print-specific CSS)

### 5.13 Reports

- **Project Progress Report**: Tasks by status, sprint velocity, completion %
- **Team Workload Report**: Tasks per member, hours logged
- **Burndown Chart**: Sprint burndown (story points over time)
- **Maintenance Summary Report**: All tickets grouped by type and status
- **Asset Report**: Asset inventory list
- All reports exportable to PDF via `window.print()`

### 5.14 Settings

- **General**: System name, logo (base64), timezone, date format, currency
- **Roles**: View and describe role permissions (static, not configurable in MVP)
- **Data Management**: Export all data to JSON, Import from JSON, Reset/clear all data
- **PWA**: Install prompt, check for update
- **About**: Version, phase, changelog

---

## 6. Role & Permission Matrix

| Feature / Page | Admin / PM | Developer | Viewer / Client |
|---|:---:|:---:|:---:|
| Dashboard (all projects) | ✓ | — | — |
| Dashboard (assigned projects) | ✓ | ✓ | — |
| Project List (all) | ✓ | — | — |
| Project List (own) | ✓ | ✓ | — |
| Project Detail | ✓ | ✓ (assigned only) | ✓ (own projects) |
| Board (all tasks) | ✓ | — | — |
| Board (own tasks only) | ✓ | ✓ | — |
| Board (read-only view) | ✓ | ✓ | ✓ |
| Create / Edit Task | ✓ | ✓ (assigned) | — |
| Delete Task | ✓ | — | — |
| Backlog | ✓ | ✓ (view only) | — |
| Sprint Management | ✓ | — | — |
| Gantt Chart | ✓ | ✓ (view only) | ✓ (view only) |
| Maintenance Module | ✓ | ✓ (assigned) | — |
| Maintenance Report & Invoice | ✓ | — | — |
| Reports | ✓ | — | — |
| Client Management | ✓ | — | — |
| Asset Management | ✓ | — | — |
| Member Management | ✓ | — | — |
| Settings | ✓ | — | — |

### Role Definitions

| Role | Description |
|---|---|
| `admin` | Full access to all features. Can manage members, settings, clients, assets. |
| `pm` | Same as admin for project-related features. Primary role for project managers. |
| `developer` | Can view and manage tasks assigned to them. Can log time and add comments. |
| `viewer` | Read-only access to projects they are assigned to. Can view board and Gantt only. |

---

## 7. Data Models

### IndexedDB Object Stores

```
Database name: trackly_db
Version: 1

Object Stores:
├── users           (keyPath: id)
├── projects        (keyPath: id)
├── tasks           (keyPath: id)    — indexes: project_id, sprint_id, assignees
├── sprints         (keyPath: id)    — indexes: project_id
├── clients         (keyPath: id)
├── assets          (keyPath: id)
├── maintenance     (keyPath: id)    — indexes: project_id, status
├── invoices        (keyPath: id)    — indexes: project_id
├── activity_log    (keyPath: id)    — indexes: project_id, user_id
└── settings        (keyPath: key)   — single store for app-wide settings
```

### ID Format

All IDs follow a consistent prefixed pattern:

| Entity | Prefix | Example |
|---|---|---|
| User | `USR-` | `USR-0001` |
| Project | `PRJ-` | `PRJ-0001` |
| Task | `TSK-` | `TSK-0042` |
| Sprint | `SPR-` | `SPR-0007` |
| Client | `CLT-` | `CLT-0003` |
| Asset | `AST-` | `AST-0012` |
| Maintenance | `MNT-` | `MNT-0088` |
| Invoice | `INV-` | `INV-0005` |

---

## 8. Page & Module Map

```
TRACKLY — Page Map

/ (Login Page)
│
└── /dashboard
    ├── /projects
    │   └── /projects/:id
    │       ├── Overview
    │       ├── Board (Kanban)
    │       ├── Backlog
    │       ├── Sprint
    │       ├── Gantt
    │       ├── Maintenance    [PM/Admin only]
    │       └── Reports        [PM/Admin only]
    ├── /clients               [PM/Admin only]
    ├── /assets                [PM/Admin only]
    ├── /members               [PM/Admin only]
    └── /settings              [PM/Admin only]
```

### Layout Structure

```
┌──────────────────────────────────────────────────┐
│  TOPBAR  [Logo] [Page Title]    [Search] [User]  │
├──────────┬───────────────────────────────────────┤
│          │                                       │
│ SIDEBAR  │           MAIN CONTENT                │
│          │                                       │
│ Nav      │  ┌───────────────────────────────┐    │
│ Links    │  │  PAGE HEADER (title + actions)│    │
│          │  ├───────────────────────────────┤    │
│ Project  │  │                               │    │
│ Quick    │  │  CONTENT AREA                 │    │
│ Links    │  │                               │    │
│          │  └───────────────────────────────┘    │
│          │                                       │
└──────────┴───────────────────────────────────────┘
```

---

## 9. Development Phases (1–17)

Each phase must be fully completed and tested before proceeding to the next. Each phase produces a working, demonstrable deliverable.

---

### Phase 1 — Project Scaffolding & Structure
**Scope**: Folder structure, base HTML, CSS reset, design tokens, fonts, icons  
**Deliverable**: A clean, empty project with all files in place, design tokens loaded, and fonts/icons rendering correctly in the browser

Tasks:
- [x] Set up complete folder structure exactly as defined in section 12
- [x] Create `index.html` as the single entry point (with PWA meta tags, manifest link, module script tag)
- [x] Create `manifest.json` with app name, icons, theme color, display mode
- [x] Create `css/main.css` with full design token definitions (`:root` custom properties from section 3)
- [x] Add CSS reset and base body/typography styles
- [x] Import Inter & JetBrains Mono via Google Fonts
- [x] Import Lucide Icons via CDN
- [x] Create empty placeholder files for all JS modules (just an exported empty function or comment)
- [x] Create empty CSS files for all page-specific stylesheets
- [x] Verify everything loads in browser without errors (open browser console — zero errors)

---

### Phase 2 — Layout Shell & Navigation
**Scope**: Sidebar, topbar, layout grid, router skeleton, page shells  
**Deliverable**: Full app layout visible in browser — sidebar, topbar, and content area switching between empty pages via URL hash

Tasks:
- [x] Create `css/layout.css` — define sidebar, topbar, and main content grid
- [x] Build sidebar component (`js/components/sidebar.js`) — nav links with Lucide icons and labels, collapsible toggle, active state highlight
- [x] Build topbar component (`js/components/topbar.js`) — logo slot, page title slot, user avatar dropdown placeholder
- [x] Implement hash-based router in `js/core/router.js` — map all routes from section 4 to page render functions
- [x] Create empty page shell render function for every route (renders just a heading with the page name)
- [x] Wire sidebar nav links to router — clicking a link updates the hash and renders the correct page shell
- [x] Add `css/components.css` with base button, badge, and card styles
- [x] Test all routes navigate correctly without page reload

---

### Phase 3 — Authentication & User Session
**Scope**: Login page UI and session management  
**Deliverable**: Styled login page with working form that stores a session in localStorage

Tasks:
- [x] Build login page UI (centered card layout, TRACKLY logo, username + password fields, "Remember me" toggle, submit button)
- [x] Implement `js/core/db.js` — full IndexedDB wrapper with `openDB()`, `getAll()`, `getById()`, `add()`, `update()`, `delete()` helpers for all object stores defined in section 7
- [x] Implement `js/core/auth.js` — `login()`, `logout()`, `getSession()`, `isAuthenticated()`, password hashing with Web Crypto API (SHA-256)
- [x] Route guard in router: redirect to `#/login` if no active session on any protected route
- [x] Successful login redirects based on role: `admin`/`pm` → `#/dashboard`, `developer` → `#/dashboard` (tasks view), `viewer` → `#/projects`
- [x] "Remember me" stores extended expiry in localStorage
- [x] Logout button in topbar dropdown clears session and redirects to login

---

### Phase 4 — First-Run Wizard & PWA Foundation
**Scope**: First-run account setup, service worker, offline capability  
**Deliverable**: App detects no users → shows setup wizard; app is installable as PWA and works offline after first load

Tasks:
- [x] First-run detection: on app start, if IndexedDB `users` store is empty, redirect to `#/setup` instead of `#/login`
- [x] Build first-run wizard page: step 1 — welcome screen; step 2 — create Admin account form (full name, username, email, password, confirm password); step 3 — success + "Go to Dashboard" button
- [x] Seed the first Admin user into IndexedDB on wizard completion
- [x] Implement `sw.js` — cache-first service worker that caches all static assets (`index.html`, all CSS, all JS, fonts, icons) on install
- [x] Register service worker in `index.html`
- [x] Add PWA install prompt logic — detect `beforeinstallprompt` event, show a dismissible banner with "Install App" button
- [x] Test: disconnect internet → reload page → app still works fully

---

### Phase 5 — Member Management
**Scope**: Full CRUD for users/members  
**Deliverable**: PM can create, view, edit, deactivate members with all profile fields

Tasks:
- [x] Member list page (table with avatar, name, role badge, status, actions)
- [x] Add / Edit member modal (all fields from section 5.9)
- [x] Avatar upload (resize to 150x150, store as base64)
- [x] Role badge component (color-coded per role)
- [x] Change password form
- [x] Deactivate / reactivate member
- [x] Search and filter members by role, status

---

### Phase 6 — Client Management
**Scope**: Full CRUD for clients  
**Deliverable**: PM can manage client records

Tasks:
- [x] Client list page (card or table view toggle)
- [x] Add / Edit client modal (all fields from section 5.10)
- [x] Client detail page with linked projects list
- [x] Logo upload (base64)
- [x] Search and filter by status, industry
- [x] Client status badge

---

### Phase 7 — Project Management Core
**Scope**: Create and manage projects  
**Deliverable**: PM can create projects, assign members, view project list

Tasks:
- [x] Project list page (card view with cover color, status badge, progress bar, client logo)
- [x] Create / Edit project modal (all fields from section 5.3)
- [x] Project detail overview page (summary, members, dates, budget vs actual)
- [x] Project status and phase management
- [x] Assign members to project with project-specific role override
- [x] Project quick-actions (archive, duplicate, delete with confirm)
- [x] Project search and filter (by status, phase, client, date range)

---

### Phase 8 — Task Management & Backlog
**Scope**: Task CRUD, backlog list view  
**Deliverable**: Tasks can be created, edited, and managed in backlog

Tasks:
- [x] Task creation form (all fields from section 5.8)
- [x] Task detail modal / slide-over panel
- [x] Rich text description area (basic Markdown render)
- [x] Assignee picker (multi-select with avatars)
- [x] Priority selector with color-coded icons
- [x] Tag input (autocomplete from existing tags)
- [x] Checklist widget (add/remove/check items)
- [x] Comments section (add, timestamped)
- [x] Backlog list page (sortable, filterable, bulk actions)
- [x] Inline quick-edit on backlog rows
- [x] Story points input

---

### Phase 9 — Kanban Board
**Scope**: Drag-and-drop board view  
**Deliverable**: Fully functional Kanban board per project

Tasks:
- [x] Board layout with configurable columns
- [x] Task cards with all metadata (priority icon, assignee avatar, due date, tag chips, checklist progress)
- [x] Drag-and-drop using native HTML5 Drag API (no library)
- [x] Add column, rename column, delete column
- [x] Task status auto-updates on drop
- [x] Swimlane toggle (group by assignee)
- [x] Board filter bar (assignee, priority, label, sprint)
- [x] Quick-add task in column header
- [x] Card color coding by priority

---

### Phase 10 — Sprint Management
**Scope**: Sprint creation, planning, and tracking  
**Deliverable**: PM can run sprints with full planning workflow

Tasks:
- Sprint list per project (create sprint with name, dates, goal)
- Sprint planning view: two-pane (backlog left, sprint right) with drag-to-assign
- Active sprint indicator in sidebar
- Sprint board (board filtered to active sprint tasks)
- Sprint completion flow: auto-move unfinished tasks to backlog or next sprint
- Sprint velocity chart (bar chart, story points completed per sprint)
- Sprint retrospective notes

---

### Phase 11 — Gantt Chart
**Scope**: Timeline visualization  
**Deliverable**: Interactive Gantt chart per project

Tasks:
- Gantt chart rendered on `<canvas>` or pure DOM (no external chart library)
- Task rows with horizontal bars (start → due date)
- Milestone markers (diamond shape)
- Sprint grouping rows
- Dependency arrows between tasks
- Zoom controls (Day / Week / Month)
- Drag to move task dates
- Drag to resize task duration
- Today line indicator
- Export to PNG via `canvas.toBlob()`

---

### Phase 12 — Maintenance Module
**Scope**: Bug/adjustment tracking for live projects  
**Deliverable**: Maintenance ticket CRUD and list view per project

Tasks:
- Maintenance tab visible only for projects in `running` or `maintenance` phase
- Maintenance ticket list (sortable, filterable by type, status, priority)
- Create / Edit maintenance ticket modal (all fields from section 5.12)
- Status pipeline: `Open → In Progress → Resolved → Closed`
- Priority and type badges
- Time tracking (estimated vs actual hours)
- Resolution notes field
- Assigned developer can update status and add resolution notes
- Activity log per ticket

---

### Phase 13 — Maintenance Report & Invoice (PDF)
**Scope**: Generate maintenance billing documents  
**Deliverable**: PM can generate and export maintenance reports and invoices as PDF

Tasks:
- Maintenance Report view: filter by date range, grouped by type
- Summary stats: total tickets, resolved %, avg resolution time, total hours
- Cost calculator: PM inputs hourly rate or per-ticket rates
- Invoice builder: pull company name/logo from settings, client info from project
- Invoice line items: ticket ID, type, description, hours, unit cost, subtotal
- Tax rate input, total calculation
- Print-optimized CSS layout for invoice (`@media print`)
- Export to PDF via `window.print()` (opens print dialog)

---

### Phase 14 — Asset Management
**Scope**: Asset inventory CRUD  
**Deliverable**: PM can manage company/project assets

Tasks:
- Asset list page (table with category icon, status badge, assigned-to)
- Create / Edit asset modal (all fields from section 5.11)
- Asset detail panel
- Image upload (base64)
- Filter by category, status, assigned user, project
- Asset assignment to project or user
- Warranty expiry warning (highlight if expiring within 30 days)

---

### Phase 15 — Reports Module
**Scope**: Project-level reporting  
**Deliverable**: PM can view and export all report types

Tasks:
- Project Progress Report page
- Team Workload Report (bar chart — tasks per member)
- Sprint Burndown Chart (line chart — story points vs time)
- Maintenance Summary Report
- Asset Inventory Report
- All charts drawn on `<canvas>` (no external library, or use Chart.js CDN)
- Print-to-PDF for all report pages
- Date range and filter controls per report

---

### Phase 16 — Polish, Accessibility & PWA Completion
**Scope**: UI/UX polish, performance, full PWA  
**Deliverable**: Production-quality feel, installable, fully offline

Tasks:
- Audit all pages for visual consistency
- Add page transition animations
- Responsive layout for tablet and mobile
- Keyboard navigation support (Tab, Enter, Escape on modals)
- ARIA labels on all interactive elements
- Toast notification system (success, error, warning, info)
- Confirm dialog component for all destructive actions
- Empty state illustrations (SVG) for all list pages
- Complete `sw.js` with full offline cache strategy
- PWA install prompt UI
- Data export / import (JSON backup/restore) in Settings
- Changelog page in Settings / About

---

### Phase 17 — Testing, Documentation & Handoff
**Scope**: Final QA, in-app help, and handoff package  
**Deliverable**: Stable `v1.0.0` release

Tasks:
- Manual QA checklist across all roles (Admin, Developer, Viewer)
- Edge case testing: empty states, long strings, large datasets
- Performance check: IndexedDB with 1000+ tasks
- In-app help tooltips on key features
- User guide page (rendered Markdown in-app)
- README update to reflect v1.0.0
- Tag GitHub release `v1.0.0`
- Record demo video / screenshots

---

## 10. Development Log

> This section is updated at the start and end of every phase.

```
╔══════════════════════════════════════════════════════════════════╗
║                    TRACKLY — DEVELOPMENT LOG                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Current Version   : v0.9.0-alpha                               ║
║  Current Phase     : Phase 10 — Sprint Management               ║
║  Phase Status      : NOT STARTED                                ║
║  Next Phase        : Phase 11 — Gantt Chart                     ║
╠══════════════════════════════════════════════════════════════════╣
║  PHASE LOG                                                      ║
║                                                                 ║
║  [x] Phase 1  — Project Scaffolding & Structure    v0.1.0      ║
║  [x] Phase 2  — Layout Shell & Navigation          v0.2.0      ║
║  [x] Phase 3  — Authentication & User Session      v0.3.0      ║
║  [x] Phase 4  — First-Run Wizard & PWA Foundation  v0.4.0      ║
║  [x] Phase 5  — Member Management                  v0.5.0      ║
║  [x] Phase 6  — Client Management                  v0.6.0      ║
║  [x] Phase 7  — Project Management Core            v0.7.0      ║
║  [x] Phase 8  — Task Management & Backlog          v0.8.0      ║
║  [x] Phase 9  — Kanban Board                       v0.9.0      ║
║  [ ] Phase 10 — Sprint Management                  v0.10.0     ║
║  [ ] Phase 11 — Gantt Chart                        v0.11.0     ║
║  [ ] Phase 12 — Maintenance Module                 v0.12.0     ║
║  [ ] Phase 13 — Maintenance Report & Invoice       v0.13.0     ║
║  [ ] Phase 14 — Asset Management                   v0.14.0     ║
║  [ ] Phase 15 — Reports Module                     v0.15.0     ║
║  [ ] Phase 16 — Polish, Accessibility & PWA        v0.16.0     ║
║  [ ] Phase 17 — Testing, Documentation & Handoff  v1.0.0      ║
╠══════════════════════════════════════════════════════════════════╣
║  CHANGE LOG                                                     ║
║                                                                 ║
║  v0.1.0  [2026-02-27]  Initial scaffold & design system       ║
║  v0.2.0  [2026-02-28]  Layout shell, sidebar, topbar, router  ║
║  v0.3.0  [2026-02-28]  Auth & session: login UI, IndexedDB,   ║
║                         SHA-256 hashing, route guards, role-   ║
║                         based redirect, remember me, logout     ║
║  v0.4.0  [2026-02-28]  First-run wizard (3-step), Admin seed, ║
║                         full SW cache, PWA install banner       ║
║  v0.5.0  [2026-02-28]  Member Management: list, add/edit,     ║
║                         avatar upload, role & status badges,    ║
║                         change password, deactivate/reactivate, ║
║                         search & filter. modal/toast/confirm/   ║
║                         badge/avatar components implemented.    ║
║  v0.6.0  [2026-02-28]  Client Management: card+table view,    ║
║                         add/edit/delete modal, client detail    ║
║                         with linked projects, logo upload,      ║
║                         search & filter by status/industry,     ║
║                         status badge (active/inactive/prospect).║
║  v0.7.0  [2026-02-28]  Project Management Core: card grid     ║
║                         with cover color, status/priority/      ║
║                         overdue badges, progress bar, client    ║
║                         logo; create/edit modal with all        ║
║                         section 5.3 fields, member picker with  ║
║                         per-project role, color picker; detail  ║
║                         page with banner, subnav, stats row,    ║
║                         budget overview, team panel; filter by  ║
║                         status, phase, client; delete confirm.  ║
║  v0.8.0  [2026-02-28]  Task Management & Backlog: full task    ║
║                         CRUD with all section 5.8 fields;       ║
║                         backlog list with sort, filter (status, ║
║                         priority, type, assignee), search;      ║
║                         inline status quick-edit; bulk select,  ║
║                         bulk status/priority/sprint/delete;     ║
║                         task detail slide-over with markdown    ║
║                         render, live checklist, comment thread; ║
║                         assignee chip picker, tag input, story  ║
║                         points, checklist widget; project       ║
║                         subnav context on all backlog views.    ║
║  v0.9.0  [2026-02-28]  Kanban Board: configurable columns per  ║
║                         project (stored localStorage); native   ║
║                         HTML5 Drag API with drop-zone highlight ║
║                         and auto status update; 5 default cols  ║
║                         (Backlog/To Do/In Progress/In Review/   ║
║                         Done); add/rename/delete column; task   ║
║                         cards with priority border, type badge, ║
║                         tags, sprint, checklist progress, due   ║
║                         date, assignee avatars; quick-add task  ║
║                         from column header; full task modal;    ║
║                         swimlane toggle (group by assignee);    ║
║                         filter bar (assignee, priority, label,  ║
║                         sprint); task detail slide-over; card   ║
║                         color coding by priority.               ║
╚══════════════════════════════════════════════════════════════════╝
```

### How to Update This Log

When starting a phase, update:
1. `Current Phase` to the phase name
2. `Phase Status` to `IN PROGRESS`
3. Check off completed tasks with `[x]` in the phase definition

When completing a phase, update:
1. `Phase Status` to `COMPLETED`
2. `Next Phase` to the upcoming phase
3. Check `[x]` next to the phase in the phase log above
4. Add a new line to `CHANGE LOG` with version, date, and summary

---

## 11. UI/UX Guidelines

### Core Principles

1. **No emoji in UI** — Use Lucide SVG icons everywhere. Emoji are prohibited in all UI elements.
2. **Dynamic feel** — Every interaction should have feedback. No dead buttons. Use hover states, active states, loading states.
3. **Consistent spacing** — Use an 8px grid. Padding: `8px`, `16px`, `24px`, `32px`. Gap: `8px`, `16px`, `24px`.
4. **Hierarchy is visual** — Use size, weight, and color to establish hierarchy, not just headings.
5. **White space is content** — Do not fill every pixel. Let the layout breathe.
6. **Mobile-aware** — Sidebar collapses to icon-only below 1024px. Modals are full-screen on mobile.

### Component Patterns

- **Modals**: Always centered, with `backdrop-filter: blur(4px)` overlay. Close on ESC and backdrop click.
- **Forms**: Labels above inputs. Validation errors appear below the input in red. Required fields marked with `*`.
- **Tables**: Striped rows (`--color-surface` on even). Fixed header on scroll. Action buttons visible on row hover only.
- **Cards**: Rounded corners (`--radius-md`), subtle shadow (`--shadow-card`), hover lift effect.
- **Badges**: Small, rounded pill. Use system colors (`success`, `warning`, `danger`, `info`, `primary`).
- **Empty States**: SVG illustration + heading + subtext + primary action button. Every list page must have one.
- **Toasts**: Top-right corner, stack vertically, auto-dismiss after 4 seconds, swipe-to-dismiss.

### Do & Don't

| Do | Don't |
|---|---|
| Use Lucide icons consistently | Use emoji as UI elements |
| Show loading/skeleton states | Leave UI blank while loading |
| Confirm before destructive actions | Delete without confirmation |
| Use color + icon together for status | Rely on color alone |
| Label all form fields | Use placeholder as the only label |
| Use relative dates ("3 days ago") | Always show raw timestamps |
| Keep modals focused on one task | Stack multiple tasks in one modal |

---

## 12. File Structure

```
trackly/
│
├── index.html                  # Single entry point
├── manifest.json               # PWA manifest
├── sw.js                       # Service Worker
├── README.md                   # This file
│
├── assets/
│   ├── icons/                  # App icons (192x192, 512x512 PNG for PWA)
│   └── logo.svg                # TRACKLY logo
│
├── css/
│   ├── main.css                # Design tokens, reset, base styles
│   ├── layout.css              # Sidebar, topbar, grid
│   ├── components.css          # Buttons, inputs, badges, modals, toasts
│   ├── pages/
│   │   ├── dashboard.css
│   │   ├── board.css
│   │   ├── gantt.css
│   │   ├── maintenance.css
│   │   └── reports.css
│   └── print.css               # Print / PDF export styles
│
└── js/
    ├── core/
    │   ├── db.js               # IndexedDB wrapper
    │   ├── router.js           # Hash router
    │   ├── auth.js             # Session management
    │   ├── store.js            # Reactive state
    │   └── utils.js            # Helpers
    ├── modules/
    │   ├── dashboard.js
    │   ├── projects.js
    │   ├── board.js
    │   ├── backlog.js
    │   ├── sprint.js
    │   ├── gantt.js
    │   ├── maintenance.js
    │   ├── assets.js
    │   ├── clients.js
    │   ├── members.js
    │   ├── reports.js
    │   └── settings.js
    └── components/
        ├── modal.js
        ├── toast.js
        ├── sidebar.js
        ├── topbar.js
        ├── avatar.js
        ├── badge.js
        └── confirm.js
```

---

## 13. Local Setup & PWA

### Running Locally

TRACKLY requires no build tools. To run locally:

**Option 1 — VS Code Live Server**
1. Open the `trackly/` folder in VS Code
2. Install the "Live Server" extension
3. Right-click `index.html` → "Open with Live Server"
4. Access at `http://127.0.0.1:5500`

**Option 2 — Python HTTP Server**
```bash
cd trackly/
python -m http.server 5500
# Access at http://localhost:5500
```

**Option 3 — Node HTTP Server**
```bash
npx serve .
# Access at the printed URL
```

> **Important**: TRACKLY must be served over HTTP/HTTPS (not `file://`) for IndexedDB, Service Workers, and Web Crypto API to function correctly.

### GitHub Pages Deployment

1. Push to `main` branch
2. Go to repository Settings → Pages
3. Set source to `main` branch, `/` (root)
4. Access at `https://yourusername.github.io/trackly/`

### PWA Installation

Once served over HTTPS (or localhost), the browser will show an install prompt:
- Chrome/Edge: Install icon in address bar
- Safari iOS: Share → "Add to Home Screen"

The Service Worker (`sw.js`) caches all app assets on first load, enabling full offline use.

### Data Persistence

- All data is stored in the browser's **IndexedDB** (persists across sessions, survives refresh)
- `localStorage` is used only for session token and UI preferences
- Data is **not synced** across devices or browsers — it is local to that browser profile
- Use **Settings → Export Data** to back up all data as a JSON file
- Use **Settings → Import Data** to restore from a JSON backup

---

## 14. Naming Conventions

### CSS

- Custom properties: `--color-primary`, `--radius-md`, `--shadow-card`
- Classes: `kebab-case` — e.g., `.task-card`, `.status-badge`, `.sidebar-nav-item`
- Modifiers: BEM-like — e.g., `.btn`, `.btn--primary`, `.btn--sm`
- State: `.is-active`, `.is-loading`, `.is-hidden`, `.is-dragging`

### JavaScript

- Variables & functions: `camelCase` — e.g., `const activeProject`, `function getTaskById()`
- Classes: `PascalCase` — e.g., `class TaskCard`, `class Router`
- Constants: `UPPER_SNAKE_CASE` — e.g., `const DEFAULT_ROLE = 'viewer'`
- Event handlers: `handleVerbNoun` — e.g., `handleTaskClick`, `handleFormSubmit`
- Async functions: suffix with action — e.g., `fetchProjects()`, `saveTask()`, `deleteClient()`

### Files

- HTML/CSS/JS files: `kebab-case` — e.g., `board.js`, `maintenance.css`
- All filenames must be lowercase

### Data / IDs

- All entity IDs: uppercase prefix + 4-digit number — e.g., `PRJ-0001`, `TSK-0042`
- Timestamps: ISO 8601 string — `new Date().toISOString()`
- Status/enum values: `snake_case` string — e.g., `in_progress`, `user_request`

---

## 15. Contribution Guidelines for AI

> This section is specifically for AI assistants helping develop TRACKLY.

### Before Writing Code

1. Read this README fully before starting any task
2. Identify which phase the task belongs to
3. Confirm that all prerequisite phases are complete
4. Check the file structure — never create files outside the defined structure
5. Check the design system — never introduce new colors, fonts, or spacing not in the tokens

### Code Quality Rules

- **No external libraries** unless explicitly listed in this README (Lucide Icons and Chart.js are approved)
- **No inline styles** — all styling goes in the appropriate CSS file
- **No `var`** — use `const` and `let` only
- **No `innerHTML` with unsanitized user input** — always sanitize or use `textContent`
- **All database operations** must go through `db.js` — never access IndexedDB directly in modules
- **All date formatting** must use `utils.js` helpers — never format dates inline
- **All user-facing text** must be consistent in tone: professional, concise, in English

### When Adding a New Feature

1. Add the data model to section 7 if it introduces a new entity
2. Add the route to section 4 if it introduces a new page
3. Update the phase task list in section 9 to mark it complete
4. Update the Development Log in section 10 with the version change

### Prohibited Patterns

- No `alert()`, `confirm()`, or `prompt()` — use the custom modal and confirm components
- No `console.log()` left in production code — use a `debug()` utility that can be toggled
- No hardcoded IDs or magic numbers in logic — use named constants
- No page reload (`location.reload()`) to update UI — re-render the affected component
- No emoji in any UI-facing string, label, or button text

### Mandatory README Update After Every Phase

This is **non-negotiable**. Every time a phase is completed, the AI must update `README.md` before delivering the output. Failure to do this breaks the workflow for the next phase.

Checklist of required README updates at phase completion:

1. In **section 1 (Project Overview)** table:
   - Update `Current Version` to the new version (e.g., `v0.2.0`)
   - Update `Current Phase` to the next phase name

2. In **section 9 (Development Phases)**:
   - Mark every completed task in the finished phase with `[x]`

3. In **section 10 (Development Log)**:
   - Update `Current Version` in the log box
   - Update `Current Phase` to the **next** phase name
   - Update `Phase Status` to `NOT STARTED` (for the incoming phase)
   - Update `Next Phase` to the phase after that
   - Mark the completed phase `[x]` in the PHASE LOG list
   - Add a new line to `CHANGE LOG`: `vX.X.X  [DATE]  Brief summary of what was built`

The updated `README.md` **must be included** in the `.zip` output alongside all code files.

---

### Output Format

When a phase is complete, the AI must deliver a **single `.zip` file** containing:

```
trackly-phaseN.zip
└── trackly/
    ├── README.md          ← updated for this phase
    ├── index.html
    ├── manifest.json
    ├── sw.js
    ├── assets/
    ├── css/
    └── js/
```

Rules for the `.zip` output:
- The root folder inside the zip must always be named `trackly/`
- The zip filename must follow the pattern: `trackly-phase1.zip`, `trackly-phase2.zip`, etc.
- All files from previous phases must be included — never deliver a partial project
- Never omit files that were created in earlier phases; the zip must always be the **complete, runnable project** at that point in time

---

### How to Read the Project for Continuation

When given a `.zip` from a previous phase and asked to continue to the next phase, the AI must:

1. Extract and read `README.md` first — understand current version, completed phases, and what the next phase requires
2. Read all existing code files to understand what has already been built — never re-implement what already exists
3. Identify exactly which tasks in the next phase definition are not yet done
4. Build only what is missing — extend existing files, do not rewrite them from scratch unless necessary
5. Follow all code quality rules, naming conventions, and design system decisions already established in the codebase
6. Deliver the complete updated project as a new `.zip` with the README updated

---

### When in Doubt

- Refer to the Design System (section 3) for any visual decision
- Refer to the Role & Permission Matrix (section 6) before showing/hiding any feature
- Refer to the Data Models (section 7) before adding or removing fields
- If the task is unclear, ask the PM (user) for clarification before writing code

---

*TRACKLY — Track Everything, Deliver Anything*  
*v0.9.0-alpha | Phase 9 of 17 complete | Internal IT Consultant PMIS*
