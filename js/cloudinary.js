/* ============================================================
   EduBlog — Cloudinary 업로드 모듈
   ============================================================
   동작 방식:
   1. 사용자가 설정 화면에서 Cloud Name + Upload Preset 저장
   2. 파일 선택 / 드래그앤드롭 시 Cloudinary Upload API로 직접 전송
   3. 반환된 secure_url 을 에디터에 <img> 또는 <video> 로 삽입
   4. URL이 CDN에 영구 저장되므로 어떤 기기에서도 동일하게 표시
   ============================================================ */

'use strict';

/* ── 설정 키 (localStorage) ── */
const CFG_KEY = 'edublog_cloudinary';

const Cloudinary = {

  /* ── 설정 읽기 / 쓰기 ── */
  getConfig() {
    try {
      return JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    } catch { return {}; }
  },

  saveConfig(cloudName, uploadPreset) {
    localStorage.setItem(CFG_KEY, JSON.stringify({ cloudName, uploadPreset }));
  },

  isConfigured() {
    const { cloudName, uploadPreset } = this.getConfig();
    return !!(cloudName && uploadPreset);
  },

  /* ── 단일 파일 업로드 ── */
  async uploadFile(file, onProgress) {
    const { cloudName, uploadPreset } = this.getConfig();
    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary 설정이 필요합니다. 설정 페이지에서 Cloud Name과 Upload Preset을 입력해주세요.');
    }

    const isVideo = file.type.startsWith('video/');
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'edublog');   // Cloudinary 내 폴더

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);

      /* 업로드 진행률 콜백 */
      if (typeof onProgress === 'function') {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new Error('Cloudinary 응답 파싱 실패'));
          }
        } else {
          let errMsg = `업로드 실패 (HTTP ${xhr.status})`;
          try {
            const err = JSON.parse(xhr.responseText);
            if (err.error && err.error.message) errMsg = err.error.message;
          } catch {}
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
      xhr.ontimeout = () => reject(new Error('업로드 시간이 초과되었습니다.'));
      xhr.timeout = 0; // 대용량 동영상을 위해 타임아웃 없음

      xhr.send(formData);
    });
  },

  /* ── 연결 테스트 (작은 텍스트 파일 업로드) ── */
  async testConnection() {
    const testBlob = new Blob(['edublog-test'], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test.txt', { type: 'image/png' }); // image 엔드포인트 테스트용
    try {
      await this.uploadFile(testFile);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }
};
