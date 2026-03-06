/**
 * TRACKLY — guide.js
 * In-app User Guide — updated to reflect current feature set.
 * Firebase backend, Cloudinary storage, Vercel deployment.
 * Sections: Overview, Roles, Getting Started, Projects, Tasks, Board,
 * Sprints, Gantt, Maintenance, Reports, Members, Clients, Assets,
 * Meetings, Discussion, Notifications, Notes, Settings.
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
          <p class="page-header__subtitle">Panduan lengkap penggunaan TRACKLY</p>
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
            <li><a href="#guide-maintenance"><i data-lucide="wrench" aria-hidden="true"></i> 9. Maintenance</a></li>
            <li><a href="#guide-reports"><i data-lucide="pie-chart" aria-hidden="true"></i> 10. Reports</a></li>
            <li><a href="#guide-members"><i data-lucide="users" aria-hidden="true"></i> 11. Members</a></li>
            <li><a href="#guide-clients"><i data-lucide="building-2" aria-hidden="true"></i> 12. Clients</a></li>
            <li><a href="#guide-assets"><i data-lucide="package" aria-hidden="true"></i> 13. Assets</a></li>
            <li><a href="#guide-meetings"><i data-lucide="calendar" aria-hidden="true"></i> 14. Meetings &amp; Notulensi</a></li>
            <li><a href="#guide-discussion"><i data-lucide="message-circle" aria-hidden="true"></i> 15. Project Discussion</a></li>
            <li><a href="#guide-notifications"><i data-lucide="bell" aria-hidden="true"></i> 16. Notifications</a></li>
            <li><a href="#guide-notes"><i data-lucide="notebook-pen" aria-hidden="true"></i> 17. Personal Notes</a></li>
            <li><a href="#guide-settings"><i data-lucide="settings" aria-hidden="true"></i> 18. Settings</a></li>
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
            TRACKLY adalah Project Management Information System (PMIS) berbasis cloud yang dirancang untuk perusahaan konsultan IT.
            Aplikasi ini membantu mengelola siklus hidup proyek secara end-to-end — mulai dari perencanaan sprint, pelacakan board,
            hingga laporan maintenance dan penagihan klien.
          </p>
          <p>
            Semua data disimpan di <strong>Firebase Firestore</strong> (cloud database real-time), file dan media
            dikelola melalui <strong>Cloudinary</strong>, dan aplikasi di-deploy via <strong>Vercel</strong>.
          </p>
          <h3>Fitur Utama</h3>
          <ul>
            <li>Multi-project management dengan Kanban board dan Gantt chart</li>
            <li>Sprint planning dengan velocity tracking dan catatan retrospektif</li>
            <li>Maintenance ticket tracking dengan SLA fields dan invoice generator</li>
            <li>Asset management dengan peringatan warranty expiry</li>
            <li>5 jenis laporan dengan ekspor PDF, Excel, dan CSV</li>
            <li>Role-based access control (Admin, PM, Member, Viewer, Client)</li>
            <li>Sistem notifikasi 2-tier yang bertarget berdasarkan role dan assignment</li>
            <li>Meetings &amp; notulensi dengan action items yang bisa dikonversi ke task</li>
            <li>Project discussion feed dengan reply, pin, dan attachment</li>
            <li>Personal notes dengan Markdown editor, folder, share, dan audit log</li>
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
            TRACKLY menggunakan sistem role berlapis. Setiap user memiliki role global, dan Admin atau PM dapat
            menetapkan role spesifik per-project yang menimpa role global untuk project tersebut.
          </p>

          <div class="guide-role-grid">
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('Admin', 'danger')}</div>
              <ul class="guide-role-card__perms">
                <li>Akses penuh ke seluruh sistem</li>
                <li>Kelola semua user</li>
                <li>Buat &amp; hapus project</li>
                <li>Akses Settings</li>
                <li>Terima semua notifikasi penting</li>
              </ul>
            </div>
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('PM', 'secondary')}</div>
              <ul class="guide-role-card__perms">
                <li>Buat &amp; kelola project</li>
                <li>Kelola sprint &amp; task</li>
                <li>Lihat maintenance &amp; laporan</li>
                <li>Kelola member &amp; client</li>
                <li>Generate invoice</li>
              </ul>
            </div>
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('Member', 'info')}</div>
              <ul class="guide-role-card__perms">
                <li>Lihat project yang ditugaskan</li>
                <li>Update status task</li>
                <li>Terima notifikasi assignment</li>
                <li>Tambah komentar &amp; checklist</li>
                <li>Akses discussion &amp; notes</li>
              </ul>
            </div>
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('Viewer', 'neutral')}</div>
              <ul class="guide-role-card__perms">
                <li>Lihat status project</li>
                <li>Lihat detail task (read-only)</li>
                <li>Tidak menerima notifikasi operasional</li>
                <li>Tidak bisa create/edit/delete</li>
              </ul>
            </div>
            <div class="guide-role-card">
              <div class="guide-role-card__badge">${renderBadge('Client', 'warning')}</div>
              <ul class="guide-role-card__perms">
                <li>Lihat tiket maintenance yang ditandai untuknya</li>
                <li>Tidak melihat data internal tim</li>
                <li>Tidak menerima notifikasi operasional</li>
                <li>Akses sangat terbatas</li>
              </ul>
            </div>
          </div>

          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>User baru dibuat oleh Admin atau PM melalui halaman Members. Login menggunakan <strong>username</strong> dan password (bukan email).</p>
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
          <p>Ikuti langkah-langkah ini untuk mulai menggunakan TRACKLY:</p>
          <ol>
            <li><strong>Login:</strong> Gunakan username dan password yang diberikan oleh Admin. Sesi aktif selama 8 jam (30 hari jika "Remember me" dicentang).</li>
            <li><strong>Tambah Member:</strong> Buka <a href="#/members">Members</a> dan buat akun baru. Tentukan role (Member, PM, Viewer, atau Client).</li>
            <li><strong>Tambah Client:</strong> Buka <a href="#/clients">Clients</a> dan daftarkan perusahaan klien agar bisa ditautkan ke project.</li>
            <li><strong>Buat Project:</strong> Buka <a href="#/projects">Projects</a> dan klik <strong>New Project</strong>. Isi nama, tanggal, client, dan assign anggota tim.</li>
            <li><strong>Buat Task:</strong> Buka project → tab Backlog. Buat task dengan prioritas, estimasi, dan assignee.</li>
            <li><strong>Mulai Sprint:</strong> Buka tab Sprint, buat sprint dengan tanggal, dan pindahkan task dari backlog ke sprint.</li>
            <li><strong>Pantau Progress:</strong> Gunakan tab Board (Kanban) untuk memindahkan task antar kolom sesuai progres pekerjaan.</li>
          </ol>
        </div>
      </div>

      <!-- Section 4: Projects -->
      <div class="guide-section card" id="guide-projects">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="folder-kanban" aria-hidden="true"></i>
            4. Projects
          </h2>
          <p>Project adalah entitas utama di TRACKLY. Setiap project memiliki board, backlog, sprint, Gantt chart, maintenance, discussion, dan laporan tersendiri.</p>
          <h3>Membuat Project</h3>
          <p>Klik <strong>New Project</strong> di halaman Projects. Field yang tersedia:</p>
          <ul>
            <li><strong>Status:</strong> Planning, Active, Maintenance, On Hold, Completed, atau Cancelled</li>
            <li><strong>Phase:</strong> Development, UAT, Deployment, Running, atau Maintenance</li>
            <li><strong>Client:</strong> Tautkan ke client yang sudah terdaftar</li>
            <li><strong>Budget:</strong> Set estimasi budget untuk dipantau vs aktual</li>
            <li><strong>Cover Color:</strong> Pilih warna untuk identifikasi visual project card</li>
            <li><strong>Members:</strong> Assign anggota tim ke project</li>
          </ul>
          <h3>Sub-halaman Project</h3>
          <p>Klik project card untuk membuka halaman detail dengan tab berikut:</p>
          <ul>
            <li><strong>Overview:</strong> Statistik ringkasan, panel tim, progres budget, dan detail project</li>
            <li><strong>Board:</strong> Kanban board untuk mengelola alur task</li>
            <li><strong>Backlog:</strong> Daftar task lengkap dengan filter dan bulk actions</li>
            <li><strong>Sprint:</strong> Perencanaan dan manajemen sprint aktif</li>
            <li><strong>Gantt:</strong> Timeline task dan milestone</li>
            <li><strong>Maintenance:</strong> (Muncul saat phase Running/Maintenance) Pelacak tiket</li>
            <li><strong>Discussion:</strong> Forum diskusi internal tim project</li>
            <li><strong>Reports:</strong> Laporan dan chart per project</li>
            <li><strong>Log:</strong> Audit trail semua aktivitas project</li>
          </ul>
          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>Tab <strong>Maintenance</strong> hanya muncul ketika phase project diset ke <em>Running</em> atau <em>Maintenance</em>. Update phase dari tab Overview.</p>
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
          <p>Task adalah unit kerja utama di TRACKLY. Setiap task milik sebuah project dan bisa di-assign ke sprint.</p>
          <h3>Field Task</h3>
          <ul>
            <li><strong>Title:</strong> Wajib diisi. Deskripsi singkat pekerjaan.</li>
            <li><strong>Type:</strong> Story, Task, Bug, Enhancement, atau Epic</li>
            <li><strong>Priority:</strong> Low, Medium, High, atau Critical</li>
            <li><strong>Status:</strong> Backlog, To Do, In Progress, In Review, Done, Cancelled</li>
            <li><strong>Assignees:</strong> Satu atau lebih anggota tim — assignee akan menerima notifikasi personal saat di-assign</li>
            <li><strong>Reporter:</strong> User yang membuat/melaporkan task</li>
            <li><strong>Story Points:</strong> Estimasi effort untuk velocity tracking</li>
            <li><strong>Dates:</strong> Start date dan due date</li>
            <li><strong>Tags:</strong> Label bebas untuk kategorisasi</li>
            <li><strong>Checklist:</strong> Sub-item dalam task</li>
            <li><strong>Comments:</strong> Thread diskusi pada task</li>
            <li><strong>Description:</strong> Deskripsi format Markdown</li>
          </ul>
          <h3>Bulk Actions</h3>
          <p>Di halaman Backlog, gunakan checkbox untuk memilih beberapa task sekaligus. Lalu bisa bulk-update status, priority, sprint assignment, atau hapus semuanya.</p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Saat kamu men-assign task ke member, mereka langsung menerima notifikasi: <em>"[Nama] menugaskan kamu pada task X"</em>.</p>
          </div>
        </div>
      </div>

      <!-- Section 6: Kanban Board -->
      <div class="guide-section card" id="guide-board">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="layout-dashboard" aria-hidden="true"></i>
            6. Kanban Board
          </h2>
          <p>Kanban Board memberikan tampilan visual semua task dalam project, diorganisir dalam kolom berdasarkan status.</p>
          <h3>Drag and Drop</h3>
          <p>Drag kartu task ke kolom berbeda untuk langsung mengubah statusnya. Status tersinkronisasi otomatis ke record task.</p>
          <h3>Custom Columns</h3>
          <p>Setiap project bisa punya konfigurasi kolom sendiri. Klik <strong>Add Column</strong> untuk menambah kolom, hover di header kolom untuk rename atau hapus.</p>
          <h3>Swimlane View</h3>
          <p>Toggle mode Swimlane (berdasarkan Assignee) untuk mengelompokkan kartu task secara horizontal per orang — berguna untuk memantau beban kerja tim.</p>
          <h3>Filter</h3>
          <p>Gunakan filter bar di bagian atas board untuk filter berdasarkan assignee, priority, label, atau sprint.</p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Klik kartu task manapun untuk membuka panel detail lengkap di mana kamu bisa mengedit semua field, menambahkan komentar, dan mengelola checklist.</p>
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
          <p>Sprint adalah iterasi berbatas waktu. TRACKLY mendukung perencanaan sprint, pelacakan sprint aktif, velocity chart, dan retrospektif.</p>
          <h3>Membuat Sprint</h3>
          <p>Di tab Sprint, klik <strong>New Sprint</strong>. Set nama (misal: "Sprint 1"), tanggal mulai, tanggal selesai, dan goal opsional.</p>
          <h3>Sprint Planning</h3>
          <p>Gunakan tampilan dua panel untuk drag task dari Backlog ke sprint. Story points dijumlahkan real-time agar tidak overcommit.</p>
          <h3>Mulai dan Selesaikan Sprint</h3>
          <p>Klik <strong>Start Sprint</strong> untuk mengaktifkan (hanya satu sprint bisa aktif). Saat sprint selesai, klik <strong>Complete Sprint</strong> — kamu akan ditanya apa yang dilakukan dengan task yang belum selesai (pindah ke backlog atau ke sprint berikutnya).</p>
          <h3>Velocity Chart</h3>
          <p>Bar chart velocity menampilkan story points yang selesai per sprint — berguna untuk estimasi kapasitas mendatang.</p>
          <h3>Catatan Retrospektif</h3>
          <p>Setelah sprint selesai, tambahkan catatan retrospektif (apa yang berjalan baik, apa yang perlu diperbaiki) langsung di kartu sprint.</p>
        </div>
      </div>

      <!-- Section 8: Gantt Chart -->
      <div class="guide-section card" id="guide-gantt">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="bar-chart-2" aria-hidden="true"></i>
            8. Gantt Chart
          </h2>
          <p>Gantt chart memberikan tampilan timeline semua task yang dikelompokkan berdasarkan sprint atau fase, ditampilkan sebagai bar horizontal.</p>
          <h3>Zoom Level</h3>
          <p>Ganti antara <strong>Day</strong>, <strong>Week</strong>, dan <strong>Month</strong> untuk menyesuaikan resolusi timeline.</p>
          <h3>Drag untuk Resize dan Pindah</h3>
          <p>Drag tepi kiri atau kanan bar task untuk mengubah tanggal mulai/selesai. Drag bar itu sendiri untuk menggeser keseluruhan task dalam waktu.</p>
          <h3>Garis Hari Ini</h3>
          <p>Garis vertikal biru menandai tanggal hari ini sebagai referensi cepat.</p>
          <h3>Export PNG</h3>
          <p>Klik tombol <strong>Export PNG</strong> untuk mengunduh tampilan Gantt saat ini sebagai file gambar.</p>
          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>Task harus memiliki start date dan due date agar muncul di Gantt chart. Task tanpa tanggal tidak ditampilkan.</p>
          </div>
        </div>
      </div>

      <!-- Section 9: Maintenance -->
      <div class="guide-section card" id="guide-maintenance">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="wrench" aria-hidden="true"></i>
            9. Maintenance
          </h2>
          <p>Modul Maintenance melacak tiket support pasca-delivery untuk project dalam fase <em>Running</em> atau <em>Maintenance</em>. Dilengkapi field SLA, assignment multi-developer, kontrol visibilitas klien, dan lampiran file.</p>

          <h3>Field Tiket</h3>
          <ul>
            <li><strong>Severity</strong> — <em>Major</em> atau <em>Minor</em>: mengklasifikasikan dampak masalah. Major = berdampak pada bisnis; Minor = kosmetik atau dampak rendah.</li>
            <li><strong>Assigned Date</strong> — Tanggal tiket secara resmi di-assign ke developer. Berguna untuk tracking SLA.</li>
            <li><strong>Due Date</strong> — Target tanggal penyelesaian tiket.</li>
            <li><strong>Ordered By</strong> — PM atau Admin yang memerintahkan tiket ini.</li>
            <li><strong>PIC Dev (Multi-select)</strong> — Satu atau lebih developer yang di-assign ke tiket. Jika dipilih, <strong>hanya developer tersebut yang dapat melihat tiket</strong>. Jika kosong, semua developer bisa melihatnya.</li>
            <li><strong>PIC Client</strong> — Nama PIC dari sisi klien. Viewer/Client hanya bisa melihat tiket yang PIC Client-nya diisi.</li>
            <li><strong>Attachments</strong> — Upload file bukti (screenshot, log, dokumen). Masing-masing maks 5MB.</li>
          </ul>

          <h3>Aturan Visibilitas</h3>
          <ul>
            <li><strong>Admin / PM:</strong> Melihat semua tiket.</li>
            <li><strong>Member/Developer:</strong> Jika tiket tidak memiliki PIC Dev, terlihat semua developer. Jika ada PIC Dev, hanya developer yang dipilih yang bisa melihat.</li>
            <li><strong>Viewer / Client:</strong> Hanya tiket yang PIC Client-nya diisi.</li>
          </ul>

          <h3>Pipeline Tiket</h3>
          <p>Tiket mengalir: <strong>Open → In Progress → Resolved → Closed</strong>. Gunakan tombol advance cepat di panel detail, atau tombol Reject untuk menolak tiket.</p>

          <h3>Laporan Maintenance &amp; Invoice</h3>
          <p>Klik <strong>Generate Report</strong> dari halaman Maintenance (tersedia untuk PM dan Admin). Set rentang tanggal, lalu gunakan tombol export:</p>
          <ul>
            <li><strong>Export PDF</strong> — Membuka dialog print browser. Semua field (Severity, Due Date, Assigned Date, Ordered By, PIC Client) disertakan.</li>
            <li><strong>Export Excel (.xlsx)</strong> — Mengunduh spreadsheet Excel lengkap semua tiket dalam rentang tanggal.</li>
            <li><strong>Export CSV</strong> — Data yang sama dalam format CSV, UTF-8 dengan BOM.</li>
            <li><strong>Generate Invoice</strong> — Beralih ke tampilan invoice builder. Pilih mode billing (Hourly Rate / Flat / Custom).</li>
          </ul>

          <div class="guide-warning">
            <i data-lucide="alert-triangle" aria-hidden="true"></i>
            <p>Tab Maintenance disembunyikan kecuali phase project diset ke <em>Running</em> atau <em>Maintenance</em>. Update phase dari tab Overview.</p>
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
          <p>TRACKLY menyertakan lima jenis laporan bawaan yang bisa diakses dari tab Reports setiap project.</p>
          <ul>
            <li><strong>Project Progress:</strong> Task berdasarkan status, priority, dan tipe — dengan doughnut dan bar chart, plus tabel ringkasan sprint.</li>
            <li><strong>Team Workload:</strong> Task dan jam yang dicatat per anggota tim — stacked bar chart dan tabel detail.</li>
            <li><strong>Sprint Burndown:</strong> Line chart burndown ideal vs aktual story points untuk sprint manapun.</li>
            <li><strong>Maintenance Summary:</strong> Breakdown tiket berdasarkan tipe dan status — doughnut chart dan daftar tiket lengkap.</li>
            <li><strong>Asset Inventory:</strong> Jumlah aset berdasarkan kategori dan status — pie dan bar chart dengan tabel aset lengkap.</li>
          </ul>
          <h3>Export PDF</h3>
          <p>Semua laporan bisa diekspor ke PDF. Klik tombol <strong>Print / Export PDF</strong>, lalu gunakan fitur Save as PDF di dialog print browser.</p>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Gunakan filter rentang tanggal di bagian atas setiap laporan untuk membatasi data ke periode tertentu.</p>
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
          <p>Halaman Members (Admin/PM only) berfungsi mengelola semua akun user dalam sistem.</p>
          <ul>
            <li>Buat member baru dengan detail profil lengkap termasuk avatar, posisi, dan departemen</li>
            <li>Assign role global (Admin, PM, Member, Viewer, Client)</li>
            <li>Nonaktifkan user untuk memblokir akses login</li>
            <li>Search dan filter berdasarkan role atau status</li>
            <li>Edit username dan password member langsung dari halaman ini</li>
          </ul>
          <div class="guide-warning">
            <i data-lucide="alert-triangle" aria-hidden="true"></i>
            <p>Menonaktifkan user mencegah mereka login, tetapi assignment task dan histori mereka tetap tersimpan. Data tidak dihapus.</p>
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
          <p>Halaman Clients (Admin/PM only) mengelola record perusahaan klien.</p>
          <ul>
            <li>Tambah client dengan nama perusahaan, kontak, email, telepon, website, dan alamat</li>
            <li>Upload logo perusahaan (disimpan di Cloudinary)</li>
            <li>Pantau status client: Active, Inactive, atau Prospect</li>
            <li>Lihat project mana yang terhubung ke setiap client</li>
          </ul>
          <p>Client ditautkan ke project melalui form create/edit project. Nama dan logo client muncul di project card dan dalam laporan.</p>
        </div>
      </div>

      <!-- Section 13: Assets -->
      <div class="guide-section card" id="guide-assets">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="package" aria-hidden="true"></i>
            13. Assets
          </h2>
          <p>Halaman Assets melacak hardware, software, lisensi, dan sumber daya lain yang digunakan tim dan project.</p>
          <ul>
            <li><strong>Kategori:</strong> Hardware, Software, License, Document, Other</li>
            <li><strong>Status:</strong> Available, In Use, Under Maintenance, Retired</li>
            <li>Assign aset ke anggota tim atau project tertentu</li>
            <li>Set tanggal kedaluarsa garansi — aset yang kedaluarsa dalam 30 hari disorot oranye</li>
            <li>Upload gambar aset sebagai referensi visual</li>
          </ul>
          <div class="guide-tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <p>Gunakan laporan Asset Inventory (dari tab Reports project mana pun) untuk mendapatkan ikhtisar semua aset yang bisa dicetak.</p>
          </div>
        </div>
      </div>

      <!-- Section 14: Meetings & Notulensi -->
      <div class="guide-section card" id="guide-meetings">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="calendar" aria-hidden="true"></i>
            14. Meetings &amp; Notulensi
          </h2>
          <p>Modul Meetings memungkinkan kamu menjadwalkan, mengelola, dan mendokumentasikan semua meeting tim dan klien di satu tempat. Akses dari sidebar.</p>

          <h3>Visibilitas Meeting</h3>
          <p>Hanya user yang diundang ke meeting (sebagai attendee) yang bisa melihat kartu dan detail meeting. User yang tidak diundang tidak akan melihat meeting tersebut — kecuali Admin dan PM yang selalu bisa melihat semua meeting.</p>

          <h3>Tampilan Kalender</h3>
          <p>Halaman Meetings menampilkan mini-kalender di kiri dan daftar meeting hari itu di kanan. Toggle antara tampilan Bulan dan Minggu menggunakan tombol di header halaman.</p>

          <h3>Membuat Meeting</h3>
          <p>Klik "New Meeting" untuk membuka form. Isi judul, tipe, tanggal, rentang waktu, dan lokasi. Gunakan tab Agenda untuk menambahkan item agenda gaya checklist, dan tab Attendees &amp; Projects untuk menghubungkan anggota tim dan project terkait.</p>

          <h3>Tipe Meeting</h3>
          <p>Tipe yang tersedia: Internal, Client Meeting, Sprint Review, Retrospective, dan Other.</p>

          <h3>Halaman Detail Meeting</h3>
          <p>Klik "View" di kartu meeting untuk membuka halaman detailnya. Gunakan tombol advance untuk memindahkan meeting: Scheduled → Ongoing → Done. Kamu juga bisa membatalkan meeting dari sini.</p>

          <h3>Notulensi</h3>
          <p>Panel Notulensi memiliki dua mode: Text Editor (Markdown + live preview) dan File Attachment (upload dokumen pendukung maks 5MB per file).</p>

          <h3>Action Items</h3>
          <p>Tambahkan follow-up task di section Action Items. Klik "Create Task" untuk mengkonversi action item menjadi task nyata di backlog project yang dipilih — pre-filled dengan teks, assignee, dan due date.</p>
        </div>
      </div>

      <!-- Section 15: Project Discussion -->
      <div class="guide-section card" id="guide-discussion">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="message-circle" aria-hidden="true"></i>
            15. Project Discussion
          </h2>
          <p>Setiap project memiliki tab Discussion (terlihat oleh Admin, PM, dan Member) untuk memposting update tim, pertanyaan, keputusan, dan blocker di satu tempat.</p>

          <h3>Membuat Post</h3>
          <p>Klik "New Post", pilih tipe (Update, Question, Decision, Blocker, atau General), tulis konten menggunakan Markdown, dan lampirkan file opsional maks 5MB. Klik "Post" untuk publish.</p>

          <h3>Tipe Post</h3>
          <p>Setiap post diberi kode warna: Blocker = merah, Decision = ungu, Question = biru, Update = hijau, General = abu-abu.</p>

          <h3>Pinned Posts</h3>
          <p>Admin dan PM bisa pin post penting. Post yang di-pin muncul di section tersendiri di atas feed reguler.</p>

          <h3>Reply</h3>
          <p>Klik tombol reply di post manapun. Post dengan lebih dari 3 reply hanya menampilkan 3 terbaru — klik "Show all" untuk melihat semua.</p>

          <h3>Edit dan Hapus</h3>
          <p>Author bisa edit atau hapus post mereka. Admin dan PM bisa hapus post siapapun.</p>

          <h3>Paginasi Feed</h3>
          <p>Feed menampilkan 20 post terbaru per halaman. Gunakan tombol Previous/Next untuk navigasi post lama.</p>
        </div>
      </div>

      <!-- Section 16: Notifications -->
      <div class="guide-section card" id="guide-notifications">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="bell" aria-hidden="true"></i>
            16. Notifications
          </h2>
          <p>Sistem notifikasi TRACKLY menggunakan pendekatan <strong>2-tier</strong> yang memastikan setiap user hanya menerima notifikasi yang relevan bagi mereka.</p>

          <h3>Tier 1 — Notifikasi Personal</h3>
          <p>Dikirim langsung ke individu spesifik:</p>
          <ul>
            <li>Kamu di-assign ke task → notif personal: <em>"[Nama] menugaskan kamu pada task X"</em></li>
            <li>Task yang kamu jadikan assignee diedit/dihapus → kamu mendapat notif</li>
            <li>Kamu diundang ke meeting → kamu mendapat notif</li>
          </ul>

          <h3>Tier 2 — Notifikasi Broadcast</h3>
          <p>Dikirim ke grup berdasarkan role:</p>
          <ul>
            <li><strong>Task / Sprint / Discussion</strong> → Admin, PM, Member project (Viewer &amp; Client <em>tidak</em> menerima)</li>
            <li><strong>Maintenance</strong> → Admin + PM saja</li>
            <li><strong>Manajemen member</strong> → Admin saja</li>
            <li><strong>Project / Client / Asset / Invoice</strong> → Admin + PM saja</li>
          </ul>

          <h3>Melihat Notifikasi</h3>
          <p>Klik ikon lonceng di topbar untuk membuka panel notifikasi. Notifikasi yang belum dibaca ditandai dengan titik biru. Gunakan tab "All" dan "Unread" untuk menyaring tampilan.</p>

          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>Viewer dan Client tidak menerima notifikasi operasional apapun (task, sprint, maintenance). Ini dirancang agar mereka tidak dibanjiri informasi yang tidak relevan.</p>
          </div>
        </div>
      </div>

      <!-- Section 17: Personal Notes -->
      <div class="guide-section card" id="guide-notes">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="notebook-pen" aria-hidden="true"></i>
            17. Personal Notes
          </h2>
          <p>Personal Notes adalah modul catatan pribadi per-user, tersedia untuk semua role. Catatan bersifat personal dan tidak ditampilkan ke user lain — kecuali jika kamu memilih untuk membagikannya.</p>

          <h3>Layout</h3>
          <p>Halaman menggunakan dua panel: panel kiri (daftar catatan, folder, search) dan panel kanan (editor Markdown).</p>

          <h3>Membuat Catatan Baru</h3>
          <p>Klik <strong>New Note</strong>. Isi judul dan konten. Catatan disimpan otomatis (autosave 800ms setelah berhenti mengetik).</p>

          <h3>Editor Markdown</h3>
          <p>Supports Markdown. Gunakan toolbar untuk bold, italic, dan heading, atau shortcut <strong>Ctrl+B</strong> / <strong>Ctrl+I</strong>. Toggle antara mode Edit dan Preview.</p>

          <h3>Pin, Warna, dan Tag</h3>
          <ul>
            <li><strong>Pin:</strong> Catatan yang di-pin muncul di section Pinned di atas daftar.</li>
            <li><strong>Warna:</strong> Pilih salah satu dari 7 warna pastel.</li>
            <li><strong>Tag:</strong> Ketik tag dan tekan Enter atau koma. Hapus dengan ×.</li>
          </ul>

          <h3>Folder</h3>
          <p>Klik <strong>New Folder</strong> untuk membuat folder. Pindahkan catatan via dropdown di toolbar. Hapus folder akan memindahkan semua catatan di dalamnya ke All Notes.</p>

          <h3>Berbagi Catatan</h3>
          <p>Klik <strong>Share</strong> di toolbar. Set permission: <em>Hanya lihat</em> (read-only) atau <em>Bisa edit</em>. Cabut akses kapan saja dari modal share.</p>

          <h3>Export &amp; Import</h3>
          <ul>
            <li><strong>Export .md:</strong> Download catatan aktif sebagai file Markdown.</li>
            <li><strong>Export Notes:</strong> Export semua catatan ke JSON atau Markdown gabungan.</li>
            <li><strong>Import:</strong> Import file JSON hasil export sebelumnya.</li>
            <li><strong>Upload .md:</strong> Upload file .md atau .txt — langsung jadi catatan baru.</li>
          </ul>

          <h3>Riwayat Aktivitas</h3>
          <p>Owner catatan bisa melihat semua aktivitas pada catatan tersebut di tab <strong>Riwayat</strong> — timeline vertikal dengan avatar user, deskripsi aksi, dan waktu relatif.</p>
        </div>
      </div>

      <!-- Section 18: Settings -->
      <div class="guide-section card" id="guide-settings">
        <div class="card__body">
          <h2 class="guide-section__title">
            <i data-lucide="settings" aria-hidden="true"></i>
            18. Settings
          </h2>
          <p>Settings (Admin/PM only) tersedia dalam dua tab:</p>
          <h3>General</h3>
          <p>Konfigurasi nama sistem, timezone, format tanggal, dan mata uang. Set juga default hourly rate dan persentase pajak yang digunakan dalam pembuatan invoice.</p>
          <h3>About / Changelog</h3>
          <p>Lihat versi saat ini, riwayat changelog lengkap, tech stack yang digunakan, dan informasi aplikasi.</p>
          <div class="guide-tip">
            <i data-lucide="info" aria-hidden="true"></i>
            <p>Karena TRACKLY kini menggunakan Firebase Firestore sebagai database cloud, fitur Export/Import/Reset Data dan PWA tidak tersedia. Pengelolaan data dilakukan langsung melalui Firebase Console.</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="card" style="margin-bottom: var(--space-8);">
        <div class="card__body" style="text-align:center; color:var(--color-text-muted); font-size:var(--text-sm);">
          <p>TRACKLY &mdash; Track Everything, Deliver Anything</p>
          <p>Butuh bantuan lebih lanjut? Hubungi administrator sistem kamu.</p>
        </div>
      </div>

    </div>
  `;
}

export default { render };
