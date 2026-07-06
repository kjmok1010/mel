/* ============================================================
   EduBlog — 코드 에디터 모듈 v2
   ============================================================
   · 모달 HTML은 index.html에 정적 포함 (id="codeEditorModal")
   · 언어 선택 → 실시간 미리보기 → 삽입
   · Tab 들여쓰기 / Shift+Tab 내어쓰기
   · Ctrl+Enter 빠른 삽입
   · 라인 번호 동기화
   · 기존 코드블록 수정 지원
   · 복사 버튼 (클립보드)
   ============================================================ */

'use strict';

const CodeEditor = (() => {

  /* ── 지원 언어 ── */
  const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript',  icon: '🟨' },
    { value: 'typescript', label: 'TypeScript',  icon: '🔷' },
    { value: 'python',     label: 'Python',      icon: '🐍' },
    { value: 'java',       label: 'Java',        icon: '☕' },
    { value: 'kotlin',     label: 'Kotlin',      icon: '🎯' },
    { value: 'swift',      label: 'Swift',       icon: '🧡' },
    { value: 'c',          label: 'C',           icon: '🔵' },
    { value: 'cpp',        label: 'C++',         icon: '🔵' },
    { value: 'csharp',     label: 'C#',          icon: '💜' },
    { value: 'php',        label: 'PHP',         icon: '🐘' },
    { value: 'ruby',       label: 'Ruby',        icon: '🔴' },
    { value: 'go',         label: 'Go',          icon: '🐹' },
    { value: 'rust',       label: 'Rust',        icon: '🦀' },
    { value: 'html',       label: 'HTML',        icon: '🌐' },
    { value: 'xml',        label: 'XML',         icon: '📝' },
    { value: 'css',        label: 'CSS',         icon: '🎨' },
    { value: 'scss',       label: 'SCSS/Sass',   icon: '🌸' },
    { value: 'sql',        label: 'SQL',         icon: '🗄️' },
    { value: 'bash',       label: 'Shell/Bash',  icon: '💻' },
    { value: 'powershell', label: 'PowerShell',  icon: '🖥️' },
    { value: 'json',       label: 'JSON',        icon: '📦' },
    { value: 'yaml',       label: 'YAML',        icon: '📄' },
    { value: 'markdown',   label: 'Markdown',    icon: '✍️' },
    { value: 'r',          label: 'R',           icon: '📊' },
    { value: 'dart',       label: 'Dart',        icon: '🎯' },
    { value: 'lua',        label: 'Lua',         icon: '🌙' },
    { value: 'plaintext',  label: '일반 텍스트', icon: '📃' },
  ];

  let _editingBlockEl = null;
  let _previewTimer   = null;

  /* ════════════════════════════════
     공개: 모달 열기
  ════════════════════════════════ */
  function open(existingBlockEl = null) {
    _editingBlockEl = existingBlockEl;

    const modal    = document.getElementById('codeEditorModal');
    const textarea = document.getElementById('ceTextarea');
    const langSel  = document.getElementById('ceLangSelect');
    if (!modal || !textarea || !langSel) {
      console.error('[CodeEditor] 모달 DOM을 찾을 수 없습니다. index.html을 확인하세요.');
      return;
    }

    if (existingBlockEl) {
      /* 수정 모드 */
      const codeEl = existingBlockEl.querySelector('code');
      const lang   = (existingBlockEl.dataset.lang) ||
                     (codeEl && codeEl.className.match(/language-(\S+)/)?.[1]) || 'javascript';
      /* hljs가 추가한 span 제거 후 순수 텍스트 추출 */
      const rawText = codeEl ? _decodeHtml(codeEl.innerHTML.replace(/<[^>]+>/g, '')) : '';
      langSel.value  = LANGUAGES.find(l => l.value === lang) ? lang : 'javascript';
      textarea.value = rawText;
      document.getElementById('ceModalTitle').textContent = '코드 수정';
    } else {
      /* 신규 모드 */
      textarea.value = '';
      langSel.value  = 'javascript';
      document.getElementById('ceModalTitle').textContent = '코드 삽입';
    }

    _onLangChange();
    _updateLineNumbers();
    _renderPreview();

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('open');
      setTimeout(() => textarea.focus(), 60);
    });
  }

  /* ════════════════════════════════
     공개: 모달 닫기
  ════════════════════════════════ */
  function close() {
    const modal = document.getElementById('codeEditorModal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
    _editingBlockEl = null;
    clearTimeout(_previewTimer);
  }

  /* ════════════════════════════════
     공개: 코드 삽입
  ════════════════════════════════ */
  function insert() {
    const textarea = document.getElementById('ceTextarea');
    const langSel  = document.getElementById('ceLangSelect');
    const code     = textarea ? textarea.value : '';
    const lang     = langSel  ? langSel.value  : 'javascript';

    if (!code.trim()) {
      _toast('코드를 입력해주세요.', 'warn');
      return;
    }

    const langInfo = LANGUAGES.find(l => l.value === lang) || { label: lang, icon: '💻' };
    const escaped  = _escapeHtml(code);
    const blockHtml = _buildBlockHtml(lang, langInfo.label, langInfo.icon, escaped);

    const area = document.getElementById('editorArea');

    if (_editingBlockEl) {
      /* 기존 블록 교체 */
      const tmp = document.createElement('div');
      tmp.innerHTML = blockHtml;
      _editingBlockEl.replaceWith(tmp.firstElementChild);
    } else {
      /* 커서 위치에 삽입 */
      if (typeof restoreSelection === 'function') restoreSelection();
      try {
        document.execCommand('insertHTML', false, blockHtml + '<p><br></p>');
      } catch (_) {
        if (area) area.innerHTML += blockHtml + '<p><br></p>';
      }
    }

    /* 삽입 후 하이라이트 */
    if (window.hljs && area) {
      area.querySelectorAll('pre code:not(.hljs)').forEach(el => {
        try { hljs.highlightElement(el); } catch(_) {}
      });
    }

    close();
    _toast(`${langInfo.icon} ${langInfo.label} 코드가 삽입되었습니다!`, 'success');
  }

  /* ════════════════════════════════
     공개: 기존 블록 수정
  ════════════════════════════════ */
  function editBlock(blockEl) {
    if (typeof saveSelection === 'function') saveSelection();
    open(blockEl);
  }

  /* ════════════════════════════════
     공개: 코드 복사
  ════════════════════════════════ */
  function copyCode(btn) {
    const block  = btn.closest('.code-block');
    const codeEl = block && block.querySelector('code');
    if (!codeEl) return;

    const raw = _decodeHtml(codeEl.innerHTML.replace(/<[^>]+>/g, ''));

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(raw).then(() => {
        _flashCopied(btn);
        _toast('📋 클립보드에 복사되었습니다!', 'success');
      }).catch(() => _fallbackCopy(raw, btn));
    } else {
      _fallbackCopy(raw, btn);
    }
  }

  function _fallbackCopy(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      _flashCopied(btn);
      _toast('📋 클립보드에 복사되었습니다!', 'success');
    } catch(_) {
      _toast('복사 실패 — 코드를 직접 선택해주세요.', 'error');
    }
    document.body.removeChild(ta);
  }

  function _flashCopied(btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> 복사됨!';
    btn.style.color = '#a6e3a1';
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2200);
  }

  /* ════════════════════════════════
     공개: 에디터 내 하이라이트 일괄 적용
  ════════════════════════════════ */
  function highlightAllInEditor() {
    const area = document.getElementById('editorArea');
    if (!area || !window.hljs) return;
    area.querySelectorAll('pre code:not(.hljs)').forEach(el => {
      try { hljs.highlightElement(el); } catch(_) {}
    });
  }

  /* ════════════════════════════════
     공개: 상세보기/출력 영역 하이라이트
  ════════════════════════════════ */
  function highlightAllInContainer(container) {
    if (!container || !window.hljs) return;

    /* 새 포맷 code-block */
    container.querySelectorAll('.code-block pre code').forEach(el => {
      if (!el.classList.contains('hljs')) {
        try { hljs.highlightElement(el); } catch(_) {}
      }
    });

    /* 상세보기에서 수정 버튼 숨기기 */
    container.querySelectorAll('.code-block .ce-edit-btn').forEach(b => {
      b.style.display = 'none';
    });

    /* legacy <pre><code> 처리 */
    container.querySelectorAll('pre:not(.code-block pre)').forEach(pre => {
      const code = pre.querySelector('code') || pre;
      if (!code.classList.contains('hljs')) {
        try { hljs.highlightElement(code); } catch(_) {}
      }
    });
  }

  /* ════════════════════════════════
     내부: 언어 변경 시
  ════════════════════════════════ */
  function _onLangChange() {
    const langSel = document.getElementById('ceLangSelect');
    const badge   = document.getElementById('ceLangBadge');
    if (!langSel || !badge) return;
    const lang  = langSel.value;
    const found = LANGUAGES.find(l => l.value === lang);
    if (found) badge.textContent = `${found.icon} ${found.label}`;
    _renderPreview();
  }

  /* ════════════════════════════════
     내부: 미리보기 렌더링
  ════════════════════════════════ */
  function _renderPreview() {
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(() => {
      const textarea = document.getElementById('ceTextarea');
      const langSel  = document.getElementById('ceLangSelect');
      const preview  = document.getElementById('cePreview');
      if (!textarea || !langSel || !preview) return;

      const code = textarea.value;
      const lang = langSel.value;

      if (!code.trim()) {
        preview.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#4a4a6a;font-size:.85rem;">
            <div style="text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">👈</div>
              <div>코드를 입력하면<br>여기서 미리보기됩니다</div>
            </div>
          </div>`;
        return;
      }

      const escaped = _escapeHtml(code);
      preview.innerHTML = `<pre style="margin:0;background:transparent;"><code class="language-${lang}">${escaped}</code></pre>`;

      if (window.hljs) {
        preview.querySelectorAll('pre code').forEach(el => {
          try { hljs.highlightElement(el); } catch(_) {}
        });
      }
    }, 150);
  }

  /* ════════════════════════════════
     내부: 라인 번호 갱신
  ════════════════════════════════ */
  function _updateLineNumbers() {
    const textarea = document.getElementById('ceTextarea');
    const lineNums = document.getElementById('ceLineNumbers');
    if (!textarea || !lineNums) return;
    const count = textarea.value.split('\n').length;
    lineNums.innerHTML = Array.from({ length: count }, (_, i) =>
      `<span>${i + 1}</span>`
    ).join('');
  }

  /* ════════════════════════════════
     내부: textarea 입력 핸들러
  ════════════════════════════════ */
  function _onTextareaInput() {
    _updateLineNumbers();
    _renderPreview();
  }

  /* ════════════════════════════════
     내부: textarea 키 핸들러
  ════════════════════════════════ */
  function _onTextareaKeydown(e) {
    const ta = e.target;

    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, end = ta.selectionEnd, v = ta.value;
      if (s === end) {
        ta.value = v.slice(0, s) + '  ' + v.slice(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
      } else {
        const lines  = v.slice(s, end).split('\n');
        const result = e.shiftKey
          ? lines.map(l => l.startsWith('  ') ? l.slice(2) : l.replace(/^ /, ''))
          : lines.map(l => '  ' + l);
        const newText = result.join('\n');
        ta.value = v.slice(0, s) + newText + v.slice(end);
        ta.selectionStart = s;
        ta.selectionEnd   = s + newText.length;
      }
      _updateLineNumbers();
      _renderPreview();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      insert();
    }
  }

  /* ════════════════════════════════
     내부: textarea 스크롤 동기화
  ════════════════════════════════ */
  function _onTextareaScroll(ta) {
    const lineNums = document.getElementById('ceLineNumbers');
    if (lineNums) lineNums.scrollTop = ta.scrollTop;
  }

  /* ════════════════════════════════
     내부: 초기화 버튼
  ════════════════════════════════ */
  function _clearCode() {
    const ta = document.getElementById('ceTextarea');
    if (ta) { ta.value = ''; _updateLineNumbers(); _renderPreview(); ta.focus(); }
  }

  /* ════════════════════════════════
     내부: 코드블록 HTML 빌드
  ════════════════════════════════ */
  function _buildBlockHtml(lang, label, icon, escapedCode) {
    return `<div class="code-block" data-lang="${lang}" contenteditable="false">` +
      `<div class="code-block-header">` +
        `<span class="code-lang-badge">${icon} ${label}</span>` +
        `<div class="code-block-actions">` +
          `<button class="code-action-btn ce-edit-btn" onclick="CodeEditor.editBlock(this.closest('.code-block'))" title="수정">` +
            `<i class="fa-solid fa-pen-to-square"></i> 수정</button>` +
          `<button class="code-action-btn ce-copy-btn" onclick="CodeEditor.copyCode(this)" title="복사">` +
            `<i class="fa-regular fa-copy"></i> 복사</button>` +
        `</div>` +
      `</div>` +
      `<pre><code class="language-${lang}">${escapedCode}</code></pre>` +
    `</div>`;
  }

  /* ════════════════════════════════
     내부: 유틸
  ════════════════════════════════ */
  function _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _decodeHtml(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function _toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type);
  }

  /* ════════════════════════════════
     init: DOM 로드 후 이벤트 연결
  ════════════════════════════════ */
  function _init() {
    const textarea = document.getElementById('ceTextarea');
    const langSel  = document.getElementById('ceLangSelect');
    const modal    = document.getElementById('codeEditorModal');

    if (!textarea || !langSel || !modal) {
      /* DOM 아직 준비 안 됨 — 재시도 */
      setTimeout(_init, 200);
      return;
    }

    textarea.addEventListener('input',   _onTextareaInput);
    textarea.addEventListener('keydown', _onTextareaKeydown);
    textarea.addEventListener('scroll',  e => _onTextareaScroll(e.target));

    langSel.addEventListener('change', _onLangChange);

    /* 모달 바깥 클릭 닫기 */
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
    });
  }

  /* DOM 준비 후 초기화 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  /* ════════════════════════════════
     공개 API
  ════════════════════════════════ */
  return {
    open,
    close,
    insert,
    editBlock,
    copyCode,
    highlightAllInEditor,
    highlightAllInContainer,
    _clearCode,
    LANGUAGES,
  };
})();
