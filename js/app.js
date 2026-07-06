/* ============================================================
   EduBlog — 메인 애플리케이션 스크립트
   ============================================================ */

'use strict';

/* ── 전역 상태 ── */
const State = {
  posts: [],
  categories: [],
  currentFilter: 'all',
  currentStatus: null,
  searchQuery: '',
  editingPostId: null,
  editingCatId: null,
  selectedColor: '#4f46e5',
  savedRange: null,       // contenteditable 커서 위치 저장
};

/* ============================================================
   ★ 동영상 분리 저장 — IndexedDB
   동영상 파일을 Base64로 content에 직접 넣으면 DB 페이로드
   한도(수 MB)를 초과하여 저장 실패합니다.
   → 동영상 바이너리는 IndexedDB(브라우저 로컬)에 저장하고,
     에디터/DB에는 data-vid-id 플레이스홀더만 기록합니다.
   ============================================================ */
const VidDB = (() => {
  const DB_NAME = 'edublog_videos';
  const STORE   = 'videos';
  const VERSION = 1;
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function save(id, file) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id, blob: file, type: file.type, name: file.name });
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  async function get(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(id);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function remove(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }

  return { save, get, remove };
})();

/* 공통: 특정 컨테이너 안의 동영상 플레이스홀더를 실제 Blob URL로 복원 */
async function _restoreVideosIn(container) {
  if (!container) return;
  const placeholders = container.querySelectorAll('div[data-vid-id]');
  for (const ph of placeholders) {
    const vidId = ph.dataset.vidId;
    if (!vidId) continue;
    const rec = await VidDB.get(vidId);
    if (rec) {
      const url = URL.createObjectURL(rec.blob);
      const video = document.createElement('video');
      video.controls = true;
      video.setAttribute('playsinline', '');
      video.style.cssText = 'max-width:100%;border-radius:8px;margin:8px 0;display:block;';
      video.dataset.vidId = vidId;
      const src = document.createElement('source');
      src.src  = url;
      src.type = rec.type;
      video.appendChild(src);
      ph.replaceWith(video);
    } else {
      /* IndexedDB에 없으면 "동영상 없음" 안내 표시 */
      const notice = document.createElement('div');
      notice.style.cssText = 'padding:14px 18px;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;color:#856404;font-size:.9rem;margin:8px 0;';
      notice.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 동영상이 이 기기에 없습니다. 재업로드가 필요합니다.';
      ph.replaceWith(notice);
    }
  }
}

/* 에디터 안의 동영상 플레이스홀더 복원 */
async function restoreVideosInEditor() {
  await _restoreVideosIn(document.getElementById('editorArea'));
}

/* 상세 보기 안의 동영상 플레이스홀더 복원 */
async function restoreVideosInDetail() {
  await _restoreVideosIn(document.getElementById('detailPostContent'));
}

/* 저장 직전: 에디터 내 <video> 를 플레이스홀더로 교체한 HTML 반환 */
function serializeEditorContent() {
  const area  = document.getElementById('editorArea');
  const clone = area.cloneNode(true);

  /* ① 동영상 → 플레이스홀더 */
  clone.querySelectorAll('video[data-vid-id]').forEach(v => {
    const ph = document.createElement('div');
    ph.dataset.vidId = v.dataset.vidId;
    ph.style.cssText = 'display:none;';
    v.replaceWith(ph);
  });
  clone.querySelectorAll('video').forEach(v => {
    const src = v.querySelector('source');
    if (src && src.src && src.src.startsWith('blob:')) {
      const ph = document.createElement('div');
      ph.dataset.vidId = v.dataset.vidId || '';
      ph.style.cssText = 'display:none;';
      v.replaceWith(ph);
    }
  });

  /* ② 코드블록: Highlight.js가 추가한 span들을 제거하고
       원본 escaped 텍스트만 남겨 DB에 깔끔하게 저장
       (다시 불러올 때 hljs.highlightElement()로 재적용) */
  clone.querySelectorAll('.code-block pre code').forEach(codeEl => {
    /* hljs가 처리했으면 data-highlighted 속성 있음 */
    if (codeEl.dataset.highlighted) {
      /* innerText로 순수 텍스트 추출 (이미 이스케이프된 상태) */
      const plainText = codeEl.textContent;
      const escaped   = plainText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      codeEl.innerHTML = escaped;
      delete codeEl.dataset.highlighted;
      codeEl.classList.remove('hljs');
    }
  });

  /* ③ 코드블록의 data-bound 속성 제거 (불필요한 속성) */
  clone.querySelectorAll('.code-block[data-bound]').forEach(el => {
    el.removeAttribute('data-bound');
  });
  clone.querySelectorAll('.code-block[data-view-bound]').forEach(el => {
    el.removeAttribute('data-view-bound');
  });

  return clone.innerHTML;
}

/* ── API 기본 경로 ── */
const API = {
  posts:      'tables/posts',
  categories: 'tables/categories',
};

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadCategories(), loadPosts()]);
  initEditor();
  setupHamburger();
  updateMediaBadge();
  updateMediaStatusBanner();

  /* 미설정 시 첫 방문 안내 */
  if (!MediaUploader.isSyncEnabled()) {
    setTimeout(() => {
      showToast('📁 미디어 동기화를 위해 저장소를 설정해주세요! (사이드바 → 미디어 저장소)', 'info');
    }, 1500);
  }
});

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadPosts() {
  try {
    const res = await fetch(`${API.posts}?limit=200&sort=created_at`);
    const json = await res.json();
    State.posts = (json.data || []).filter(p => !p.deleted);
    renderPosts();
    updateStats();
  } catch (e) {
    console.error('게시물 로드 실패:', e);
    showToast('게시물을 불러오지 못했습니다.', 'error');
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API.categories}?limit=100`);
    const json = await res.json();
    State.categories = (json.data || []).filter(c => !c.deleted);
    renderSidebarCategories();
    renderFilterChips();
    renderCategoryCards();
    populateCategorySelect();
  } catch (e) {
    console.error('카테고리 로드 실패:', e);
  }
}

/* ============================================================
   RENDER — POSTS
   ============================================================ */
function renderPosts() {
  const grid = document.getElementById('postGrid');
  const empty = document.getElementById('homeEmpty');
  let posts = getFilteredPosts();

  if (posts.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = posts.map(p => {
    const cat = State.categories.find(c => c.id === p.category || c.name === p.category);
    const catColor = cat ? cat.color : '#4f46e5';
    const catName  = cat ? cat.name  : (p.category || '미분류');
    const catIcon  = cat ? (cat.icon || '📁') : '📁';
    const date = p.created_at ? new Date(Number(p.created_at)).toLocaleDateString('ko-KR') : '';
    const excerpt = stripHtml(p.content || '').slice(0, 100);
    const isDraft = p.status === 'draft';

    return `
    <article class="post-card fade-in" onclick="viewPost('${p.id}')">
      <div class="post-card-thumb">
        ${p.thumbnail
          ? `<img src="${escHtml(p.thumbnail)}" alt="${escHtml(p.title)}" onerror="this.parentElement.innerHTML='${catIcon}'" />`
          : catIcon}
      </div>
      <div class="post-card-body">
        <span class="post-card-cat" style="background:${catColor}22;color:${catColor}">
          ${catIcon} ${escHtml(catName)}
        </span>
        ${isDraft ? '<span class="post-card-cat" style="background:#fef9c3;color:#854d0e;margin-left:4px;">임시저장</span>' : ''}
        <h3 class="post-card-title">${escHtml(p.title || '(제목 없음)')}</h3>
        <p class="post-card-excerpt">${escHtml(excerpt)}</p>
        <div class="post-card-meta">
          <span><i class="fa-regular fa-calendar"></i> ${date}</span>
          <span><i class="fa-regular fa-eye"></i> ${p.view_count || 0}</span>
        </div>
      </div>
    </article>`;
  }).join('');
}

function getFilteredPosts() {
  let posts = State.posts;

  // 상태 필터
  if (State.currentStatus === 'draft') {
    posts = posts.filter(p => p.status === 'draft');
  } else {
    posts = posts.filter(p => p.status === 'published' || !p.status);
  }

  // 카테고리 필터
  if (State.currentFilter !== 'all') {
    posts = posts.filter(p => p.category === State.currentFilter);
  }

  // 검색 필터
  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    posts = posts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      stripHtml(p.content || '').toLowerCase().includes(q) ||
      (Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || '')).toLowerCase().includes(q)
    );
  }

  return posts.sort((a, b) => Number(b.created_at) - Number(a.created_at));
}

function updateStats() {
  const published = State.posts.filter(p => p.status === 'published' || !p.status);
  const drafts    = State.posts.filter(p => p.status === 'draft');
  const totalViews = State.posts.reduce((acc, p) => acc + (p.view_count || 0), 0);

  document.getElementById('stat-total').textContent = published.length;
  document.getElementById('stat-cats').textContent  = State.categories.length;
  document.getElementById('stat-views').textContent = totalViews;
  document.getElementById('badge-all').textContent  = published.length;
  document.getElementById('badge-draft').textContent = drafts.length;
}

/* ============================================================
   RENDER — SIDEBAR & FILTERS
   ============================================================ */
function renderSidebarCategories() {
  const ul = document.getElementById('sidebarCategories');
  ul.innerHTML = State.categories.map(cat => {
    const count = State.posts.filter(p =>
      (p.status === 'published' || !p.status) && p.category === (cat.id || cat.name)
    ).length;
    return `
    <li>
      <a href="#" onclick="filterCategory('${escHtml(cat.id || cat.name)}');showPage('home');return false;">
        <span class="cat-dot" style="background:${cat.color || '#4f46e5'}"></span>
        ${escHtml(cat.name)}
        <span class="badge">${count}</span>
      </a>
    </li>`;
  }).join('');
}

function renderFilterChips() {
  const wrap = document.getElementById('filterChips');
  wrap.innerHTML = State.categories.map(cat => `
    <button class="filter-chip" data-filter="${escHtml(cat.id || cat.name)}"
      onclick="filterCategory('${escHtml(cat.id || cat.name)}')"
      style="--cat-color:${cat.color || '#4f46e5'}">
      ${cat.icon || '📁'} ${escHtml(cat.name)}
    </button>
  `).join('');
}

function filterCategory(catId) {
  State.currentFilter = catId;
  State.currentStatus = null;

  // 필터 칩 활성화
  document.querySelectorAll('.filter-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === catId);
  });
  // 첫 번째 전체 칩
  const allChip = document.querySelector('.filter-chip[data-filter="all"]');
  if (allChip) allChip.classList.toggle('active', catId === 'all');

  const label = document.getElementById('currentFilterLabel');
  if (catId === 'all') {
    label.textContent = '최근 게시물';
  } else {
    const cat = State.categories.find(c => (c.id || c.name) === catId);
    label.textContent = cat ? `${cat.icon || '📁'} ${cat.name}` : catId;
  }
  renderPosts();
}

function filterStatus(status) {
  State.currentStatus = status;
  State.currentFilter = 'all';
  document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
  const label = document.getElementById('currentFilterLabel');
  label.textContent = status === 'draft' ? '📝 임시저장 목록' : '최근 게시물';
  renderPosts();
}

/* ============================================================
   RENDER — CATEGORY PAGE
   ============================================================ */
function renderCategoryCards() {
  const grid = document.getElementById('catGrid');
  const empty = document.getElementById('catEmpty');

  if (State.categories.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = State.categories.map(cat => {
    const count = State.posts.filter(p => p.category === (cat.id || cat.name)).length;
    const color = cat.color || '#4f46e5';
    return `
    <div class="cat-card fade-in">
      <div class="cat-card-top">
        <div class="cat-card-icon" style="background:${color}22;color:${color}">
          ${cat.icon || '📁'}
        </div>
        <div>
          <div class="cat-card-name">${escHtml(cat.name)}</div>
        </div>
      </div>
      <p class="cat-card-desc">${escHtml(cat.description || '설명 없음')}</p>
      <div class="cat-card-footer">
        <span class="cat-card-count"><i class="fa-solid fa-file-lines"></i> ${count}개 게시물</span>
        <div class="cat-card-actions">
          <button class="btn-icon" title="편집" onclick="editCategory('${escHtml(cat.id)}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon" title="삭제" style="color:var(--danger)" onclick="confirmDeleteCat('${escHtml(cat.id)}','${escHtml(cat.name)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function populateCategorySelect() {
  const sel = document.getElementById('postCategory');
  const current = sel.value;
  sel.innerHTML = '<option value="">카테고리 선택</option>' +
    State.categories.map(c =>
      `<option value="${escHtml(c.id || c.name)}">${escHtml(c.name)}</option>`
    ).join('');
  if (current) sel.value = current;
}

/* ============================================================
   PAGE NAVIGATION
   ============================================================ */
function showPage(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  // 사이드바 nav 활성화
  document.querySelectorAll('.sidebar-menu li a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  closeSidebar();
  window.scrollTo(0, 0);
}

/* ============================================================
   POST DETAIL
   ============================================================ */
async function viewPost(id) {
  const post = State.posts.find(p => p.id === id);
  if (!post) return;

  // 조회수 증가
  try {
    await fetch(`${API.posts}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ view_count: (post.view_count || 0) + 1 }),
    });
    post.view_count = (post.view_count || 0) + 1;
    updateStats();
  } catch (_) {}

  const cat = State.categories.find(c => c.id === post.category || c.name === post.category);
  const catColor = cat ? cat.color : '#4f46e5';
  const catName  = cat ? cat.name  : (post.category || '미분류');
  const catIcon  = cat ? (cat.icon || '📁') : '📁';
  const date = post.created_at ? new Date(Number(post.created_at)).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : '';

  const tags = Array.isArray(post.tags)
    ? post.tags
    : (post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : []);

  document.getElementById('detailContent').innerHTML = `
    <div class="post-detail-header fade-in">
      <span class="post-detail-cat" style="background:${catColor}22;color:${catColor}">
        ${catIcon} ${escHtml(catName)}
      </span>
      <h1 class="post-detail-title">${escHtml(post.title || '(제목 없음)')}</h1>
      <div class="post-detail-meta">
        <span><i class="fa-regular fa-calendar"></i> ${date}</span>
        <span><i class="fa-regular fa-eye"></i> ${post.view_count || 0}회</span>
      </div>
    </div>
    ${post.thumbnail ? `<img src="${escHtml(post.thumbnail)}" class="post-detail-thumb" alt="썸네일" onerror="this.style.display='none'" />` : ''}
    <div class="post-content" id="detailPostContent">${post.content || ''}</div>
    ${tags.length ? `<div class="tag-list">${tags.map(t => `<span class="tag">#${escHtml(t)}</span>`).join('')}</div>` : ''}
    <div class="post-actions" style="margin-top:32px;padding-top:20px;border-top:1px solid var(--border);">
      <button class="btn btn-secondary btn-sm" onclick="openEditor('${id}')">
        <i class="fa-solid fa-pen"></i> 수정
      </button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeletePost('${id}','${escHtml(post.title || '이 게시물')}')">
        <i class="fa-solid fa-trash"></i> 삭제
      </button>
    </div>
  `;

  /* ★ 상세 페이지에서도 동영상 플레이스홀더 복원 */
  await restoreVideosInDetail();

  /* ★ 코드블록 Syntax Highlight 적용 */
  const detailBody = document.getElementById('detailPostContent');
  if (detailBody && window.CodeEditor) {
    CodeEditor.highlightAllInContainer(detailBody);
  }

  showPage('detail');
}

/* ============================================================
   EDITOR
   ============================================================ */
function openEditor(postId = null) {
  State.editingPostId = postId;
  const area = document.getElementById('editorArea');
  const titleInput = document.getElementById('postTitle');

  if (postId) {
    const post = State.posts.find(p => p.id === postId);
    if (!post) return;
    document.getElementById('editorTitle').textContent = '게시물 수정';
    titleInput.value = post.title || '';
    document.getElementById('postCategory').value = post.category || '';
    document.getElementById('postTags').value = Array.isArray(post.tags)
      ? post.tags.join(', ')
      : (post.tags || '');
    document.getElementById('postThumbnail').value = post.thumbnail || '';
    area.innerHTML = post.content || '';
    /* ★ 저장된 동영상 플레이스홀더를 실제 영상으로 복원 */
    restoreVideosInEditor();
    /* ★ 코드블록 하이라이트 복원 */
    if (window.CodeEditor) setTimeout(() => CodeEditor.highlightAllInEditor(), 100);
  } else {
    document.getElementById('editorTitle').textContent = '새 글 작성';
    titleInput.value = '';
    document.getElementById('postCategory').value = '';
    document.getElementById('postTags').value = '';
    document.getElementById('postThumbnail').value = '';
    area.innerHTML = '';
  }

  showPage('editor');
  titleInput.focus();
}

function cancelEditor() {
  if (State.editingPostId) {
    showPage('detail');
  } else {
    showPage('home');
  }
}

async function savePost(status) {
  const title     = document.getElementById('postTitle').value.trim();
  const category  = document.getElementById('postCategory').value;
  const tagsRaw   = document.getElementById('postTags').value;
  const thumbnail = document.getElementById('postThumbnail').value.trim();

  if (!title) { showToast('제목을 입력해주세요.', 'warn'); return; }

  /* ★ 동영상 플레이스홀더로 교체한 안전한 HTML 생성 */
  const content = serializeEditorContent();

  /* 페이로드 크기 사전 검사 (5MB 이하 권장) */
  const payloadStr = JSON.stringify({ title, content });
  const payloadMB  = new Blob([payloadStr]).size / 1024 / 1024;
  if (payloadMB > 8) {
    showToast(
      `저장 데이터가 너무 큽니다 (${payloadMB.toFixed(1)}MB). 이미지 수를 줄이거나 크기를 줄여주세요.`,
      'error'
    );
    return;
  }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const payload = { title, content, category, tags, thumbnail, status };

  /* 저장 중 버튼 비활성화 */
  const saveBtns = document.querySelectorAll('[onclick^="savePost"]');
  saveBtns.forEach(b => { b.disabled = true; b.style.opacity = '.6'; });

  try {
    let res;
    if (State.editingPostId) {
      res = await fetch(`${API.posts}/${State.editingPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      payload.view_count = 0;
      res = await fetch(API.posts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      /* 서버 오류 메시지 파싱 */
      let errMsg = `서버 오류 (HTTP ${res.status})`;
      try {
        const errBody = await res.text();
        if (errBody.length < 300) errMsg += `: ${errBody}`;
      } catch (_) {}
      if (res.status === 413) errMsg = '저장 데이터가 서버 허용 용량을 초과했습니다. 이미지 수를 줄여주세요.';
      throw new Error(errMsg);
    }

    const saved = await res.json();
    showToast(
      status === 'published' ? '게시물이 게시되었습니다! 🎉' : '임시저장되었습니다.',
      'success'
    );

    await loadPosts();
    State.editingPostId = saved.id || State.editingPostId;
    showPage('home');
  } catch (e) {
    console.error('savePost 오류:', e);
    showToast(e.message || '저장 중 알 수 없는 오류가 발생했습니다.', 'error');
  } finally {
    saveBtns.forEach(b => { b.disabled = false; b.style.opacity = ''; });
  }
}

/* ── Post Delete ── */
function confirmDeletePost(id, name) {
  document.getElementById('deleteModalMsg').textContent = `"${name}" 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
  document.getElementById('deleteConfirmBtn').onclick = () => deletePost(id);
  document.getElementById('deleteModal').classList.add('open');
}

async function deletePost(id) {
  try {
    await fetch(`${API.posts}/${id}`, { method: 'DELETE' });
    showToast('게시물이 삭제되었습니다.', 'success');
    closeDeleteModal();
    await loadPosts();
    showPage('home');
  } catch (e) {
    showToast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

/* ============================================================
   RICH TEXT EDITOR
   ============================================================ */
function initEditor() {
  const area = document.getElementById('editorArea');
  const container = document.getElementById('editorContainer');

  // Drag & Drop
  area.addEventListener('dragover', e => {
    e.preventDefault();
    container.classList.add('drag-over');
  });
  area.addEventListener('dragleave', e => {
    if (!area.contains(e.relatedTarget)) container.classList.remove('drag-over');
  });
  area.addEventListener('drop', e => {
    e.preventDefault();
    container.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // 드롭 위치 저장
      const range = getDropRange(e);
      if (range) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      embedFiles(files);
    }
  });

  // 커서 저장 (모달 열기 전 필요)
  area.addEventListener('keyup', saveSelection);
  area.addEventListener('mouseup', saveSelection);
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    State.savedRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  const area = document.getElementById('editorArea');
  area.focus();
  if (State.savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(State.savedRange);
  }
}

function getDropRange(e) {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(e.clientX, e.clientY);
  }
  return null;
}

/* ── toolbar commands ── */
function execCmd(cmd, value = null) {
  document.getElementById('editorArea').focus();
  document.execCommand(cmd, false, value);
}

function formatBlock(tag) {
  if (!tag) return;
  document.getElementById('editorArea').focus();
  document.execCommand('formatBlock', false, tag);
}

function pickColor() {
  saveSelection();
  document.getElementById('colorPicker').click();
}

function insertBlockquote() {
  document.getElementById('editorArea').focus();
  document.execCommand('formatBlock', false, 'blockquote');
}

function insertHR() {
  restoreSelection();
  document.execCommand('insertHTML', false, '<hr>');
}

function insertLink() {
  saveSelection();
  const url = prompt('링크 URL을 입력하세요:', 'https://');
  if (!url) return;
  restoreSelection();
  document.execCommand('createLink', false, url);
}

function insertTable() {
  saveSelection();
  const cols = parseInt(prompt('열 수:', '3'));
  const rows = parseInt(prompt('행 수:', '3'));
  if (!cols || !rows) return;

  let html = '<table><thead><tr>' +
    Array(cols).fill('<th>제목</th>').join('') +
    '</tr></thead><tbody>' +
    Array(rows).fill('<tr>' + Array(cols).fill('<td>&nbsp;</td>').join('') + '</tr>').join('') +
    '</tbody></table><p></p>';

  restoreSelection();
  document.execCommand('insertHTML', false, html);
}

function insertVideoUrl() {
  saveSelection();
  const url = prompt('동영상 직접 URL을 입력하세요 (MP4, WebM 등):');
  if (!url) return;
  restoreSelection();
  const html = `<video controls playsinline style="max-width:100%;border-radius:8px;margin:8px 0;display:block;">
    <source src="${escHtml(url)}" type="video/mp4">
  </video><p></p>`;
  document.execCommand('insertHTML', false, html);
}

/* insertYoutube는 mediaUploader.js의 openYoutubeDialog()로 통합됨 */

/* ── File Handling ── */
function triggerImageUpload() {
  saveSelection();
  document.getElementById('imageFileInput').click();
}

function handleFileInput(input) {
  const files = Array.from(input.files);
  restoreSelection();
  embedFiles(files);
  input.value = '';
}

/* ================================================================
   파일 핸들러 — MediaUploader 모듈로 위임
   ================================================================ */
function embedFiles(files) {
  MediaUploader.handleFiles(Array.from(files));
}

/* ── 툴바 트리거 ── */
function triggerImageUpload() {
  saveSelection();
  document.getElementById('imageFileInput').click();
}
function triggerVideoUpload() {
  saveSelection();
  document.getElementById('videoFileInput').click();
}
function handleImageInput(input) {
  const files = Array.from(input.files);
  restoreSelection();
  MediaUploader.handleFiles(files);
  input.value = '';
}
function handleVideoInput(input) {
  const files = Array.from(input.files);
  restoreSelection();
  MediaUploader.handleFiles(files);
  input.value = '';
}
/* 드래그앤드롭은 기존 embedFiles 그대로 사용 */

/* ============================================================
   CATEGORY MANAGEMENT
   ============================================================ */
function openCatModal(cat = null) {
  State.editingCatId = cat ? cat.id : null;
  document.getElementById('catModalTitle').textContent = cat ? '카테고리 수정' : '새 카테고리';
  document.getElementById('catName').value = cat ? cat.name : '';
  document.getElementById('catDesc').value = cat ? (cat.description || '') : '';
  document.getElementById('catIcon').value = cat ? (cat.icon || '') : '';
  document.getElementById('catEditId').value = cat ? cat.id : '';

  // 색상 선택
  const currentColor = cat ? (cat.color || '#4f46e5') : '#4f46e5';
  State.selectedColor = currentColor;
  document.querySelectorAll('.color-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === currentColor);
  });

  document.getElementById('catModal').classList.add('open');
  setTimeout(() => document.getElementById('catName').focus(), 100);
}

function closeCatModal() {
  document.getElementById('catModal').classList.remove('open');
}

function selectColor(el) {
  document.querySelectorAll('.color-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  State.selectedColor = el.dataset.color;
}

async function saveCategory() {
  const name = document.getElementById('catName').value.trim();
  const desc = document.getElementById('catDesc').value.trim();
  const icon = document.getElementById('catIcon').value.trim() || '📁';
  const color = State.selectedColor;
  const editId = document.getElementById('catEditId').value;

  if (!name) { showToast('카테고리 이름을 입력해주세요.', 'warn'); return; }

  // 중복 확인
  const dup = State.categories.find(c =>
    c.name === name && c.id !== editId
  );
  if (dup) { showToast('이미 같은 이름의 카테고리가 있습니다.', 'warn'); return; }

  const payload = { name, description: desc, icon, color };

  try {
    let res;
    if (editId) {
      res = await fetch(`${API.categories}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(API.categories, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) throw new Error(await res.text());
    showToast(editId ? '카테고리가 수정되었습니다.' : '카테고리가 생성되었습니다!', 'success');
    closeCatModal();
    await loadCategories();
    renderPosts(); // 사이드바 카운트 갱신
  } catch (e) {
    showToast('저장 중 오류가 발생했습니다.', 'error');
  }
}

function editCategory(id) {
  const cat = State.categories.find(c => c.id === id);
  if (cat) openCatModal(cat);
}

function confirmDeleteCat(id, name) {
  const count = State.posts.filter(p => p.category === id || p.category === name).length;
  const msg = count > 0
    ? `"${name}" 카테고리를 삭제하시겠습니까? 이 카테고리의 게시물 ${count}개는 카테고리가 해제됩니다.`
    : `"${name}" 카테고리를 삭제하시겠습니까?`;
  document.getElementById('deleteModalMsg').textContent = msg;
  document.getElementById('deleteConfirmBtn').onclick = () => deleteCategory(id);
  document.getElementById('deleteModal').classList.add('open');
}

async function deleteCategory(id) {
  try {
    await fetch(`${API.categories}/${id}`, { method: 'DELETE' });
    showToast('카테고리가 삭제되었습니다.', 'success');
    closeDeleteModal();
    await loadCategories();
    renderPosts();
  } catch (e) {
    showToast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

/* ============================================================
   미디어 저장소 통합 설정 모달
   ============================================================ */
function openMediaModal() {
  /* 현재 설정값 복원 */
  const cfgCl = Cloudinary.getConfig();
  document.getElementById('cfCloudName').value = cfgCl.cloudName    || '';
  document.getElementById('cfPreset').value    = cfgCl.uploadPreset || '';

  const cfgIb = ImgBB.getConfig();
  document.getElementById('imgbbApiKey').value = cfgIb.apiKey || '';

  _setMediaStatusMsg('cfStatus', '');
  _setMediaStatusMsg('imgbbStatus', '');
  _renderCurrentModeDisplay();

  /* 현재 활성 탭으로 초기화 */
  const mode = MediaUploader.getMode();
  switchMediaTab(mode === 'imgbb' ? 'imgbb' : 'cloudinary');

  document.getElementById('mediaModal').classList.add('open');
}

function closeMediaModal() {
  document.getElementById('mediaModal').classList.remove('open');
}

function switchMediaTab(tab) {
  /* 탭 버튼 활성화 */
  document.querySelectorAll('.media-tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  /* 패널 전환 */
  document.querySelectorAll('.media-panel').forEach(el => el.style.display = 'none');
  document.getElementById(`panel-${tab}`).style.display = 'block';
}

async function saveMediaConfig(mode) {
  if (mode === 'cloudinary') {
    const cloudName    = document.getElementById('cfCloudName').value.trim();
    const uploadPreset = document.getElementById('cfPreset').value.trim();
    if (!cloudName || !uploadPreset) {
      _setMediaStatusMsg('cfStatus', 'Cloud Name과 Upload Preset을 모두 입력해주세요.', 'error'); return;
    }
    Cloudinary.saveConfig(cloudName, uploadPreset);
    MediaUploader.setMode('cloudinary');
    _setMediaStatusMsg('cfStatus', '✅ Cloudinary 설정 저장 완료! 이미지·동영상이 모든 기기에서 동기화됩니다.', 'success');
    showToast('☁️ Cloudinary 방식으로 저장되었습니다!', 'success');

  } else if (mode === 'imgbb') {
    const apiKey = document.getElementById('imgbbApiKey').value.trim();
    if (!apiKey) {
      _setMediaStatusMsg('imgbbStatus', 'imgBB API Key를 입력해주세요.', 'error'); return;
    }
    ImgBB.saveConfig(apiKey);
    MediaUploader.setMode('imgbb');
    _setMediaStatusMsg('imgbbStatus', '✅ imgBB 설정 저장 완료! 이미지가 모든 기기에서 동기화됩니다.', 'success');
    showToast('🖼️ imgBB + YouTube 방식으로 저장되었습니다!', 'success');
  }

  updateMediaBadge();
  updateMediaStatusBanner();
  _renderCurrentModeDisplay();
  setTimeout(() => closeMediaModal(), 2000);
}

async function testCloudinaryConn() {
  const cloudName    = document.getElementById('cfCloudName').value.trim();
  const uploadPreset = document.getElementById('cfPreset').value.trim();
  if (!cloudName || !uploadPreset) {
    _setMediaStatusMsg('cfStatus', '먼저 Cloud Name과 Upload Preset을 입력하세요.', 'error'); return;
  }
  Cloudinary.saveConfig(cloudName, uploadPreset);
  _setMediaStatusMsg('cfStatus', '🔄 연결 테스트 중…', 'info');
  const r = await Cloudinary.testConnection();
  _setMediaStatusMsg('cfStatus', r.ok ? '✅ 연결 성공! 설정이 올바릅니다.' : `❌ 연결 실패: ${r.message}`, r.ok ? 'success' : 'error');
}

async function testImgBBConn() {
  const apiKey = document.getElementById('imgbbApiKey').value.trim();
  if (!apiKey) {
    _setMediaStatusMsg('imgbbStatus', '먼저 API Key를 입력하세요.', 'error'); return;
  }
  ImgBB.saveConfig(apiKey);
  _setMediaStatusMsg('imgbbStatus', '🔄 연결 테스트 중…', 'info');
  const r = await ImgBB.testConnection();
  _setMediaStatusMsg('imgbbStatus', r.ok ? '✅ 연결 성공! API Key가 유효합니다.' : `❌ 연결 실패: ${r.message}`, r.ok ? 'success' : 'error');
}

function clearMediaConfig() {
  if (!confirm('미디어 저장소 설정을 초기화하시겠습니까?')) return;
  localStorage.removeItem('edublog_cloudinary');
  localStorage.removeItem('edublog_imgbb');
  localStorage.removeItem('edublog_upload_mode');
  document.getElementById('cfCloudName').value = '';
  document.getElementById('cfPreset').value    = '';
  document.getElementById('imgbbApiKey').value = '';
  _setMediaStatusMsg('cfStatus', '');
  _setMediaStatusMsg('imgbbStatus', '');
  _renderCurrentModeDisplay();
  updateMediaBadge();
  updateMediaStatusBanner();
  showToast('미디어 저장소 설정이 초기화되었습니다.', 'info');
}

/* ── 내부 헬퍼 ── */
function _setMediaStatusMsg(elId, msg, type = '') {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!msg) { el.style.display = 'none'; return; }
  const colors = {
    success: 'background:#f0fdf4;border:1px solid #86efac;color:#166534;',
    error:   'background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;',
    info:    'background:#eff6ff;border:1px solid #93c5fd;color:#1e40af;',
  };
  el.style.cssText = (colors[type] || 'background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;') +
    'display:block;padding:10px 14px;border-radius:8px;font-size:.86rem;margin-top:8px;';
  el.textContent = msg;
}

function _renderCurrentModeDisplay() {
  const el = document.getElementById('currentModeDisplay');
  if (!el) return;
  const lbl = MediaUploader.getModeLabel();
  el.innerHTML = `<span style="font-size:.8rem;color:${lbl.color};">
    현재 방식: <strong>${lbl.icon} ${lbl.text}</strong>
  </span>`;
}

/* ── 사이드바 배지 업데이트 ── */
function updateMediaBadge() {
  const badge = document.getElementById('badge-cloudinary');
  if (!badge) return;
  const lbl = MediaUploader.getModeLabel();
  if (MediaUploader.isSyncEnabled()) {
    badge.textContent = '연결됨';
    badge.style.background = 'rgba(16,185,129,.3)';
    badge.style.color = '#6ee7b7';
  } else {
    badge.textContent = '미설정';
    badge.style.background = 'rgba(239,68,68,.35)';
    badge.style.color = '#fca5a5';
  }
}

/* ── 에디터 상단 배너 업데이트 ── */
function updateMediaStatusBanner() {
  const banner = document.getElementById('mediaStatusBanner');
  if (!banner) return;
  const lbl = MediaUploader.getModeLabel();
  banner.style.background   = lbl.bg;
  banner.style.borderColor  = lbl.border;
  banner.style.color        = lbl.color;

  if (MediaUploader.isSyncEnabled()) {
    banner.innerHTML = `
      <i class="fa-solid fa-cloud-arrow-up"></i>
      <strong>${lbl.icon} ${lbl.text}</strong> — 이미지·동영상이 모든 기기에서 동기화됩니다.
      <button onclick="openMediaModal()" style="margin-left:auto;font-size:.78rem;color:${lbl.color};
        text-decoration:underline;background:none;border:none;cursor:pointer;">설정 변경</button>
    `;
  } else {
    banner.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation"></i>
      <strong>미디어 저장소 미설정</strong> — 파일이 이 기기에만 저장됩니다.
      <button onclick="openMediaModal()" style="margin-left:8px;padding:3px 12px;
        background:#ea580c;color:#fff;border:none;border-radius:6px;
        font-size:.78rem;cursor:pointer;font-weight:600;">
        <i class="fa-solid fa-gear"></i> 지금 설정하기
      </button>
    `;
  }
}

/* 하위 호환: 기존 코드에서 updateCloudinaryBadge 호출 시 대응 */
function updateCloudinaryBadge() { updateMediaBadge(); }

/* ============================================================
   SEARCH
   ============================================================ */
function handleSearch(query) {
  State.searchQuery = query;
  renderPosts();
  const label = document.getElementById('currentFilterLabel');
  label.textContent = query ? `"${query}" 검색 결과` : '최근 게시물';
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
}

// 모달 바깥 클릭으로 닫기
document.addEventListener('click', e => {
  if (e.target.id === 'catModal')    closeCatModal();
  if (e.target.id === 'deleteModal') closeDeleteModal();
  if (e.target.id === 'mediaModal')  closeMediaModal();
});

// ESC 키
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCatModal();
    closeDeleteModal();
    closeMediaModal();
    if (window.CodeEditor) CodeEditor.close();
  }
});

/* ============================================================
   HAMBURGER / SIDEBAR
   ============================================================ */
function setupHamburger() {
  document.getElementById('hamburgerBtn').addEventListener('click', toggleSidebar);
}
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isOpen = sidebar.classList.contains('open');
  sidebar.classList.toggle('open', !isOpen);
  backdrop.style.display = isOpen ? 'none' : 'block';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').style.display = 'none';
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type = 'success') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const icon = icons[type] || icons.info;
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icon} ${type}"></i> ${escHtml(msg)}`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .4s';
    setTimeout(() => el.remove(), 400);
  }, 3200);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
