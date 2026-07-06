/* ============================================================
   EduBlog — PWA 설치 관리 모듈
   ============================================================
   · beforeinstallprompt 이벤트 감지 → 설치 배너 표시
   · 앱 설치 완료 후 배너 숨김
   · 설치 상태에 따라 UI 업데이트
   ============================================================ */

'use strict';

const PWAInstall = (() => {
  let deferredPrompt = null;   // beforeinstallprompt 이벤트 저장

  /* ── 초기화 ── */
  function init() {
    /* iOS Safari는 beforeinstallprompt 미지원 → 수동 안내 */
    if (_isIOS()) {
      _showIOSBanner();
      return;
    }

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      _showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      _hideInstallBanner();
      _showInstalledToast();
    });

    /* 이미 설치된 상태(standalone) → 배너 숨김 */
    if (_isStandalone()) _hideInstallBanner();

    /* URL 파라미터 처리: ?action=new → 에디터 바로 열기 */
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          if (typeof openEditor === 'function') openEditor();
        }, 800);
      });
    }
  }

  /* ── 설치 버튼 클릭 ── */
  async function triggerInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      _hideInstallBanner();
    }
    deferredPrompt = null;
  }

  /* ── 배너 표시/숨김 ── */
  function _showInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.display = 'flex';
      banner.classList.add('slide-in');
    }
  }

  function _hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('pwa_banner_dismissed', '1');
  }

  /* ── iOS 전용 안내 배너 ── */
  function _showIOSBanner() {
    if (localStorage.getItem('pwa_ios_dismissed') || _isStandalone()) return;
    const banner = document.getElementById('pwa-ios-banner');
    if (banner) banner.style.display = 'flex';
  }

  function hideIOSBanner() {
    const banner = document.getElementById('pwa-ios-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('pwa_ios_dismissed', '1');
  }

  function _showInstalledToast() {
    if (typeof showToast === 'function') {
      showToast('📱 EduBlog가 홈 화면에 설치되었습니다!', 'success');
    }
  }

  /* ── 헬퍼 ── */
  function _isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  function _isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  /* 앱 모드 여부 공개 */
  function isRunningAsApp() { return _isStandalone(); }

  return { init, triggerInstall, hideIOSBanner, isRunningAsApp };
})();

/* DOM 준비 후 초기화 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PWAInstall.init());
} else {
  PWAInstall.init();
}

/* Service Worker 등록 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker 등록 성공:', reg.scope);

        /* 새 버전 감지 → 업데이트 안내 */
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              _showUpdateBanner();
            }
          });
        });
      })
      .catch(err => console.warn('[PWA] Service Worker 등록 실패:', err));
  });
}

function _showUpdateBanner() {
  const banner = document.getElementById('pwa-update-banner');
  if (banner) banner.style.display = 'flex';
}

function applyUpdate() {
  navigator.serviceWorker.getRegistration().then(reg => {
    if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
  window.location.reload();
}
