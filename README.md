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
9. [Development Phases (1–20)](#9-development-phases-120)
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
| **Current Version** | `v1.10.0` |
| **Current Phase** | Phase 30 — (TBD) |
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
#/projects/:id/discussion
#/projects/:id/log
#/meetings
#/meetings/:id
#/clients
#/assets
#/members
#/settings
#/guide
#/notifications
#/notes
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

### 5.15 Audit Trail (Activity Log per Project)

Every project has a dedicated **Log** tab visible to Admin and PM. The log captures all significant changes made within the project context — who did what, where, and when.

**Log Entry fields:**

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (`ACT-XXXX`) |
| `project_id` | Ref | Project context (nullable for global actions) |
| `entity_type` | Enum | `project`, `task`, `sprint`, `member`, `maintenance`, `asset`, `meeting`, `discussion` |
| `entity_id` | String | ID of the affected record |
| `entity_name` | String | Snapshot of entity name at time of action (survives deletion) |
| `action` | Enum | `created`, `updated`, `deleted`, `status_changed`, `assigned`, `unassigned`, `commented`, `uploaded`, `sprint_started`, `sprint_completed`, `member_added`, `member_removed`, `meeting_scheduled`, `meeting_completed` |
| `actor_id` | Ref | User ID who performed the action |
| `actor_name` | String | Snapshot of user's full name at time of action |
| `changes` | Array | `[{ field, old_value, new_value }]` — for `updated` and `status_changed` actions |
| `metadata` | Object | Free-form context (e.g. sprint name, comment excerpt) |
| `created_at` | Timestamp | |

**UI features:**
- Tab **Log** on every project detail page (Admin/PM only)
- Timeline list — newest first, paginated (50 per page)
- Filter by: entity type, actor, action, date range
- Each entry shows: actor avatar + name, action description, entity link, timestamp (relative + absolute on hover)
- Diff display for `updated` entries: shows old value → new value per field
- `logActivity()` helper function in `utils.js` — all modules call this after every write operation
- Global Activity Feed on Dashboard shows the 20 most recent log entries across all projects

### 5.16 Meeting Agenda & Notulensi

A global **Meetings** module accessible from the sidebar (Admin/PM only). Meetings can optionally be linked to one or more projects.

**Meeting fields:**

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (`MTG-XXXX`) |
| `title` | String | Required |
| `description` | Text | Optional context / objective |
| `type` | Enum | `internal`, `client_meeting`, `sprint_review`, `retrospective`, `other` |
| `date` | Date | Meeting date |
| `start_time` | String | e.g. `09:00` |
| `end_time` | String | e.g. `10:30` |
| `location` | String | Physical room name or video call URL |
| `project_ids` | Array | Linked project IDs (optional, supports multi-project meetings) |
| `attendee_ids` | Array | User IDs of attendees |
| `agenda_items` | Array | `[{ id, text, order, done }]` — checklist-style agenda |
| `status` | Enum | `scheduled`, `ongoing`, `done`, `cancelled` |
| `notulensi` | Object | `{ content: String (Markdown), attachments: Array, created_by, updated_at }` |
| `action_items` | Array | `[{ text, assignee_id, due_date, task_id (optional ref) }]` — can be converted to tasks |
| `created_by` | Ref | User ID |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

**UI features:**
- Sidebar entry: **Meetings** (Admin/PM only) between Members and Settings
- **Calendar view** — mini calendar on left panel, meeting list for selected date on right panel. Toggle between Month and Week view.
- Meeting detail page (`#/meetings/:id`) — full agenda, attendee list, status controls
- **Notulensi panel** — two modes:
  - *Direct notes*: Markdown editor with live preview
  - *File attachment*: Upload documents (PDF, DOCX, images) stored as base64, max 5MB per file, with filename + download link display
- **Action Items** tab inside meeting detail — list of follow-up tasks with assignee and due date. "Create Task" button converts an action item into a real task in the linked project's backlog
- Quick status advance: Scheduled → Ongoing → Done
- Attendance list with avatar chips
- All meeting create/edit/cancel actions are logged to Audit Trail

### 5.18 Maintenance Enhancement (Phase 21)

The Maintenance module receives a major upgrade to support real SLA-based maintenance workflows for IT consultants managing live client projects.

**Enhanced Maintenance Ticket fields (additions to 5.12):**

| Field | Type | Notes |
|---|---|---|
| `severity` | Enum | `major`, `minor` — impact classification, separate from priority |
| `assigned_date` | Date | When the ticket was formally assigned |
| `due_date` | Date | Target completion date |
| `ordered_by` | Ref | User ID of the PM who ordered/commissioned the ticket |
| `pic_dev_ids` | Array | User IDs of assigned developers — dev visibility filter |
| `pic_client` | String | Name of client PIC — viewer visibility filter |
| `attachments` | Array | `[{ name, data (base64), size, mime_type }]` — max 5MB per file |

**Visibility rules:**
- Developer: only sees tickets where `pic_dev_ids` includes `session.userId`
- Viewer/Client: only sees tickets where `pic_client` matches their name or `viewer_user_ids` includes their ID

**Export enhancements (maintenance-report.js):**
- Export to **Excel (.xlsx)** via SheetJS — text only, no attachments
- Export to **CSV** — plain text download
- Export to **PDF** — existing `window.print()`, now includes new fields
- All date fields in export use **Indonesian date format** (DD MMMM YYYY)

---

### 5.17 Project Discussion

A **Discussion** tab inside every project (visible to all project members — Admin, PM, Developer). Functions as an informal thread board for project-level updates, questions, decisions, and blockers.

**Discussion Post fields:**

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (`DSC-XXXX`) |
| `project_id` | Ref | Required |
| `title` | String | Optional — for structured threads |
| `content` | Text | Markdown-supported. Required. |
| `type` | Enum | `update`, `question`, `decision`, `blocker`, `general` |
| `author_id` | Ref | User ID |
| `pinned` | Boolean | PM/Admin can pin important posts |
| `attachments` | Array | `[{ name, data (base64), size, mime_type }]` — max 5MB per file |
| `replies` | Array | `[{ id, author_id, content, created_at }]` — inline reply thread |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

**UI features:**
- **Discussion tab** in project subnav — between Reports and (if applicable) Maintenance
- Feed layout — newest posts at top, paginated
- Post type badge with color coding: `blocker` = red, `decision` = purple, `question` = blue, `update` = green, `general` = neutral
- **Pin** feature — pinned posts appear at top of feed regardless of date
- Inline reply thread — collapsible, shows reply count badge
- Markdown render for post content and replies
- File attachment (same base64 approach as notulensi, max 5MB per file)
- Edit / delete own posts (PM/Admin can delete any post)
- All new posts and replies logged to Audit Trail

---

### 5.19 Notification Center (Phase 23)

Real-time in-app notification system that automatically informs relevant team members whenever significant actions are performed in the system.

**Data Model — `notifications` store:**

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (`NTF-XXXX`) |
| `user_id` | Ref | User ID penerima notifikasi |
| `actor_id` | Ref | User ID yang melakukan aksi (bisa null untuk sistem) |
| `actor_name` | String | Snapshot nama aktor |
| `actor_avatar` | String | Snapshot avatar aktor |
| `entity_type` | Enum | `task`, `sprint`, `project`, `maintenance`, `meeting`, `discussion`, `member`, `client`, `asset` |
| `entity_id` | String | ID entitas terkait |
| `entity_name` | String | Snapshot nama entitas |
| `action` | String | `created`, `updated`, `deleted`, `status_changed`, dll. |
| `message` | String | Pesan siap tampil — contoh: "Budi membuat task X di Project Alpha" |
| `project_id` | String | Project context (nullable) |
| `project_name` | String | Snapshot nama project (nullable) |
| `read` | Boolean | `false` = unread, `true` = sudah dibaca |
| `created_at` | Timestamp | ISO string |

**Features:**
- **Bell icon** di topbar dengan badge merah menampilkan jumlah unread (max "99+")
- **Dropdown panel** (360px) — 20 notifikasi terbaru, animasi slide-in, mark-all-as-read
- **Notification Center page** (`#/notifications`) — full list, tab Semua/Belum Dibaca, paginasi 30/halaman
- **Auto-generate**: setiap `logActivity()` membuat notifikasi untuk semua member relevan (kecuali aktor sendiri)
- **Navigasi cerdas**: klik item → mark as read + navigate ke halaman relevan
- **IndexedDB v5**: `notifications` store dengan index `user_id`, `read`, `created_at`

---

### 5.20 Personal Notes (Phase 24–25)

Private note-taking module per user. Inspired by Obsidian/Notion — simple, personal, with optional sharing.

**Data Model — `notes` store (IndexedDB v7):**

| Field | Type | Notes |
|---|---|---|
| `id` | String | Auto-generated (`NOTE-XXXX`) |
| `user_id` | Ref | User ID pemilik note |
| `owner_id` | Ref | Sama dengan `user_id` — field eksplisit untuk clarity |
| `title` | String | Judul note (nullable — fallback ke 30 char pertama content) |
| `content` | Text | Plain text dengan Markdown support |
| `folder_id` | Ref | ID folder (nullable = All Notes) |
| `pinned` | Boolean | `true` = tampil di atas list |
| `color` | String | Hex color pastel (null = white) |
| `tags` | Array | Tag string bebas |
| `shared_with` | Array | Array of user_id yang punya akses. Default: `[]` |
| `share_permission` | String | `'view'` atau `'edit'`. Default: `'view'` |
| `created_at` | Timestamp | ISO string |
| `updated_at` | Timestamp | ISO string |

**Folders** disimpan di `localStorage` key `notes_folders_{userId}` (bukan IndexedDB).

**Features (Phase 24):**
- Two-column layout: panel kiri (search, pinned, folders, all notes) + panel kanan (editor)
- **Markdown editor** dengan toggle Edit/Preview — bold, italic, code, headings, lists, blockquote, links, hr
- **Auto-save** debounce 800ms dengan indikator "Saved"
- **Pin**: note pinned muncul di section Pinned di atas list
- **Color**: 7 warna pastel untuk card/label di panel kiri
- **Tags**: tambah/hapus tag inline di bottom toolbar
- **Folder management**: buat, rename (double-click), hapus folder — hapus folder memindah notes ke All Notes
- **Export per note**: tombol "Export .md" di toolbar → download file `.md`
- **Export semua**: JSON (bisa diimport kembali) atau Markdown gabungan
- **Import**: JSON dari hasil export — merge by ID (tidak menimpa yang sudah ada)
- **Responsif**: panel kiri collapse jadi drawer overlay di layar ≤ 768px

**Features (Phase 25 — Notes Sharing & Collaboration Audit):**
- **Share Note**: owner bisa membagikan note ke member lain via modal — pilih user, set permission (view/edit)
- **Permission levels**: `view` = textarea readonly + banner info; `edit` = bisa edit + autosave
- **Shared with me**: notes dari orang lain muncul di section "Dibagikan ke Saya" di panel kiri
- **Visual indicators**: badge "Shared" + label "Dari: [nama]" untuk received notes; icon share-2 untuk notes yang sudah dibagikan
- **Access control**: tombol Delete, Pin, Share, Tag, Color, Move Folder HANYA tampil untuk owner
- **Audit log**: setiap aksi pada note dicatat di store `note_audit`
- **Riwayat tab**: owner bisa melihat audit trail per-note sebagai timeline vertikal
- **Shared user audit**: aksi edit/view oleh non-owner dicatat sebagai `note_edited_shared` / `note_viewed_shared`

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
| **Project Discussion** | ✓ (create/edit/delete/pin) | ✓ (create/edit own/reply) | — |
| **Project Log (Audit Trail)** | ✓ (view) | — | — |
| **Meetings** | ✓ (full CRUD) | — | — |
| **Meeting Notulensi** | ✓ (create/edit) | — | — |
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
Version: 5

Object Stores:
├── users           (keyPath: id)
├── projects        (keyPath: id)
├── tasks           (keyPath: id)    — indexes: project_id, sprint_id, assignees
├── sprints         (keyPath: id)    — indexes: project_id
├── clients         (keyPath: id)
├── assets          (keyPath: id)
├── maintenance     (keyPath: id)    — indexes: project_id, status
├── invoices        (keyPath: id)    — indexes: project_id
├── activity_log    (keyPath: id)    — indexes: project_id, user_id  ← activated in Phase 18
├── meetings        (keyPath: id)    — indexes: date                 ← new in Phase 19
├── discussions     (keyPath: id)    — indexes: project_id           ← new in Phase 20
├── notifications   (keyPath: id)    — indexes: user_id, read, created_at  ← new in Phase 23
├── notes           (keyPath: id)    — indexes: user_id, folder_id, created_at, updated_at, pinned, shared_with (multiEntry)  ← Phase 24–25
├── note_audit      (keyPath: id)    — indexes: note_id, user_id, action, created_at  ← new in Phase 25
```

> **Note:** No new stores in Phase 21. DB bumped to version `4` to trigger `onupgradeneeded` for any migration logic needed by future phases.

```
└── settings        (keyPath: key)   — single store for app-wide settings
```

> **Note:** DB version must be bumped to `2` in `db.js` when adding `meetings` and `discussions` stores in Phase 19–20. The `onupgradeneeded` handler already creates stores dynamically from the `STORES` map — only the version number and new store definitions need to be added.

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
| Activity Log | `ACT-` | `ACT-0001` |
| Meeting | `MTG-` | `MTG-0001` |
| Discussion | `DSC-` | `DSC-0001` |
| Notification | `NTF-` | `NTF-0001` |

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
    │       ├── Discussion          [Admin/PM/Developer]
    │       ├── Log (Audit Trail)   [Admin/PM only]
    │       ├── Maintenance         [Admin/PM only — running/maintenance phase]
    │       └── Reports             [Admin/PM only]
    ├── /meetings                   [Admin/PM only]
    │   └── /meetings/:id           [Admin/PM only]
    ├── /clients                    [Admin/PM only]
    ├── /assets                     [Admin/PM only]
    ├── /members                    [Admin/PM only]
    ├── /guide
    └── /settings                   [Admin/PM only]
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

## 9. Development Phases (1–20)

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
- [x] Implement- **js/sw.js**: Basic service worker
  - [ ] Adjust caching strategies for dynamic content from Firestore
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
- [x] Sprint list per project (create sprint with name, dates, goal)
- [x] Sprint planning view: two-pane (backlog left, sprint right) with drag-to-assign
- [x] Active sprint indicator in sidebar
- [x] Sprint board (board filtered to active sprint tasks)
- [x] Sprint completion flow: auto-move unfinished tasks to backlog or next sprint
- [x] Sprint velocity chart (bar chart, story points completed per sprint)
- [x] Sprint retrospective notes

---

### Phase 11 — Gantt Chart
**Scope**: Timeline visualization  
**Deliverable**: Interactive Gantt chart per project

Tasks:
- [x] Gantt chart rendered on `<canvas>` or pure DOM (no external chart library)
- [x] Task rows with horizontal bars (start → due date)
- [x] Milestone markers (diamond shape)
- [x] Sprint grouping rows
- [x] Dependency arrows between tasks
- [x] Zoom controls (Day / Week / Month)
- [x] Drag to move task dates
- [x] Drag to resize task duration
- [x] Today line indicator
- [x] Export to PNG via `canvas.toBlob()`

---

### Phase 12 — Maintenance Module
**Scope**: Bug/adjustment tracking for live projects  
**Deliverable**: Maintenance ticket CRUD and list view per project

Tasks:
- [x] Maintenance tab visible only for projects in `running` or `maintenance` phase
- [x] Maintenance ticket list (sortable, filterable by type, status, priority)
- [x] Create / Edit maintenance ticket modal (all fields from section 5.12)
- [x] Status pipeline: `Open → In Progress → Resolved → Closed`
- [x] Priority and type badges
- [x] Time tracking (estimated vs actual hours)
- [x] Resolution notes field
- [x] Assigned developer can update status and add resolution notes
- [x] Activity log per ticket

---

### Phase 13 — Maintenance Report & Invoice (PDF)
**Scope**: Generate maintenance billing documents  
**Deliverable**: PM can generate and export maintenance reports and invoices as PDF

Tasks:
- [x] Maintenance Report view: filter by date range, grouped by type
- [x] Summary stats: total tickets, resolved %, avg resolution time, total hours
- [x] Cost calculator: PM inputs hourly rate or per-ticket rates
- [x] Invoice builder: pull company name/logo from settings, client info from project
- [x] Invoice line items: ticket ID, type, description, hours, unit cost, subtotal
- [x] Tax rate input, total calculation
- [x] Print-optimized CSS layout for invoice (`@media print`)
- [x] Export to PDF via `window.print()` (opens print dialog)

---

### Phase 14 — Asset Management
**Scope**: Asset inventory CRUD  
**Deliverable**: PM can manage company/project assets

Tasks:
- [x] Asset list page (table with category icon, status badge, assigned-to)
- [x] Create / Edit asset modal (all fields from section 5.11)
- [x] Asset detail panel
- [x] Image upload (base64)
- [x] Filter by category, status, assigned user, project
- [x] Asset assignment to project or user
- [x] Warranty expiry warning (highlight if expiring within 30 days)

---

### Phase 15 — Reports Module
**Scope**: Project-level reporting  
**Deliverable**: PM can view and export all report types

Tasks:
- [x] Project Progress Report page
- [x] Team Workload Report (bar chart — tasks per member)
- [x] Sprint Burndown Chart (line chart — story points vs time)
- [x] Maintenance Summary Report
- [x] Asset Inventory Report
- [x] All charts drawn on `<canvas>` (no external library, or use Chart.js CDN)
- [x] Print-to-PDF for all report pages
- [x] Date range and filter controls per report

---

### Phase 16 — Polish, Accessibility & PWA Completion
**Scope**: UI/UX polish, performance, full PWA  
**Deliverable**: Production-quality feel, installable, fully offline

Tasks:
- [x] Audit all pages for visual consistency
- [x] Add page transition animations
- [x] Responsive layout for tablet and mobile
- [x] Keyboard navigation support (Tab, Enter, Escape on modals)
- [x] ARIA labels on all interactive elements
- [x] Toast notification system (success, error, warning, info)
- [x] Confirm dialog component for all destructive actions
- [x] Empty state illustrations (SVG) for all list pages
- [x] Complete `sw.js` with full offline cache strategy
- [x] PWA install prompt UI
- [x] Data export / import (JSON backup/restore) in Settings
- [x] Changelog page in Settings / About

---

### Phase 17 — Testing, Documentation & Handoff
**Scope**: Final QA, in-app help, and handoff package  
**Deliverable**: Stable `v1.0.0` release

Tasks:
- [x] Manual QA checklist across all roles (Admin, Developer, Viewer)
- [x] Edge case testing: empty states, long strings, large datasets
- [x] Performance check: IndexedDB with 1000+ tasks
- [x] In-app help tooltips on key features (sidebar nav, topbar, action buttons)
- [x] User guide page (rendered in-app — 15 sections covering all features)
- [x] README update to reflect v1.0.0 with complete changelog
- [ ] Tag GitHub release `v1.0.0`
- [ ] Record demo video / screenshots

---

### Phase 18 — Audit Trail (Activity Log)
**Scope**: System-wide activity logging with per-project Log tab  
**Deliverable**: Every significant action in TRACKLY is recorded and viewable by Admin/PM

Tasks:
- [x] Create `logActivity(params)` helper function in `utils.js` — centralised write to `activity_log` store
- [x] Retrofit all existing modules to call `logActivity()` after every create, update, delete, and status change: `projects.js`, `tasks.js`/`backlog.js`, `board.js`, `sprint.js`, `maintenance.js`, `members.js`, `clients.js`, `assets.js`
- [x] Add **Log** tab to project subnav (Admin/PM only) — renders after Reports tab
- [x] Build `js/modules/log.js` — timeline list view, newest first
- [x] Each log entry shows: actor avatar + name, human-readable action description, entity name + type, relative timestamp (absolute on hover)
- [x] Diff display for `updated` entries: show field name, old value → new value
- [x] Filter bar: by entity type, actor (user), action type, date range
- [x] Pagination: 50 entries per page with Previous / Next controls
- [x] Add `css/pages/log.css` for timeline styles
- [x] Wire `ACT-` prefix into `ID_PREFIX` constants in `utils.js`
- [x] Update `db.js` — ensure `activity_log` store indexes cover `project_id` and `created_at`
- [x] Update Dashboard — replace the stub "Recent Activity" with real data from `activity_log` (last 20 entries across all projects)
- [x] Register route `#/projects/:id/log` in `app.js`
- [x] Update `sw.js` cache to include `log.js`

---

### Phase 19 — Meeting Agenda & Notulensi
**Scope**: Global meeting calendar with agenda management and notulensi  
**Deliverable**: Admin/PM can create, manage, and document meetings; action items can become tasks

Tasks:
- [x] Add `meetings` store to `db.js` — bump DB version to `2`, add store with `date` index
- [x] Add `MTG-` prefix to `ID_PREFIX` in `utils.js`
- [x] Build `js/modules/meetings.js` — list + calendar view
- [x] Calendar UI: left panel mini-calendar (month grid, week strip), right panel day's meeting list
- [x] Toggle between **Month view** (grid) and **Week view** (time-slot columns)
- [x] Meeting list card: title, type badge, time range, project links, attendee avatars, status badge
- [x] Create / Edit meeting modal — all fields from section 5.16
- [x] Attendee picker — multi-select with avatar chips (from members list)
- [x] Project link picker — optional multi-select from projects list
- [x] Agenda items widget — ordered checklist, drag to reorder, check off during meeting
- [x] Meeting detail page (`#/meetings/:id`) — full view with all sections
- [x] Quick status advance button: Scheduled → Ongoing → Done → (back to Scheduled if needed)
- [x] **Notulensi panel** — two-mode tabbed interface:
  - [x] Mode 1: Markdown text editor with live preview toggle
  - [x] Mode 2: File attachment — upload (PDF/DOCX/image, max 5MB), display filename + size + download link
- [x] **Action Items** section inside meeting detail — add items with assignee + due date
- [x] "Create Task" button on each action item — opens task creation modal pre-filled, links back to meeting, saves to selected project's backlog
- [x] Sidebar entry: **Meetings** (Admin/PM only) — placed between Members and Settings
- [x] Add `Meetings` to mobile nav and topbar route title map
- [x] Add `css/pages/meetings.css`
- [x] Register routes `#/meetings` and `#/meetings/:id` in `app.js`
- [x] Call `logActivity()` for all meeting create/update/cancel/complete actions
- [x] Update `sw.js` cache to include `meetings.js`
- [x] Update User Guide (`guide.js`) to add Meeting section

---

### Phase 20 — Project Discussion
**Scope**: Per-project discussion feed for team communication  
**Deliverable**: Team members can post updates, questions, decisions, and blockers within each project

Tasks:
- [x] Add `discussions` store to `db.js` — bump DB version to `3`, add store with `project_id` index
- [x] Add `DSC-` prefix to `ID_PREFIX` in `utils.js`
- [x] Build `js/modules/discussion.js` — feed layout per project
- [x] **Discussion tab** in project subnav — between Gantt and Log (visible to Admin, PM, Developer)
- [x] Feed view: posts newest first, paginated (20 per page)
- [x] Post card: type badge (color-coded), author avatar + name, relative timestamp, content (Markdown rendered), attachment count badge, reply count badge
- [x] **Pinned posts** section — appears above the regular feed, only if pins exist
- [x] Post type badge colours: `blocker` = danger red, `decision` = secondary purple, `question` = info blue, `update` = success green, `general` = neutral
- [x] Create post modal — title (optional), type selector, Markdown content editor, file attachment (max 5MB, base64)
- [x] Inline reply thread — collapsible, shows last 3 replies with "Show all N replies" expand
- [x] Edit / delete own post (PM/Admin can delete any post)
- [x] Pin / unpin post (Admin/PM only)
- [x] File attachment display — filename, size, mime icon, download link
- [x] Empty state with contextual CTA ("Start the conversation — post a project update")
- [x] Add `css/pages/discussion.css`
- [x] Register route `#/projects/:id/discussion` in `app.js`
- [x] Call `logActivity()` for post created, deleted, pinned
- [x] Update `sw.js` cache to include `discussion.js`
- [x] Update User Guide (`guide.js`) to add Discussion section


---

### Phase 21 — Maintenance Enhancement
**Scope**: Retrofit Maintenance module with attachment support, multi-dev PIC, client PIC visibility, severity field, date fields, and export to Excel/CSV  
**Deliverable**: Maintenance tickets support file attachments, multi-assignee dev visibility, client-side visibility filter, and export to Excel/CSV/PDF with Indonesian date format

Tasks:
- [x] Add new fields to maintenance ticket data model: `severity`, `assigned_date`, `due_date`, `ordered_by`, `pic_dev_ids` (array), `pic_client` (string), `attachments` (array)
- [x] DB version bump to `4` in `db.js` — no new store needed, only schema expansion
- [x] Update `maintenance.js` — add `severity` select (major/minor) to create/edit form
- [x] Add `assigned_date` (date picker) and `due_date` (date picker) to form
- [x] Add `ordered_by` (dropdown — PM/Admin users) to form
- [x] Replace single `assigned_to` with `pic_dev_ids` multi-select (developer users only)
- [x] Add `pic_client` text input to form (name of client PIC visible to that viewer)
- [x] Add file attachment upload to form (max 5MB per file, base64, same pattern as discussion.js)
- [x] Display attachments in ticket detail panel with filename, size, mime icon, download link
- [x] Developer visibility filter: developer only sees tickets where `pic_dev_ids` includes `session.userId`
- [x] Viewer/Client visibility filter: viewer only sees tickets where `pic_client` is non-empty (or filter by linked viewer user)
- [x] Show `severity` badge in ticket list and detail panel
- [x] Show `due_date` and `assigned_date` in ticket detail panel (Indonesian date format)
- [x] Show `ordered_by` name in ticket detail panel
- [x] Update ticket list table columns to reflect new fields
- [x] Update `maintenance-report.js` — add Export Excel (.xlsx) button using SheetJS CDN
- [x] Add Export CSV button (pure JS, no library needed)
- [x] Excel/CSV export: include all ticket fields, dates in Indonesian format (DD MMMM YYYY), no attachments
- [x] Update PDF export layout to include new fields (severity, due_date, assigned_date, ordered_by, pic_client)
- [x] Update `logActivity()` calls to reflect new fields in change tracking
- [x] Update User Guide (`guide.js`) — update section for Maintenance with new fields explanation
- [x] Update `sw.js` — no new files, but bump cache version to `v1.3.1`

---

### Phase 23 — Notification Center
**Scope**: Topbar bell icon, notification dropdown panel, full Notification Center page, auto-generate notifications from logActivity()  
**Version**: `v1.4.0`  
**Deliverable**: Bell icon in topbar with unread badge, dropdown with 20 latest notifications, full page at `#/notifications` with tab filter and pagination, notifications auto-generated for relevant members on every logActivity() call.

Tasks:
- [x] Bump DB version to `5` in `db.js` — add `notifications` object store (keyPath: `id`, indexes: `user_id`, `read`, `created_at`)
- [x] Add `NTF` prefix to `ID_PREFIX` in `utils.js`
- [x] Update `logActivity()` in `utils.js` — auto-generate notifications for all relevant recipients after writing activity log
- [x] Update `js/components/topbar.js` — add bell icon, unread badge, dropdown panel
- [x] Create `js/modules/notifications.js` — full Notification Center page
- [x] Create `css/pages/notifications.css` — bell, badge, dropdown, page styles
- [x] Register route `#/notifications` in `app.js`
- [x] Add `css/pages/notifications.css` to `index.html`
- [x] Update `sw.js` — add `notifications.js` and `notifications.css` to cache, bump to `v1.4.0`
- [x] Update README — section 5.19, section 7 (object stores), section 4 (routes), section 12 (file structure), version `v1.4.0`

---

### Phase 24 — Personal Notes
**Scope**: Private per-user note-taking module with folder management, Markdown editor, auto-save, color/pin/tag, import/export  
**Version**: `v1.5.0`  
**Deliverable**: Full Personal Notes page at `#/notes` — two-column layout with folder panel and Markdown editor, accessible from sidebar for all roles.

Tasks:
- [x] Add prefix `NOTE` and `NFLD` to `ID_PREFIX` in `utils.js`
- [x] Bump DB version to `6` in `db.js` — add `notes` object store (keyPath: `id`, indexes: `user_id`, `folder_id`, `created_at`, `updated_at`, `pinned`)
- [x] Create `js/modules/notes.js` — two-column layout, panel kiri (search, pinned, folders, all notes), Markdown editor with Edit/Preview toggle, debounced auto-save, pin, color, tags, folder management, per-note MD export, bulk export JSON/MD, import JSON
- [x] Create `css/pages/notes.css` — full styling for two-column layout, note list items, editor, bottom toolbar, color picker, folder items, mobile drawer
- [x] Register route `#/notes` in `app.js`
- [x] Add "Personal Notes" entry to sidebar (`sidebar.js`) between Meetings and Clients — visible all roles
- [x] Add `/notes` to topbar title map in `topbar.js`
- [x] Add store `notes` to export/import arrays in `settings.js`
- [x] Add `notes.css` to `index.html`
- [x] Update `sw.js` — add `notes.js` and `notes.css` to cache, bump to `v1.5.0`
- [x] Update README — section 5.20, section 4 (routes), section 7 (data models), section 8 (page map), section 9 (phases), section 10 (dev log), section 12 (file structure), version `v1.5.0`

---

### Phase 25 — Notes Sharing & Collaboration Audit

**Version:** `v1.6.0`
**Deliverable**: Owner bisa membagikan note ke member lain (view/edit), semua aktivitas note tercatat di audit log yang bisa dilihat owner.

- [x] Bump DB version ke `7` di `db.js`, tambah index `shared_with` (multiEntry) pada store `notes`, tambah store `note_audit` (keyPath: `id`, indexes: `note_id`, `user_id`, `action`, `created_at`)
- [x] Tambah prefix `NAUD` ke `ID_PREFIX` di `utils.js`
- [x] Update `loadNotes()` di `notes.js` — load own notes + shared notes, deduplicate, normalisasi field baru pada existing notes
- [x] Buat fungsi `getNoteAccess(note, userId)` — returns `'owner'` | `'edit'` | `'view'` | `null`
- [x] Buat fungsi `logNoteAudit(noteId, action, detail)` di `notes.js`
- [x] Tambahkan `logNoteAudit()` ke semua fungsi relevan: createNewNote, persistCurrentNote, deleteActiveNote, togglePin, setNoteColor, addTag, removeTag, moveNoteToFolder, exportNoteAsMd, selectNote
- [x] Tambahkan tombol Share di `renderEditorToolbar()` — hanya untuk owner
- [x] Buat fungsi `openShareModal(note, userId)` — modal share dengan member picker, permission radio, daftar akses + revoke
- [x] Buat fungsi `shareNote()` dan `unshareNote()`
- [x] Update `renderNoteListItem()` — badge "Shared", label "Dari: [nama]", icon share-2
- [x] Update `renderEditor()` — tab Riwayat (audit mode), readonly banner untuk view-only, disable textarea/toolbar untuk view permission
- [x] Buat fungsi `renderAuditLog(note)` dan `loadAuditPanel(note)`
- [x] Tambahkan section "Dibagikan ke Saya" di panel kiri
- [x] Tambahkan semua class CSS baru ke `css/pages/notes.css` (prefix `notes-share__` dan `notes-audit__`)
- [x] Bump `sw.js` cache version ke `v1.6.0`
- [x] Update README.md — section 5.20, section 7 (data models), section 9 (phases), section 10 (dev log), version `v1.6.0`

---

**Version**: `v1.6.1`  
**Date**: 2025-03-03  
**Type**: UX Improvement (Hotfix)

---

**Version**: `v1.6.2`  
**Date**: 2026-03-04  
**Type**: UX Fix (Icon Alignment)

### UX Fix: Icon Alignment & Positioning (Sistematis)

Diperbaiki masalah icon yang tidak rata secara vertikal dengan teks di samping icon, yang memengaruhi hampir semua halaman aplikasi. Root cause: banyak container icon+teks tidak menggunakan flex container yang proper.

**File yang diubah:**
- `css/layout.css` — `.page-header__title` ditambah `display:flex; align-items:center; gap`
- `css/components.css` — `.card__title` flex layout; `.icon-text` utility class baru; `[data-lucide]` fallback; svg rules untuk project card
- `css/pages/meetings.css` — `.meeting-card__meta` + `.meeting-card__meta-item` baru; `.meeting-detail-meta-item` baru; `.section-title svg`
- `js/modules/meetings.js` — HTML diperbarui untuk clock/location/agenda count menggunakan `.meeting-card__meta-item`; meeting detail meta menggunakan `.meeting-detail-meta-item`
- `css/pages/sprint.css` — `.sprint-planning__pane-header svg` sizing; `.sprint-planning__header-label`; `.sprint-card__meta-item` diperbarui ke 13px
- `js/modules/sprint.js` — inline style dihapus dari pane header icons
- `css/pages/board.css` — `.board-task-card__meta-pill svg` dan `.board-task-card__due svg` sizing ditambahkan
- `css/pages/log.css` — `.log-entry__action-icon` ditambah `justify-content:center`, `width/height`, hapus `margin-top:1px`
- `css/pages/discussion.css` — `.dsc-type-badge svg`, `.dsc-btn-reply-toggle`, meta helper classes
- `css/pages/notifications.css` — `.notif-item__icon` flex+svg
- `css/pages/maintenance.css` — `.mnt-detail__label` flex+svg
- `css/pages/assets.css` — `.asset-category-badge svg`, `.asset-category-icon`

### UX Improvement: Filter Modal System

Refactored filter UI across 9 pages from inline dropdown bars to a unified modal-based system.

**Files changed:**
- `css/components.css` — Added `.filter-btn-wrap`, `.filter-badge`, `.filter-chips`, `.filter-chip`, `.filter-modal-grid` global styles
- `js/modules/projects.js` — Replaced `.projects-filters` bar with Filter Modal + chips
- `js/modules/members.js` — Replaced `.members-filters` bar with Filter Modal + chips
- `js/modules/clients.js` — Replaced `.clients-filters` selects with Filter Modal + chips (view toggle preserved)
- `js/modules/backlog.js` — Replaced `.backlog-filters` selects with Filter Modal + chips (sort controls preserved)
- `js/modules/board.js` — Replaced `.board-filterbar` selects with Filter Modal + chips (search preserved)
- `js/modules/assets.js` — Replaced `.assets-filters` bar with Filter Modal + chips
- `js/modules/maintenance.js` — Replaced `.projects-filters` bar with Filter Modal + chips
- `js/modules/log.js` — Replaced `.log-filter-bar` card with Filter Modal + chips; added `openModal`/`closeModal` import
- `js/modules/gantt.js` — Replaced inline `#gantt-sprint-filter` select with Filter Modal; added `openModal`/`closeModal` import

**No changes to filter logic** (`getFilteredXxx`, `_getFilteredTasks`, etc.) — only UI rendering and event binding were modified. All filter state variables (`_filterXxx`) remain intact.

---

> This section is updated at the start and end of every phase.

```
╔══════════════════════════════════════════════════════════════════╗
║                    TRACKLY — DEVELOPMENT LOG                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Current Version   : v1.10.0                                    ║
║  Current Phase     : Phase 30 — (TBD)                           ║
║  Phase Status      : NOT STARTED                                ║
║  Next Phase        : Phase 31 — (TBD)                           ║
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
║  [x] Phase 10 — Sprint Management                  v0.10.0     ║
║  [x] Phase 11 — Gantt Chart                        v0.11.0     ║
║  [x] Phase 12 — Maintenance Module                 v0.12.0     ║
║  [x] Phase 13 — Maintenance Report & Invoice       v0.13.0     ║
║  [x] Phase 14 — Asset Management                   v0.14.0     ║
║  [x] Phase 15 — Reports Module                     v0.15.0     ║
║  [x] Phase 16 — Polish, Accessibility & PWA        v0.16.0     ║
║  [x] Phase 17 — Testing, Documentation & Handoff  v1.0.0      ║
║  [x] Phase 18 — Audit Trail                        v1.1.0      ║
║  [x] Phase 19 — Meeting Agenda & Notulensi         v1.2.0      ║
║  [x] Phase 20 — Project Discussion                 v1.3.0      ║
║  [x] Phase 21 — Maintenance Enhancement            v1.3.1      ║
║  [x] Phase 22 — Bugfix                             v1.3.2      ║
║  [x] Phase 23 — Notification Center                v1.4.0      ║
║  [x] Phase 24 — Personal Notes                     v1.5.0      ║
║  [x] Phase 25 — Notes Sharing & Collaboration Audit v1.6.0     ║
║  [x] Phase 26 — Maintenance Board View & Report Revamp v1.7.1 ║
║  [x] Phase 27 — UI Polish, Role Enforcement & Log      v1.8.0  ║
║  [x] Phase 28 — Bug Fixes, UI Polish & Roles           v1.9.0  ║
║  [x] Phase 29 — Parent-Child Hierarchies               v1.10.0 ║
╠══════════════════════════════════════════════════════════════════╣
║  CHANGE LOG                                                     ║
║                                                                 ║
║  v1.10.0 [2026-03-05] Phase 29: Parent-Child Hierarchies        ║
║    (Added sub-project nesting capabilities, updated all reports ║
║    and modules to utilize async banner titles, improved project ║
║    list tree-view layout, enabled maintenance report grouping)  ║
║                                                                 ║
║  v1.9.0 [2026-03-05]  Phase 28: Bug Fixes & UI Polish           ║
║    (Notes HTML fix, strict view-only roles for viewer/client,   ║
║    Members page admin-only, Dashboard UI revamp with interactive║
║    charts and sections, unified scrollable assignee checkboxes) ║
║                                                                 ║
║  v1.8.0 [2026-03-05]  Phase 27: UI Polish & Role Enforcement    ║
║    (Inline backlog toolbar, checkbox ui for assignees & shared  ║
║    notes, searchable grid for PM/Dev PIC, Audit log show-more   ║
║    pattern, Strict read-only state for viewer/client roles)     ║
║                                                                 ║
║  v1.7.4 [2026-03-04]  Bug Fix Phase 26 Fix 4: Maintenance Report —      ║
║    page header tampil identik dengan tab lain (z-index & layout fix);  ║
║    judul "Maintenance Report" dan subtitle nama project tidak lagi      ║
║    tertutup sticky subnav; tombol Export CSV / Export Excel /           ║
║    Generate PDF fully visible dan bisa diklik; hapus !important         ║
║    berlebihan dari page-header & page-header__actions; CSS di           ║
║    maintenance-report.css disederhanakan sesuai spec Fix 4              ║
║                                                                         ║
║  v1.7.3 [2026-03-04]  Bug Fix Phase 26 Fix 3: Maintenance Report —      ║
║    judul tidak lagi tertutup sticky subnav (padding-top & z-index fix), ║
║    tombol Export CSV / Excel / Generate PDF kembali bisa diklik;        ║
║    hapus inline style="padding:0" dari page-container, tambah           ║
║    position:relative + z-index:11 pada page-header & page-header__      ║
║    actions di maintenance-report.css                                    ║
║                                                                         ║
║  v1.7.2 [2026-03-04]  Bug Fix Phase 26 Fix 2: Maintenance Report —      ║
║    page header tampil kembali, subnav disamakan dengan maintenance      ║
║    (tab aktif Maintenance), tab "Maintenance Report" dihapus dari       ║
║    subnav (akses tetap via tombol Generate Report), tombol Export CSV / ║
║    Excel / PDF kembali tampil dan berfungsi (IDs: btnExportCSV,         ║
║    btnExportExcel, btnGeneratePDF); rpt-content-body padding added;     ║
║    maintenance-report.css page-header always visible with !important    ║
║                                                                         ║
║  v1.7.1 [2026-03-04]  Bug Fix Phase 26 Fix 1: Maintenance Report —
║    page header tampil kembali, subnav disamakan dengan maintenance,
║    tab aktif Maintenance, filter bar diganti searchbar + modal filter,
║    tombol Preview dihapus, overlay subnav diatasi                   ║
║                                                                 ║
║  v1.7.0 [2026-03-04]  Phase 26: Maintenance Board View          ║
║    (Kanban drag & drop, pipeline baru 6+2 status, permission   ║
║    per role, filter bar); Report PDF revamp (tabel 9 kolom,     ║
║    window.print); Form revamp (Reported By = PM/Admin,         ║
║    PIC Client = Viewer dropdown, PIC Dev = Developer only)      ║
║                                                                 ║
║  v1.6.5 [2026-03-04]  UX Fix: Banner Badge Contrast,          ║
║    Dashboard Show More & Subnav Layout Consistency             ║
║    - Banner badge contrast (badge--on-banner variant):         ║
║      Added .badge--on-banner modifier in components.css        ║
║      with white text, solid semi-opaque bg per variant,        ║
║      and glass border for readability over cover colors        ║
║    - Updated buildProjectBanner() in utils.js to use           ║
║      local bannerBadge() helper instead of renderBadge()       ║
║      so all 4 badges (status/phase/priority/overdue)           ║
║      in banner always render with badge--on-banner class       ║
║    - Updated renderBadge() in badge.js with optional 3rd       ║
║      param onBanner; Overview tab badges also updated          ║
║    - Dashboard show more: border-top separator added,          ║
║      chevron-down icon with rotate(180deg) CSS transition      ║
║      on is-expanded, count label in Indonesian                 ║
║      ("Tampilkan lebih banyak / lebih sedikit"); lucide icons  ║
║      re-rendered after toggle; CSS in dashboard.css            ║
║    - Subnav layout audit & fix: All non-Overview tabs          ║
║      (board, backlog, sprint, gantt, maintenance, discussion,  ║
║      log) now use project-detail-page class on outer           ║
║      container (padding:0) for edge-to-edge banner;            ║
║      inner content wrapped in .project-tab-body with           ║
║      padding:0 var(--space-6) var(--space-6); board uses       ║
║      dedicated CSS for its flex-overflow layout                ║
║                                                                 ║
║  v1.6.4 [2026-03-04]  UX Fix: Project Subnav Consistency     ║
║    & Edit Project Button                                        ║
║    - Removed inline margin-top:var(--space-6) from             ║
║      .page-header in all project detail tabs: board.js,        ║
║      backlog.js, sprint.js, gantt.js, maintenance.js,          ║
║      discussion.js, log.js                                      ║
║    - Added CSS rules in components.css so .page-header         ║
║      inside project tabs has margin-top:0, padding, and        ║
║      border-bottom — consistent with Overview's spacing        ║
║    - Changed "Edit Project" button in buildProjectBanner()     ║
║      (utils.js) from <a href> to <button id=                   ║
║      "btnBannerEditProject"> with data-project-id attribute    ║
║    - Added window listener for custom event                     ║
║      'trackly:editProject' in projects.js — opens edit         ║
║      modal directly without redirecting to Overview            ║
║    - Each tab module dispatches trackly:editProject on          ║
║      banner button click; Overview tab unaffected              ║
║    - Tab Reports unaffected                                     ║
║                                                                 ║
║  v1.6.3 [2026-03-04]  UX Enhancement: Dashboard              ║
║    - Live clock (day, date, HH:MM:SS) with setInterval in     ║
║      dashboard-welcome area; interval cleared on re-render     ║
║    - Activity timeline redesign: vertical timeline with color  ║
║      dots per action type; default 5 items + Show more toggle  ║
║    - Task Status donut chart (pure SVG, 6 statuses with        ║
║      legend) + Task Priority horizontal bar chart (active      ║
║      tasks only); no external chart library                    ║
║    - dashboard.js: _startClock/_stopClock, _renderDonutChart,  ║
║      _renderBarChart, timeline buildTimelineItems helper       ║
║    - css/pages/dashboard.css: fully written with all new       ║
║      component styles (.dashboard-clock, .activity-timeline-*, ║
║      .dashboard-charts-row, .dashboard-chart-*)                ║
║                                                                 ║
║  v1.6.2 [2026-03-04]  UX Fix: Icon Alignment & Positioning   ║
║    - Diperbaiki secara sistematis di seluruh halaman            ║
║      menggunakan CSS flex container yang konsisten              ║
║    - layout.css: .page-header__title → display:flex            ║
║    - components.css: .card__title, .icon-text (utility),       ║
║      [data-lucide] fallback, project card svg rules             ║
║    - meetings.css+js: .meeting-card__meta-item,                 ║
║      .meeting-detail-meta-item, .section-title svg              ║
║    - sprint.css: pane-header svg sizing,                        ║
║      sprint-planning__header-label                              ║
║    - board.css: meta-pill + due svg sizing                      ║
║    - log.css: log-entry__action-icon justify-content, w/h      ║
║    - discussion.css: dsc-type-badge svg, reply-toggle flex     ║
║    - notifications.css: .notif-item__icon                       ║
║    - maintenance.css: .mnt-detail__label                        ║
║    - assets.css: category-badge svg + .asset-category-icon     ║
║                                                                 ║
║  v1.6.0 [2026-03-03]  Phase 25 — Notes Sharing & Audit:      ║
║    - Share notes ke member lain (view/edit permission)         ║
║    - Audit log per-note (store note_audit, store NAUD-XXXX)    ║
║    - Tab Riwayat di editor, timeline audit log                 ║
║    - Visual indicators untuk shared notes di panel kiri        ║
║    - Access control: owner-only actions (delete, pin, share)   ║
║    - DB bumped to v7, sw.js cache v1.6.0                       ║
║  v1.5.1 [2026-03-03]  Bugfix & Enhancement: Personal Notes   ║
║                         — back button folder navigation;        ║
║                         close active note button; upload .md   ║
║                         from computer; move note to folder;    ║
║                         formatting toolbar (Bold/Italic/H1-3); ║
║                         autosave indicator improvement.         ║
║                                                                 ║
║  v1.5.0 [2026-03-03]  Phase 24 — Personal Notes:             ║
║                         New `notes` IndexedDB store (DB v6);   ║
║                         ID prefixes NOTE & NFLD added to        ║
║                         utils.js; full two-column Personal      ║
║                         Notes page (#/notes) with folder mgmt  ║
║                         (localStorage), note list panel,        ║
║                         Markdown editor with Edit/Preview       ║
║                         toggle, debounced auto-save, pin,       ║
║                         color picker, tag system, per-note MD   ║
║                         export, bulk JSON/MD export & JSON      ║
║                         import; notes store added to            ║
║                         settings.js backup/restore; sidebar     ║
║                         entry added between Meetings & Clients; ║
║                         sw.js bumped to v1.5.0 cache.           ║
║                                                                 ║
║  v1.3.3 [2026-03-03]  Hotfix: meetings, discussions,          ║
║                         notifications tidak ikut ter-export/    ║
║                         import di JSON backup. Fixed array      ║
║                         `stores` di handleExportData() dan      ║
║                         handleImportData() (settings.js) agar   ║
║                         menyertakan ketiga store tersebut.      ║
║                                                                 ║
║  v1.4.0 [2026-03-02]  Phase 23 — Notification Center:        ║
║                         New `notifications` IndexedDB store     ║
║                         (DB v5); bell icon + unread badge in    ║
║                         topbar; dropdown panel with 20 latest   ║
║                         notifs, mark-as-read, navigation;       ║
║                         full Notification Center page           ║
║                         (#/notifications) with tab filter       ║
║                         (Semua/Belum Dibaca) and pagination;    ║
║                         logActivity() auto-generates notifs     ║
║                         for relevant members; sw.js bumped to   ║
║                         v1.4.0 cache.                           ║
║                                                                 ║
║  v1.3.2 [2026-03-02]  Bugfix Phase 22:                        ║
║                         Bug #1: Fixed syntax error in           ║
║                         backlog.js (misplaced `"` in ternary    ║
║                         style attribute) that broke Board,      ║
║                         Backlog, and Sprint tabs. Bug #2: Fixed ║
║                         gantt.css `.gantt-bars` missing width,  ║
║                         height & overflow so task bars no       ║
║                         longer overlap the date header. Bug #3: ║
║                         Refactored discussion.js                ║
║                         `_openPostModal()` to pass `title`,     ║
║                         `body`, `footer` to `openModal()`       ║
║                         instead of `content`, fixing the        ║
║                         "undefined undefined" modal bug.        ║
║                                                                 ║
║  v1.3.1 [2026-02-28]  Phase 21 — Maintenance Enhancement:    ║
║                         DB version bumped to 4; maintenance.js  ║
║                         retrofitted with severity (major/minor  ║
║                         badge), assigned_date, due_date (date   ║
║                         pickers), ordered_by (PM/Admin dropdown)║
║                         pic_dev_ids (multi-select checkboxes —  ║
║                         developer visibility filter), pic_client║
║                         (text input — viewer visibility filter),║
║                         attachments (base64, max 5MB, download);║
║                         ticket list updated with Severity &     ║
║                         Due Date columns; detail panel shows    ║
║                         all new fields with Indonesian dates;   ║
║                         PIC Dev displayed as avatar chips;      ║
║                         maintenance-report.js updated with      ║
║                         Export Excel (SheetJS CDN), Export CSV  ║
║                         (pure JS, BOM-prefixed), formatDateID() ║
║                         for all date fields; PDF export updated  ║
║                         with Severity/Due Date/Assigned Date/   ║
║                         Ordered By/PIC Client columns; guide.js ║
║                         section 9 updated with full Phase 21    ║
║                         field explanations; sw.js bumped to     ║
║                         v1.3.1.                                  ║
║  v1.3.0 [2026-02-28]  Phase 20 — Project Discussion:         ║
║                         discussions store added to db.js (DB v3); ║
║                         DSC- prefix already in ID_PREFIX;          ║
║                         discussion.js module with feed (20/page),  ║
║                         pinned posts section (Admin/PM only),       ║
║                         post type badges (blocker=red, decision=    ║
║                         purple, question=blue, update=green,        ║
║                         general=neutral), inline collapsible reply  ║
║                         threads (show last 3, expand all),          ║
║                         Markdown render for posts+replies, file     ║
║                         attachments (base64, max 5MB, download),    ║
║                         edit/delete own post, Admin/PM can delete   ║
║                         any post + pin/unpin, logActivity() on all  ║
║                         actions; discussion tab added to subnav in  ║
║                         all project modules (between Gantt+Log);   ║
║                         discussion.css; route registered in app.js; ║
║                         sw.js bumped to v1.3.0; guide.js section   ║
║                         17 added. v1.3.0 = v1.x feature-complete.  ║
║  v1.2.0 [2026-02-28]  Phase 19 — Meeting Agenda & Notulensi:   ║
║                         meetings store added to db.js (DB v2);   ║
║                         MTG- prefix in ID_PREFIX; meetings.js    ║
║                         module with calendar (month/week toggle), ║
║                         mini-calendar left panel + day list right;║
║                         meeting CRUD modal (tabs: Details, Agenda,║
║                         Attendees & Projects); meeting detail page║
║                         (#/meetings/:id) with agenda checklist,  ║
║                         quick status advance, attendees panel;    ║
║                         Notulensi panel (Mode 1: Markdown editor  ║
║                         + live preview; Mode 2: file upload base64║
║                         max 5MB + download); Action Items with    ║
║                         assignee + due date + Create Task button; ║
║                         Meetings in sidebar (Admin/PM) + topbar   ║
║                         title map; meetings.css; routes registered║
║                         in app.js; logActivity() on all actions;  ║
║                         sw.js bumped to v1.2.0; guide.js section  ║
║                         16 added.                                  ║
║  v1.1.0 [2026-02-28]  Phase 18 — Audit Trail: logActivity()    ║
║                         helper in utils.js; ACT- prefix in        ║
║                         ID_PREFIX; log.js module with timeline,   ║
║                         filter bar, pagination, diff display;      ║
║                         Log tab in project subnav (Admin/PM);     ║
║                         all modules retrofitted (projects, tasks,  ║
║                         board, sprint, maintenance, members,       ║
║                         clients, assets); Dashboard Activity Feed  ║
║                         shows last 20 real entries; log.css added; ║
║                         sw.js cache bumped to v1.1.0.              ║
║  v1.0.0 [2026-02-28]  Phase 17 — Testing, Documentation &      ║
║                         Handoff: stable v1.0.0 release.         ║
║                         In-app User Guide (15 sections);        ║
║                         tooltip system on all key UI elements;  ║
║                         bug fix: formatDate custom format        ║
║                         strings (DD MMM YYYY, etc.); User Guide ║
║                         in sidebar + topbar dropdown + mobile   ║
║                         nav; SW cache bumped to v1.0.0;         ║
║                         README finalized to v1.0.0.             ║
║  v0.16.0 [2026-02-28]  Polish, Accessibility & PWA: full       ║
║                         Dashboard with live stats, My Tasks, & ║
║                         recent projects; full Settings (General, ║
║                         Data, PWA, About/Changelog); mobile bottom║
║                         nav (≤768px); Tab/Escape focus trap in    ║
║                         modals; skip-link for screen readers;     ║
║                         ARIA labels throughout; empty states on   ║
║                         all list pages; SW cache v0.16.0; JSON    ║
║                         export/import in Settings; PWA status in  ║
║                         Settings > PWA; visual consistency audit. ║
║  v0.15.0 [2026-02-28]  Reports Module: 5 report types — Project  ║
║                         Progress (status/priority/type doughnuts ║
║                         & bar charts, sprint table, task list);   ║
║                         Team Workload (stacked bar per member,    ║
║                         detail table with hours & story points);  ║
║                         Sprint Burndown (ideal vs actual line     ║
║                         chart, sprint selector); Maintenance      ║
║                         Summary (type & status doughnut/bar,      ║
║                         ticket list); Asset Inventory (pie & bar  ║
║                         charts, asset table). All charts via      ║
║                         Chart.js CDN. Date range filter. PDF      ║
║                         export via window.print() with clean      ║
║                         @media print CSS. Route updated to use    ║
║                         new reports.js module.                    ║
║  v0.14.0 [2026-02-28]  Asset Management: asset list table with  ║
║                         category icons, status badges, assignee   ║
║                         & project cells; add/edit/delete modal    ║
║                         with all section 5.11 fields; detail      ║
║                         panel; image upload (base64); filters by  ║
║                         category, status, assignee, project;      ║
║                         asset assignment to user/project; warranty║
║                         expiry warning banner + row highlight for ║
║                         assets expiring within 30 days; stats row ║
║                         (total, in-use, available, expiring).     ║
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
║  v0.13.0 [2026-02-28]  Maintenance Report & Invoice: report view ║
║                         with date-range filter, stats (total,   ║
║                         resolve %, avg resolution time, hours); ║
║                         tickets grouped by type + full list;    ║
║                         invoice builder (hourly/flat/custom     ║
║                         billing), tax rate, company/client info ║
║                         from settings & project; PDF export via ║
║                         window.print() with full @media print   ║
║                         CSS; "Generate Report" button on maint. ║
║  v0.12.0 [2026-02-28]  Maintenance Module: ticket CRUD;    ║
║                         list view with filters (status/type/  ║
║                         priority); status pipeline (Open→In   ║
║                         Progress→Resolved→Closed); create/edit ║
║                         modal with all section 5.12 fields;   ║
║                         one-click status advance; resolution   ║
║                         notes; activity log per ticket; role  ║
║                         check (PM/Dev only); tab hidden for   ║
║                         non-running/maintenance projects.      ║
║  v0.11.0 [2026-02-28]  Gantt Chart: canvas+DOM rendering; task  ║
║                         bars (start→due); sprint grouping rows;  ║
║                         milestone diamond markers; today line;    ║
║                         zoom Day/Week/Month; drag-to-move and     ║
║                         drag-to-resize bars; export PNG via       ║
║                         canvas.toBlob(); sprint filter dropdown.  ║
║  v0.10.0 [2026-02-28]  Sprint Management: sprint CRUD with     ║
║                         name/dates/goal; two-pane planning view  ║
║                         with native drag-and-drop (backlog ↔      ║
║                         sprint); active sprint banner; sprint     ║
║                         board (filtered Kanban); complete sprint  ║
║                         flow with unfinished task options (move   ║
║                         to backlog or next sprint); velocity bar  ║
║                         chart on canvas; retrospective notes;     ║
║                         reopen/delete sprints.                   ║
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
│   ├── components.css          # Buttons, inputs, badges, modals, toasts, tooltips
│   ├── pages/
│   │   ├── dashboard.css
│   │   ├── board.css
│   │   ├── gantt.css
│   │   ├── maintenance.css
│   │   ├── maintenance-report.css
│   │   ├── reports.css
│   │   ├── assets.css
│   │   ├── sprint.css
│   │   ├── log.css             ← Phase 18
│   │   ├── meetings.css        ← Phase 19
│   │   ├── discussion.css      ← Phase 20
│   │   ├── notifications.css   ← Phase 23
│   │   └── notes.css           ← Phase 24
│   └── print.css               # Print / PDF export styles
│
└── js/
    ├── core/
    │   ├── db.js               # IndexedDB wrapper
    │   ├── router.js           # Hash router
    │   ├── auth.js             # Session management
    │   ├── store.js            # Reactive state
    │   └── utils.js            # Helpers + logActivity()
    ├── modules/
    │   ├── dashboard.js
    │   ├── projects.js
    │   ├── board.js
    │   ├── backlog.js
    │   ├── sprint.js
    │   ├── gantt.js
    │   ├── maintenance.js
    │   ├── maintenance-report.js
    │   ├── assets.js
    │   ├── clients.js
    │   ├── members.js
    │   ├── reports.js
    │   ├── settings.js
    │   ├── guide.js
    │   ├── log.js              ← Phase 18
    │   ├── meetings.js         ← Phase 19
    │   ├── discussion.js       ← Phase 20
    │   ├── notifications.js    ← Phase 23
    │   └── notes.js            ← Phase 24
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

## 20. Backend Migration Guidelines (Firebase/Vercel)

Trackly is currently a pure local/offline MVP utilizing `IndexedDB`. A migration to **Firebase (Firestore + Auth)** hosted on **Vercel** is planned.

### What is Already Prepared:
1. **Dynamic Ticket Number Generation (`ticket_number`)**: Implemented locally (using project initials) so that the UI does not rely on global DB sequential IDs, reducing the chance of Firestore race conditions on sequential IDs.
2. **Abstracted DB Layer (`js/core/db.js`)**: **ALL** database operations (`getAll`, `getById`, `add`, `update`, `remove`) are properly abstracted in `db.js`. No `localStorage` or `IndexedDB` calls exist directly in the UI modules. **Migration only requires replacing the contents of `db.js` with Firebase SDK calls.**
3. **Server Timestamp Preparation (`getTimestamp()`)**: An abstraction function is introduced in `utils.js` replacing `nowISO()`. This allows an easy drop-in replacement using `FieldValue.serverTimestamp()` during migration.
4. **Roles & Permissions (RBAC)**: Currently handled purely in JS logic (hiding buttons/tabs). This structure directly maps to what needs to be written for **Firestore Security Rules**.

### Critical Steps for Migration (Next Phase):
1. **Firebase Authentication:** Replace `js/core/auth.js` to use `signInWithEmailAndPassword`. Remove user passwords from local storage.
2. **Firestore Initialization:** Replace `indexedDB` logic in `db.js` with Firestore collections mapping 1:1 with current stores (`users`, `projects`, `maintenance`, etc.).
3. **Data Hydration/Migration Script:** Create a one-time admin script to read from local IndexedDB and upload existing Trackly data to Firestore.
4. **Real-time Listeners (Optional but Recommended):** Upgrade `db.js` `getAll` fetching to utilize Firestore `onSnapshot` for real-time board updates across users. 
5. **Firestore Security Rules:** Ensure Viewers cannot write to the DB and Developer edits are restricted using their `session.userId`. This is crucial since client-side UI hiding is not secure enough for a live database.

---

*TRACKLY — Track Everything, Deliver Anything*  
*v1.10.0 | Pre-Migration Phase | Internal IT Consultant PMIS*
