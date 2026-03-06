/**
 * TRACKLY — project-guide.js
 * How to Use Project Features: Backlog, Board, Sprint, Gantt Chart.
 * Comprehensive interactive guide — visible to Admin & PM only.
 */

import { getSession } from '../core/auth.js';

let _activeSection = 'backlog';

export async function render(params = {}) {
  const content = document.getElementById('main-content');
  if (!content) return;
  const session = getSession();
  if (!session) return;

  if (params.section) _activeSection = params.section;

  content.innerHTML = _buildHTML(session);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindEvents(content);
}

function _buildHTML(session) {
  const role = session?.role || '';
  const isPM = role === 'pm';
  const isAdmin = role === 'admin';
  const roleLabel = isAdmin ? 'Admin' : 'Project Manager';

  return `
    <div class="page-container page-enter pguide-page">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Project Feature Guide</h1>
          <p class="page-header__subtitle">Panduan penggunaan Backlog, Board, Sprint, dan Gantt Chart</p>
        </div>
        <div class="page-header__actions">
          <a href="#/guide" class="btn btn--ghost">
            <i data-lucide="book-open" aria-hidden="true"></i> User Guide
          </a>
          <a href="#/projects" class="btn btn--primary">
            <i data-lucide="folder-kanban" aria-hidden="true"></i> Go to Projects
          </a>
        </div>
      </div>

      <!-- Role badge -->
      <div class="pguide-role-notice">
        <i data-lucide="shield-check" aria-hidden="true"></i>
        <span>Panduan ini hanya tersedia untuk <strong>${roleLabel}</strong>. Berisi strategi penggunaan fitur project secara menyeluruh.</span>
      </div>

      <!-- Feature Comparison Table -->
      <div class="pguide-compare card">
        <div class="card__body">
          <h3 class="pguide-compare__title"><i data-lucide="layout-grid" aria-hidden="true"></i> Perbandingan Keempat Fitur</h3>
          <div class="pguide-compare-table-wrap">
            <table class="pguide-compare-table">
              <thead>
                <tr>
                  <th>Dimensi</th>
                  <th><i data-lucide="list" aria-hidden="true"></i> Backlog</th>
                  <th><i data-lucide="layout-dashboard" aria-hidden="true"></i> Board</th>
                  <th><i data-lucide="zap" aria-hidden="true"></i> Sprint</th>
                  <th><i data-lucide="bar-chart-2" aria-hidden="true"></i> Gantt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Tujuan</strong></td>
                  <td>Gudang semua task, prioritasi</td>
                  <td>Visual status harian (semua task)</td>
                  <td>Iterasi kerja berbatas waktu</td>
                  <td>Timeline & deteksi keterlambatan</td>
                </tr>
                <tr>
                  <td><strong>Scope</strong></td>
                  <td>Seluruh project</td>
                  <td>Seluruh project, semua status</td>
                  <td>Sprint aktif saja (Sprint Board)</td>
                  <td>Task bertanggal, grouped per sprint</td>
                </tr>
                <tr>
                  <td><strong>Unit kerja</strong></td>
                  <td>Task individual (daftar)</td>
                  <td>Kartu per kolom status</td>
                  <td>Story Points per sprint</td>
                  <td>Bar durasi per task</td>
                </tr>
                <tr>
                  <td><strong>Digunakan oleh</strong></td>
                  <td>PM/Admin (grooming), Dev (view)</td>
                  <td>Seluruh tim (daily update)</td>
                  <td>PM/Admin (manage), Dev (execute)</td>
                  <td>PM/Admin (monitoring)</td>
                </tr>
                <tr>
                  <td><strong>Output utama</strong></td>
                  <td>Prioritized task list</td>
                  <td>Status terkini real-time</td>
                  <td>Velocity + Burndown tracking</td>
                  <td>Timeline visual + overlap detection</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Hero Workflow Banner -->
      <div class="pguide-hero card">
        <div class="card__body pguide-hero__body">
          <div class="pguide-hero__left">
            <div class="pguide-hero__badge">
              <i data-lucide="map" aria-hidden="true"></i>
              Alur Kerja Ideal
            </div>
            <h2 class="pguide-hero__title">Dari Task ke Delivery</h2>
            <p class="pguide-hero__desc">
              Gunakan keempat fitur secara berurutan untuk manajemen project yang optimal.
              Setiap fitur punya peran berbeda — jangan campur aduk fungsinya.
            </p>
            <div class="pguide-hero__flow">
              <div class="pguide-flow-step" data-section="backlog">
                <div class="pguide-flow-step__icon"><i data-lucide="list" aria-hidden="true"></i></div>
                <span>Backlog</span>
                <small>Create & prioritize</small>
              </div>
              <div class="pguide-flow-arrow"><i data-lucide="arrow-right" aria-hidden="true"></i></div>
              <div class="pguide-flow-step" data-section="sprint">
                <div class="pguide-flow-step__icon"><i data-lucide="zap" aria-hidden="true"></i></div>
                <span>Sprint</span>
                <small>Plan & timebox</small>
              </div>
              <div class="pguide-flow-arrow"><i data-lucide="arrow-right" aria-hidden="true"></i></div>
              <div class="pguide-flow-step" data-section="board">
                <div class="pguide-flow-step__icon"><i data-lucide="layout-dashboard" aria-hidden="true"></i></div>
                <span>Board</span>
                <small>Execute daily</small>
              </div>
              <div class="pguide-flow-arrow"><i data-lucide="arrow-right" aria-hidden="true"></i></div>
              <div class="pguide-flow-step" data-section="gantt">
                <div class="pguide-flow-step__icon"><i data-lucide="bar-chart-2" aria-hidden="true"></i></div>
                <span>Gantt</span>
                <small>Monitor timeline</small>
              </div>
            </div>
          </div>
          <div class="pguide-hero__visual">
            <div class="pguide-mini-kanban">
              <div class="pguide-mini-col">
                <div class="pguide-mini-col__head">Backlog</div>
                <div class="pguide-mini-card pguide-mini-card--high">Bug: Login error</div>
                <div class="pguide-mini-card pguide-mini-card--med">API Integration</div>
                <div class="pguide-mini-card pguide-mini-card--low">Update docs</div>
              </div>
              <div class="pguide-mini-col">
                <div class="pguide-mini-col__head">Sprint 2</div>
                <div class="pguide-mini-card pguide-mini-card--high">Bug: Login error</div>
                <div class="pguide-mini-card pguide-mini-card--med">API Integration</div>
              </div>
              <div class="pguide-mini-col">
                <div class="pguide-mini-col__head">Board</div>
                <div class="pguide-mini-card pguide-mini-card--prog">🔄 In Progress</div>
                <div class="pguide-mini-card pguide-mini-card--done">✅ Done</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Nav Tabs -->
      <div class="pguide-tabs card">
        <div class="pguide-tabs__inner">
          ${_buildTabBtn('backlog', 'list', 'Backlog', 'Create & prioritize tasks')}
          ${_buildTabBtn('board', 'layout-dashboard', 'Kanban Board', 'Daily visual progress')}
          ${_buildTabBtn('sprint', 'zap', 'Sprint', 'Timebox & velocity')}
          ${_buildTabBtn('gantt', 'bar-chart-2', 'Gantt Chart', 'Timeline & milestones')}
        </div>
      </div>

      <!-- Section Content -->
      <div id="pguideSectionContent">
        ${_renderSection(_activeSection)}
      </div>

      <!-- Quick Reference -->
      <div class="pguide-qref card">
        <div class="card__body">
          <h3 class="pguide-qref__title"><i data-lucide="zap" aria-hidden="true"></i> Quick Reference — Aliran Kerja Ideal</h3>
          <div class="pguide-qref__grid">
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">1</div>
              <div class="pguide-qref__content">
                <strong>📋 Buat Task di Backlog</strong>
                <span>PM/Admin dekomposisi fitur → task kecil dengan estimasi story points, assignee, prioritas, dan epic.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">2</div>
              <div class="pguide-qref__content">
                <strong>⚡ Buat Sprint & Planning</strong>
                <span>PM/Admin buat sprint dengan goal & tanggal, drag task dari backlog ke sprint panel. Perhatikan total SP vs kapasitas tim.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">3</div>
              <div class="pguide-qref__content">
                <strong>▶️ Start Sprint</strong>
                <span>PM/Admin aktifkan sprint. Developer update status task via Board atau Sprint Board setiap hari.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">4</div>
              <div class="pguide-qref__content">
                <strong>📊 Monitor via Gantt & Burndown</strong>
                <span>PM pantau timeline Gantt untuk deteksi keterlambatan. Cek Burndown chart untuk track apakah sprint on-track.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">5</div>
              <div class="pguide-qref__content">
                <strong>🏁 Complete Sprint & Retrospektif</strong>
                <span>PM/Admin selesaikan sprint, pilih nasib task unfinished, tulis retrospective notes untuk sprint berikutnya.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="card" style="margin-bottom:var(--space-8);">
        <div class="card__body" style="text-align:center;color:var(--color-text-muted);font-size:var(--text-sm);">
          <p>Butuh bantuan lebih lanjut? Baca <a href="#/guide" style="color:var(--color-primary);">User Guide lengkap</a> atau hubungi administrator.</p>
        </div>
      </div>
    </div>
  `;
}

function _buildTabBtn(id, icon, label, sub) {
  const active = _activeSection === id;
  return `
    <button class="pguide-tab ${active ? 'is-active' : ''}" data-section="${id}">
      <i data-lucide="${icon}" aria-hidden="true"></i>
      <span class="pguide-tab__label">${label}</span>
      <span class="pguide-tab__sub">${sub}</span>
    </button>`;
}

function _renderSection(id) {
  switch (id) {
    case 'backlog': return _sectionBacklog();
    case 'board': return _sectionBoard();
    case 'sprint': return _sectionSprint();
    case 'gantt': return _sectionGantt();
    default: return _sectionBacklog();
  }
}

// ─────────────────────────────────────────────
// BACKLOG SECTION
// ─────────────────────────────────────────────
function _sectionBacklog() {
  return `
    <div class="pguide-section" id="section-backlog">

      <div class="pguide-section-header card">
        <div class="card__body pguide-section-header__body">
          <div class="pguide-section-header__icon pguide-section-header__icon--backlog">
            <i data-lucide="list" aria-hidden="true"></i>
          </div>
          <div>
            <h2 class="pguide-section-header__title">Backlog</h2>
            <p class="pguide-section-header__desc">
              Backlog adalah <strong>gudang semua task</strong> dalam project. Ini adalah satu-satunya sumber kebenaran
              tentang apa yang harus dikerjakan. Task masuk ke backlog sebelum diprioritaskan dan dimasukkan ke sprint.
              Backlog harus selalu bersih, terprioritasi, dan up-to-date.
            </p>
          </div>
        </div>
      </div>

      <!-- Role Context -->
      <div class="pguide-role-grid">
        <div class="pguide-role-card pguide-role-card--pm">
          <div class="pguide-role-card__head"><i data-lucide="crown" aria-hidden="true"></i> Admin / PM</div>
          <ul>
            <li>Buat task baru (+ New Task)</li>
            <li>Set prioritas, type, epic, story points</li>
            <li>Lakukan backlog grooming rutin (mingguan)</li>
            <li>Assign ke sprint via bulk action</li>
            <li>Hapus task yang tidak relevan</li>
            <li>Gunakan Epic grouping untuk organisasi</li>
          </ul>
        </div>
        <div class="pguide-role-card pguide-role-card--dev">
          <div class="pguide-role-card__head"><i data-lucide="code-2" aria-hidden="true"></i> Developer</div>
          <ul>
            <li>Lihat dan filter task yang di-assign ke mereka</li>
            <li>Update status task (Backlog → To Do → In Progress)</li>
            <li>Buka task detail untuk baca description & checklist</li>
            <li>Tambah komentar progress</li>
            <li>Log waktu yang dihabiskan (Time Logged)</li>
          </ul>
        </div>
      </div>

      <!-- Anatomy of a Task -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="puzzle" aria-hidden="true"></i> Anatomi Sebuah Task</h3>
          <p>Setiap task di TRACKLY memiliki field-field berikut yang sebaiknya diisi:</p>
          <div class="pguide-field-grid">
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--required">Wajib</span> Title</div>
              <p>Judul singkat dan deskriptif. Contoh: <em>"Implementasi endpoint POST /api/login"</em> — hindari judul ambigu seperti "Fix bug".</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Type</div>
              <p><span class="pguide-inline-badge">Story</span> Fitur user-facing · <span class="pguide-inline-badge">Task</span> Pekerjaan teknis · <span class="pguide-inline-badge">Bug</span> Defect · <span class="pguide-inline-badge">Enhancement</span> Peningkatan · <span class="pguide-inline-badge">Epic</span> Container besar (parent)</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--required">Wajib</span> Priority</div>
              <p>
                <span class="pguide-priority pguide-priority--critical">● Critical</span> — Blokir delivery, kerjakan segera<br>
                <span class="pguide-priority pguide-priority--high">● High</span> — Penting, kerjakan sprint ini<br>
                <span class="pguide-priority pguide-priority--med">● Medium</span> — Standar, sprint berikutnya<br>
                <span class="pguide-priority pguide-priority--low">● Low</span> — Nice-to-have
              </p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--required">Wajib</span> Status</div>
              <p>
                <code>Backlog</code> → <code>To Do</code> → <code>In Progress</code> → <code>In Review</code> → <code>Done</code> / <code>Cancelled</code><br>
                Task baru di backlog biasanya dimulai sebagai <code>Backlog</code>.
              </p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Story Points</div>
              <p>Estimasi effort (Fibonacci: 1, 2, 3, 5, 8, 13). Gunakan kompleksitas relatif, bukan jam kerja. Diperlukan untuk Velocity & Burndown chart.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Start & Due Date</div>
              <p>Diperlukan agar task muncul di <strong>Gantt Chart</strong>. Task tanpa kedua tanggal ini tidak akan tampil di Gantt.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Issue Links</div>
              <p>Link task ke task lain dengan tipe: <em>blocks</em>, <em>is blocked by</em>, <em>relates to</em>, <em>duplicates</em>. Berguna untuk dependency tracking antar task.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Checklist & Comments</div>
              <p>Checklist untuk sub-langkah implementasi. Comments untuk diskusi thread. Description mendukung format Markdown.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Step by Step -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="play-circle" aria-hidden="true"></i> Langkah-langkah Menggunakan Backlog</h3>
          <div class="pguide-steps">
            <div class="pguide-step">
              <div class="pguide-step__num">1</div>
              <div class="pguide-step__body">
                <h4>Buka Tab Backlog</h4>
                <p>Navigasi ke <strong>Projects</strong> → klik project → pilih tab <strong>Backlog</strong> di navigation bar project.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">2</div>
              <div class="pguide-step__body">
                <h4>Buat Task Baru</h4>
                <p>Klik tombol <strong>+ New Task</strong>. Form task terbuka. Isi Title, Type, Priority. Untuk task yang akan masuk Gantt, isi juga Start & Due Date. Klik <strong>Create Task</strong>.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Organisasi dengan Epic</h4>
                <p>Buat task bertipe <strong>Epic</strong> sebagai container. Saat membuat task lain, set field "Parent" ke epic tersebut. Gunakan toggle <strong>Group by Epic</strong> di backlog untuk melihat hierarki.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">4</div>
              <div class="pguide-step__body">
                <h4>Grooming: Filter, Prioritize, & Clean Up</h4>
                <p>Gunakan filter bar untuk menyaring task. Ubah prioritas secara bulk via checkbox + bulk action bar. Hapus task yang sudah tidak relevan agar backlog tetap bersih (<em>tidak lebih dari 50 task aktif</em>).</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">5</div>
              <div class="pguide-step__body">
                <h4>Link Dependencies</h4>
                <p>Buka task detail → bagian <strong>Issue Links</strong> → tambah link ke task yang mem-block atau di-block. Ini membantu developer tahu task mana yang harus selesai lebih dulu.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Best Practices -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="star" aria-hidden="true"></i> Best Practices Backlog</h3>
          <div class="pguide-tips-grid">
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--green"><i data-lucide="check" aria-hidden="true"></i></div>
              <div>
                <strong>Pecah task besar menjadi kecil</strong>
                <p>Task ideal bisa diselesaikan dalam 1–2 hari. Epic boleh besar, tapi child task-nya harus kecil.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--green"><i data-lucide="check" aria-hidden="true"></i></div>
              <div>
                <strong>Selalu isi Story Points</strong>
                <p>Story points menghasilkan Velocity & Burndown chart yang meaningful untuk prediksi sprint berikutnya.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--red"><i data-lucide="x" aria-hidden="true"></i></div>
              <div>
                <strong>Jangan biarkan backlog menumpuk</strong>
                <p>Backlog dengan ratusan task tidak terprioritasi adalah "graveyard". Review dan cuci setiap minggu.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--red"><i data-lucide="x" aria-hidden="true"></i></div>
              <div>
                <strong>Jangan skip Issue Links</strong>
                <p>Dependency yang tidak di-link membuat developer tidak tahu task mana yang harus dikerjakan duluan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Advanced Features -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="zap" aria-hidden="true"></i> Fitur Lanjutan Backlog</h3>
          <div class="pguide-feature-list">
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="layers" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Group by Epic</h4>
                <p>Klik tombol <strong>Group by Epic</strong> di toolbar backlog untuk mengelompokkan task di bawah epic masing-masing. Setiap epic header menampilkan <strong>progress bar</strong> (% child tasks yang sudah Done). Toggle kembali ke <strong>Flat List</strong> untuk melihat semua task berurutan. Saat membuat task, pilih <strong>Parent Epic</strong> dari dropdown untuk menetapkan keanggotaannya ke epic tertentu.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="link-2" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Issue Links (Dependency Tracking)</h4>
                <p>Di task form, scroll ke bawah ke bagian <strong>Issue Links</strong>. Pilih tipe link:
                  <span style="background:#FEE2E2;color:#991B1B;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;">blocks</span>
                  <span style="background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;">is blocked by</span>
                  <span style="background:#DBEAFE;color:#1E40AF;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;">relates to</span>
                  <span style="background:#F3F4F6;color:#374151;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;">duplicates</span>.
                  Ketik ID atau judul task di search box &rarr; pilih dari autocomplete &rarr; klik Add. Di task detail slideover, section <strong>Linked Issues</strong> menampilkan semua link — klik untuk navigasi ke task terkait. Backlog row yang punya link menampilkan ikon 🔗.
                </p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="git-branch" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Subtasks (Parent-Child Task)</h4>
                <p>Saat membuat atau mengedit task (non-epic), gunakan dropdown <strong>Parent Task</strong> untuk menjadikannya subtask dari task lain. Parent task menampilkan hitungan subtask di backlog row. Buka task detail slideover &rarr; section <strong>Subtasks</strong> menampilkan daftar subtask + statusnya. Klik <strong>+ Add Subtask</strong> untuk membuat task baru yang otomatis terhubung ke parent ini.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;


}

// ─────────────────────────────────────────────
// BOARD SECTION
// ─────────────────────────────────────────────
function _sectionBoard() {
  return `
    <div class="pguide-section" id="section-board">

      <div class="pguide-section-header card">
        <div class="card__body pguide-section-header__body">
          <div class="pguide-section-header__icon pguide-section-header__icon--board">
            <i data-lucide="layout-dashboard" aria-hidden="true"></i>
          </div>
          <div>
            <h2 class="pguide-section-header__title">Kanban Board</h2>
            <p class="pguide-section-header__desc">
              Board adalah <strong>tampilan visual Kanban</strong> dari seluruh task dalam project, diorganisir dalam kolom berdasarkan status.
              Board menampilkan <em>semua</em> task lintas sprint — berbeda dengan Sprint Board yang hanya menampilkan task sprint aktif.
              Ini adalah command center harian untuk melihat apa yang sedang dikerjakan oleh seluruh tim.
            </p>
          </div>
        </div>
      </div>

      <div class="pguide-callout pguide-callout--warning">
        <i data-lucide="info" aria-hidden="true"></i>
        <div>
          <strong>Board vs Sprint Board:</strong> Tab "Board" menampilkan <em>semua task project</em> (lintas sprint).
          Sprint Board (di dalam tab Sprint → sub-tab Board) hanya menampilkan task dalam sprint yang sedang aktif.
          Board untuk gambaran besar; Sprint Board untuk fokus sprint harian.
        </div>
      </div>

      <!-- Role Context -->
      <div class="pguide-role-grid">
        <div class="pguide-role-card pguide-role-card--pm">
          <div class="pguide-role-card__head"><i data-lucide="crown" aria-hidden="true"></i> Admin / PM</div>
          <ul>
            <li>Buka Swimlane Mode untuk daily standup</li>
            <li>Set WIP Limit per kolom agar tim tidak overloaded</li>
            <li>Tambah custom column (mis. "QA Review")</li>
            <li>Monitor distribusi beban kerja per orang</li>
            <li>Deteksi bottleneck (kolom mana yang penuh?)</li>
          </ul>
        </div>
        <div class="pguide-role-card pguide-role-card--dev">
          <div class="pguide-role-card__head"><i data-lucide="code-2" aria-hidden="true"></i> Developer</div>
          <ul>
            <li>Drag kartu task dari "To Do" → "In Progress"</li>
            <li>Klik kartu untuk buka detail & update progress</li>
            <li>Update checklist & tambah komentar</li>
            <li>Drag ke "Done" saat task selesai review</li>
          </ul>
        </div>
      </div>

      <!-- Visual Board Explanation -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="layout-dashboard" aria-hidden="true"></i> Fitur-fitur Board</h3>
          <div class="pguide-feature-list">
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="move" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Drag & Drop Status</h4>
                <p>Seret kartu task ke kolom berbeda untuk langsung mengubah statusnya. Perubahan tersimpan otomatis ke Firestore. Semua anggota tim akan melihat perubahan setelah refresh.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="alert-triangle" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>WIP Limit (Work In Progress)</h4>
                <p>Set batas maksimum kartu per kolom. Hover di header kolom → klik ikon <strong>Edit</strong> → set WIP Limit. Kolom yang sudah melebihi batas akan menunjukkan indikator <span style="color:var(--color-danger);font-weight:600;">merah</span> — sinyal bahwa ada bottleneck di sini.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="columns" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Custom Columns</h4>
                <p>Setiap project bisa memiliki konfigurasi kolom sendiri. Klik <strong>Add Column</strong> untuk menambah kolom baru (mis. "Testing", "UAT"). Konfigurasi disimpan per-project.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="users" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Swimlane Mode (by Assignee)</h4>
                <p>Toggle tombol <strong>Swimlane</strong> untuk mengelompokkan kartu per-assignee secara horizontal. Sempurna untuk daily standup: PM bisa sekaligus melihat beban kerja setiap anggota tim dan siapa yang overloaded.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="panel-right" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Task Detail Slideover</h4>
                <p>Klik kartu task manapun → panel detail terbuka dari kanan layar tanpa meninggalkan board. Edit semua field, tambah checklist, tinggalkan komentar, lihat linked issues — semuanya tanpa navigasi keluar dari board.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="play-circle" aria-hidden="true"></i> Tips Penggunaan Board yang Optimal</h3>
          <div class="pguide-steps">
            <div class="pguide-step">
              <div class="pguide-step__num">1</div>
              <div class="pguide-step__body">
                <h4>Setup WIP Limit di Awal Sprint</h4>
                <p>Sebelum sprint dimulai, set WIP limit untuk kolom "In Progress" (biasanya: jumlah developer tim). Ini mencegah multitasking berlebihan dan mendorong penyelesaian task sebelum ambil task baru.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">2</div>
              <div class="pguide-step__body">
                <h4>Daily Standup dengan Swimlane</h4>
                <p>Aktifkan Swimlane Mode saat daily standup. Setiap baris = satu anggota tim. PM bisa langsung melihat siapa yang progress-nya stagnan dan siapa yang mungkin bisa membantu rekan yang blocked.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Identifikasi Bottleneck</h4>
                <p>Kolom yang paling penuh (melebihi WIP limit) = bottleneck. Cari tahu kenapa banyak task stuck di sana — apakah ada blocker? Apakah "In Review" menumpuk karena reviewer sibuk?</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

// ─────────────────────────────────────────────
// SPRINT SECTION
// ─────────────────────────────────────────────
function _sectionSprint() {
  return `
    <div class="pguide-section" id="section-sprint">

      <div class="pguide-section-header card">
        <div class="card__body pguide-section-header__body">
          <div class="pguide-section-header__icon pguide-section-header__icon--sprint">
            <i data-lucide="zap" aria-hidden="true"></i>
          </div>
          <div>
            <h2 class="pguide-section-header__title">Sprint Management</h2>
            <p class="pguide-section-header__desc">
              Sprint adalah <strong>iterasi kerja berbatas waktu</strong> (biasanya 1–4 minggu) di mana tim berkomitmen untuk menyelesaikan
              sejumlah task dari backlog. Sprint adalah jantung dari Agile/Scrum. TRACKLY mendukung seluruh lifecycle sprint:
              planning, eksekusi, Burndown monitoring, Velocity tracking, dan retrospektif.
            </p>
          </div>
        </div>
      </div>

      <!-- Role Context -->
      <div class="pguide-role-grid">
        <div class="pguide-role-card pguide-role-card--pm">
          <div class="pguide-role-card__head"><i data-lucide="crown" aria-hidden="true"></i> Admin / PM</div>
          <ul>
            <li>Buat sprint (nama, goal, tanggal)</li>
            <li>Sprint Planning: drag task dari backlog ke sprint</li>
            <li>Aktifkan sprint (Start Sprint)</li>
            <li>Monitor Burndown chart harian</li>
            <li>Complete sprint + retrospective notes</li>
            <li>Review Velocity untuk prediksi sprint berikutnya</li>
          </ul>
        </div>
        <div class="pguide-role-card pguide-role-card--dev">
          <div class="pguide-role-card__head"><i data-lucide="code-2" aria-hidden="true"></i> Developer</div>
          <ul>
            <li>Lihat sprint aktif di banner atas</li>
            <li>Update status task via Sprint Board (drag kartu)</li>
            <li>Klik kartu untuk buka detail & baca task description</li>
            <li>Log time yang dihabiskan per task</li>
          </ul>
        </div>
      </div>

      <!-- Sprint Lifecycle -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="repeat" aria-hidden="true"></i> Lifecycle Sprint</h3>
          <div class="pguide-lifecycle">
            <div class="pguide-lifecycle__step pguide-lifecycle__step--neutral">
              <div class="pguide-lifecycle__icon"><i data-lucide="clock" aria-hidden="true"></i></div>
              <div class="pguide-lifecycle__label">Planning</div>
              <div class="pguide-lifecycle__desc">Sprint dibuat, task dipilih dari backlog</div>
            </div>
            <div class="pguide-lifecycle__arrow">→</div>
            <div class="pguide-lifecycle__step pguide-lifecycle__step--success">
              <div class="pguide-lifecycle__icon"><i data-lucide="play" aria-hidden="true"></i></div>
              <div class="pguide-lifecycle__label">Active</div>
              <div class="pguide-lifecycle__desc">Tim mengerjakan, update status harian</div>
            </div>
            <div class="pguide-lifecycle__arrow">→</div>
            <div class="pguide-lifecycle__step pguide-lifecycle__step--info">
              <div class="pguide-lifecycle__icon"><i data-lucide="flag" aria-hidden="true"></i></div>
              <div class="pguide-lifecycle__label">Completed</div>
              <div class="pguide-lifecycle__desc">Retrospektif, task unfinished dipindah</div>
            </div>
          </div>
          <div class="pguide-callout pguide-callout--info" style="margin-top:var(--space-4);">
            <i data-lucide="alert-circle" aria-hidden="true"></i>
            <div><strong>Aturan penting:</strong> Hanya <em>satu sprint</em> yang bisa aktif pada satu waktu. Selesaikan atau complete sprint yang aktif sebelum bisa mengaktifkan sprint berikutnya.</div>
          </div>
        </div>
      </div>

      <!-- Sprint Tabs Explained -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="layers" aria-hidden="true"></i> 5 Tab dalam Sprint</h3>
          <div class="pguide-tabs-explained">
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="list" aria-hidden="true"></i>
                <strong>Sprints</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 1</span>
              </div>
              <p>Daftar semua sprint beserta statistiknya (total task, done, SP, progress bar). Dari sini kamu bisa membuat sprint baru, mengaktifkan, menyelesaikan, atau menghapus sprint.</p>
            </div>
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="move" aria-hidden="true"></i>
                <strong>Planning</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 2</span>
              </div>
              <p>Tampilan dua panel: kiri = task backlog yang belum masuk sprint, kanan = task yang sudah masuk sprint yang dipilih. <strong>Drag task dari kiri ke kanan</strong> untuk memasukkan ke sprint. Story points terjumlah realtime agar tidak over-commit.</p>
            </div>
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="kanban" aria-hidden="true"></i>
                <strong>Sprint Board</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 3</span>
              </div>
              <p>Kanban board <em>khusus sprint aktif</em>. Hanya task dalam sprint aktif yang tampil. Drag kartu untuk update status. Ini adalah view yang paling sering digunakan developer selama sprint berlangsung.</p>
            </div>
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="trending-down" aria-hidden="true"></i>
                <strong>Burndown</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 4</span>
              </div>
              <p>Chart yang membandingkan <em>Ideal Burndown</em> (garis lurus dari total SP ke 0) vs <em>Actual Burndown</em> (SP remaining per hari). Jika garis actual di atas garis ideal → sprint kemungkinan tidak akan selesai tepat waktu. Ambil tindakan segera!</p>
            </div>
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="bar-chart-2" aria-hidden="true"></i>
                <strong>Velocity</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 5</span>
              </div>
              <p>Bar chart yang membandingkan story points committed vs completed per sprint. Gunakan rata-rata velocity 3 sprint terakhir sebagai kapasitas sprint berikutnya. Berisi juga Retrospective Notes.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="play-circle" aria-hidden="true"></i> Cara Menjalankan Sprint dari Awal</h3>
          <div class="pguide-steps">
            <div class="pguide-step">
              <div class="pguide-step__num">1</div>
              <div class="pguide-step__body">
                <h4>Buat Sprint <span class="pguide-who">👑 Admin/PM</span></h4>
                <p>Tab Sprint → klik <strong>New Sprint</strong>. Isi nama, tanggal mulai & selesai, dan sprint goal. Goal yang jelas memberikan arah tim selama sprint berlangsung.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">2</div>
              <div class="pguide-step__body">
                <h4>Sprint Planning <span class="pguide-who">👑 Admin/PM</span></h4>
                <p>Buka tab <strong>Planning</strong>. Pilih sprint target di dropdown. Drag task dari panel Backlog (kiri) ke panel Sprint (kanan). Perhatikan total Story Points — jangan isi lebih dari kapasitas tim!</p>
                <div class="pguide-callout pguide-callout--info" style="margin-top:var(--space-2);">
                  <i data-lucide="lightbulb" aria-hidden="true"></i>
                  <div>Kapasitas tim = rata-rata velocity 3 sprint terakhir (lihat tab Velocity). Jika sprint pertama, estimasi: jumlah dev × hari kerja × SP/hari.</div>
                </div>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Aktifkan Sprint <span class="pguide-who">👑 Admin/PM</span></h4>
                <p>Kembali ke tab <strong>Sprints</strong>. Di kartu sprint yang sudah diisi task, klik tombol <strong>Start</strong> (hijau). Sprint sekarang berstatus Active — developer bisa mulai drag kartu di Sprint Board.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">4</div>
              <div class="pguide-step__body">
                <h4>Eksekusi Harian <span class="pguide-who">👨‍💻 Developer</span></h4>
                <p>Developer membuka tab <strong>Sprint Board</strong> dan drag kartu sesuai progress: "To Do" → "In Progress" → "In Review" → "Done". PM memantau via Burndown chart harian.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">5</div>
              <div class="pguide-step__body">
                <h4>Monitor Burndown Chart <span class="pguide-who">👑 Admin/PM</span></h4>
                <p>Buka tab <strong>Burndown</strong> setiap hari untuk cek apakah sprint on-track. Jika garis actual (biru) berada di <em>atas</em> garis ideal (abu-abu), sprint kemungkinan akan terlambat — diskusikan dengan tim untuk re-prioritize.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">6</div>
              <div class="pguide-step__body">
                <h4>Complete Sprint & Retrospektif <span class="pguide-who">👑 Admin/PM</span></h4>
                <p>Klik <strong>Complete Sprint</strong>. Dialog akan muncul untuk menentukan nasib task unfinished (pindah ke backlog atau sprint berikutnya). Isi Retrospective Notes: apa yang berjalan baik, apa yang perlu diperbaiki.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

// ─────────────────────────────────────────────
// GANTT SECTION
// ─────────────────────────────────────────────
function _sectionGantt() {
  return `
    <div class="pguide-section" id="section-gantt">

      <div class="pguide-section-header card">
        <div class="card__body pguide-section-header__body">
          <div class="pguide-section-header__icon pguide-section-header__icon--gantt">
            <i data-lucide="bar-chart-2" aria-hidden="true"></i>
          </div>
          <div>
            <h2 class="pguide-section-header__title">Gantt Chart</h2>
            <p class="pguide-section-header__desc">
              Gantt Chart adalah <strong>tampilan timeline horizontal</strong> dari semua task dalam project, dikelompokkan berdasarkan sprint.
              Setiap task direpresentasikan sebagai bar yang memanjang dari tanggal mulai hingga tanggal selesai.
              Ini adalah tool utama PM untuk melihat dependensi, overlap, dan keterlambatan secara sekilas.
            </p>
          </div>
        </div>
      </div>

      <div class="pguide-callout pguide-callout--warning">
        <i data-lucide="alert-triangle" aria-hidden="true"></i>
        <div>
          <strong>Syarat tampil di Gantt:</strong> Task harus memiliki <em>Start Date</em> DAN <em>Due Date</em> yang sudah diisi.
          Task tanpa kedua tanggal ini tidak akan ditampilkan. Biasakan isi tanggal saat membuat task di Backlog.
        </div>
      </div>

      <!-- Role Context -->
      <div class="pguide-role-grid">
        <div class="pguide-role-card pguide-role-card--pm">
          <div class="pguide-role-card__head"><i data-lucide="crown" aria-hidden="true"></i> Admin / PM (Pengguna Utama)</div>
          <ul>
            <li>Pantau timeline seluruh project secara visual</li>
            <li>Deteksi task terlambat (bar melewati garis merah "hari ini")</li>
            <li>Geser jadwal task dengan drag bar (tanpa buka task detail)</li>
            <li>Ubah durasi task dengan resize edge kanan bar</li>
            <li>Export PNG untuk laporan ke klien/manajemen</li>
            <li>Filter per sprint untuk fokus timeline sprint tertentu</li>
          </ul>
        </div>
        <div class="pguide-role-card pguide-role-card--dev">
          <div class="pguide-role-card__head"><i data-lucide="code-2" aria-hidden="true"></i> Developer (View Only)</div>
          <ul>
            <li>Lihat jadwal task mereka sendiri dalam konteks timeline project</li>
            <li>Pahami dependensi dan urutan pengerjaan</li>
          </ul>
        </div>
      </div>

      <!-- Gantt Demo -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="calendar-range" aria-hidden="true"></i> Cara Membaca Gantt Chart</h3>
          <div class="pguide-gantt-demo">
            <div class="pguide-gantt-demo__legend">
              <div class="pguide-gantt-demo__labels">
                <div>TSK-001: Setup DB</div>
                <div>TSK-002: Auth API</div>
                <div>TSK-003: Login UI</div>
                <div>TSK-004: Testing</div>
              </div>
              <div class="pguide-gantt-demo__chart">
                <div class="pguide-gantt-demo__header">
                  <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
                </div>
                <div class="pguide-gantt-demo__rows">
                  <div class="pguide-gantt-row">
                    <div class="pguide-gantt-bar pguide-gantt-bar--done" style="left:0%;width:25%">Done ✅</div>
                  </div>
                  <div class="pguide-gantt-row">
                    <div class="pguide-gantt-bar pguide-gantt-bar--progress" style="left:15%;width:35%">In Progress 🔄</div>
                  </div>
                  <div class="pguide-gantt-row">
                    <div class="pguide-gantt-bar pguide-gantt-bar--todo" style="left:25%;width:40%">To Do</div>
                  </div>
                  <div class="pguide-gantt-row">
                    <div class="pguide-gantt-bar pguide-gantt-bar--todo" style="left:50%;width:45%">To Do</div>
                  </div>
                </div>
                <div class="pguide-gantt-today" title="Today"></div>
              </div>
            </div>
            <div class="pguide-gantt-demo__legend-items">
              <span class="pguide-gantt-legend pguide-gantt-legend--done">■ Done</span>
              <span class="pguide-gantt-legend pguide-gantt-legend--progress">■ In Progress</span>
              <span class="pguide-gantt-legend pguide-gantt-legend--todo">■ To Do / Planned</span>
              <span class="pguide-gantt-legend pguide-gantt-legend--today">| Hari Ini (garis merah)</span>
            </div>
          </div>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-3);">
            <strong>Cara baca:</strong> Task yang bar-nya sudah melewati garis merah "hari ini" tapi belum berstatus Done = <span style="color:var(--color-danger);font-weight:600;">TERLAMBAT</span>. Segera follow up tim.
          </p>
        </div>
      </div>

      <!-- Features -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="sparkles" aria-hidden="true"></i> Fitur-fitur Gantt Chart</h3>
          <div class="pguide-feature-list">
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="zoom-in" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Zoom Level: Day / Week / Month</h4>
                <p><strong>Day</strong> — detail harian (sprint pendek &lt; 2 minggu) · <strong>Week</strong> — tampilan mingguan (paling umum) · <strong>Month</strong> — gambaran besar project panjang</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="move-horizontal" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Drag Bar untuk Geser Jadwal</h4>
                <p>Seret <em>bagian tengah</em> bar task untuk menggeser keseluruhan durasi. Start date dan due date ikut berubah otomatis dan tersimpan ke Firestore.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="arrow-left-right" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Resize Bar untuk Ubah Durasi</h4>
                <p>Seret <em>tepi kanan</em> bar untuk mengubah due date. Berguna saat ada slippage dan perlu menyesuaikan jadwal tanpa buka task detail satu per satu.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="image-down" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Export PNG untuk Reporting</h4>
                <p>Klik tombol <strong>Export PNG</strong> untuk screenshot Gantt dalam kondisi zoom & filter saat ini. Lampirkan ke laporan progress atau presentasi ke klien — tidak perlu screenshot manual.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="play-circle" aria-hidden="true"></i> Cara Menggunakan Gantt Chart Efektif</h3>
          <div class="pguide-steps">
            <div class="pguide-step">
              <div class="pguide-step__num">1</div>
              <div class="pguide-step__body">
                <h4>Pastikan Semua Task Punya Tanggal</h4>
                <p>Sebelum buka Gantt, pastikan task sudah memiliki <strong>Start Date</strong> dan <strong>Due Date</strong>. Edit task dari Backlog atau Board → isi kedua tanggal. Task tanpa tanggal tidak tampil di Gantt.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">2</div>
              <div class="pguide-step__body">
                <h4>Buka & Scroll ke Hari Ini</h4>
                <p>Project → tab <strong>Gantt</strong>. Chart otomatis scroll ke tanggal hari ini. Task dikelompokkan per sprint. Klik <strong>Today</strong> di toolbar jika sudah ter-scroll terlalu jauh.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Identifikasi Keterlambatan</h4>
                <p>Task yang bar-nya sudah melewati garis merah "hari ini" tapi belum Done = <strong>terlambat</strong>. Segera buka task tersebut (klik label di sebelah kiri), update status atau sesuaikan jadwal.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">4</div>
              <div class="pguide-step__body">
                <h4>Sesuaikan Jadwal via Drag</h4>
                <p>Jika ada scope change atau keterlambatan, drag bar task untuk geser jadwal secara bulk visual. Jauh lebih cepat daripada edit task satu per satu di Backlog.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">5</div>
              <div class="pguide-step__body">
                <h4>Export untuk Meeting Klien</h4>
                <p>Sebelum meeting progress dengan klien, filter per sprint yang sedang aktif → klik <strong>Export PNG</strong>. Lampirkan ke laporan atau presentasikan langsung di meeting.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────
function _bindEvents(content) {
  // Tab switching
  content.querySelectorAll('.pguide-tab[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeSection = btn.dataset.section;
      content.querySelectorAll('.pguide-tab').forEach(t => t.classList.remove('is-active'));
      btn.classList.add('is-active');
      const sectionEl = document.getElementById('pguideSectionContent');
      if (sectionEl) {
        sectionEl.innerHTML = _renderSection(_activeSection);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Hero flow step clicks
  content.querySelectorAll('.pguide-flow-step[data-section]').forEach(step => {
    step.addEventListener('click', () => {
      _activeSection = step.dataset.section;
      const tabBtn = content.querySelector(`.pguide-tab[data-section="${_activeSection}"]`);
      if (tabBtn) tabBtn.click();
    });
  });
}

export default { render };
