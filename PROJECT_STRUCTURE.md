# ClassIn 학습 아카이브 - 프로젝트 구조

## 📁 디렉토리 구조

```
classin-archive/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 라우트
│   │   └── login/
│   │       └── page.tsx          # 로그인 페이지
│   │
│   ├── student/                  # 학생용 라우트
│   │   ├── layout.tsx            # 학생 레이아웃 (헤더, 인증 체크)
│   │   ├── dashboard/
│   │   │   └── page.tsx          # 학생 대시보드 (수업 목록)
│   │   └── viewer/
│   │       └── [id]/
│   │           └── page.tsx      # E-Book 뷰어 (수업 자료 보기)
│   │
│   ├── admin/                    # 관리자용 라우트
│   │   ├── layout.tsx            # 관리자 레이아웃
│   │   ├── dashboard/
│   │   │   └── page.tsx          # 관리자 대시보드
│   │   ├── classes/
│   │   │   └── new/
│   │   │       └── page.tsx      # 수업 업로드 페이지
│   │   └── students/
│   │       └── new/
│   │           └── page.tsx      # 학생 추가 페이지
│   │
│   ├── globals.css               # 전역 스타일
│   ├── layout.tsx                # 루트 레이아웃
│   └── page.tsx                  # 홈페이지 (리다이렉트)
│
├── components/                   # 재사용 가능한 컴포넌트
│   └── ui/                       # Shadcn/UI 컴포넌트
│       ├── button.tsx
│       ├── input.tsx
│       └── card.tsx
│
├── lib/                          # 유틸리티 및 설정
│   ├── supabase/
│   │   └── client.ts             # Supabase 클라이언트 및 헬퍼 함수
│   └── utils.ts                  # 공통 유틸리티 함수
│
├── supabase/                     # Supabase 관련 파일
│   └── schema.sql                # 데이터베이스 스키마
│
├── public/                       # 정적 파일
│   └── manifest.json             # PWA 매니페스트
│
├── .env.example                  # 환경 변수 예시
├── .gitignore
├── next.config.js                # Next.js 설정
├── package.json
├── postcss.config.js
├── tailwind.config.ts            # Tailwind CSS 설정
├── tsconfig.json                 # TypeScript 설정
├── README.md                     # 프로젝트 개요
└── SETUP_GUIDE.md               # 설정 가이드

```

## 🎯 주요 파일 설명

### 인증 & 라우팅

#### `app/page.tsx`
- 홈페이지, 자동으로 로그인 상태 확인
- 학생은 `/student/dashboard`로, 관리자는 `/admin/dashboard`로 리다이렉트

#### `app/login/page.tsx`
- 로그인 페이지
- 이메일/비밀번호 인증
- 로그인 성공 시 역할에 따라 리다이렉트

### 학생용 페이지

#### `app/student/layout.tsx`
- 학생용 공통 레이아웃
- 헤더 (로고, 사용자 이름, 로그아웃)
- 인증 체크 및 권한 확인

#### `app/student/dashboard/page.tsx`
- 학생 대시보드
- 본인의 수업 목록을 카드 형태로 표시
- 각 수업의 자료 개수, 영상 개수 표시
- 수업 클릭 시 뷰어로 이동

#### `app/student/viewer/[id]/page.tsx`
- E-Book 스타일 뷰어
- 주요 기능:
  - 칠판 이미지 좌우 넘기기 (키보드 화살표 지원)
  - 확대/축소 (Zoom In/Out)
  - 수업 영상 바로가기 버튼
  - 페이지 네비게이션
  - 풀스크린 뷰

### 관리자용 페이지

#### `app/admin/layout.tsx`
- 관리자용 공통 레이아웃
- 관리자 권한 체크

#### `app/admin/dashboard/page.tsx`
- 관리자 대시보드
- 통계 카드 (학생 수, 수업 수, 자료 수)
- 최근 수업 목록
- 학생 목록 및 빠른 수업 추가

#### `app/admin/classes/new/page.tsx`
- 수업 업로드 페이지
- 기능:
  - 학생 선택
  - 수업 정보 입력 (제목, 설명, 날짜)
  - 칠판 이미지 다중 업로드
  - 이미지 순서 조정 (드래그 또는 버튼)
  - 영상 링크 추가
  - Supabase Storage에 이미지 업로드

#### `app/admin/students/new/page.tsx`
- 학생 계정 생성 페이지
- Supabase Auth로 사용자 생성
- Profile 테이블에 학생 정보 저장

### 공통 컴포넌트

#### `components/ui/`
- Shadcn/UI 기반 재사용 가능한 컴포넌트
- Button, Input, Card 등

### 유틸리티

#### `lib/supabase/client.ts`
- Supabase 클라이언트 초기화
- 타입 정의 (Profile, Class, Material)
- 헬퍼 함수:
  - `getCurrentUser()`: 현재 로그인 사용자
  - `getCurrentProfile()`: 현재 사용자 프로필
  - `signIn()`: 로그인
  - `signOut()`: 로그아웃
  - `isAdmin()`: 관리자 권한 체크

#### `lib/utils.ts`
- `cn()`: Tailwind CSS 클래스 병합
- `formatDate()`: 날짜 포맷팅
- `formatDateTime()`: 날짜/시간 포맷팅

### 데이터베이스

#### `supabase/schema.sql`
- 전체 데이터베이스 스키마
- 테이블:
  - `profiles`: 사용자 프로필
  - `classes`: 수업 정보
  - `materials`: 수업 자료
- RLS (Row Level Security) 정책
- 인덱스 및 트리거

## 🔐 보안 및 권한

### Row Level Security (RLS)

모든 테이블에 RLS가 적용되어 있습니다:

1. **Profiles**
   - 사용자는 본인 프로필만 조회 가능
   - 관리자는 모든 프로필 조회 가능
   - 관리자만 새 프로필 생성 가능

2. **Classes**
   - 학생은 본인 수업만 조회 가능
   - 관리자는 모든 수업 조회/생성/수정/삭제 가능

3. **Materials**
   - 해당 수업의 학생만 자료 조회 가능
   - 관리자는 모든 자료 관리 가능

### Storage 정책

- 관리자만 이미지 업로드 가능
- 학생은 본인 수업의 이미지만 다운로드 가능

## 🎨 UI/UX 특징

### 반응형 디자인
- 모바일, 태블릿, 데스크톱 모두 지원
- Tailwind CSS의 반응형 유틸리티 사용

### E-Book 뷰어
- 직관적인 좌우 넘기기
- 확대/축소 기능
- 키보드 단축키 지원
- 페이지 인디케이터
- 풀스크린 모드

### 관리자 인터페이스
- 드래그 앤 드롭 이미지 업로드
- 이미지 순서 조정
- 실시간 프리뷰

## 🚀 개발 단계별 가이드

### Phase 1: Supabase 설정 및 관리자 페이지 ✅
- [x] 데이터베이스 스키마 설계
- [x] Supabase 클라이언트 설정
- [x] 관리자 인증 및 레이아웃
- [x] 학생 추가 기능
- [x] 수업 업로드 기능

### Phase 2: 학생 대시보드 및 뷰어 ✅
- [x] 학생 인증 및 레이아웃
- [x] 수업 목록 대시보드
- [x] E-Book 스타일 뷰어
- [x] 이미지 확대/축소
- [x] 영상 링크 통합

### Phase 3: PWA 설정 (다음 단계)
- [ ] PWA manifest 설정
- [ ] Service Worker 추가
- [ ] 오프라인 지원
- [ ] 앱 아이콘 생성
- [ ] 설치 프롬프트

## 📝 다음 개선 사항

1. **검색 및 필터링**
   - 수업 제목, 날짜로 검색
   - 날짜 범위 필터

2. **알림 시스템**
   - 새 수업 업로드 시 알림
   - 이메일 알림

3. **통계 및 분석**
   - 학생별 복습 현황
   - 수업 진도율

4. **PDF 내보내기**
   - 수업 자료를 PDF로 내보내기
   - 인쇄용 레이아웃

5. **다국어 지원**
   - 영어, 한국어 등

6. **댓글 기능**
   - 수업별 질문/답변

## 🛠️ 기술 스택 상세

### Frontend
- **Next.js 14**: React 프레임워크, App Router 사용
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 유틸리티 우선 CSS
- **Shadcn/UI**: 재사용 가능한 컴포넌트 라이브러리
- **Lucide React**: 아이콘

### Backend
- **Supabase**: 
  - PostgreSQL 데이터베이스
  - 인증 (Auth)
  - 파일 저장소 (Storage)
  - Row Level Security
  - Realtime (선택적)

### 배포
- **Vercel**: Next.js 최적화 호스팅
- **Supabase Cloud**: 관리형 백엔드
