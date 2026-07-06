/* ============================================================
   EduBlog — imgBB 이미지 업로드 모듈
   ============================================================
   · imgBB Free API: 무제한 용량, API Key만 필요
   · 이미지 전용 (동영상 미지원 → YouTube 임베드로 대체)
   · API Key 발급: https://api.imgbb.com/
     → 로그인 후 우측 상단 아이디 클릭 → API → API Key 복사
   ============================================================ */

'use strict';

const ImgBB = {

  CFG_KEY: 'edublog_imgbb',

  getConfig() {
    try { return JSON.parse(localStorage.getItem(this.CFG_KEY) || '{}'); }
    catch { return {}; }
  },

  saveConfig(apiKey) {
    localStorage.setItem(this.CFG_KEY, JSON.stringify({ apiKey }));
  },

  isConfigured() {
    const { apiKey } = this.getConfig();
    return !!(apiKey && apiKey.trim());
  },

  /* 이미지 파일 업로드 → { url, deleteUrl } 반환 */
  async uploadImage(file, onProgress) {
    const { apiKey } = this.getConfig();
    if (!apiKey) throw new Error('imgBB API Key가 설정되지 않았습니다.');

    const formData = new FormData();
    formData.append('image', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`);

      if (typeof onProgress === 'function') {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
        });
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              resolve({
                url:       data.data.url,
                displayUrl: data.data.display_url,
                deleteUrl: data.data.delete_url,
                id:        data.data.id,
              });
            } else {
              reject(new Error(data.error?.message || '업로드 실패'));
            }
          } catch { reject(new Error('응답 파싱 실패')); }
        } else if (xhr.status === 400) {
          reject(new Error('잘못된 API Key이거나 지원하지 않는 파일 형식입니다.'));
        } else if (xhr.status === 429) {
          reject(new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'));
        } else {
          reject(new Error(`업로드 실패 (HTTP ${xhr.status})`));
        }
      };

      xhr.onerror   = () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
      xhr.ontimeout = () => reject(new Error('업로드 시간이 초과되었습니다.'));
      xhr.send(formData);
    });
  },

  /* API Key 유효성 테스트 (1x1 pixel PNG) */
  async testConnection() {
    try {
      /* 가장 작은 PNG (1×1 투명) */
      const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const byteString = atob(b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });
      await this.uploadImage(file);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  },
};
