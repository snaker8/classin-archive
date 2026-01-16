# ClassIn 학습 아카이브 플랫폼 - 설정 가이드

## 1. 사전 준비사항

### 필요한 도구
- Node.js 18.x 이상
- npm 또는 yarn
- Supabase 계정 (https://supabase.com)

## 2. Supabase 프로젝트 설정

### 2.1 프로젝트 생성
1. Supabase (https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. 리전 선택 (Seoul 권장)

### 2.2 데이터베이스 스키마 생성
1. Supabase 대시보드에서 "SQL Editor" 메뉴로 이동
2. `supabase/schema.sql` 파일의 내용을 복사하여 붙여넣기
3. "Run" 버튼 클릭하여 실행

### 2.3 Storage 버킷 생성
1. Supabase 대시보드에서 "Storage" 메뉴로 이동
2. "Create a new bucket" 클릭
3. 버킷 이름: `blackboard-images`
4. Public bucket: **체크 해제** (private으로 설정)
5. "Create bucket" 클릭

### 2.4 Storage 정책 설정
버킷 생성 후 "Policies" 탭에서 다음 정책들을 추가:

#### 업로드 정책 (관리자만)
```sql
CREATE POLICY "Admins can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blackboard-images' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

#### 다운로드 정책 (해당 학생 또는 관리자)
```sql
CREATE POLICY "Students can view own class images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'blackboard-images' AND
  (
    -- 관리자는 모든 이미지 접근 가능
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- 학생은 본인 수업 이미지만 접근 가능
    EXISTS (
      SELECT 1 FROM classes
      WHERE student_id = auth.uid()
      AND (storage.foldername(name))[1] = classes.id::text
    )
  )
);
```

### 2.5 환경 변수 설정
1. Supabase 대시보드에서 "Settings" > "API" 메뉴로 이동
2. 다음 정보를 복사:
   - Project URL
   - anon public key

## 3. 로컬 개발 환경 설정

### 3.1 프로젝트 클론 및 설치
```bash
cd classin-archive
npm install
```

### 3.2 환경 변수 파일 생성
`.env.local` 파일을 생성하고 다음 내용을 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3.3 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 4. 초기 관리자 계정 생성

### 4.1 Supabase Auth에서 사용자 생성
1. Supabase 대시보드에서 "Authentication" > "Users" 메뉴로 이동
2. "Add user" > "Create new user" 클릭
3. 이메일과 비밀번호 입력
4. "Create user" 클릭

### 4.2 사용자 ID 복사
생성된 사용자의 UUID를 복사

### 4.3 관리자 프로필 생성
1. "SQL Editor"로 이동
2. 다음 SQL 실행 (UUID를 실제 사용자 ID로 변경):

```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'your-user-uuid-here',
  'admin@example.com',
  '관리자',
  'admin'
);
```

## 5. 사용 방법

### 5.1 관리자 로그인
1. http://localhost:3000/login 접속
2. 관리자 이메일과 비밀번호로 로그인
3. 자동으로 관리자 대시보드로 이동

### 5.2 학생 계정 생성
1. 관리자 대시보드에서 "학생 추가" 버튼 클릭
2. 학생 정보 입력 (이름, 이메일, 비밀번호)
3. "학생 추가" 버튼으로 계정 생성

### 5.3 수업 자료 업로드
1. "수업 업로드" 버튼 클릭
2. 학생 선택
3. 수업 정보 입력 (제목, 설명, 날짜)
4. ClassIn 칠판 이미지 업로드 (여러 개 가능)
5. 수업 영상 링크 추가 (선택사항)
6. "업로드" 버튼 클릭

### 5.4 학생으로 로그인하여 확인
1. 로그아웃
2. 학생 계정으로 로그인
3. 대시보드에서 본인의 수업 목록 확인
4. 수업 카드 클릭하여 E-Book 뷰어로 자료 복습

## 6. PWA 모바일 앱 설치 (Phase 3)

### 6.1 아이콘 파일 생성
`public` 폴더에 다음 아이콘 파일들을 추가:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

### 6.2 Service Worker 추가 (선택사항)
완전한 오프라인 지원을 위해 service worker를 추가할 수 있습니다.

### 6.3 모바일 기기에서 설치
1. 모바일 브라우저(Chrome, Safari)에서 사이트 접속
2. 브라우저 메뉴에서 "홈 화면에 추가" 선택
3. 앱처럼 사용 가능

## 7. 프로덕션 배포

### 7.1 Vercel 배포 (권장)
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel
```

### 7.2 환경 변수 설정
Vercel 대시보드에서 환경 변수 설정:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 8. 문제 해결

### 이미지가 표시되지 않는 경우
1. Storage 버킷이 올바르게 생성되었는지 확인
2. Storage 정책이 올바르게 설정되었는지 확인
3. 이미지 URL이 공개 URL인지 확인

### 로그인이 안 되는 경우
1. Supabase Auth 설정 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 권한 오류가 발생하는 경우
1. RLS 정책이 올바르게 설정되었는지 확인
2. 사용자의 role이 올바르게 설정되었는지 확인

## 9. 추가 개선 사항

### 9.1 이메일 인증
Supabase의 이메일 인증 기능을 활성화하여 사용자 등록 시 이메일 확인

### 9.2 비밀번호 재설정
비밀번호 재설정 기능 추가

### 9.3 알림 기능
새 수업이 업로드되면 학생에게 알림 전송

### 9.4 검색 기능
수업 제목이나 날짜로 검색 기능 추가

### 9.5 통계 대시보드
학생별 복습 현황, 수업 진도율 등 통계 표시

## 10. 지원

문제가 발생하거나 질문이 있으면:
- Supabase 문서: https://supabase.com/docs
- Next.js 문서: https://nextjs.org/docs
