/**
 * CineTrack — script.js
 * Kanban-style movie watchlist with LocalStorage persistence.
 */

'use strict';

// ─── State ───────────────────────────────────────────────
/** @type {Array<MovieItem>} */
let movies = [];

/** ID фільму, який редагується зараз (null = новий) */
let editingId = null;

/** ID фільму для видалення (тимчасово) */
let pendingDeleteId = null;

/** ID картки, яку тягнемо drag&drop */
let draggingId = null;

// ─── LocalStorage ─────────────────────────────────────────
const LS_KEY = 'cinetrack_movies';

/** Зберегти поточний стан у LocalStorage */
function saveToStorage() {
  localStorage.setItem(LS_KEY, JSON.stringify(movies));
}

/** Завантажити стан із LocalStorage */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    movies = raw ? JSON.parse(raw) : [];
  } catch {
    movies = [];
  }
}

// ─── DOM helpers ──────────────────────────────────────────
const $ = id => document.getElementById(id);

// Модальне вікно фільму
const movieModal      = $('movieModal');
const modalTitle      = $('modalTitle');
const movieTitleInput = $('movieTitle');
const movieGenreInput = $('movieGenre');
const movieStatusInput= $('movieStatus');
const movieDesireInput= $('movieDesire');
const desireValSpan   = $('desireVal');
const movieProgressInput=$('movieProgress');
const progressValSpan = $('progressVal');
const movieRatingInput= $('movieRating');
const ratingValSpan   = $('ratingVal');
const movieNoteInput  = $('movieNote');

const fieldDesire   = $('fieldDesire');
const fieldProgress = $('fieldProgress');
const fieldRating   = $('fieldRating');

// Модальне вікно видалення
const deleteModal   = $('deleteModal');

// Пошук
const searchInput = $('searchInput');
const searchClear = $('searchClear');

// ─── Utility ──────────────────────────────────────────────
/** Генерує унікальний ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Повертає локалізовану дату (ДД.ММ.РРРР) */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('uk-UA');
}

/** Екранує HTML для безпечного вставлення тексту */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Будує рядок зірочок для рейтингу (від 1 до 10 → 1–5 зірочок) */
function starsHtml(rating) {
  const full  = Math.round(rating / 2);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

// ─── Modal: show / hide ───────────────────────────────────

/** Відкрити модальне вікно */
function openModal(el) {
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/** Закрити модальне вікно */
function closeModal(el) {
  el.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Conditional form fields ──────────────────────────────

/**
 * Показує відповідне поле залежно від статусу
 * @param {string} status - 'want' | 'watching' | 'watched'
 */
function updateFormFields(status) {
  fieldDesire.style.display   = status === 'want'     ? 'flex' : 'none';
  fieldProgress.style.display = status === 'watching' ? 'flex' : 'none';
  fieldRating.style.display   = status === 'watched'  ? 'flex' : 'none';
}

// ─── Open Add / Edit modal ────────────────────────────────

/** Відкрити форму для нового фільму */
function openAddModal(defaultStatus = 'want') {
  editingId = null;
  modalTitle.textContent = 'Новий фільм';

  // Скидаємо поля
  movieTitleInput.value  = '';
  movieGenreInput.value  = '';
  movieStatusInput.value = defaultStatus;
  movieDesireInput.value = 5;
  desireValSpan.textContent = 5;
  movieProgressInput.value = 0;
  progressValSpan.textContent = 0;
  movieRatingInput.value = 7;
  ratingValSpan.textContent = 7;
  movieNoteInput.value = '';

  updateFormFields(defaultStatus);
  openModal(movieModal);
  setTimeout(() => movieTitleInput.focus(), 50);
}

/** Відкрити форму для редагування фільму */
function openEditModal(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;

  editingId = id;
  modalTitle.textContent = 'Редагувати фільм';

  movieTitleInput.value  = movie.title;
  movieGenreInput.value  = movie.genre || '';
  movieStatusInput.value = movie.status;
  movieDesireInput.value = movie.desire ?? 5;
  desireValSpan.textContent = movie.desire ?? 5;
  movieProgressInput.value = movie.progress ?? 0;
  progressValSpan.textContent = movie.progress ?? 0;
  movieRatingInput.value = movie.rating ?? 7;
  ratingValSpan.textContent = movie.rating ?? 7;
  movieNoteInput.value = movie.note || '';

  updateFormFields(movie.status);
  openModal(movieModal);
  setTimeout(() => movieTitleInput.focus(), 50);
}

// ─── Save movie ───────────────────────────────────────────

/** Зберегти фільм (новий або відредагований) */
function saveMovie() {
  const title = movieTitleInput.value.trim();
  if (!title) {
    movieTitleInput.focus();
    movieTitleInput.style.borderColor = '#ef4444';
    setTimeout(() => { movieTitleInput.style.borderColor = ''; }, 1500);
    return;
  }

  const status   = movieStatusInput.value;
  const genre    = movieGenreInput.value;
  const desire   = parseInt(movieDesireInput.value);
  const progress = parseInt(movieProgressInput.value);
  const rating   = parseInt(movieRatingInput.value);
  const note     = movieNoteInput.value.trim();

  if (editingId) {
    // Редагування
    const idx = movies.findIndex(m => m.id === editingId);
    if (idx !== -1) {
      movies[idx] = { ...movies[idx], title, genre, status, desire, progress, rating, note };
    }
  } else {
    // Новий фільм
    const movie = {
      id:      genId(),
      title,
      genre,
      status,
      desire,
      progress,
      rating,
      note,
      addedAt: new Date().toISOString(),
    };
    movies.push(movie);
  }

  saveToStorage();
  renderBoard();
  closeModal(movieModal);
}

// ─── Delete movie ─────────────────────────────────────────

/** Показати модальне підтвердження видалення */
function askDelete(id) {
  pendingDeleteId = id;
  openModal(deleteModal);
}

/** Підтвердити видалення */
function confirmDelete() {
  if (!pendingDeleteId) return;
  movies = movies.filter(m => m.id !== pendingDeleteId);
  pendingDeleteId = null;
  saveToStorage();
  renderBoard();
  closeModal(deleteModal);
}

// ─── Card HTML builder ────────────────────────────────────

/**
 * Будує HTML картки фільму
 * @param {Object} movie
 * @returns {string}
 */
function buildCardHtml(movie) {
  const isTrophy = movie.status === 'watched' && movie.rating >= 9;

  // Специфічний блок для кожного статусу
  let extraHtml = '';
  if (movie.status === 'want') {
    const fires = '🔥'.repeat(Math.ceil(movie.desire / 2));
    extraHtml = `
      <div class="card-desire">
        <span>${fires}</span>
        <span>${movie.desire}/10</span>
      </div>`;
  } else if (movie.status === 'watching') {
    extraHtml = `
      <div class="progress-wrap">
        <div class="progress-label">
          <span>Прогрес</span>
          <span>${movie.progress}%</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${movie.progress}%"></div>
        </div>
      </div>`;
  } else if (movie.status === 'watched') {
    extraHtml = `
      <div class="card-rating">
        <span class="rating-stars">${starsHtml(movie.rating)}</span>
        <span class="rating-num">${movie.rating}/10</span>
        ${isTrophy ? '<span class="trophy-badge">🏆</span>' : ''}
      </div>`;
  }

  return `
    <div
      class="card${isTrophy ? ' card--trophy' : ''}"
      data-id="${esc(movie.id)}"
      draggable="true"
    >
      <div class="card-header">
        <span class="card-title">${esc(movie.title)}</span>
        <div class="card-actions">
          <button class="card-btn card-btn--edit" title="Редагувати" data-action="edit" data-id="${esc(movie.id)}">✏️</button>
          <button class="card-btn card-btn--delete" title="Видалити" data-action="delete" data-id="${esc(movie.id)}">🗑️</button>
        </div>
      </div>

      <div class="card-meta">
        ${movie.genre ? `<span class="badge badge--genre">${esc(movie.genre)}</span>` : ''}
        <span class="badge badge--date">📅 ${formatDate(movie.addedAt)}</span>
      </div>

      ${movie.note ? `<p class="card-note">${esc(movie.note)}</p>` : ''}

      ${extraHtml}
    </div>`;
}

// ─── Render board ─────────────────────────────────────────

/** Відмальовує всю дошку */
function renderBoard() {
  const query = searchInput.value.trim().toLowerCase();

  ['want', 'watching', 'watched'].forEach(status => {
    const list  = document.getElementById(`list-${status}`);
    const count = document.getElementById(`count-${status}`);

    // Фільтруємо за статусом
    const group = movies.filter(m => m.status === status);

    if (group.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">${status === 'want' ? '🎯' : status === 'watching' ? '▶️' : '✅'}</span>
          Список порожній
        </div>`;
      count.textContent = '0';
      return;
    }

    // Рендеримо картки
    list.innerHTML = group.map(buildCardHtml).join('');
    count.textContent = group.length;

    // Якщо активний пошук — приховуємо невідповідні картки
    if (query) {
      list.querySelectorAll('.card').forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        card.classList.toggle('hidden', !title.includes(query));
      });

      // Оновити лічильник з урахуванням видимих
      const visible = list.querySelectorAll('.card:not(.hidden)').length;
      count.textContent = visible;
    }

    // Прив'язати drag events до кожної картки
    list.querySelectorAll('.card').forEach(bindDragEvents);
  });
}

// ─── Drag & Drop ──────────────────────────────────────────

/** Прив'язати drag-події до картки */
function bindDragEvents(cardEl) {
  cardEl.addEventListener('dragstart', onDragStart);
  cardEl.addEventListener('dragend',   onDragEnd);
}

function onDragStart(e) {
  draggingId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  // Невелика затримка, щоб браузер встиг сфотографувати картку
  setTimeout(() => e.currentTarget.style.opacity = '0.4', 0);
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  e.currentTarget.style.opacity = '';
  draggingId = null;
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// Прив'язуємо drag-over/drop до колонок
document.querySelectorAll('.cards-list').forEach(list => {
  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    list.closest('.column').classList.add('drag-over');
  });

  list.addEventListener('dragleave', e => {
    // dragleave спрацьовує й на дочірніх елементах — перевіряємо
    if (!list.contains(e.relatedTarget)) {
      list.closest('.column').classList.remove('drag-over');
    }
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const newStatus = list.dataset.status;
    list.closest('.column').classList.remove('drag-over');

    if (!draggingId || !newStatus) return;

    const movie = movies.find(m => m.id === draggingId);
    if (movie && movie.status !== newStatus) {
      movie.status = newStatus;
      saveToStorage();
      renderBoard();
    }
  });
});

// ─── Search ───────────────────────────────────────────────

searchInput.addEventListener('input', () => {
  searchClear.classList.toggle('visible', searchInput.value.length > 0);
  renderBoard();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  renderBoard();
  searchInput.focus();
});

// ─── Event delegation for board buttons ───────────────────

document.getElementById('board').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  if (action === 'edit')   openEditModal(id);
  if (action === 'delete') askDelete(id);
});

// ─── Modal: add button in header ─────────────────────────
$('openAddModal').addEventListener('click', () => openAddModal('want'));

// ─── Modal: column "+" buttons ───────────────────────────
document.querySelectorAll('.btn-col-add').forEach(btn => {
  btn.addEventListener('click', () => openAddModal(btn.dataset.status));
});

// ─── Modal: movie form ────────────────────────────────────
$('closeMovieModal').addEventListener('click',  () => closeModal(movieModal));
$('cancelMovieModal').addEventListener('click', () => closeModal(movieModal));
$('saveMovie').addEventListener('click', saveMovie);

// Закрити по кліку на фон
movieModal.addEventListener('click', e => {
  if (e.target === movieModal) closeModal(movieModal);
});

// Esc
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (movieModal.classList.contains('open'))  closeModal(movieModal);
    if (deleteModal.classList.contains('open')) closeModal(deleteModal);
  }
  // Enter у формі = зберегти
  if (e.key === 'Enter' && movieModal.classList.contains('open')) {
    if (e.target.tagName !== 'TEXTAREA') saveMovie();
  }
});

// Оновлення підпису статусу
movieStatusInput.addEventListener('change', () => updateFormFields(movieStatusInput.value));

// Слайдери — live preview
movieDesireInput.addEventListener('input',   () => { desireValSpan.textContent   = movieDesireInput.value; });
movieProgressInput.addEventListener('input', () => { progressValSpan.textContent = movieProgressInput.value; });
movieRatingInput.addEventListener('input',   () => { ratingValSpan.textContent   = movieRatingInput.value; });

// ─── Modal: delete confirm ────────────────────────────────
$('cancelDelete').addEventListener('click',  () => closeModal(deleteModal));
$('confirmDelete').addEventListener('click', confirmDelete);

deleteModal.addEventListener('click', e => {
  if (e.target === deleteModal) closeModal(deleteModal);
});

// ─── Init ─────────────────────────────────────────────────
loadFromStorage();
renderBoard();
