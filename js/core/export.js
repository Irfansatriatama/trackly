/**
 * TRACKLY — export.js
 * Pure-JS CSV and PDF export utilities.
 * No external libraries required.
 */

// ─── CSV Core ─────────────────────────────────────────────────────────────────

/**
 * Escape a single CSV cell value.
 * Wraps in quotes if it contains comma, quote, or newline.
 * @param {any} val
 * @returns {string}
 */
function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Build a CSV string from a headers array and 2D rows array.
 * @param {string[]} headers
 * @param {any[][]} rows
 * @returns {string}
 */
function buildCSV(headers, rows) {
    const lines = [headers.map(escapeCSV).join(',')];
    rows.forEach(row => lines.push(row.map(escapeCSV).join(',')));
    return lines.join('\r\n');
}

/**
 * Download a CSV string as a file in the browser.
 * @param {string[]} headers
 * @param {any[][]} rows
 * @param {string} filename
 */
export function downloadCSV(headers, rows, filename = 'export.csv') {
    const csv = buildCSV(headers, rows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Task / Backlog CSV ───────────────────────────────────────────────────────

/**
 * Download backlog tasks as a CSV file.
 * @param {Object[]} tasks
 * @param {Object[]} members
 * @param {Object[]} sprints
 * @param {string}   filename
 */
export function downloadTasksCSV(tasks, members, sprints, filename = 'backlog-export.csv') {
    const headers = ['ID', 'Title', 'Type', 'Status', 'Priority', 'Story Points', 'Assignee(s)', 'Reporter', 'Sprint', 'Epic ID', 'Parent Task ID', 'Start Date', 'Due Date', 'Time Logged (min)', 'Tags', 'Dependencies', 'Created At', 'Updated At'];

    const rows = tasks.map(t => {
        const assigneeNames = (t.assignees || [])
            .map(id => members.find(m => m.id === id)?.full_name || id)
            .join('; ');
        const reporterName = members.find(m => m.id === t.reporter)?.full_name || t.reporter || '';
        const sprintName = sprints.find(s => s.id === t.sprint_id)?.name || '';
        const deps = (t.dependencies || []).map(d => `${d.type}:${d.taskId}`).join('; ');

        return [
            t.id,
            t.title,
            t.type,
            t.status,
            t.priority,
            t.story_points ?? '',
            assigneeNames,
            reporterName,
            sprintName,
            t.epic_id || '',
            t.parent_task_id || '',
            t.start_date || '',
            t.due_date || '',
            t.time_logged || 0,
            (t.tags || []).join('; '),
            deps,
            t.created_at || '',
            t.updated_at || '',
        ];
    });

    downloadCSV(headers, rows, filename);
}

// ─── Time Tracking CSV ────────────────────────────────────────────────────────

/**
 * Download time-per-member summary as CSV.
 * @param {Object[]} stats  [{member, tasks, totalMin, sp}, ...]
 * @param {string}   filename
 */
export function downloadTimeTrackingCSV(stats, filename = 'time-tracking.csv') {
    const headers = ['Member', 'Role', 'Tasks with Time', 'Total Time (min)', 'Total Time (h:m)', 'Story Points', 'Avg Time/Task (min)'];
    const rows = stats.map(s => {
        const hm = `${Math.floor(s.totalMin / 60)}h ${s.totalMin % 60}m`;
        const avg = s.tasks > 0 ? Math.round(s.totalMin / s.tasks) : 0;
        return [s.member.full_name, s.member.role, s.tasks, s.totalMin, hm, s.sp, avg];
    });
    downloadCSV(headers, rows, filename);
}

/**
 * Download per-task time tracking as CSV.
 * @param {Object[]} taskRows  [{task, assigneeNames, sprintName}, ...]
 * @param {string}   filename
 */
export function downloadTaskTimeCSV(taskRows, filename = 'task-time-tracking.csv') {
    const headers = ['ID', 'Title', 'Type', 'Status', 'Assignee(s)', 'Sprint', 'Story Points', 'Time Logged (min)', 'Time Logged (h:m)', 'Time/SP Ratio'];
    const rows = taskRows.map(r => {
        const hm = `${Math.floor(r.task.time_logged / 60)}h ${(r.task.time_logged || 0) % 60}m`;
        const ratio = (r.task.story_points && r.task.time_logged)
            ? Math.round(r.task.time_logged / r.task.story_points)
            : '';
        return [
            r.task.id, r.task.title, r.task.type, r.task.status,
            r.assigneeNames, r.sprintName,
            r.task.story_points ?? '', r.task.time_logged || 0, hm, ratio
        ];
    });
    downloadCSV(headers, rows, filename);
}

// ─── PDF / Print ──────────────────────────────────────────────────────────────

/**
 * Trigger the browser print dialog (generates a PDF if user chooses).
 * Adds a temporary print title to the page if provided.
 * @param {string} [reportTitle]
 */
export function printPage(reportTitle) {
    if (reportTitle) {
        document.title = `TRACKLY — ${reportTitle}`;
        setTimeout(() => { document.title = 'TRACKLY'; }, 3000);
    }
    window.print();
}
