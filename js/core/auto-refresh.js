/**
 * TRACKLY — auto-refresh.js
 * Polls a refresh function on a configurable interval.
 * Pauses when the browser tab is hidden (Page Visibility API).
 * Shows a small fixed indicator showing last-updated time + countdown.
 */

let _timer = null;
let _countdown = null;
let _refreshFn = null;
let _intervalMs = 60000;
let _lastUpdated = null;
let _paused = false;
let _remaining = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start auto-refresh polling.
 * @param {() => void | Promise<void>} fn   The function to call on each tick
 * @param {number} intervalMs               Refresh interval in milliseconds (default 60 000)
 */
export function startAutoRefresh(fn, intervalMs = 60000) {
    stopAutoRefresh();                     // Clear any previous session
    _refreshFn = fn;
    _intervalMs = intervalMs;
    _remaining = Math.round(_intervalMs / 1000);
    _lastUpdated = new Date();

    _renderIndicator();
    _scheduleTick();
    _startCountdown();

    // Pause / resume on tab visibility
    document.addEventListener('visibilitychange', _onVisibilityChange);
    // Stop on navigation
    window.addEventListener('hashchange', stopAutoRefresh, { once: true });
}

/**
 * Stop auto-refresh and remove the indicator.
 */
export function stopAutoRefresh() {
    clearTimeout(_timer);
    clearInterval(_countdown);
    document.removeEventListener('visibilitychange', _onVisibilityChange);
    const el = document.getElementById('autoRefreshIndicator');
    if (el) el.remove();
    _timer = _countdown = _refreshFn = null;
    _paused = false;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _scheduleTick() {
    _timer = setTimeout(async () => {
        if (_paused || !_refreshFn) return;
        try {
            await _refreshFn();
            _lastUpdated = new Date();
        } catch (_) { /* non-fatal */ }
        _remaining = Math.round(_intervalMs / 1000);
        _updateIndicator();
        _scheduleTick();
    }, _intervalMs);
}

function _startCountdown() {
    _countdown = setInterval(() => {
        if (!_paused) {
            _remaining = Math.max(0, _remaining - 1);
            _updateIndicator();
        }
    }, 1000);
}

function _onVisibilityChange() {
    if (document.hidden) {
        _paused = true;
        clearTimeout(_timer);
    } else {
        _paused = false;
        _remaining = Math.round(_intervalMs / 1000);
        _scheduleTick();
        _updateIndicator();
    }
}

function _fmt(date) {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function _renderIndicator() {
    // Remove stale indicator if any
    document.getElementById('autoRefreshIndicator')?.remove();

    const el = document.createElement('div');
    el.id = 'autoRefreshIndicator';
    el.innerHTML = `
    <span id="arLastUpdated">Updated ${_fmt(_lastUpdated)}</span>
    <span id="arCountdown" style="color:var(--color-text-muted);font-size:10px;">next ${_remaining}s</span>
    <button id="arRefreshNow" title="Refresh now" style="background:none;border:none;cursor:pointer;padding:0;display:inline-flex;color:var(--color-text-muted);">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
    </button>`;
    document.body.appendChild(el);

    document.getElementById('arRefreshNow')?.addEventListener('click', async () => {
        clearTimeout(_timer);
        const btn = document.getElementById('arRefreshNow');
        if (btn) btn.style.opacity = '0.4';
        try {
            await _refreshFn?.();
            _lastUpdated = new Date();
        } catch (_) { /* non-fatal */ }
        _remaining = Math.round(_intervalMs / 1000);
        _updateIndicator();
        _scheduleTick();
        if (btn) btn.style.opacity = '';
    });
}

function _updateIndicator() {
    const lu = document.getElementById('arLastUpdated');
    const cd = document.getElementById('arCountdown');
    if (lu) lu.textContent = `Updated ${_fmt(_lastUpdated)}`;
    if (cd) cd.textContent = _paused ? 'paused' : `next ${_remaining}s`;
}
