/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 約束のあの場所で 一号 (Vanilla TypeScript / Standard DOM)
 */
const STORAGE_KEY = 'yakusoku_app_settings_v1';
const RANDOM_SLOGANS = [
    '「みんなで集合だぜ！」',
    '「遅れないでね・・・」',
    '「走れ！急げ！」',
    '「あの場所で待ち合わせ。」',
];
const DEFAULT_7_PEOPLE = [
    { id: '1', name: '', minutes: 0, seconds: 0 },
    { id: '2', name: '', minutes: 0, seconds: 0 },
    { id: '3', name: '', minutes: 0, seconds: 0 },
    { id: '4', name: '', minutes: 0, seconds: 0 },
    { id: '5', name: '', minutes: 0, seconds: 0 },
    { id: '6', name: '', minutes: 0, seconds: 0 },
    { id: '7', name: '', minutes: 0, seconds: 0 },
];
function padZero(num) {
    return String(Math.max(0, Math.floor(num))).padStart(2, '0');
}
function formatSecondsToHumanReadable(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(safeSeconds / 3600);
    const m = Math.floor((safeSeconds % 3600) / 60);
    const s = safeSeconds % 60;
    if (h > 0)
        return `${h}時間${m}分${s}秒`;
    if (m > 0)
        return `${m}分${s}秒`;
    return `${s}秒`;
}
function calculateDeparture(name, travelSeconds, targetHours, targetMinutes, targetSeconds) {
    const safeTargetH = Math.max(0, Math.min(23, targetHours || 0));
    const safeTargetM = Math.max(0, Math.min(59, targetMinutes || 0));
    const safeTargetS = Math.max(0, Math.min(59, targetSeconds || 0));
    const safeTravelS = Math.max(0, travelSeconds || 0);
    const targetTotalSeconds = safeTargetH * 3600 + safeTargetM * 60 + safeTargetS;
    const travelTotalSeconds = safeTravelS;
    const departureTotalSeconds = targetTotalSeconds - travelTotalSeconds;
    const daysOffset = Math.floor(departureTotalSeconds / 86400);
    const departureSecondsOfDay = ((departureTotalSeconds % 86400) + 86400) % 86400;
    const depH = Math.floor(departureSecondsOfDay / 3600);
    const depM = Math.floor((departureSecondsOfDay % 3600) / 60);
    const depS = departureSecondsOfDay % 60;
    const departureTimeFormatted = `${padZero(depH)}:${padZero(depM)}:${padZero(depS)}`;
    const departureTimeJaFormatted = `${padZero(depH)}時${padZero(depM)}分${padZero(depS)}秒`;
    const displayName = name.trim();
    const dayPrefix = daysOffset < 0 ? '(前日) ' : daysOffset > 0 ? '(翌日) ' : '';
    const formattedBulletItem = displayName
        ? `${displayName} ${dayPrefix}${departureTimeFormatted}`
        : `${dayPrefix}${departureTimeFormatted}`;
    const formattedBulletJaItem = displayName
        ? `${displayName} ${dayPrefix}${departureTimeJaFormatted}`
        : `${dayPrefix}${departureTimeJaFormatted}`;
    return {
        name: displayName,
        travelSeconds: travelTotalSeconds,
        departureTimeFormatted,
        departureTimeJaFormatted,
        departureSecondsOfDay,
        daysOffset,
        formattedBulletItem,
        formattedBulletJaItem,
    };
}
async function copyTextToClipboard(text) {
    if (!text)
        return false;
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    }
    catch {
        // fallback
    }
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    }
    catch {
        return false;
    }
}
// -------------------------------------------------------------
// アプリケーション状態管理
// -------------------------------------------------------------
class AppState {
    targetHours = 18;
    targetMinutes = 0;
    targetSeconds = 0;
    gatheringMinutes = 0;
    meetingPlace = '';
    travelers = JSON.parse(JSON.stringify(DEFAULT_7_PEOPLE));
    timeFormat = 'colon';
    bulletStyle = 'none';
    slogan = RANDOM_SLOGANS[0];
    sortByEarliest = true;
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw)
                return;
            const parsed = JSON.parse(raw);
            if (!parsed)
                return;
            if (typeof parsed.targetHours === 'number' && parsed.targetHours >= 0 && parsed.targetHours <= 23) {
                this.targetHours = parsed.targetHours;
            }
            if (typeof parsed.targetMinutes === 'number' && parsed.targetMinutes >= 0 && parsed.targetMinutes <= 59) {
                this.targetMinutes = parsed.targetMinutes;
            }
            if (typeof parsed.targetSeconds === 'number' && parsed.targetSeconds >= 0 && parsed.targetSeconds <= 59) {
                this.targetSeconds = parsed.targetSeconds;
            }
            if (typeof parsed.gatheringMinutes === 'number' && parsed.gatheringMinutes >= 0) {
                this.gatheringMinutes = parsed.gatheringMinutes;
            }
            if (typeof parsed.meetingPlace === 'string') {
                this.meetingPlace = parsed.meetingPlace;
            }
            if (Array.isArray(parsed.travelers) && parsed.travelers.length === 7) {
                this.travelers = parsed.travelers.map((t, idx) => ({
                    id: String(idx + 1),
                    name: typeof t.name === 'string' ? t.name : '',
                    minutes: Math.min(999, Math.max(0, Number(t.minutes) || 0)),
                    seconds: Math.min(999, Math.max(0, Number(t.seconds) || 0)),
                }));
            }
            if (parsed.timeFormat === 'colon' || parsed.timeFormat === 'japanese') {
                this.timeFormat = parsed.timeFormat;
            }
            if (parsed.bulletStyle === 'none' || parsed.bulletStyle === 'bullet' || parsed.bulletStyle === 'dash') {
                this.bulletStyle = parsed.bulletStyle;
            }
            if (typeof parsed.slogan === 'string' && parsed.slogan.trim()) {
                this.slogan = parsed.slogan;
            }
        }
        catch (e) {
            console.warn('Load settings failed', e);
        }
    }
    save() {
        try {
            const data = {
                targetHours: this.targetHours,
                targetMinutes: this.targetMinutes,
                targetSeconds: this.targetSeconds,
                gatheringMinutes: this.gatheringMinutes,
                meetingPlace: this.meetingPlace,
                travelers: this.travelers,
                timeFormat: this.timeFormat,
                bulletStyle: this.bulletStyle,
                slogan: this.slogan,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
        catch (e) {
            console.warn('Save settings failed', e);
        }
    }
}
const state = new AppState();
// -------------------------------------------------------------
// UI更新レンダリング
// -------------------------------------------------------------
function renderTargetTime() {
    const hInput = document.getElementById('target-hours');
    const mInput = document.getElementById('target-minutes');
    const sInput = document.getElementById('target-seconds');
    const preview = document.getElementById('target-time-preview');
    if (hInput && document.activeElement !== hInput) {
        hInput.value = padZero(state.targetHours);
    }
    if (mInput && document.activeElement !== mInput) {
        mInput.value = padZero(state.targetMinutes);
    }
    if (sInput && document.activeElement !== sInput) {
        sInput.value = padZero(state.targetSeconds);
    }
    if (preview) {
        preview.textContent = `${padZero(state.targetHours)}:${padZero(state.targetMinutes)}:${padZero(state.targetSeconds)}`;
    }
}
function renderGatheringTime() {
    const buttons = document.querySelectorAll('.btn-gather');
    buttons.forEach((btn) => {
        const val = Number(btn.dataset.value);
        if (val === state.gatheringMinutes) {
            btn.classList.add('active');
        }
        else {
            btn.classList.remove('active');
        }
    });
    const desc = document.getElementById('gathering-desc');
    const clearBtn = document.getElementById('btn-gather-clear');
    const scheduleBadge = document.getElementById('schedule-gathering-badge');
    if (desc) {
        if (state.gatheringMinutes > 0) {
            desc.textContent = `（${state.gatheringMinutes}分集結選択）`;
            desc.classList.add('active');
        }
        else {
            desc.textContent = '（ひとつ選択可能・計算結果に反映）';
            desc.classList.remove('active');
        }
    }
    if (clearBtn) {
        clearBtn.style.display = state.gatheringMinutes > 0 ? 'inline-block' : 'none';
    }
    if (scheduleBadge) {
        if (state.gatheringMinutes > 0) {
            scheduleBadge.style.display = 'inline-flex';
            scheduleBadge.textContent = `集結時間 ${state.gatheringMinutes}分`;
        }
        else {
            scheduleBadge.style.display = 'none';
        }
    }
    const timelineNote = document.getElementById('timeline-gathering-note');
    if (timelineNote) {
        timelineNote.style.display = state.gatheringMinutes > 0 ? 'inline-block' : 'none';
    }
}
function renderMeetingPlace() {
    const input = document.getElementById('meeting-place-input');
    if (input && document.activeElement !== input) {
        input.value = state.meetingPlace;
    }
}
function renderFormatToggles() {
    const timeToggles = document.querySelectorAll('[data-time-format]');
    timeToggles.forEach((el) => {
        if (el.dataset.timeFormat === state.timeFormat) {
            el.classList.add('active');
        }
        else {
            el.classList.remove('active');
        }
    });
    const bulletToggles = document.querySelectorAll('[data-bullet-style]');
    bulletToggles.forEach((el) => {
        if (el.dataset.bulletStyle === state.bulletStyle) {
            el.classList.add('active');
        }
        else {
            el.classList.remove('active');
        }
    });
}
function renderTravelersTable() {
    for (let i = 0; i < 7; i++) {
        const traveler = state.travelers[i];
        const nameInput = document.getElementById(`traveler-name-${i}`);
        const minInput = document.getElementById(`traveler-min-${i}`);
        const secInput = document.getElementById(`traveler-sec-${i}`);
        const totalSecSpan = document.getElementById(`traveler-total-sec-${i}`);
        const totalHumanSpan = document.getElementById(`traveler-total-human-${i}`);
        if (nameInput && document.activeElement !== nameInput) {
            nameInput.value = traveler.name;
        }
        if (minInput && document.activeElement !== minInput) {
            minInput.value = traveler.minutes === 0 ? '' : String(traveler.minutes);
        }
        if (secInput && document.activeElement !== secInput) {
            secInput.value = traveler.seconds === 0 ? '' : String(traveler.seconds);
        }
        const totalSec = traveler.minutes * 60 + traveler.seconds;
        if (totalSecSpan) {
            totalSecSpan.textContent = `${totalSec} 秒`;
        }
        if (totalHumanSpan) {
            if (totalSec >= 60) {
                totalHumanSpan.style.display = 'block';
                totalHumanSpan.textContent = `(${formatSecondsToHumanReadable(totalSec)})`;
            }
            else {
                totalHumanSpan.style.display = 'none';
            }
        }
    }
}
function computeScheduleResults() {
    const activeTravelers = state.travelers.filter((t) => t.name.trim() !== '');
    // 1. 純粋な移動時間（時間ランキング用）
    const pureResults = activeTravelers.map((t) => {
        const pureSec = (t.minutes || 0) * 60 + (t.seconds || 0);
        return calculateDeparture(t.name, pureSec, state.targetHours, state.targetMinutes, state.targetSeconds);
    });
    // 2. 集結時間を加えた移動時間（予定表用）
    const scheduleResults = activeTravelers.map((t) => {
        const pureSec = (t.minutes || 0) * 60 + (t.seconds || 0);
        const totalTravelSec = pureSec + state.gatheringMinutes * 60;
        return calculateDeparture(t.name, totalTravelSec, state.targetHours, state.targetMinutes, state.targetSeconds);
    });
    // テキスト行生成
    const lines = [];
    if (scheduleResults.length > 0) {
        if (state.meetingPlace && state.meetingPlace.trim() !== '') {
            lines.push(`待ち合わせ場所 ${state.meetingPlace.trim()}`);
        }
        const targetFormatted = state.timeFormat === 'japanese'
            ? `${padZero(state.targetHours)}時${padZero(state.targetMinutes)}分${padZero(state.targetSeconds)}秒`
            : `${padZero(state.targetHours)}:${padZero(state.targetMinutes)}:${padZero(state.targetSeconds)}`;
        scheduleResults.forEach((res) => {
            const timeStr = state.timeFormat === 'colon' ? res.departureTimeFormatted : res.departureTimeJaFormatted;
            const dayNotice = res.daysOffset < 0 ? '(前日) ' : res.daysOffset > 0 ? '(翌日) ' : '';
            const mainContent = `${res.name} ${dayNotice}${timeStr}`;
            if (state.bulletStyle === 'bullet') {
                lines.push(`・${mainContent}`);
            }
            else if (state.bulletStyle === 'dash') {
                lines.push(`- ${mainContent}`);
            }
            else {
                lines.push(mainContent);
            }
        });
        lines.push(`到着時刻 ${targetFormatted}`);
        if (state.gatheringMinutes > 0) {
            lines.push(`集結時間 ${state.gatheringMinutes}分`);
        }
        if (state.slogan) {
            lines.push(state.slogan);
        }
    }
    const hasPreviousDayOffset = scheduleResults.some((r) => r.daysOffset !== 0);
    return {
        scheduleResults,
        pureResults,
        lines,
        hasPreviousDayOffset,
    };
}
function renderSchedule() {
    const { scheduleResults, pureResults, lines, hasPreviousDayOffset } = computeScheduleResults();
    const targetFormatted = state.timeFormat === 'japanese'
        ? `${padZero(state.targetHours)}時${padZero(state.targetMinutes)}分${padZero(state.targetSeconds)}秒`
        : `${padZero(state.targetHours)}:${padZero(state.targetMinutes)}:${padZero(state.targetSeconds)}`;
    const scheduleList = document.getElementById('schedule-list');
    const emptyNotice = document.getElementById('schedule-empty-notice');
    const warningBox = document.getElementById('schedule-warning-box');
    const lineCountBadge = document.getElementById('schedule-line-count');
    const textarea = document.getElementById('schedule-textarea');
    const headerTargetTime = document.getElementById('schedule-header-target');
    if (headerTargetTime) {
        headerTargetTime.textContent = `目標到着時刻：${padZero(state.targetHours)}:${padZero(state.targetMinutes)}:${padZero(state.targetSeconds)}`;
    }
    if (scheduleResults.length === 0) {
        if (emptyNotice)
            emptyNotice.style.display = 'block';
        if (scheduleList) {
            scheduleList.innerHTML = '';
            scheduleList.style.display = 'none';
        }
        if (warningBox)
            warningBox.style.display = 'none';
        if (textarea)
            textarea.value = '';
        if (lineCountBadge)
            lineCountBadge.textContent = '0 行';
        renderTimeline(pureResults);
        return;
    }
    if (emptyNotice)
        emptyNotice.style.display = 'none';
    if (scheduleList) {
        scheduleList.style.display = 'flex';
        let html = '';
        // 待ち合わせ場所
        if (state.meetingPlace && state.meetingPlace.trim() !== '') {
            html += `
        <li class="schedule-item special-place">
          <div class="schedule-item-left">
            <span class="badge-tag-place">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 14 4-8 4 8"/><path d="m5 19 7-10 7 10"/><path d="M12 19v3"/></svg>
              場所
            </span>
            <span style="font-size:0.75rem; color:var(--text-muted)">待ち合わせ場所</span>
          </div>
          <span style="font-size:0.9rem; font-weight:700; color:var(--accent-amber)">${escapeHtml(state.meetingPlace.trim())}</span>
        </li>
      `;
        }
        // 各メンバー
        scheduleResults.forEach((res, idx) => {
            const timeStr = state.timeFormat === 'colon' ? res.departureTimeFormatted : res.departureTimeJaFormatted;
            const offsetBadge = res.daysOffset !== 0
                ? `<span class="item-day-tag">${res.daysOffset < 0 ? '前日' : '翌日'}</span>`
                : '';
            html += `
        <li class="schedule-item">
          <div class="schedule-item-left">
            <span class="item-index">${idx + 1}.</span>
            <span class="item-name">${escapeHtml(res.name)}</span>
          </div>
          <div class="schedule-item-right">
            ${offsetBadge}
            <span class="item-time-badge">${timeStr}</span>
          </div>
        </li>
      `;
        });
        // 到着目標時刻
        html += `
      <li class="schedule-item special-arrival">
        <div class="schedule-item-left">
          <span class="badge-tag-arrival">到着</span>
          <span style="font-size:0.75rem; color:var(--text-muted)">目標到達時刻</span>
        </div>
        <span class="arrival-time-text">${targetFormatted}</span>
      </li>
    `;
        // 集結時間
        if (state.gatheringMinutes > 0) {
            html += `
        <li class="schedule-item special-gathering">
          <div class="schedule-item-left">
            <span class="badge-tag-place">集結</span>
            <span style="font-size:0.75rem; color:var(--text-muted)">集結時間</span>
          </div>
          <span class="gathering-time-text">${state.gatheringMinutes}分</span>
        </li>
      `;
        }
        // 合言葉
        if (state.slogan) {
            html += `
        <li class="schedule-item special-slogan">
          <div class="schedule-item-left">
            <span class="badge-info">合言葉</span>
            <span class="slogan-text">${escapeHtml(state.slogan)}</span>
          </div>
          <button type="button" id="btn-shuffle-slogan" class="btn-shuffle" title="別の言葉にランダム変更">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
            <span>変更</span>
          </button>
        </li>
      `;
        }
        scheduleList.innerHTML = html;
        const shuffleBtn = document.getElementById('btn-shuffle-slogan');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                const candidates = RANDOM_SLOGANS.filter((s) => s !== state.slogan);
                state.slogan = candidates[Math.floor(Math.random() * candidates.length)] || RANDOM_SLOGANS[0];
                state.save();
                markChanged();
                renderSchedule();
            });
        }
    }
    if (warningBox) {
        warningBox.style.display = hasPreviousDayOffset ? 'flex' : 'none';
    }
    if (textarea) {
        textarea.value = lines.join('\n');
    }
    if (lineCountBadge) {
        lineCountBadge.textContent = `${lines.length} 行`;
    }
    renderTimeline(pureResults);
}
function renderTimeline(pureResults) {
    const container = document.getElementById('timeline-list');
    const emptyNotice = document.getElementById('timeline-empty-notice');
    const sortBtn = document.getElementById('btn-sort-timeline');
    if (sortBtn) {
        sortBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
      <span>${state.sortByEarliest ? '出発が早い順' : '入力順'}</span>
    `;
    }
    if (pureResults.length === 0) {
        if (emptyNotice)
            emptyNotice.style.display = 'block';
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
        return;
    }
    if (emptyNotice)
        emptyNotice.style.display = 'none';
    if (!container)
        return;
    container.style.display = 'flex';
    const items = [...pureResults];
    if (state.sortByEarliest) {
        items.sort((a, b) => b.travelSeconds - a.travelSeconds);
    }
    const maxTravelSec = Math.max(...items.map((r) => r.travelSeconds), 1);
    const targetFormatted = `${padZero(state.targetHours)}:${padZero(state.targetMinutes)}:${padZero(state.targetSeconds)}`;
    let html = '';
    items.forEach((item) => {
        const widthPercent = Math.max(15, Math.round((item.travelSeconds / maxTravelSec) * 100));
        const durationStr = formatSecondsToHumanReadable(item.travelSeconds);
        html += `
      <div class="timeline-item">
        <div class="timeline-item-meta">
          <div class="timeline-meta-left">
            <span class="timeline-person-name">${escapeHtml(item.name)}</span>
            <span class="timeline-sep">|</span>
            <span class="timeline-duration">所要時間: ${durationStr}</span>
          </div>
          <div class="timeline-meta-right">
            <span style="color:var(--text-muted)">出発:</span>
            <span class="timeline-dep-badge">${item.departureTimeFormatted}</span>
          </div>
        </div>
        <div class="timeline-bar-track">
          <div class="timeline-bar-fill" style="width: ${widthPercent}%">
            <span>${item.departureTimeFormatted} 発</span>
            <span style="font-size:0.65rem; opacity:0.85">${durationStr}</span>
          </div>
          <div class="timeline-goal-marker">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            <span>${targetFormatted} 着</span>
          </div>
        </div>
      </div>
    `;
    });
    container.innerHTML = html;
}
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
// -------------------------------------------------------------
// コピーボタンの状態管理（未コピーの変更検知）
// -------------------------------------------------------------
let hasChangesSinceCopy = false;
function markChanged() {
    hasChangesSinceCopy = true;
    updateCopyButtonAppearance();
}
function updateCopyButtonAppearance() {
    const copyBtn = document.getElementById('btn-copy-schedule');
    if (!copyBtn)
        return;
    if (copyBtn.classList.contains('copied'))
        return;
    if (hasChangesSinceCopy) {
        copyBtn.classList.add('has-changes');
    }
    else {
        copyBtn.classList.remove('has-changes');
    }
}
// -------------------------------------------------------------
// コピー & フラッシュ演出
// -------------------------------------------------------------
function triggerCopyAnimation() {
    hasChangesSinceCopy = false;
    const flashLayer = document.getElementById('copy-flash-layer');
    if (flashLayer) {
        flashLayer.classList.remove('active');
        void flashLayer.offsetWidth; // reflow
        flashLayer.classList.add('active');
        setTimeout(() => {
            flashLayer.classList.remove('active');
        }, 800);
    }
    const copyBtn = document.getElementById('btn-copy-schedule');
    if (copyBtn) {
        copyBtn.classList.remove('has-changes');
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      <span>コピー完了</span>
    `;
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            updateCopyButtonAppearance();
            copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>コピー</span>
      `;
        }, 2000);
    }
}
async function handleCopySchedule() {
    const { lines } = computeScheduleResults();
    if (lines.length === 0)
        return;
    const text = lines.join('\n');
    const ok = await copyTextToClipboard(text);
    if (ok) {
        triggerCopyAnimation();
    }
}
// -------------------------------------------------------------
// 一括テキストパース
// -------------------------------------------------------------
function parseBatchText(text) {
    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    const parsed = [];
    for (let i = 0; i < 7; i++) {
        const line = lines[i];
        if (!line) {
            parsed.push({
                id: String(i + 1),
                name: '',
                minutes: 0,
                seconds: 0,
            });
            continue;
        }
        const parts = line.split(/\s+/);
        let name = parts[0] || '';
        let rest = parts.slice(1).join(' ');
        if (!rest) {
            const match = line.match(/^([^\d\s]+)\s*(.*)$/);
            if (match && match[2]) {
                name = match[1];
                rest = match[2];
            }
        }
        let m = 0;
        let s = 0;
        const minMatch = rest.match(/(\d+)\s*分/);
        const secMatch = rest.match(/(\d+)\s*秒/);
        if (minMatch || secMatch) {
            if (minMatch) {
                m = Math.min(999, Math.max(0, parseInt(minMatch[1].slice(0, 3), 10) || 0));
            }
            if (secMatch) {
                s = Math.min(999, Math.max(0, parseInt(secMatch[1].slice(0, 3), 10) || 0));
            }
        }
        else {
            const numbers = rest.match(/\d+/g);
            if (numbers && numbers.length >= 2) {
                m = Math.min(999, Math.max(0, parseInt(numbers[0].slice(0, 3), 10) || 0));
                s = Math.min(999, Math.max(0, parseInt(numbers[1].slice(0, 3), 10) || 0));
            }
            else if (numbers && numbers.length === 1) {
                s = Math.min(999, Math.max(0, parseInt(numbers[0].slice(0, 3), 10) || 0));
            }
        }
        parsed.push({
            id: String(i + 1),
            name,
            minutes: m,
            seconds: s,
        });
    }
    return parsed;
}
// -------------------------------------------------------------
// イベント初期化
// -------------------------------------------------------------
function setupEventListeners() {
    // 時刻調整ボタン
    const adjustHours = (delta) => {
        state.targetHours = (state.targetHours + delta + 24) % 24;
        state.save();
        markChanged();
        renderTargetTime();
        renderSchedule();
    };
    const adjustMinutes = (delta) => {
        state.targetMinutes = (state.targetMinutes + delta + 60) % 60;
        state.save();
        markChanged();
        renderTargetTime();
        renderSchedule();
    };
    const adjustSeconds = (delta) => {
        state.targetSeconds = (state.targetSeconds + delta + 60) % 60;
        state.save();
        markChanged();
        renderTargetTime();
        renderSchedule();
    };
    document.getElementById('btn-hours-down')?.addEventListener('click', () => adjustHours(-1));
    document.getElementById('btn-hours-up')?.addEventListener('click', () => adjustHours(1));
    document.getElementById('btn-minutes-down')?.addEventListener('click', () => adjustMinutes(-1));
    document.getElementById('btn-minutes-up')?.addEventListener('click', () => adjustMinutes(1));
    document.getElementById('btn-seconds-down')?.addEventListener('click', () => adjustSeconds(-1));
    document.getElementById('btn-seconds-up')?.addEventListener('click', () => adjustSeconds(1));
    // 時刻直接入力
    const hInput = document.getElementById('target-hours');
    const mInput = document.getElementById('target-minutes');
    const sInput = document.getElementById('target-seconds');
    hInput?.addEventListener('focus', () => {
        hInput.value = '';
        state.targetHours = 0;
        state.save();
        markChanged();
        renderSchedule();
    });
    hInput?.addEventListener('input', () => {
        const digits = hInput.value.replace(/\D/g, '').slice(0, 2);
        hInput.value = digits;
        state.targetHours = Math.min(23, parseInt(digits, 10) || 0);
        state.save();
        markChanged();
        renderTargetTime();
        renderSchedule();
    });
    hInput?.addEventListener('blur', () => {
        renderTargetTime();
    });
    mInput?.addEventListener('focus', () => {
        mInput.value = '';
        state.targetMinutes = 0;
        state.save();
        markChanged();
        renderSchedule();
    });
    mInput?.addEventListener('input', () => {
        const digits = mInput.value.replace(/\D/g, '').slice(0, 2);
        mInput.value = digits;
        state.targetMinutes = Math.min(59, parseInt(digits, 10) || 0);
        state.save();
        markChanged();
        renderTargetTime();
        renderSchedule();
    });
    mInput?.addEventListener('blur', () => {
        renderTargetTime();
    });
    sInput?.addEventListener('focus', () => {
        sInput.value = '';
        state.targetSeconds = 0;
        state.save();
        markChanged();
        renderSchedule();
    });
    sInput?.addEventListener('input', () => {
        const digits = sInput.value.replace(/\D/g, '').slice(0, 2);
        sInput.value = digits;
        state.targetSeconds = Math.min(59, parseInt(digits, 10) || 0);
        state.save();
        markChanged();
        renderTargetTime();
        renderSchedule();
    });
    sInput?.addEventListener('blur', () => {
        renderTargetTime();
    });
    // 集結時間ボタン
    const gatherButtons = document.querySelectorAll('.btn-gather');
    gatherButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const val = Number(btn.dataset.value);
            state.gatheringMinutes = state.gatheringMinutes === val ? 0 : val;
            state.save();
            markChanged();
            renderGatheringTime();
            renderSchedule();
        });
    });
    document.getElementById('btn-gather-clear')?.addEventListener('click', () => {
        state.gatheringMinutes = 0;
        state.save();
        markChanged();
        renderGatheringTime();
        renderSchedule();
    });
    // 待ち合わせ場所
    const meetingInput = document.getElementById('meeting-place-input');
    meetingInput?.addEventListener('input', () => {
        state.meetingPlace = meetingInput.value;
        state.save();
        markChanged();
        renderSchedule();
    });
    // フォーマット切り替え
    document.querySelectorAll('[data-time-format]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const fmt = btn.dataset.timeFormat;
            state.timeFormat = fmt;
            state.save();
            markChanged();
            renderFormatToggles();
            renderSchedule();
        });
    });
    document.querySelectorAll('[data-bullet-style]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.bulletStyle;
            state.bulletStyle = style;
            state.save();
            markChanged();
            renderFormatToggles();
            renderSchedule();
        });
    });
    // コピーボタン
    document.getElementById('btn-copy-schedule')?.addEventListener('click', handleCopySchedule);
    document.getElementById('btn-copy-textarea')?.addEventListener('click', handleCopySchedule);
    // テキストエリアクリックで全選択
    const textarea = document.getElementById('schedule-textarea');
    textarea?.addEventListener('click', () => {
        textarea.select();
    });
    // 7行のテーブル入力
    for (let i = 0; i < 7; i++) {
        const nameInput = document.getElementById(`traveler-name-${i}`);
        const minInput = document.getElementById(`traveler-min-${i}`);
        const secInput = document.getElementById(`traveler-sec-${i}`);
        nameInput?.addEventListener('input', () => {
            state.travelers[i].name = nameInput.value;
            state.save();
            markChanged();
            renderSchedule();
        });
        minInput?.addEventListener('focus', () => {
            minInput.select();
        });
        minInput?.addEventListener('input', () => {
            const digits = minInput.value.replace(/\D/g, '').slice(0, 3);
            minInput.value = digits;
            state.travelers[i].minutes = digits === '' ? 0 : Math.min(999, parseInt(digits, 10));
            state.save();
            markChanged();
            renderTravelersTable();
            renderSchedule();
        });
        secInput?.addEventListener('focus', () => {
            secInput.select();
        });
        secInput?.addEventListener('input', () => {
            const digits = secInput.value.replace(/\D/g, '').slice(0, 3);
            secInput.value = digits;
            state.travelers[i].seconds = digits === '' ? 0 : Math.min(999, parseInt(digits, 10));
            state.save();
            markChanged();
            renderTravelersTable();
            renderSchedule();
        });
    }
    // リセットクリアボタン
    document.getElementById('btn-clear-travelers')?.addEventListener('click', () => {
        state.travelers = JSON.parse(JSON.stringify(DEFAULT_7_PEOPLE));
        state.save();
        markChanged();
        renderTravelersTable();
        renderSchedule();
    });
    // 一括入力モーダル
    const modal = document.getElementById('batch-modal');
    const batchTextarea = document.getElementById('batch-textarea');
    const batchError = document.getElementById('batch-error');
    document.getElementById('btn-open-batch')?.addEventListener('click', () => {
        if (batchTextarea) {
            const lines = state.travelers.map((t) => {
                const parts = [t.name];
                if (t.minutes > 0 || t.seconds > 0) {
                    parts.push(`${t.minutes}分${t.seconds}秒`);
                }
                else if (t.name) {
                    parts.push('0分0秒');
                }
                return parts.join(' ');
            });
            batchTextarea.value = lines.join('\n');
        }
        if (batchError)
            batchError.style.display = 'none';
        modal?.classList.remove('hidden');
        batchTextarea?.focus();
    });
    const closeModal = () => {
        modal?.classList.add('hidden');
    };
    document.getElementById('btn-close-batch')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-batch')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal)
            closeModal();
    });
    document.getElementById('btn-apply-batch')?.addEventListener('click', () => {
        const raw = batchTextarea?.value || '';
        if (!raw.trim()) {
            if (batchError) {
                batchError.style.display = 'block';
                batchError.textContent = 'テキストを入力してください。';
            }
            return;
        }
        state.travelers = parseBatchText(raw);
        state.save();
        markChanged();
        renderTravelersTable();
        renderSchedule();
        closeModal();
    });
    // タイムラインソート切り替え
    document.getElementById('btn-sort-timeline')?.addEventListener('click', () => {
        state.sortByEarliest = !state.sortByEarliest;
        const { pureResults } = computeScheduleResults();
        renderTimeline(pureResults);
    });
}
// -------------------------------------------------------------
// アプリ起動
// -------------------------------------------------------------
function initApp() {
    state.load();
    renderTargetTime();
    renderGatheringTime();
    renderMeetingPlace();
    renderFormatToggles();
    renderTravelersTable();
    renderSchedule();
    updateCopyButtonAppearance();
    setupEventListeners();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
}
else {
    initApp();
}
