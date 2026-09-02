/**
 * RIVA MUSIC BOX - Mobile Jukebox Remote Controller
 * Search YouTube Songs Live and Queue on the Riva TV Channel
 */

const API_BASE_URL = window.location.origin.includes('pages.dev') || window.location.origin.includes('maryhary.online')
  ? window.location.origin
  : '';

let currentSearchQuery = '';
let searchDebounceTimer = null;
let currentSongList = [];

// DOM Elements
const elements = {
  userNameInput: document.getElementById('user-name-input'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  genrePills: document.querySelectorAll('.filter-pill'),
  songsList: document.getElementById('songs-list-container'),
  resultsHeading: document.getElementById('results-heading'),
  resultsCount: document.getElementById('results-count'),
  modal: document.getElementById('success-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  queuedSongPreview: document.getElementById('queued-song-preview')
};

// BroadcastChannel
let broadcastChannel = null;
if ('BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('riva_music_box_channel');
}

function parseDuration(val) {
  if (typeof val === 'number') return val;
  if (!val) return 200;
  const parts = String(val).split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 200;
}

function renderSongs(songs) {
  elements.songsList.innerHTML = '';

  if (!songs || songs.length === 0) {
    if (currentSearchQuery.trim() === '') {
      elements.songsList.innerHTML = `
        <div style="text-align:center; padding: 50px 16px; color: #53586b;">
          <svg style="width:40px;height:40px;margin-bottom:12px;opacity:0.6;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p style="font-family:var(--font-tech); font-size:13px; text-transform:uppercase; letter-spacing:1px; color:#8e93a6;">
            SEARCH ANY SONG OR ARTIST ABOVE
          </p>
          <p style="font-size:11px; color:#53586b; margin-top:4px;">
            Choose any YouTube song to play live on the Riva TV screen
          </p>
        </div>
      `;
      elements.resultsCount.textContent = 'READY';
      return;
    }

    elements.songsList.innerHTML = `
      <div style="text-align:center; padding: 40px 16px; color: #53586b;">
        <p style="font-family:var(--font-tech); font-size:13px; text-transform:uppercase; letter-spacing:1px;">NO RESULTS FOR "${escapeHtml(currentSearchQuery)}"</p>
        <button id="btn-custom-req" style="margin-top:14px; background:var(--brand-red); color:#fff; border:none; padding:12px 20px; border-radius:6px; font-family:var(--font-tech); font-weight:800; font-size:12px; letter-spacing:1px; cursor:pointer;">
          QUEUE "${escapeHtml(currentSearchQuery).toUpperCase()}" ON TV
        </button>
      </div>
    `;

    const customBtn = document.getElementById('btn-custom-req');
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        handleSongRequest({
          id: 'custom_' + Date.now(),
          title: currentSearchQuery,
          artist: 'YOUTUBE REQUEST',
          duration: 210,
          thumb: 'rivaLogo.png'
        });
      });
    }

    elements.resultsCount.textContent = '0 TRACKS';
    return;
  }

  elements.resultsCount.textContent = `${songs.length} TRACKS`;

  songs.forEach(song => {
    const row = document.createElement('div');
    row.className = 'song-item-row';

    row.innerHTML = `
      <img src="${song.thumb || 'rivaLogo.png'}" alt="Cover" class="song-cover-thumb">
      <div class="song-text-meta">
        <div class="song-main-title">${escapeHtml(song.title)}</div>
        <div class="song-sub-artist">${escapeHtml(song.artist)} • ${song.duration || '03:30'}</div>
      </div>
      <button class="song-action-btn">QUEUE</button>
    `;

    row.querySelector('.song-action-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      handleSongRequest(song);
    });

    row.addEventListener('click', () => {
      handleSongRequest(song);
    });

    elements.songsList.appendChild(row);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Live YouTube Search
async function performLiveYouTubeSearch(query) {
  elements.resultsHeading.textContent = `SEARCHING YOUTUBE FOR "${query.toUpperCase()}"...`;
  elements.resultsCount.textContent = '...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        elements.resultsHeading.textContent = `YOUTUBE SEARCH RESULTS`;
        currentSongList = data.results;
        renderSongs(currentSongList);
        return;
      }
    }
  } catch (err) {}

  renderSongs([]);
}

// Handle Queue Request
async function handleSongRequest(song) {
  const requesterName = elements.userNameInput.value.trim() || 'GUEST';

  const songData = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    requester: requesterName,
    duration: parseDuration(song.duration),
    thumbnail: song.thumb || 'rivaLogo.png'
  };

  const payload = {
    type: 'QUEUE_SONG_REQUEST',
    song: songData
  };

  let serverResult = null;
  // 1. Direct HTTPS post to TV Master Server (Instant, guaranteed delivery)
  try {
    const res = await fetch('https://tv.maryhary.online/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    serverResult = await res.json();
  } catch (e) {}

  // Check if queue is full
  if (serverResult && serverResult.success === false) {
    alert(serverResult.error || 'Queue is currently full (10/10 songs). Please wait for a song to finish!');
    return;
  }

  // 2. Fallback / relay to origin API
  try {
    await fetch(`${API_BASE_URL}/api/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {}

  // 3. BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }

  // 4. LocalStorage
  localStorage.setItem('riva_latest_request', JSON.stringify({
    ...payload,
    timestamp: Date.now()
  }));

  // Show Confirmation Modal (Customized for new vs bumped)
  const isBumped = serverResult && serverResult.action === 'bumped';
  const modalBadge = elements.modal.querySelector('.modal-badge');
  const modalHeading = elements.modal.querySelector('.modal-heading');
  const modalSubheading = elements.modal.querySelector('.modal-subheading');

  if (modalBadge) modalBadge.textContent = isBumped ? '🔥 VOTE BUMP' : 'REQUEST CONFIRMED';
  if (modalHeading) modalHeading.textContent = isBumped ? 'MOVED TO TOP OF QUEUE!' : 'ADDED TO TV QUEUE';
  if (modalSubheading) {
    modalSubheading.innerHTML = isBumped
      ? `This track is already in the playlist! It now has <strong>${serverResult.requestCount} requests</strong> and jumped to the top!`
      : `Your song has been sent to the on-air TV channel and will <strong>play in request order</strong>.`;
  }

  elements.queuedSongPreview.innerHTML = `
    <img src="${songData.thumbnail}" style="width:44px; height:44px; border-radius:4px; object-fit:cover;">
    <div style="flex:1; min-width:0;">
      <div style="font-family:var(--font-main); font-weight:800; font-size:13px; color:#fff; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(songData.title)}</div>
      <div style="font-family:var(--font-tech); font-size:11px; color:#8e93a6; text-transform:uppercase; margin-top:2px;">${escapeHtml(songData.artist)} • BY: ${escapeHtml(requesterName)}${isBumped ? ` (🔥 ${serverResult.requestCount}x)` : ''}</div>
    </div>
  `;

  elements.modal.classList.remove('hidden');
}

function initApp() {
  elements.searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    elements.searchClearBtn.classList.toggle('hidden', currentSearchQuery.length === 0);

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    if (currentSearchQuery.length >= 2) {
      searchDebounceTimer = setTimeout(() => {
        performLiveYouTubeSearch(currentSearchQuery);
      }, 350);
    } else if (currentSearchQuery.length === 0) {
      elements.resultsHeading.textContent = 'YOUTUBE SEARCH';
      renderSongs([]);
    }
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    currentSearchQuery = '';
    elements.searchClearBtn.classList.add('hidden');
    elements.resultsHeading.textContent = 'YOUTUBE SEARCH';
    renderSongs([]);
  });

  elements.genrePills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.genrePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const genre = pill.dataset.genre;
      elements.searchInput.value = genre === 'all' ? '' : `${genre} hits`;
      currentSearchQuery = elements.searchInput.value;
      elements.searchClearBtn.classList.toggle('hidden', currentSearchQuery.length === 0);
      if (currentSearchQuery) {
        performLiveYouTubeSearch(currentSearchQuery);
      } else {
        renderSongs([]);
      }
    });
  });

  elements.modalCloseBtn.addEventListener('click', () => {
    elements.modal.classList.add('hidden');
  });

  const savedName = localStorage.getItem('riva_requester_name');
  if (savedName) elements.userNameInput.value = savedName;

  elements.userNameInput.addEventListener('input', (e) => {
    localStorage.setItem('riva_requester_name', e.target.value);
  });

  // Initial State: Waiting for user search
  elements.resultsHeading.textContent = 'YOUTUBE SEARCH';
  renderSongs([]);
}

document.addEventListener('DOMContentLoaded', initApp);
