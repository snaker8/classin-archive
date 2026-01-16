# ClassIn 학습 아카이브 플랫폼

온라인 수업 도구 ClassIn에서 생성된 수업 자료를 학생별로 관리하고, 전자책 형태로 복습할 수 있는 플랫폼입니다.

## 🎯 주요 기능

### 학생용 E-Book 뷰어
- ✨ **3D 플립 효과**: 실제 책처럼 넘기는 페이지 전환
- 🔍 **고급 확대/축소**: 더블클릭, 핀치 줌, 마우스 휠 지원
- 📱 **완벽한 반응형**: PC, 태블릿, 모바일 최적화
- 🎥 **영상 연동**: 새 탭에서 영상 보며 판서 동시 확인
- ⌨️ **키보드 단축키**: 화살표 키, F(전체화면) 지원
- 📑 **썸네일 네비게이션**: 빠른 페이지 점프

### 관리자 업로드 대시보드
- 🎨 **좌우 분할 레이아웃**: 학생 선택 + 업로드 폼
- 🖱️ **드래그 앤 드롭**: 바탕화면에서 직접 이미지 끌어다 놓기
- 🔀 **이미지 순서 변경**: 드래그로 간편한 재정렬
- 👁️ **실시간 미리보기**: 학생 화면 그대로 확인
- 🔔 **실시간 피드백**: Toast 알림으로 모든 상태 표시
- ⚡ **자동화 기능**: 날짜별 자동 제목 생성

## 기술 스택

- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend/DB**: Supabase (Auth, Database, Storage)
- **UI Library**: Shadcn/UI, Lucide React
- **Special Features**: 
  - react-pageflip (3D 책 넘김)
  - react-zoom-pan-pinch (확대/축소)
  - react-dropzone (드래그 앤 드롭)
  - @dnd-kit (순서 변경)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase 데이터베이스 설정

`supabase/schema.sql` 파일의 SQL을 Supabase SQL Editor에서 실행하세요.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
classin-archive/
├── app/
│   ├── (auth)/
│   │   └── login/              # 로그인 페이지
│   ├── student/
│   │   ├── dashboard/          # 학생 대시보드
│   │   └── viewer/[id]/        # 📚 E-Book 뷰어 (NEW!)
│   ├── admin/
│   │   ├── dashboard/          # 관리자 대시보드
│   │   ├── classes/new/        # 🎨 업로드 페이지 (IMPROVED!)
│   │   └── students/new/       # 학생 추가
│   └── layout.tsx
├── components/
│   └── ui/                     # Shadcn/UI 컴포넌트
├── lib/
│   ├── supabase/
│   └── utils/
└── public/
```

## 📚 문서

- **QUICKSTART.md**: 5분 안에 시작하기
- **SETUP_GUIDE.md**: 전체 설정 가이드
- **PROJECT_STRUCTURE.md**: 프로젝트 구조 설명
- **UPLOAD_GUIDE.md**: 관리자 업로드 대시보드 사용법
- **VIEWER_GUIDE.md**: 학생용 E-Book 뷰어 사용법 (NEW!)

## 주요 개선 사항 (v2)

### E-Book 뷰어
- ✅ 3D 페이지 플립 애니메이션
- ✅ 더블클릭/핀치 줌 확대/축소
- ✅ 드래그로 이미지 이동
- ✅ PC: 양면 보기, 모바일: 단면 보기
- ✅ 터치 스와이프 지원
- ✅ 썸네일 네비게이션
- ✅ 전체화면 모드
- ✅ 키보드 단축키

### 업로드 대시보드
- ✅ 좌우 분할 레이아웃
- ✅ 학생 검색 기능
- ✅ 드래그 앤 드롭 업로드
- ✅ 이미지 순서 드래그 변경
- ✅ E-Book 미리보기
- ✅ Toast 알림
- ✅ 자동 제목 생성

## 개발 단계

- [x] Phase 1: Supabase 설정 및 관리자 페이지
- [x] Phase 2: 학생 대시보드 및 뷰어
- [x] Phase 3: 고급 E-Book 뷰어 기능
- [x] Phase 4: 관리자 UX 개선
- [ ] Phase 5: PWA 설정

## 라이선스

MIT
