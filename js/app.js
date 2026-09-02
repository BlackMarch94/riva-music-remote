/**
 * RIVA MUSIC BOX - Mobile Jukebox Remote Controller Engine
 * Supports Live YouTube Search and Real-Time TV Queueing
 */

// Backend API URL (Defaults to current server origin or custom server host)
const API_BASE_URL = window.location.origin.includes('pages.dev') || window.location.origin.includes('maryhary.online')
  ? window.location.origin
  : '';

// Default Curated Songs Catalog
const DEFAULT_SONGS = [
  { id: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd', genre: 'pop', duration: 200, thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
  { id: 'TUVcZfQe-Kw', title: 'Levitating', artist: 'Dua Lipa', genre: 'pop', duration: 203, thumb: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
  { id: '34Na4j8AVgA', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', genre: 'pop', duration: 230, thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
  { id: 'H5v3kku4y6Q', title: 'As It Was', artist: 'Harry Styles', genre: 'pop', duration: 167, thumb: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300' },
  { id: '5NV6Rdv1a3I', title: 'Get Lucky', artist: 'Daft Punk ft. Pharrell', genre: 'dance', duration: 248, thumb: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300' },
  { id: 'DyDfgMOUjCI', title: 'Bad Guy', artist: 'Billie Eilish', genre: 'pop', duration: 194, thumb: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300' },
  { id: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', genre: 'pop', duration: 233, thumb: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'rock', duration: 354, thumb: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300' },
  { id: '09R8_2nJtjg', title: 'Sugar', artist: 'Maroon 5', genre: 'pop', duration: 235, thumb: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300' },
  { id: 'G7KNmW9a75Y', title: 'Flowers', artist: 'Miley Cyrus', genre: 'pop', duration: 200, thumb: 'https://images.unsplash.com/photo-1520523839898-507125cd53c1?w=300' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', genre: 'latin', duration: 228, thumb: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300' },
  { id: 'hT_nvWreIhg', title: 'Counting Stars', artist: 'OneRepublic', genre: 'pop', duration: 257, thumb: 'https://images.unsplash.com/photo-1445985543468-7944e99f79bf?w=300' },
  { id: 'uelHwf8o7_U', title: 'Love Tonight', artist: 'Shouse', genre: 'dance', duration: 242, thumb: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300' },
  { id: 'eVTXPUF4Oz4', title: 'In The End', artist: 'Linkin Park', genre: 'rock', duration: 216, thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
  { id: 'djV11Xbc914', title: 'Take On Me', artist: 'a-ha', genre: '80s', duration: 227, thumb: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300' }
];

let activeGenre = 'all';
let currentSearchQuery = '';
let searchDebounceTimer = null;
let currentSongList = [...DEFAULT_SONGS];

// DOM References
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

// Convert "MM:SS" or number to seconds
function parseDuration(val) {
  if (typeof val === 'number') return val;
  if (!val) return 200;
  const parts = String(val).split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 200;
}

// Render Song Cards
function renderSongs(songs) {
  elements.songsList.innerHTML = '';

  if (!songs || songs.length === 0) {
    elements.songsList.innerHTML = `
      <div style="text-align:center; padding: 40px 16px; color: #53586b;">
        <p style="font-family:var(--font-tech); font-size:13px; text-transform:uppercase; letter-spacing:1px;">NO DIRECT MATCH FOR "${escapeHtml(currentSearchQuery)}"</p>
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
          thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'
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
      <img src="${song.thumb || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" alt="Cover" class="song-cover-thumb">
      <div class="song-text-meta">
        <div class="song-main-title">${escapeHtml(song.title)}</div>
        <div class="song-sub-artist">${escapeHtml(song.artist)}</div>
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

// Live YouTube Search via Backend API
async function performLiveYouTubeSearch(query) {
  elements.resultsHeading.textContent = `SEARCHING YOUTUBE FOR "${query.toUpperCase()}"...`;
  elements.resultsCount.textContent = '...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        elements.resultsHeading.textContent = `YOUTUBE SEARCH: "${query.toUpperCase()}"`;
        currentSongList = data.results;
        renderSongs(currentSongList);
        return;
      }
    }
  } catch (err) {
    console.warn('API search fallback to local catalogue:', err);
  }

  // Fallback to local catalog filtering
  const q = query.toLowerCase().trim();
  currentSongList = DEFAULT_SONGS.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q)
  );
  elements.resultsHeading.textContent = `RESULTS FOR "${query.toUpperCase()}"`;
  renderSongs(currentSongList);
}

// Filter by Genre
function filterByGenre() {
  if (activeGenre === 'all') {
    currentSongList = DEFAULT_SONGS;
    elements.resultsHeading.textContent = 'POPULAR ON RIVA TV';
  } else {
    currentSongList = DEFAULT_SONGS.filter(s => s.genre === activeGenre);
    elements.resultsHeading.textContent = `${activeGenre.toUpperCase()} TRACKS`;
  }
  renderSongs(currentSongList);
}

// Handle Song Request Submission
async function handleSongRequest(song) {
  const requesterName = elements.userNameInput.value.trim() || 'GUEST';

  const songData = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    requester: requesterName,
    duration: parseDuration(song.duration),
    thumbnail: song.thumb || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'
  };

  const payload = {
    type: 'QUEUE_SONG_REQUEST',
    song: songData
  };

  // 1. Post to Server API endpoint
  try {
    await fetch(`${API_BASE_URL}/api/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('HTTP API request failed (falling back to local channels):', err);
  }

  // 2. BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }

  // 3. postMessage
  if (window.opener) window.opener.postMessage(payload, '*');
  if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');

  // 4. LocalStorage
  localStorage.setItem('riva_latest_request', JSON.stringify({
    ...payload,
    timestamp: Date.now()
  }));

  // Show Confirmation Modal
  elements.queuedSongPreview.innerHTML = `
    <img src="${songData.thumbnail}" style="width:44px; height:44px; border-radius:4px; object-fit:cover;">
    <div style="flex:1; min-width:0;">
      <div style="font-family:var(--font-main); font-weight:800; font-size:13px; color:#fff; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(songData.title)}</div>
      <div style="font-family:var(--font-tech); font-size:11px; color:#8e93a6; text-transform:uppercase; margin-top:2px;">${escapeHtml(songData.artist)} • BY: ${escapeHtml(requesterName)}</div>
    </div>
  `;

  elements.modal.classList.remove('hidden');
}

// Initialize Application
function initApp() {
  // Search Input with Debounce
  elements.searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    elements.searchClearBtn.classList.toggle('hidden', currentSearchQuery.length === 0);

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    if (currentSearchQuery.length >= 2) {
      searchDebounceTimer = setTimeout(() => {
        performLiveYouTubeSearch(currentSearchQuery);
      }, 350);
    } else if (currentSearchQuery.length === 0) {
      filterByGenre();
    }
  });

  // Clear Search Button
  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    currentSearchQuery = '';
    elements.searchClearBtn.classList.add('hidden');
    filterByGenre();
  });

  // Genre Filters
  elements.genrePills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.genrePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeGenre = pill.dataset.genre;
      elements.searchInput.value = '';
      currentSearchQuery = '';
      elements.searchClearBtn.classList.add('hidden');
      filterByGenre();
    });
  });

  // Close Confirmation Modal
  elements.modalCloseBtn.addEventListener('click', () => {
    elements.modal.classList.add('hidden');
  });

  // Remember requester name
  const savedName = localStorage.getItem('riva_requester_name');
  if (savedName) elements.userNameInput.value = savedName;

  elements.userNameInput.addEventListener('input', (e) => {
    localStorage.setItem('riva_requester_name', e.target.value);
  });

  // Initial display
  filterByGenre();
}

document.addEventListener('DOMContentLoaded', initApp);
