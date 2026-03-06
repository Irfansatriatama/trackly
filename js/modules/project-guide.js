/**
 * TRACKLY — project-guide.js
 * How to Use Project Features: Backlog, Board, Sprint, Gantt Chart.
 * Comprehensive interactive guide with step-by-step instructions.
 */

import { getSession } from '../core/auth.js';

let _activeSection = 'backlog';

export async function render(params = {}) {
    const content = document.getElementById('main-content');
    if (!content) return;
    const session = getSession();
    if (!session) return;

    // Allow deep-linking via ?section=board etc.
    if (params.section) _activeSection = params.section;

    content.innerHTML = _buildHTML();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    _bindEvents(content);
}

function _buildHTML() {
    return `
    <div class="page-container page-enter pguide-page">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">How to Use Project Features</h1>
          <p class="page-header__subtitle">Panduan lengkap menggunakan Backlog, Board, Sprint, dan Gantt Chart</p>
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

      <!-- Hero Banner -->
      <div class="pguide-hero card">
        <div class="card__body pguide-hero__body">
          <div class="pguide-hero__left">
            <div class="pguide-hero__badge">
              <i data-lucide="map" aria-hidden="true"></i>
              Project Workflow Guide
            </div>
            <h2 class="pguide-hero__title">Satu Project, Empat Cara Kerja</h2>
            <p class="pguide-hero__desc">
              Setiap project di TRACKLY memiliki empat alat utama yang bekerja secara terpadu.
              Pelajari cara menggunakannya secara optimal untuk memaksimalkan produktivitas tim.
            </p>
            <div class="pguide-hero__flow">
              <div class="pguide-flow-step" data-section="backlog">
                <div class="pguide-flow-step__icon"><i data-lucide="list" aria-hidden="true"></i></div>
                <span>Backlog</span>
              </div>
              <div class="pguide-flow-arrow"><i data-lucide="arrow-right" aria-hidden="true"></i></div>
              <div class="pguide-flow-step" data-section="sprint">
                <div class="pguide-flow-step__icon"><i data-lucide="zap" aria-hidden="true"></i></div>
                <span>Sprint</span>
              </div>
              <div class="pguide-flow-arrow"><i data-lucide="arrow-right" aria-hidden="true"></i></div>
              <div class="pguide-flow-step" data-section="board">
                <div class="pguide-flow-step__icon"><i data-lucide="layout-dashboard" aria-hidden="true"></i></div>
                <span>Board</span>
              </div>
              <div class="pguide-flow-arrow"><i data-lucide="arrow-right" aria-hidden="true"></i></div>
              <div class="pguide-flow-step" data-section="gantt">
                <div class="pguide-flow-step__icon"><i data-lucide="bar-chart-2" aria-hidden="true"></i></div>
                <span>Gantt</span>
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
          ${_buildTabBtn('backlog', 'list', 'Backlog', 'Atur & kelola semua task')}
          ${_buildTabBtn('board', 'layout-dashboard', 'Kanban Board', 'Pantau progress visual')}
          ${_buildTabBtn('sprint', 'zap', 'Sprint', 'Rencanakan iterasi kerja')}
          ${_buildTabBtn('gantt', 'bar-chart-2', 'Gantt Chart', 'Timeline & milestone')}
        </div>
      </div>

      <!-- Section Content -->
      <div id="pguideSectionContent">
        ${_renderSection(_activeSection)}
      </div>

      <!-- Quick Reference Card -->
      <div class="pguide-qref card">
        <div class="card__body">
          <h3 class="pguide-qref__title"><i data-lucide="zap" aria-hidden="true"></i> Quick Reference — Aliran Kerja Ideal</h3>
          <div class="pguide-qref__grid">
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">1</div>
              <div class="pguide-qref__content">
                <strong>Buat Task di Backlog</strong>
                <span>Dekomposisi fitur menjadi task kecil dengan estimasi story points, assignee, dan prioritas.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">2</div>
              <div class="pguide-qref__content">
                <strong>Buat Sprint & Planning</strong>
                <span>Buat sprint dengan tanggal, set goal, lalu drag task dari backlog ke sprint via tab Planning.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">3</div>
              <div class="pguide-qref__content">
                <strong>Start Sprint & Kerjakan</strong>
                <span>Aktifkan sprint, anggota tim update status task lewat Board atau Sprint Board saat mengerjakan.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">4</div>
              <div class="pguide-qref__content">
                <strong>Monitor via Gantt</strong>
                <span>Pantau timeline, deteksi keterlambatan, dan sesuaikan jadwal task langsung dari Gantt Chart.</span>
              </div>
            </div>
            <div class="pguide-qref__item">
              <div class="pguide-qref__num">5</div>
              <div class="pguide-qref__content">
                <strong>Complete Sprint & Retrospektif</strong>
                <span>Selesaikan sprint, pilih nasib task unfinished, tulis catatan retrospektif untuk sprint berikutnya.</span>
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

      <!-- Header -->
      <div class="pguide-section-header card">
        <div class="card__body pguide-section-header__body">
          <div class="pguide-section-header__icon pguide-section-header__icon--backlog">
            <i data-lucide="list" aria-hidden="true"></i>
          </div>
          <div>
            <h2 class="pguide-section-header__title">Backlog</h2>
            <p class="pguide-section-header__desc">
              Backlog adalah <strong>daftar lengkap semua task</strong> dalam sebuah project. Ini adalah tempat pertama kali semua
              pekerjaan dicatat sebelum diprioritaskan dan dimasukkan ke sprint. Pikirkan backlog sebagai "kolam" dari semua
              hal yang harus dikerjakan.
            </p>
          </div>
        </div>
      </div>

      <!-- Concept Callout -->
      <div class="pguide-callout pguide-callout--info">
        <i data-lucide="lightbulb" aria-hidden="true"></i>
        <div>
          <strong>Konsep Inti:</strong> Backlog bukan hanya to-do list — ini adalah product backlog yang hidup.
          Task di backlog dikelola secara berkelanjutan: diprioritaskan ulang, diestimasi, diupdate, dan dipindah ke sprint saat siap dikerjakan.
        </div>
      </div>

      <!-- Anatomy of a Task -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="puzzle" aria-hidden="true"></i> Anatomi Sebuah Task</h3>
          <p>Setiap task dalam TRACKLY memiliki field-field berikut yang perlu kamu isi:</p>
          <div class="pguide-field-grid">
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--required">Wajib</span> Title</div>
              <p>Judul singkat dan deskriptif. Contoh: <em>"Implementasi endpoint POST /api/login"</em> — hindari judul ambigu seperti "Fix bug".</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Type</div>
              <p><span class="pguide-inline-badge">Story</span> Fitur user-facing · <span class="pguide-inline-badge">Task</span> Pekerjaan teknis internal · <span class="pguide-inline-badge">Bug</span> Perbaikan defect · <span class="pguide-inline-badge">Enhancement</span> Perbaikan fitur yang ada · <span class="pguide-inline-badge">Epic</span> Container untuk story/task besar</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--required">Wajib</span> Priority</div>
              <p>
                <span class="pguide-priority pguide-priority--critical">● Critical</span> — Blokir delivery, harus dikerjakan segera<br>
                <span class="pguide-priority pguide-priority--high">● High</span> — Penting, kerjakan sprint ini<br>
                <span class="pguide-priority pguide-priority--med">● Medium</span> — Standar, rencanakan ke sprint berikutnya<br>
                <span class="pguide-priority pguide-priority--low">● Low</span> — Nice-to-have, kerjakan jika ada kapasitas
              </p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--required">Wajib</span> Status</div>
              <p>
                <code>Backlog</code> → <code>To Do</code> → <code>In Progress</code> → <code>In Review</code> → <code>Done</code> / <code>Cancelled</code><br>
                Status dalam backlog biasanya dimulai sebagai <code>Backlog</code> atau <code>To Do</code>.
              </p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Story Points</div>
              <p>Estimasi effort dalam satuan abstrak (biasanya 1, 2, 3, 5, 8, 13). Digunakan untuk velocity tracking di sprint. Hindari jam kerja — gunakan kompleksitas relatif.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Assignees</div>
              <p>Satu atau beberapa member yang bertanggung jawab. Setiap assignee akan menerima notifikasi otomatis saat di-assign atau task diupdate.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Start & Due Date</div>
              <p>Tanggal penting untuk Gantt Chart. Task hanya muncul di Gantt jika memiliki kedua tanggal ini.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Tags / Labels</div>
              <p>Label bebas untuk kategorisasi lintas-sprint. Contoh: <em>backend</em>, <em>frontend</em>, <em>security</em>. Bisa difilter di Board dan Backlog.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Checklist</div>
              <p>Daftar sub-item dalam sebuah task. Berguna untuk memecah langkah implementasi tanpa membuat task terpisah.</p>
            </div>
            <div class="pguide-field">
              <div class="pguide-field__head"><span class="pguide-badge pguide-badge--opt">Opsional</span> Description & Comments</div>
              <p>Description mendukung format Markdown. Comments untuk diskusi thread pada task tersebut.</p>
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
                <p>Klik tombol <strong>+ New Task</strong> di kanan atas. Form task akan terbuka. Minimal isi Title, Type, Priority. Klik <strong>Save Task</strong>.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Buka Task Detail</h4>
                <p>Klik baris task mana pun → panel detail (slideover) muncul di sebelah kanan. Di sini kamu bisa edit semua field, tambah checklist, tinggalkan komentar, dan lihat histori perubahan.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">4</div>
              <div class="pguide-step__body">
                <h4>Filter & Urutkan</h4>
                <p>Gunakan filter bar di atas tabel untuk menyaring task berdasarkan: <strong>Status</strong>, <strong>Priority</strong>, <strong>Assignee</strong>, <strong>Sprint</strong>, <strong>Type</strong>, atau <strong>Tag</strong>. Klik header kolom untuk mengurutkan.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">5</div>
              <div class="pguide-step__body">
                <h4>Bulk Actions</h4>
                <p>Centang checkbox di kiri setiap baris untuk memilih banyak task sekaligus. Toolbar bulk actions akan muncul: ubah status, priority, sprint, atau hapus semua sekaligus.</p>
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
                <p>Task yang bisa diselesaikan dalam 1–2 hari adalah ukuran ideal. Task lebih besar dari itu harus dipecah.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--green"><i data-lucide="check" aria-hidden="true"></i></div>
              <div>
                <strong>Selalu isi Story Points</strong>
                <p>Story points membantu memprediksi kapasitas sprint dan menghasilkan velocity chart yang akurat.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--green"><i data-lucide="check" aria-hidden="true"></i></div>
              <div>
                <strong>Lakukan Backlog Grooming rutin</strong>
                <p>Review dan prioritaskan ulang backlog setiap minggu. Hapus atau arsipkan task yang sudah tidak relevan.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--red"><i data-lucide="x" aria-hidden="true"></i></div>
              <div>
                <strong>Jangan biarkan backlog menumpuk</strong>
                <p>Backlog dengan ratusan task yang tidak prioritas hanyalah "graveyard". Hapus yang tidak akan dikerjakan.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--red"><i data-lucide="x" aria-hidden="true"></i></div>
              <div>
                <strong>Jangan duplikasi task</strong>
                <p>Cek dulu apakah task serupa sudah ada sebelum membuat yang baru. Gunakan filter/search.</p>
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
              Berbeda dari Sprint Board yang terbatas pada sprint aktif, Board menampilkan <em>semua</em> task di semua tahap.
              Ini adalah command center harian untuk melihat apa yang sedang dikerjakan oleh seluruh tim.
            </p>
          </div>
        </div>
      </div>

      <div class="pguide-callout pguide-callout--warning">
        <i data-lucide="info" aria-hidden="true"></i>
        <div>
          <strong>Board vs Sprint Board:</strong> Board di tab "Board" menampilkan <em>semua task project</em> (lintas sprint).
          Sprint Board (di dalam tab Sprint → sub-tab Board) hanya menampilkan task dalam sprint yang sedang aktif.
          Gunakan Board untuk gambaran besar, Sprint Board untuk fokus sprint harian.
        </div>
      </div>

      <!-- Visual Board Explanation -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="layout-dashboard" aria-hidden="true"></i> Struktur Board</h3>
          <div class="pguide-board-demo">
            ${['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'].map((col, i) => `
              <div class="pguide-board-col">
                <div class="pguide-board-col__head">${col}</div>
                <div class="pguide-board-col__body">
                  ${i < 3 ? `
                    <div class="pguide-board-card" style="border-left-color:${['#EF4444', '#F59E0B', '#3B82F6'][i] || '#94A3B8'}">
                      <div class="pguide-board-card__id">TSK-00${i + 1}</div>
                      <div class="pguide-board-card__title">Sample Task ${i + 1}</div>
                    </div>` : ''}
                  ${i === 3 ? `
                    <div class="pguide-board-card" style="border-left-color:#8B5CF6">
                      <div class="pguide-board-card__id">TSK-004</div>
                      <div class="pguide-board-card__title">In Review Task</div>
                    </div>` : ''}
                  ${i === 4 ? `
                    <div class="pguide-board-card" style="border-left-color:#10B981;opacity:0.7">
                      <div class="pguide-board-card__id">TSK-005</div>
                      <div class="pguide-board-card__title">✓ Completed</div>
                    </div>` : ''}
                </div>
                <div class="pguide-board-col__drop-hint">Drop task here</div>
              </div>
            `).join('')}
          </div>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-3);">
            Setiap kolom merepresentasikan satu status task. Drag kartu dari satu kolom ke kolom lain untuk mengubah status secara langsung.
          </p>
        </div>
      </div>

      <!-- Features -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="sparkles" aria-hidden="true"></i> Fitur-fitur Board</h3>
          <div class="pguide-feature-list">
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="move" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Drag & Drop</h4>
                <p>Seret kartu task ke kolom berbeda untuk langsung mengubah statusnya. Perubahan tersimpan otomatis ke Firestore — semua anggota tim yang membuka board akan melihat perubahan setelah refresh.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="columns" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Custom Columns</h4>
                <p>Setiap project bisa memiliki konfigurasi kolom sendiri. Klik <strong>Add Column</strong> untuk menambah kolom baru. Hover di header kolom untuk opsi <strong>Rename</strong> atau <strong>Delete</strong>. Konfigurasi disimpan per-project di localStorage browser-mu.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="users" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Swimlane Mode (by Assignee)</h4>
                <p>Toggle tombol <strong>Swimlane</strong> untuk mengelompokkan semua kartu task secara horizontal per-assignee. Mode ini sangat berguna untuk daily standup: PM bisa sekaligus melihat beban kerja setiap anggota tim.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="filter" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Filter Bar</h4>
                <p>Di atas board terdapat filter bar. Bisa filter berdasarkan:</p>
                <ul>
                  <li><strong>Assignee</strong> — tampilkan hanya task yang di-assign ke orang tertentu</li>
                  <li><strong>Priority</strong> — filter Critical / High / Medium / Low</li>
                  <li><strong>Label/Tag</strong> — filter berdasarkan tag yang kamu buat</li>
                  <li><strong>Sprint</strong> — batasi tampilan ke sprint tertentu</li>
                </ul>
                <p>Filter bisa dikombinasikan. Klik <strong>Clear</strong> untuk menghapus semua filter.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="panel-right" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Task Detail Slideover</h4>
                <p>Klik kartu task manapun → panel detail terbuka dari kanan layar tanpa meninggalkan board. Kamu bisa edit semua field (title, status, priority, assignees, dates, tags), tambah checklist, tinggalkan komentar, dan lihat deskripsi Markdown — semuanya tanpa navigasi keluar dari board.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="play-circle" aria-hidden="true"></i> Cara Menggunakan Board</h3>
          <div class="pguide-steps">
            <div class="pguide-step">
              <div class="pguide-step__num">1</div>
              <div class="pguide-step__body">
                <h4>Akses Board</h4>
                <p>Project → tab <strong>Board</strong>. Board langsung menampilkan semua task yang ada berdasarkan statusnya masing-masing.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">2</div>
              <div class="pguide-step__body">
                <h4>Setup Kolom (Opsional)</h4>
                <p>Jika alur kerja tim kamu berbeda, tambah atau ubah nama kolom. Contoh: tambah kolom "Testing" antara "In Review" dan "Done".</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Update Progress Harian</h4>
                <p>Saat mulai mengerjakan task, drag kartu dari "To Do" ke "In Progress". Saat selesai review, drag ke "Done". Sesederhana itu.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">4</div>
              <div class="pguide-step__body">
                <h4>Daily Standup dengan Swimlane</h4>
                <p>Aktifkan Swimlane Mode untuk daily standup. Setiap baris adalah satu anggota tim — langsung terlihat siapa yang sedang mengerjakan apa dan siapa yang mungkin overloaded.</p>
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
              sejumlah task yang sudah dipilih dari backlog. Sprint adalah jantung dari metodologi Agile/Scrum.
              TRACKLY mendukung seluruh lifecycle sprint: planning, eksekusi, monitoring velocity, dan retrospektif.
            </p>
          </div>
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
            <div><strong>Aturan penting:</strong> Hanya <em>satu sprint</em> yang bisa aktif pada satu waktu. Selesaikan sprint yang aktif sebelum bisa mengaktifkan sprint berikutnya.</div>
          </div>
        </div>
      </div>

      <!-- Sprint Tabs Explained -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="layers" aria-hidden="true"></i> 4 Tab dalam Sprint</h3>
          <div class="pguide-tabs-explained">
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="list" aria-hidden="true"></i>
                <strong>Sprints</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 1</span>
              </div>
              <p>Daftar semua sprint dalam project beserta statistiknya (total task, done, remaining, story points, progress bar). Dari sini kamu bisa membuat sprint baru, mengaktifkan, menyelesaikan, atau menghapus sprint.</p>
            </div>
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="move" aria-hidden="true"></i>
                <strong>Planning</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 2</span>
              </div>
              <p>Tampilan dua panel side-by-side: kiri = task backlog yang belum masuk sprint, kanan = task yang sudah masuk sprint yang dipilih. <strong>Drag task dari kiri ke kanan</strong> untuk memasukkan ke sprint, atau sebaliknya untuk mengembalikan ke backlog. Story points terjumlah realtime di header panel kanan agar tim tidak over-commit.</p>
            </div>
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="kanban" aria-hidden="true"></i>
                <strong>Sprint Board</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 3</span>
              </div>
              <p>Kanban board <em>khusus sprint aktif</em>. Menampilkan hanya task yang ada dalam sprint aktif, dikelompokkan dalam 4 kolom: To Do, In Progress, In Review, Done. Drag kartu untuk update status task. Ini adalah view yang paling sering digunakan selama sprint berlangsung.</p>
            </div>
            <div class="pguide-tab-explain">
              <div class="pguide-tab-explain__head">
                <i data-lucide="bar-chart-2" aria-hidden="true"></i>
                <strong>Velocity</strong>
                <span class="pguide-badge pguide-badge--neutral">Tab 4</span>
              </div>
              <p>Bar chart yang membandingkan story points yang <em>committed</em> (abu-abu) vs yang benar-benar <em>completed</em> (biru) per sprint. Berguna untuk memprediksi kapasitas sprint berikutnya. Juga berisi section Retrospective Notes untuk mencatat catatan pasca-sprint.</p>
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
                <h4>Buat Sprint</h4>
                <p>Tab Sprint → klik <strong>New Sprint</strong>. Isi nama (misal "Sprint 1"), tanggal mulai, tanggal selesai, dan goal opsional (ringkasan apa yang ingin dicapai sprint ini).</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">2</div>
              <div class="pguide-step__body">
                <h4>Sprint Planning — Isi Sprint dengan Task</h4>
                <p>Buka tab <strong>Planning</strong>. Pilih sprint target di dropdown. Drag task dari panel Backlog (kiri) ke panel Sprint (kanan). Perhatikan total Story Points di header — jangan isi lebih dari kapasitas tim!</p>
                <div class="pguide-callout pguide-callout--info" style="margin-top:var(--space-2);">
                  <i data-lucide="lightbulb" aria-hidden="true"></i>
                  <div>Kapasitas tim = jumlah developer × hari kerja dalam sprint × story points per hari per orang. Biasanya dimulai dari velocity sprint sebelumnya.</div>
                </div>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Aktifkan Sprint</h4>
                <p>Kembali ke tab <strong>Sprints</strong>. Di kartu sprint yang sudah diisi task, klik tombol <strong>Start</strong> (hijau). Konfirmasi. Sprint sekarang berstatus Active.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">4</div>
              <div class="pguide-step__body">
                <h4>Eksekusi: Update Status Harian</h4>
                <p>Selama sprint, anggota tim membuka tab <strong>Sprint Board</strong> dan drag kartu dari "To Do" → "In Progress" → "In Review" → "Done" sesuai progress pekerjaan. PM memantau progress dari Sprint Board atau tab utama Board.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">5</div>
              <div class="pguide-step__body">
                <h4>Selesaikan Sprint</h4>
                <p>Di akhir sprint, klik <strong>Complete Sprint</strong>. Dialog akan muncul:</p>
                <ul>
                  <li>Jika semua task Done → langsung complete</li>
                  <li>Jika ada task yang belum selesai → pilih: <strong>pindah ke Backlog</strong> atau <strong>pindah ke sprint berikutnya</strong></li>
                  <li>Isi <strong>Retrospective Notes</strong>: apa yang berjalan baik, apa yang perlu diperbaiki</li>
                </ul>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">6</div>
              <div class="pguide-step__body">
                <h4>Review Velocity</h4>
                <p>Buka tab <strong>Velocity</strong> untuk melihat bar chart story points committed vs completed. Gunakan data ini untuk menentukan kapasitas sprint selanjutnya secara lebih akurat.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Best Practices -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="star" aria-hidden="true"></i> Best Practices Sprint</h3>
          <div class="pguide-tips-grid">
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--green"><i data-lucide="check" aria-hidden="true"></i></div>
              <div>
                <strong>Set sprint goal yang jelas</strong>
                <p>Sprint goal memberikan arah. Contoh: "Menyelesaikan semua fitur authentication agar QA bisa mulai testing."</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--green"><i data-lucide="check" aria-hidden="true"></i></div>
              <div>
                <strong>Gunakan Sprint Review sebelum Complete</strong>
                <p>Demo hasil sprint ke stakeholder sebelum menekan Complete Sprint. Ini memastikan feedback cepat.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--red"><i data-lucide="x" aria-hidden="true"></i></div>
              <div>
                <strong>Jangan tambah task di tengah sprint</strong>
                <p>Menambah task di sprint yang aktif melanggar prinsip Scrum. Masukkan ke backlog dulu, baru ke sprint berikutnya.</p>
              </div>
            </div>
            <div class="pguide-tip">
              <div class="pguide-tip__icon pguide-tip__icon--red"><i data-lucide="x" aria-hidden="true"></i></div>
              <div>
                <strong>Jangan over-commit</strong>
                <p>Lebih baik sprint yang under-commit tapi semua selesai dari pada over-commit dan 40% masuk backlog lagi.</p>
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
              Ini memudahkan PM melihat dependensi, overlap, dan potensi keterlambatan secara sekilas.
            </p>
          </div>
        </div>
      </div>

      <div class="pguide-callout pguide-callout--warning">
        <i data-lucide="alert-triangle" aria-hidden="true"></i>
        <div>
          <strong>Syarat tampil di Gantt:</strong> Task harus memiliki <em>Start Date</em> dan <em>Due Date</em> yang sudah diisi.
          Task tanpa kedua tanggal ini tidak akan ditampilkan di Gantt Chart. Pastikan mengisi tanggal saat membuat task.
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
                    <div class="pguide-gantt-bar pguide-gantt-bar--done" style="left:0%;width:25%">Done</div>
                  </div>
                  <div class="pguide-gantt-row">
                    <div class="pguide-gantt-bar pguide-gantt-bar--progress" style="left:15%;width:35%">In Progress</div>
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
              <span class="pguide-gantt-legend pguide-gantt-legend--today">| Hari Ini</span>
            </div>
          </div>
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
                <p>Ubah resolusi timeline dengan tombol zoom di atas chart:</p>
                <ul>
                  <li><strong>Day</strong> — detail harian, cocok untuk sprint pendek (&lt; 2 minggu)</li>
                  <li><strong>Week</strong> — tampilan mingguan, paling umum digunakan</li>
                  <li><strong>Month</strong> — gambaran besar, cocok untuk project jangka panjang (&gt; 1 bulan)</li>
                </ul>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="move-horizontal" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Drag Bar untuk Geser Jadwal</h4>
                <p>Seret <em>bagian tengah</em> bar task untuk menggeser keseluruhan durasi task (start date dan due date ikut berubah). Ini memperbarui langsung field tanggal di record task di Firestore.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="arrow-left-right" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Resize Bar untuk Ubah Durasi</h4>
                <p>Seret <em>tepi kiri</em> bar untuk mengubah start date. Seret <em>tepi kanan</em> untuk mengubah due date. Berguna saat ada slippage dan kamu perlu menyesuaikan jadwal task secara visual.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="calendar-check" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Garis Merah "Hari Ini"</h4>
                <p>Garis vertikal merah menandai tanggal hari ini. Task yang bar-nya sudah melewati garis ini tapi belum berstatus Done adalah task yang <strong>terlambat</strong> — segera follow up.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="image-down" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Export PNG</h4>
                <p>Klik tombol <strong>Export PNG</strong> untuk mengunduh screenshot Gantt Chart dalam kondisi zoom dan filter saat ini. Berguna untuk melampirkan ke laporan project atau presentasi ke klien.</p>
              </div>
            </div>
            <div class="pguide-feature">
              <div class="pguide-feature__icon"><i data-lucide="layers" aria-hidden="true"></i></div>
              <div class="pguide-feature__body">
                <h4>Grouping by Sprint</h4>
                <p>Task dikelompokkan berdasarkan sprint mereka. Task backlog (belum di-assign ke sprint) muncul di group tersendiri. Ini membantu melihat timeline per sprint sekaligus.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="pguide-content-card card">
        <div class="card__body">
          <h3 class="pguide-content-card__title"><i data-lucide="play-circle" aria-hidden="true"></i> Cara Menggunakan Gantt Chart</h3>
          <div class="pguide-steps">
            <div class="pguide-step">
              <div class="pguide-step__num">1</div>
              <div class="pguide-step__body">
                <h4>Pastikan Task Punya Tanggal</h4>
                <p>Sebelum buka Gantt, pastikan task sudah memiliki <strong>Start Date</strong> dan <strong>Due Date</strong>. Edit task dari Backlog atau Board → panel detail → isi kedua tanggal.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">2</div>
              <div class="pguide-step__body">
                <h4>Buka Gantt Chart</h4>
                <p>Project → tab <strong>Gantt</strong>. Chart otomatis di-scroll ke tanggal hari ini. Task dikelompokkan per sprint dan ditampilkan sebagai bar berwarna berdasarkan status.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">3</div>
              <div class="pguide-step__body">
                <h4>Identifikasi Keterlambatan</h4>
                <p>Task yang bar-nya sudah melewati garis merah "hari ini" tapi belum Done = terlambat. Segera buka task tersebut dan update status atau sesuaikan jadualnya.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">4</div>
              <div class="pguide-step__body">
                <h4>Sesuaikan Jadwal via Drag</h4>
                <p>Jika ada perubahan scope atau ada keterlambatan yang perlu diakomodir, drag bar task untuk geser jadwal. Tidak perlu buka task detail satu per satu.</p>
              </div>
            </div>
            <div class="pguide-step">
              <div class="pguide-step__num">5</div>
              <div class="pguide-step__body">
                <h4>Export untuk Reporting</h4>
                <p>Sebelum meeting dengan klien atau manajemen, klik <strong>Export PNG</strong> untuk screenshot Gantt. Lampirkan ke laporan progress atau presentasi.</p>
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
            // Update active tab
            content.querySelectorAll('.pguide-tab').forEach(t => t.classList.remove('is-active'));
            btn.classList.add('is-active');
            // Re-render section content
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
