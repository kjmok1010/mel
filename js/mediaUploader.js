/* ============================================================
   EduBlog — 미디어 업로드 통합 모듈 (MediaUploader)
   ============================================================
   사용자가 선택한 업로드 방식에 따라 분기:

   MODE A — Cloudinary
     · 이미지 + 동영상 모두 업로드
     · 설정: Cloud Name + Upload Preset (Unsigned)

   MODE B — imgBB + YouTube
     · 이미지 → imgBB API (무제한 무료)
     · 동영상 → YouTube URL 입력 팝업으로 임베드
     · 설정: imgBB API Key

   MODE NONE — 미설정 (로컬 폴백)
     · 이미지: Base64 (20MB 이하, 이 기기만)
     · 동영상: IndexedDB Blob (이 기기만)
   ============================================================ */

'use strict';

const MODE_KEY = 'edublog_upload_mode'; // 'cloudinary' | 'imgbb' | ''

const MediaUploader = {

  /* ── 현재 모드 ── */
  getMode() {
    return localStorage.getItem(MODE_KEY) || '';
  },
  setMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
  },

  /* ── 동기화 가능 여부 ── */
  isSyncEnabled() {
    const mode = this.getMode();
    if (mode === 'cloudinary') return Cloudinary.isConfigured();
    if (mode === 'imgbb')      return ImgBB.isConfigured();
    return false;
  },

  /* ── 모드 라벨 (UI용) ── */
  getModeLabel() {
    const mode = this.getMode();
    if (mode === 'cloudinary' && Cloudinary.isConfigured()) {
      const cfg = Cloudinary.getConfig();
      return { icon: '☁️', text: `Cloudinary (${cfg.cloudName})`, color: '#166534', bg: '#f0fdf4', border: '#86efac' };
    }
    if (mode === 'imgbb' && ImgBB.isConfigured()) {
      return { icon: '🖼️', text: 'imgBB + YouTube', color: '#1e40af', bg: '#eff6ff', border: '#93c5fd' };
    }
    return { icon: '⚠️', text: '미설정 — 이 기기에만 저장됨', color: '#9a3412', bg: '#fff7ed', border: '#fdba74' };
  },

  /* ================================================================
     메인 진입점: 파일 배열을 받아 업로드 방식에 맞게 처리
     ================================================================ */
  async handleFiles(files) {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await this._handleImage(file);
      } else if (file.type.startsWith('video/')) {
        await this._handleVideo(file);
      } else {
        showToast(`지원하지 않는 파일 형식: ${file.type}`, 'warn');
      }
    }
  },

  /* ── 이미지 처리 ── */
  async _handleImage(file) {
    const mode = this.getMode();

    if (mode === 'cloudinary' && Cloudinary.isConfigured()) {
      await _uploadWithProgress(file, 'cloudinary');

    } else if (mode === 'imgbb' && ImgBB.isConfigured()) {
      await _uploadWithProgress(file, 'imgbb');

    } else {
      /* 로컬 폴백 */
      _warnNoSync();
      const MAX = 20 * 1024 * 1024;
      if (file.size > MAX) {
        showToast(`이미지가 너무 큽니다. (최대 20MB, 현재 ${(file.size/1024/1024).toFixed(1)}MB)`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        _insertHtml(`<img src="${e.target.result}" alt="${escHtml(file.name)}" style="max-width:100%;border-radius:8px;margin:8px 0;"/><p></p>`);
        showToast(`🖼️ ${file.name} 삽입 (로컬 임시 — 동기화 안 됨)`, 'warn');
      };
      reader.readAsDataURL(file);
    }
  },

  /* ── 동영상 처리 ── */
  async _handleVideo(file) {
    const mode = this.getMode();

    if (mode === 'cloudinary' && Cloudinary.isConfigured()) {
      /* Cloudinary: 동영상 파일 직접 업로드 */
      await _uploadWithProgress(file, 'cloudinary');

    } else if (mode === 'imgbb') {
      /* imgBB 모드: 동영상 파일 미지원 → YouTube 입력 팝업 안내 */
      showToast('imgBB 모드에서는 동영상 파일을 직접 업로드할 수 없습니다.\n툴바의 YouTube 버튼을 이용해주세요.', 'warn');
      /* 자동으로 YouTube 삽입 다이얼로그 열기 */
      setTimeout(() => openYoutubeDialog(), 300);

    } else {
      /* 로컬 폴백 — IndexedDB */
      _warnNoSync();
      const MAX = 500 * 1024 * 1024;
      if (file.size > MAX) {
        showToast(`동영상이 너무 큽니다. (최대 500MB)`, 'error'); return;
      }
      const sizeMB = (file.size/1024/1024).toFixed(1);
      showToast(`🎬 동영상 처리 중… (${sizeMB}MB)`, 'info');
      try {
        const vidId = 'vid_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
        await VidDB.save(vidId, file);
        const blobUrl = URL.createObjectURL(file);
        _insertHtml(`<video controls playsinline data-vid-id="${vidId}"
          style="max-width:100%;border-radius:8px;margin:8px 0;display:block;">
          <source src="${blobUrl}" type="${escHtml(file.type)}">
        </video><p></p>`);
        showToast(`🎬 ${file.name} (${sizeMB}MB) 삽입 — 이 기기에만 저장됨`, 'warn');
      } catch { showToast('동영상 저장 중 오류가 발생했습니다.', 'error'); }
    }
  },
};

/* ================================================================
   내부 헬퍼 함수들
   ================================================================ */

/* 진행 바 포함 업로드 (Cloudinary / imgBB 공용) */
async function _uploadWithProgress(file, service) {
  const isVideo = file.type.startsWith('video/');
  const sizeMB  = (file.size / 1024 / 1024).toFixed(1);

  /* 용량 체크 */
  const limits = { cloudinary: { image: 10, video: 100 }, imgbb: { image: 32, video: 0 } };
  const lim = isVideo ? limits[service].video : limits[service].image;
  if (file.size > lim * 1024 * 1024) {
    showToast(`파일이 너무 큽니다. (${service === 'cloudinary' ? 'Cloudinary' : 'imgBB'} 최대 ${lim}MB, 현재 ${sizeMB}MB)`, 'error');
    return;
  }

  /* 진행 UI 삽입 */
  const pid  = 'prog_' + Date.now();
  const serviceLabel = service === 'cloudinary' ? '☁️ Cloudinary' : '🖼️ imgBB';
  _insertHtml(`<div id="${pid}" class="upload-progress-block" contenteditable="false">
    <div class="upload-progress-inner">
      <div class="upload-icon">${isVideo ? '🎬' : '🖼️'}</div>
      <div class="upload-info">
        <div class="upload-filename">${escHtml(file.name)} <span class="upload-size">(${sizeMB}MB · ${serviceLabel})</span></div>
        <div class="upload-bar-wrap"><div class="upload-bar" id="bar_${pid}"></div></div>
        <div class="upload-percent" id="pct_${pid}">0%</div>
      </div>
    </div>
  </div><p></p>`);

  const onProgress = pct => {
    const bar = document.getElementById(`bar_${pid}`);
    const pctEl = document.getElementById(`pct_${pid}`);
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  };

  try {
    let url = '';
    if (service === 'cloudinary') {
      const data = await Cloudinary.uploadFile(file, onProgress);
      url = data.secure_url;
    } else {
      const data = await ImgBB.uploadImage(file, onProgress);
      url = data.url;
    }

    /* 진행 UI → 실제 미디어로 교체 */
    const el = document.getElementById(pid);
    if (el) {
      const mediaHtml = isVideo
        ? `<video controls playsinline src="${url}"
            style="max-width:100%;border-radius:8px;margin:8px 0;display:block;">
            브라우저가 동영상을 지원하지 않습니다.
           </video>`
        : `<img src="${url}" alt="${escHtml(file.name)}"
            style="max-width:100%;border-radius:8px;margin:8px 0;"/>`;
      const wrap = document.createElement('div');
      wrap.innerHTML = mediaHtml;
      el.replaceWith(wrap.firstElementChild);
    }
    showToast(`✅ ${file.name} 업로드 완료 — 모든 기기에서 동기화됩니다!`, 'success');

  } catch (err) {
    console.error(`${service} 업로드 실패:`, err);
    const el = document.getElementById(pid);
    if (el) {
      el.innerHTML = `<div class="upload-error-block">
        <i class="fa-solid fa-circle-xmark"></i>
        업로드 실패: ${escHtml(err.message)}
        <button onclick="this.closest('.upload-error-block').parentElement.remove()"
          style="margin-left:12px;font-size:.8rem;color:#ef4444;text-decoration:underline;background:none;border:none;cursor:pointer;">제거</button>
      </div>`;
    }
    showToast(`업로드 실패: ${err.message}`, 'error');
  }
}

/* 에디터에 HTML 삽입 */
function _insertHtml(html) {
  document.getElementById('editorArea').focus();
  document.execCommand('insertHTML', false, html);
}

/* 동기화 미설정 경고 배너 (에디터 안, 한 번만) */
function _warnNoSync() {
  if (document.getElementById('no-sync-banner')) return;
  _insertHtml(`<div id="no-sync-banner" contenteditable="false"
    style="padding:10px 16px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;
           margin:8px 0;font-size:.85rem;color:#9a3412;display:flex;align-items:center;gap:10px;">
    <i class="fa-solid fa-triangle-exclamation"></i>
    <span>미디어 저장소 미설정 — 이 파일은 <strong>이 기기에만</strong> 저장됩니다.
      <button onclick="openMediaModal()" style="margin-left:8px;padding:2px 10px;
        background:#ea580c;color:#fff;border:none;border-radius:5px;font-size:.78rem;
        cursor:pointer;font-weight:600;">지금 설정</button>
    </span>
  </div><p></p>`);
}

/* YouTube 다이얼로그 (툴바 버튼과 공용) */
function openYoutubeDialog() {
  saveSelection();
  const url = prompt('YouTube URL 또는 영상 ID를 입력하세요:\n예) https://youtu.be/XXXXXXXXXXX');
  if (!url) return;
  let videoId = url.trim();
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (match) videoId = match[1];
  restoreSelection();
  _insertHtml(`<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin:12px 0;">
    <iframe src="https://www.youtube.com/embed/${videoId}"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
      allowfullscreen loading="lazy"></iframe>
  </div><p></p>`);
  showToast('YouTube 영상이 삽입되었습니다!', 'success');
}
