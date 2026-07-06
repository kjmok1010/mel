# 📚 EduBlog — 나의 교육자료 블로그

강의 노트, 학습 자료, 교육 콘텐츠를 카테고리별로 관리하는 **나만의 교육 블로그**입니다.  
모든 게시물은 **RESTful Table API(온라인 DB)**에 저장되어 스마트폰·노트북·태블릿 어느 기기에서나 항상 동일하게 표시됩니다.

---

## ✅ 구현된 기능

### 📝 리치 텍스트 에디터
- ContentEditable 기반 WYSIWYG 에디터
- 텍스트 포맷 (굵게, 기울임, 밑줄, 취소선, 색상)
- 제목 수준 (H1, H2, H3), 본문, 인용구
- 정렬, 목록(순서/비순서), 들여쓰기, 링크, 표, 구분선
- 드래그 앤 드롭 이미지/동영상 삽입

### 💻 코드 에디터 (Syntax Highlight) ← **신규**
- **27가지 언어** 지원: JavaScript, TypeScript, Python, Java, Kotlin, Swift, C/C++, C#, PHP, Ruby, Go, Rust, HTML, CSS, SCSS, SQL, Bash, PowerShell, JSON, YAML, XML, Markdown, R, MATLAB, Dart, Lua, 일반 텍스트
- **Highlight.js** 기반 실시간 Syntax Highlighting
- **좌우 분할 화면**: 코드 입력(왼쪽) + 미리보기(오른쪽)
- **라인 번호** 자동 표시
- **Tab 키 들여쓰기** (2칸) + **Shift+Tab 내어쓰기**
- **Ctrl+Enter** / **Cmd+Enter** 로 빠른 삽입
- 삽입된 코드블록 **수정** 버튼 (블록 헤더 클릭)
- 삽입된 코드블록 **복사** 버튼 (원클릭 클립보드 복사)
- DB 저장: `<div class="code-block" data-lang="언어">` 구조로 표준화
- 상세보기 페이지에서 자동으로 Syntax Highlight 복원

### 🗄️ 데이터베이스 (모든 기기 동기화)
- **RESTful Table API** (`tables/posts`, `tables/categories`) 사용
- 게시물/카테고리 CRUD 전부 온라인 DB에 저장
- 기기 무관 — 스마트폰, 노트북, 태블릿 어디서나 동일한 내용
- 게시물 저장 시 코드블록 HTML 정규화 (hljs 태그 제거 후 저장)
- 불러올 때 자동 Highlight 복원

### 🖼️ 미디어 저장 (크로스 디바이스)
- **Cloudinary** Unsigned Upload (이미지+동영상 CDN)
- **imgBB** Free API (이미지 무제한 무료)  
  + **YouTube** iframe 임베드 (동영상 무료)
- 로컬 폴백: IndexedDB (Cloudinary/imgBB 미설정 시)
- 업로드 진행 바 UI

### 📱 PWA (안드로이드 홈 화면 설치)
- `manifest.json` + Service Worker (`sw.js`)
- 안드로이드 Chrome 설치 배너 (자동)
- iOS Safari 수동 안내 배너
- 앱 업데이트 배너
- Cache First / Network First / Stale-While-Revalidate 3단계 전략
- 오프라인 폴백 화면

### 📂 카테고리 관리
- 카테고리 생성/수정/삭제
- 색상 10종 + 이모지 아이콘
- 사이드바 카테고리별 게시물 수 표시

### 기타
- 게시물 검색 (제목, 내용, 태그)
- 임시저장 / 게시하기 분리
- 조회수 카운터
- 태그 (#태그)
- 반응형 레이아웃 (모바일/태블릿/데스크톱)
- Safe-area 보정 (노치, 네비바)
- 터치 타겟 최소 44px

---

## 🗂️ 파일 구조

```
index.html              — SPA 메인 (4개 페이지 섹션)
css/
  style.css             — 전체 스타일 + 코드블록 테마
js/
  app.js                — 메인 로직 (CRUD, 에디터, 렌더링)
  code-editor.js        — 코드 삽입 모달 + Highlight.js 연동 ← 신규
  cloudinary.js         — Cloudinary Unsigned Upload 모듈
  imgbb.js              — imgBB Free API 모듈
  mediaUploader.js      — 미디어 업로드 통합 (Cloudinary/imgBB/로컬)
  pwa-install.js        — PWA 설치 관리 (beforeinstallprompt)
  generate-icons.js     — PWA 아이콘 Canvas 생성 유틸
manifest.json           — PWA 매니페스트
sw.js                   — Service Worker (오프라인 캐시)
icons/
  icon.svg              — 기본 SVG 아이콘
  icon-192.svg          — 192×192 maskable SVG
  icon-512.svg          — 512×512 maskable SVG
  create-icons.html     — PNG 아이콘 생성 도구
```

---

## 🔗 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `tables/posts`         | 게시물 목록 (limit=200) |
| POST   | `tables/posts`         | 게시물 생성 |
| PUT    | `tables/posts/:id`     | 게시물 수정 |
| PATCH  | `tables/posts/:id`     | 조회수 업데이트 |
| DELETE | `tables/posts/:id`     | 게시물 삭제 |
| GET    | `tables/categories`    | 카테고리 목록 |
| POST   | `tables/categories`    | 카테고리 생성 |
| PUT    | `tables/categories/:id`| 카테고리 수정 |
| DELETE | `tables/categories/:id`| 카테고리 삭제 |

---

## 📊 데이터 모델

### posts 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | UUID (자동) |
| title | text | 게시물 제목 |
| content | rich_text | HTML 본문 (코드블록 포함) |
| category | text | 카테고리 ID |
| tags | array | 태그 배열 |
| thumbnail | text | 대표 이미지 URL |
| status | text | `published` / `draft` |
| view_count | number | 조회수 |
| created_at | datetime | 생성 시각 |

### categories 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | UUID (자동) |
| name | text | 카테고리 이름 |
| description | text | 설명 |
| icon | text | 이모지 아이콘 |
| color | text | HEX 색상 |

---

## 💻 코드 에디터 사용법

1. 글 작성 화면의 툴바에서 **`</> 코드`** 버튼 클릭 (검은 배경의 보라색 버튼)
2. 모달이 열리면 **언어 선택** 드롭다운에서 원하는 언어 선택 (27종)
3. **왼쪽 패널** 어두운 배경 입력창에 코드 붙여넣기 또는 직접 입력
4. **오른쪽 패널**에서 실시간 Syntax Highlight 미리보기 확인
5. **삽입하기** 버튼 클릭 (또는 `Ctrl+Enter` 단축키)
6. 에디터 본문에 코드블록이 삽입됨 → 게시하기

| 단축키 | 기능 |
|--------|------|
| `Tab` | 2칸 들여쓰기 |
| `Shift+Tab` | 2칸 내어쓰기 |
| `Ctrl+Enter` | 바로 삽입 |

> 💡 삽입된 코드블록 헤더의 **수정** 버튼으로 언제든 다시 편집 가능  
> 📋 **복사** 버튼으로 원클릭 클립보드 복사 지원

---

## 📱 안드로이드 PWA 설치

1. Chrome으로 사이트 접속
2. 하단 **"EduBlog 앱 설치"** 배너 → **설치** 탭
3. 또는 Chrome 메뉴 → **홈 화면에 추가**

---

## 🔧 미디어 저장소 설정

사이드바 → **미디어 저장소** 클릭

| 방식 | 이미지 | 동영상 | 무료 여부 |
|------|--------|--------|----------|
| Cloudinary | ✅ | ✅ | 25GB/월 무료 |
| imgBB + YouTube | ✅ 무제한 | ✅ YouTube 임베드 | 완전 무료 |
| 로컬 (미설정) | ✅ | ✅ | 이 기기만 |

---

## 🚀 배포

**Publish 탭**에서 원클릭 배포 → HTTPS 자동 적용 → PWA 설치 가능
