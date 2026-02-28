/**
 * TRACKLY — guide.js
 * Phase 17: In-app User Guide — rendered as structured HTML.
 * Covers all major features, roles, and workflows.
 */

import { getSession } from '../core/auth.js';
import { renderBadge } from '../components/badge.js';

export async function render(params = {}) {
  const content = document.getElementById('main-content');
  if (!content) return;

  const session = getSession();
  if (!session) return;

  content.innerHTML = buildGuideHTML();

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Smooth scroll for TOC links
  content.querySelectorAll('.guide-toc__list a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = content.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function buildGuideHTML() {
  return `
    <div class="page-container page-enter guide-container">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">User Guide</h1>
          <p class="page-header__subtitle">Everything you need to know about using TRACKLY</p>
        </div>
        <div class="page-header__actions">
          <a href="#/dashboard" class="btn btn--ghost">
            <i data-lucide="arrow-left" aria-hidden="true"></i>
            Back to Dashboard
          </a>
        </div>
      </div>

      <!-- Table of Contents -->
      <div class="guide-toc card">
        <div class="card__body">
          <p class="guide-toc__title">Table of Contents</p>
          <ul class="guide-toc__list">
            <li><a href="#guide-overview"><i data-lucide="book-open" aria-hidden="true"></i> 1. Overview</a></li>
            <li><a href="#guide-roles"><i data-lucide="shield" aria-hidden="true"></i> 2. Roles &amp; Permissions</a></li>
            <li><a href="#guide-getting-started"><i data-lucide="play-circle" aria-hidden="true"></i> 3. Getting Started</a></li>
            <li><a href="#guide-projects"><i data-lucide="folder-kanban" aria-hidden="true"></i> 4. Projects</a></li>
            <li><a href="#guide-tasks"><i data-lucide="check-square" aria-hidden="true"></i> 5. Tasks &amp; Backlog</a></li>
            <li><a href="#guide-board"><i data-lucide="layout-dashboard" aria-hidden="true"></i> 6. Kanban Board</a></li>
            <li><a href="#guide-sprints"><i data-lucide="zap" aria-hidden="true"></i> 7. Sprint Management</a></li>
            <li><a href="#guide-gantt"><i data-lucide="bar-chart-2" aria-hidden="true"></i> 8. Gantt Chart</a></li>
            <li><a href="#guide-maintenance"><i data-lucide="tool" aria-hidden="true"></i> 9. Maintenance</a></li>
            <li><a href="#guide-reports"><i data-lucide="pie-chart" aria-hidden="true"></i> 10. Reports</a></li>
            <li><a href="#guide-members"><i data-lucide="users" aria-hidden="true"></i> 11. Members</a></li>
            <li><a href="#guide-clients"><i data-lucide="building-2" aria-hidden="true"></i> 12. Clients</a></li>
            <li><a href="#guide-assets"><i data-lucide="package" aria-hidden="true"></i> 13. Assets</a></li>
            <li><a href="#guide-settings"><i data-lucide="settings" aria-hidden="true"></i> 14. Settings &amp; Data</a></li>
            <li><a href="#guide-pwa"><i data-lucide="smartphone" aria-hidden="true"></i> 15. PWA &amp; Offline Use</a></li>
            <li><a href="#guide-meetings"><i data-lucide="calendar" aria-hidden="true"></i> 16. Meetings &amp; Notulensi</a></li>
          </ul>
        </div>
      </div>

      <!-- Section 1: Overview -->
      <div class="guide-section card" id="guide-overview">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="book-open" aria-hidden="true"></i>
            1. Overview
          </h2>
          <p>
            TRACKLY is a fully client-side Project Management Information System (PMIS) designed for IT
            consultant firms. It manages the complete project lifecycle — from initial setup, sprint planning,
            and board tracking, all the way through to post-delivery maintenance reporting and billing.
          </p>
          <p>
            All data is stored locally in your browser using IndexedDB, making TRACKLY fully functional
            without a server, internet connection, or database setup. You can also install it as a
            Progressive Web App (PWA) for a native app experience on any device.
          </p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>TRACKLY works best when served over HTTP or HTTPS. Opening <code>index.html</code> directly as a file:// URL will disable IndexedDB and Service Workers.</p>
          </div>
          <h3>Key Capabilities</h3>
          <ul>
            <li>Multi-project management with Kanban boards and Gantt charts</li>
            <li>Sprint planning with velocity tracking and retrospective notes</li>
            <li>Maintenance ticket tracking and client invoice generation</li>
            <li>Asset management with warranty expiry alerts</li>
            <li>5 report types with PDF export via the browser print function</li>
            <li>Role-based access control (Admin, PM, Developer, Viewer)</li>
            <li>Full offline support via Service Worker caching</li>
            <li>JSON data export and import for backup and restore</li>
          </ul>
        </div>
      </div>

      <!-- Section 2: Roles & Permissions -->
      <div class="guide-section card" id="guide-roles">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="shield" aria-hidden="true"></i>
            2. Roles &amp; Permissions
          </h2>
          <p>
            TRACKLY uses a four-tier role system. Every user has a global role, and Admins or PMs
            can also assign project-specific roles that override the global role for a given project.
          </p>

          <div class="guide-role-grid">
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('Admin', 'danger')}</div>
              <ul class="guide-role-card__perms">
                <li>Full system access</li>
                <li>Manage all users</li>
                <li>Create &amp; delete projects</li>
                <li>Access Settings</li>
                <li>Export/import data</li>
              </ul>
            </div>
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('PM', 'secondary')}</div>
              <ul class="guide-role-card__perms">
                <li>Create &amp; manage projects</li>
                <li>Manage sprints &amp; tasks</li>
                <li>View maintenance &amp; reports</li>
                <li>Manage members &amp; clients</li>
                <li>Generate invoices</li>
              </ul>
            </div>
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('Developer', 'info')}</div>
              <ul class="guide-role-card__perms">
                <li>View assigned projects</li>
                <li>Update task status</li>
                <li>Log time on tasks</li>
                <li>Add comments</li>
                <li>View board &amp; backlog</li>
              </ul>
            </div>
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('Viewer', 'neutral')}</div>
              <ul class="guide-role-card__perms">
                <li>View project status</li>
                <li>View task details</li>
                <li>Read-only access</li>
                <li>Cannot create/edit</li>
                <li>Cannot delete</li>
              </ul>
            </div>
          </div>

          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>The first account created via the setup wizard is always an Admin. Subsequent users can be assigned any role by the Admin or PM from the Members page.</p>
          </div>
        </div>
      </div>

      <!-- Section 3: Getting Started -->
      <div class="guide-section card" id="guide-getting-started">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="play-circle" aria-hidden="true"></i>
            3. Getting Started
          </h2>
          <p>Follow these steps to get up and running with a new TRACKLY instance:</p>
          <ol>
            <li><strong>First Run:</strong> On first launch, TRACKLY detects no users and shows the Setup Wizard. Complete all 3 steps to create your Admin account.</li>
            <li><strong>Add Members:</strong> Go to <a href="#/members">Members</a> and invite your team. Assign each person a role (Developer, PM, or Viewer).</li>
            <li><strong>Add Clients:</strong> Go to <a href="#/clients">Clients</a> and add your client companies so you can link them to projects.</li>
            <li><strong>Create Projects:</strong> Go to <a href="#/projects">Projects</a> and click <strong>New Project</strong>. Fill in the project name, dates, client, and assign team members.</li>
            <li><strong>Add Tasks:</strong> Open a project and navigate to the Backlog tab. Create tasks with priorities, estimates, and assignees.</li>
            <li><strong>Start a Sprint:</strong> Go to the Sprint tab, create a sprint with start/end dates, and drag tasks from the backlog into the sprint.</li>
            <li><strong>Track Progress:</strong> Use the Board (Kanban) tab to move tasks across columns as work progresses.</li>
          </ol>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Export your data regularly from <strong>Settings &rarr; Data &rarr; Export Data</strong> as a JSON backup. This is the only way to back up your data since everything is stored locally.</p>
          </div>
        </div>
      </div>

      <!-- Section 4: Projects -->
      <div class="guide-section card" id="guide-projects">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="folder-kanban" aria-hidden="true"></i>
            4. Projects
          </h2>
          <p>Projects are the top-level entity in TRACKLY. Each project has its own board, backlog, sprints, Gantt chart, maintenance module, and reports.</p>
          <h3>Creating a Project</h3>
          <p>Click <strong>New Project</strong> on the Projects page. You must provide at minimum a project name. You can also set:</p>
          <ul>
            <li><strong>Status:</strong> Planning, Active, Maintenance, On Hold, Completed, or Cancelled</li>
            <li><strong>Phase:</strong> Development, UAT, Deployment, Running, or Maintenance</li>
            <li><strong>Client:</strong> Link a client from your Clients list</li>
            <li><strong>Budget:</strong> Set an estimated budget to track against actual costs</li>
            <li><strong>Cover Color:</strong> Pick a color to visually identify the project card</li>
            <li><strong>Members:</strong> Assign team members with optional project-specific role overrides</li>
          </ul>
          <h3>Project Sub-pages</h3>
          <p>Click on any project card to open the project detail page with these tabs:</p>
          <ul>
            <li><strong>Overview:</strong> Summary stats, team panel, budget progress, and project details</li>
            <li><strong>Board:</strong> Kanban board for managing task flow</li>
            <li><strong>Backlog:</strong> Full task list with filters and bulk actions</li>
            <li><strong>Sprint:</strong> Sprint planning and active sprint management</li>
            <li><strong>Gantt:</strong> Timeline view of tasks and milestones</li>
            <li><strong>Maintenance:</strong> (Visible for Running/Maintenance phase projects) Ticket tracker</li>
            <li><strong>Reports:</strong> Project-specific reports and charts</li>
          </ul>
          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>The <strong>Maintenance</strong> tab only appears when the project phase is set to <em>Running</em> or <em>Maintenance</em>. Update the project phase from the Overview tab.</p>
          </div>
        </div>
      </div>

      <!-- Section 5: Tasks & Backlog -->
      <div class="guide-section card" id="guide-tasks">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="check-square" aria-hidden="true"></i>
            5. Tasks &amp; Backlog
          </h2>
          <p>Tasks are the core unit of work in TRACKLY. Each task belongs to a project and can optionally be assigned to a sprint.</p>
          <h3>Task Fields</h3>
          <ul>
            <li><strong>Title:</strong> Required. Short description of the work item.</li>
            <li><strong>Type:</strong> Story, Task, Bug, Enhancement, or Epic</li>
            <li><strong>Priority:</strong> Low, Medium, High, or Critical</li>
            <li><strong>Status:</strong> Backlog, To Do, In Progress, In Review, Done, Cancelled</li>
            <li><strong>Assignees:</strong> One or more team members</li>
            <li><strong>Story Points:</strong> Effort estimate for sprint velocity tracking</li>
            <li><strong>Dates:</strong> Start date and due date</li>
            <li><strong>Tags:</strong> Free-form labels for categorization</li>
            <li><strong>Checklist:</strong> Sub-items within a task</li>
            <li><strong>Comments:</strong> Threaded discussion thread</li>
            <li><strong>Description:</strong> Markdown-formatted description</li>
          </ul>
          <h3>Bulk Actions</h3>
          <p>On the Backlog page, use the checkboxes to select multiple tasks. You can then bulk-update status, priority, sprint assignment, or delete them.</p>
        </div>
      </div>

      <!-- Section 6: Kanban Board -->
      <div class="guide-section card" id="guide-board">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="layout-dashboard" aria-hidden="true"></i>
            6. Kanban Board
          </h2>
          <p>The Kanban Board gives a visual overview of all tasks in the project, organized into columns by status.</p>
          <h3>Drag and Drop</h3>
          <p>Drag any task card to a different column to instantly update its status. The card's status is synchronized to the task record automatically.</p>
          <h3>Custom Columns</h3>
          <p>Each project can have its own column configuration. Click the <strong>+</strong> button to add a column, hover over a column header to rename or delete it.</p>
          <h3>Swimlane View</h3>
          <p>Toggle the Swimlane mode (by Assignee) to group task cards horizontally by the person they are assigned to — useful for workload visibility.</p>
          <h3>Filters</h3>
          <p>Use the filter bar at the top of the board to filter cards by assignee, priority, label, or sprint.</p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Click on any task card to open the full task detail panel where you can edit all fields, add comments, and manage the checklist.</p>
          </div>
        </div>
      </div>

      <!-- Section 7: Sprints -->
      <div class="guide-section card" id="guide-sprints">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="zap" aria-hidden="true"></i>
            7. Sprint Management
          </h2>
          <p>Sprints are time-boxed iterations. TRACKLY supports sprint planning, active sprint tracking, velocity charts, and retrospectives.</p>
          <h3>Creating a Sprint</h3>
          <p>On the Sprint tab, click <strong>New Sprint</strong>. Set a name (e.g., "Sprint 1"), start date, end date, and an optional goal.</p>
          <h3>Sprint Planning</h3>
          <p>Use the two-pane planning view to drag tasks from the Backlog into the sprint. Story points are summed in real time to help you avoid over-commitment.</p>
          <h3>Starting and Completing a Sprint</h3>
          <p>Click <strong>Start Sprint</strong> to activate it (only one sprint can be active at a time). When the sprint ends, click <strong>Complete Sprint</strong>. You will be asked what to do with incomplete tasks — move them to backlog or carry them into the next sprint.</p>
          <h3>Velocity Chart</h3>
          <p>The velocity bar chart shows completed story points per sprint — helpful for estimating future capacity.</p>
          <h3>Retrospective Notes</h3>
          <p>After completing a sprint, add retrospective notes (what went well, what to improve) directly on the sprint card.</p>
        </div>
      </div>

      <!-- Section 8: Gantt Chart -->
      <div class="guide-section card" id="guide-gantt">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="bar-chart-2" aria-hidden="true"></i>
            8. Gantt Chart
          </h2>
          <p>The Gantt chart provides a timeline view of all tasks grouped by sprint or phase, showing start and end dates as horizontal bars.</p>
          <h3>Zoom Levels</h3>
          <p>Switch between <strong>Day</strong>, <strong>Week</strong>, and <strong>Month</strong> zoom to adjust the timeline resolution.</p>
          <h3>Drag to Resize and Move</h3>
          <p>Drag the left or right edge of a task bar to change its start or end date. Drag the bar itself to shift the entire task in time.</p>
          <h3>Today Line</h3>
          <p>A vertical blue line marks the current date for quick reference.</p>
          <h3>Export to PNG</h3>
          <p>Click the <strong>Export PNG</strong> button to download the current Gantt view as an image file.</p>
          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>Tasks must have both a start date and a due date to appear on the Gantt chart. Tasks without dates are excluded from the timeline view.</p>
          </div>
        </div>
      </div>

      <!-- Section 9: Maintenance -->
      <div class="guide-section card" id="guide-maintenance">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="tool" aria-hidden="true"></i>
            9. Maintenance
          </h2>
          <p>The Maintenance module tracks post-delivery support tickets for projects in the <em>Running</em> or <em>Maintenance</em> phase.</p>
          <h3>Maintenance Tickets</h3>
          <p>Create tickets with type (Bug, Adjustment, Enhancement, User Request, Incident), priority, assigned developer, estimated/actual hours, and resolution notes.</p>
          <h3>Ticket Pipeline</h3>
          <p>Tickets flow through: <strong>Open → In Progress → Resolved → Closed</strong>. Use the quick-advance button to move a ticket to the next status.</p>
          <h3>Maintenance Report &amp; Invoice</h3>
          <p>Click <strong>Generate Report</strong> (available to PM and Admin) to open the Maintenance Report page. Set a date range, choose a billing method (hourly rate, flat per ticket, or custom), and generate a printable invoice.</p>
          <div class="guide-warning">
            <i data-lucide="alert-triangle" aria-hidden="true"></i>
            <p>The Maintenance tab is hidden unless the project phase is set to <em>Running</em> or <em>Maintenance</em>. Update the project phase from the Overview tab.</p>
          </div>
        </div>
      </div>

      <!-- Section 10: Reports -->
      <div class="guide-section card" id="guide-reports">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="pie-chart" aria-hidden="true"></i>
            10. Reports
          </h2>
          <p>TRACKLY includes five built-in report types accessible from the Reports tab of any project.</p>
          <ul>
            <li><strong>Project Progress:</strong> Tasks by status, priority, and type — with doughnut and bar charts, plus a sprint summary table.</li>
            <li><strong>Team Workload:</strong> Tasks and hours logged per team member — stacked bar chart and detail table.</li>
            <li><strong>Sprint Burndown:</strong> Ideal vs actual story point burndown line chart for any completed or active sprint.</li>
            <li><strong>Maintenance Summary:</strong> Ticket breakdown by type and status — doughnut charts and a full ticket list.</li>
            <li><strong>Asset Inventory:</strong> Asset count by category and status — pie and bar charts with full asset table.</li>
          </ul>
          <h3>PDF Export</h3>
          <p>All reports can be exported to PDF. Click the <strong>Print / Export PDF</strong> button, then use your browser's Save as PDF option in the print dialog.</p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Use the date range filter at the top of each report to narrow down data to a specific period.</p>
          </div>
        </div>
      </div>

      <!-- Section 11: Members -->
      <div class="guide-section card" id="guide-members">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="users" aria-hidden="true"></i>
            11. Members
          </h2>
          <p>The Members page (Admin/PM only) lets you manage all user accounts in the system.</p>
          <ul>
            <li>Create new members with full profile details including avatar, position, and department</li>
            <li>Assign global roles (Admin, PM, Developer, Viewer)</li>
            <li>Change passwords for any user</li>
            <li>Deactivate or reactivate user accounts</li>
            <li>Search and filter by role or status</li>
          </ul>
          <div class="guide-warning">
            <i data-lucide="alert-triangle" aria-hidden="true"></i>
            <p>Deactivating a user prevents them from logging in, but their task assignments and history are preserved. Their data is not deleted.</p>
          </div>
        </div>
      </div>

      <!-- Section 12: Clients -->
      <div class="guide-section card" id="guide-clients">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="building-2" aria-hidden="true"></i>
            12. Clients
          </h2>
          <p>The Clients page (Admin/PM only) manages your client company records.</p>
          <ul>
            <li>Add clients with company name, contact person, email, phone, website, and address</li>
            <li>Upload a company logo (stored as base64 in the browser)</li>
            <li>Track client status: Active, Inactive, or Prospect</li>
            <li>View which projects are linked to each client</li>
          </ul>
          <p>Clients are linked to projects via the project creation/edit form. Once linked, the client name and logo appear on the project card and in reports.</p>
        </div>
      </div>

      <!-- Section 13: Assets -->
      <div class="guide-section card" id="guide-assets">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="package" aria-hidden="true"></i>
            13. Assets
          </h2>
          <p>The Assets page tracks hardware, software, licenses, and other resources used by your team and projects.</p>
          <ul>
            <li><strong>Categories:</strong> Hardware, Software, License, Document, Other</li>
            <li><strong>Status:</strong> Available, In Use, Under Maintenance, Retired</li>
            <li>Assign assets to a specific team member or project</li>
            <li>Set warranty expiry dates — assets expiring within 30 days are highlighted in orange</li>
            <li>Upload asset images for visual reference</li>
          </ul>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Use the Asset Inventory report (from any project's Reports tab) to get a printable overview of all assets with their current status.</p>
          </div>
        </div>
      </div>

      <!-- Section 14: Settings & Data -->
      <div class="guide-section card" id="guide-settings">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="settings" aria-hidden="true"></i>
            14. Settings &amp; Data
          </h2>
          <p>Settings (Admin/PM only) are divided into four tabs:</p>
          <h3>General</h3>
          <p>Configure your system name, timezone, date format, and currency. Also set the default hourly rate and tax percentage used in invoice generation.</p>
          <h3>Data Management</h3>
          <p>Export all data as a JSON file for backup, or import a previously exported JSON to restore data. You can also clear all application data (with confirmation) to reset TRACKLY to a clean state.</p>
          <div class="guide-warning">
            <i data-lucide="alert-triangle" aria-hidden="true"></i>
            <p><strong>Clear All Data</strong> is irreversible. All projects, tasks, members, and other records will be permanently deleted. Always export a backup before clearing.</p>
          </div>
          <h3>PWA</h3>
          <p>View the installation status of TRACKLY as a Progressive Web App and trigger the install prompt if available.</p>
          <h3>About / Changelog</h3>
          <p>View the current version, full changelog history, and links to documentation.</p>
        </div>
      </div>

      <!-- Section 15: PWA & Offline -->
      <div class="guide-section card" id="guide-pwa">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="smartphone" aria-hidden="true"></i>
            15. PWA &amp; Offline Use
          </h2>
          <p>TRACKLY is a Progressive Web App (PWA). Once visited, all assets are cached by the Service Worker and the app works fully offline.</p>
          <h3>Installing TRACKLY</h3>
          <ul>
            <li><strong>Chrome / Edge (Desktop):</strong> Look for the install icon in the address bar, or use the browser menu → "Install TRACKLY"</li>
            <li><strong>Chrome (Android):</strong> Tap the "Install App" banner that appears at the bottom of the screen</li>
            <li><strong>Safari (iOS):</strong> Tap the Share button → "Add to Home Screen"</li>
          </ul>
          <h3>Offline Behavior</h3>
          <p>Once installed, all pages, scripts, and styles are served from the Service Worker cache. You can create projects, add tasks, and manage all data without an internet connection.</p>
          <div class="guide-warning">
            <i data-lucide="alert-triangle" aria-hidden="true"></i>
            <p>Data is stored <em>only</em> in the browser where TRACKLY was set up. It does not sync across devices or browsers. Use the <strong>Export Data</strong> feature in Settings to create backups.</p>
          </div>
          <h3>Clearing Cache</h3>
          <p>To force a refresh of all cached assets, unregister the Service Worker from your browser's developer tools (Application → Service Workers → Unregister), then reload the page.</p>
        </div>
      </div>

      <!-- Footer -->
      <!-- Section 16: Meetings & Notulensi -->
      <div class="guide-section card" id="guide-meetings">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="calendar" aria-hidden="true"></i>
            16. Meetings &amp; Notulensi
          </h2>
          <p>The Meetings module (Admin/PM only) lets you schedule, manage, and document all team and client meetings in one place. Access it from the sidebar under Management.</p>
          <h3>Calendar View</h3>
          <p>The Meetings page shows a mini-calendar on the left and the day's meeting list on the right. Click any date to see its meetings. Toggle between Month view (date grid) and Week view (7-day strip) using the buttons in the page header.</p>
          <h3>Creating a Meeting</h3>
          <p>Click "New Meeting" to open the meeting form. Fill in the title, type, date, time range, and location. Use the Agenda tab to add checklist-style agenda items, and the Attendees &amp; Projects tab to link team members and related projects.</p>
          <h3>Meeting Types</h3>
          <p>Available types are: Internal, Client Meeting, Sprint Review, Retrospective, and Other. Each type is shown with a distinct color bar on the meeting card.</p>
          <h3>Meeting Detail Page</h3>
          <p>Click "View" on any meeting card to open its detail page. Here you can see the full agenda, attendees, linked projects, and status. Use the status advance button to move the meeting through: Scheduled → Ongoing → Done. You can also cancel a meeting from this page.</p>
          <h3>Agenda Checklist</h3>
          <p>During or after the meeting, check off agenda items directly on the detail page. The progress bar at the top tracks how many items have been completed.</p>
          <h3>Notulensi (Meeting Notes)</h3>
          <p>The Notulensi panel has two modes. In Text Editor mode, write meeting notes using Markdown and toggle a live preview. In File Attachment mode, upload supporting documents (PDF, DOCX, images) up to 5MB each. Files are stored as base64 and can be downloaded later.</p>
          <h3>Action Items</h3>
          <p>Add follow-up tasks using the Action Items section. Each item has a description, assignee, and due date. Click "Create Task" to convert any action item into a real task in the selected project's backlog — the task will be pre-filled with the action item text, assignee, and due date.</p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>All meeting actions (create, update, status change, cancel) are recorded in the Audit Trail.</p>
          </div>
        </div>
      </div>

      <!-- Section 17: Project Discussion -->
      <div class="guide-section card" id="guide-discussion">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="message-circle" aria-hidden="true"></i>
            17. Project Discussion
          </h2>
          <p>Every project has a Discussion tab (visible to Admin, PM, and Developer) for posting team updates, questions, decisions, and blockers in one place.</p>
          <h3>Creating a Post</h3>
          <p>Click "New Post" to open the post form. Choose a type (Update, Question, Decision, Blocker, or General), optionally add a title, write your content using Markdown, and attach files up to 5MB each. Click "Post" to publish.</p>
          <h3>Post Types</h3>
          <p>Each post is color-coded by type: Blockers are shown in red, Decisions in purple, Questions in blue, Updates in green, and General posts in neutral grey. This makes it easy to scan the feed for critical items at a glance.</p>
          <h3>Pinned Posts</h3>
          <p>Admin and PM can pin important posts to keep them at the top of the feed. Click the pin icon on any post card to pin or unpin it. Pinned posts appear in a highlighted section above the regular feed, regardless of their original post date.</p>
          <h3>Replies</h3>
          <p>Click the reply button on any post to expand the inline reply thread. Write your reply in the text area and click "Reply" to submit. Posts with more than 3 replies show only the latest three by default — click "Show all N replies" to see the full thread.</p>
          <h3>Editing and Deleting</h3>
          <p>Authors can edit or delete their own posts at any time. Admin and PM can delete any post. Hover over a post card to reveal the edit and delete buttons in the top-right corner.</p>
          <h3>File Attachments</h3>
          <p>You can attach images, PDFs, and documents to any post. Files are stored in the browser and accessible via download link directly from the post card. Each file is limited to 5MB.</p>
          <h3>Feed Pagination</h3>
          <p>The discussion feed shows the 20 most recent (non-pinned) posts per page. Use the Previous and Next buttons at the bottom of the feed to navigate older posts.</p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>All post creation, deletion, and pinning actions are recorded in the project Audit Trail (Log tab), visible to Admin and PM.</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="card" style="margin-bottom: var(--space-8);">
        <div class="card__body" style="text-align:center; color:var(--color-text-muted); font-size:var(--text-sm);">
          <p>TRACKLY v1.0.0 &mdash; Track Everything, Deliver Anything</p>
          <p>Need more help? Contact your system administrator or refer to the README in the project repository.</p>
        </div>
      </div>

    </div>
  `;
}

export default { render };
