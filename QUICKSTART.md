# ClassIn 학습 아카이브 - 빠른 시작 가이드 🚀

## ⚡ 5분 안에 시작하기

### 1단계: 프로젝트 설정 (1분)

```bash
# 프로젝트 폴더로 이동
cd classin-archive

# 의존성 설치
npm install
```

### 2단계: Supabase 설정 (2분)

1. **Supabase 계정 생성 및 프로젝트 생성**
   - https://supabase.com 접속
   - "Start your project" 클릭
   - 프로젝트 이름 입력, 비밀번호 설정
   - 리전 선택 (Seoul 권장)

2. **데이터베이스 스키마 생성**
   - Supabase 대시보드 → SQL Editor
   - `supabase/schema.sql` 파일 내용 복사 → 붙여넣기
   - "Run" 클릭

3. **Storage 버킷 생성**
   - Supabase 대시보드 → Storage
   - "Create bucket" 클릭
   - 이름: `blackboard-images`
   - Public: **체크 해제**
   - "Create" 클릭

4. **환경 변수 설정**
   ```bash
   # .env.local 파일 생성
   cp .env.example .env.local
   ```
   
   Supabase 대시보드 → Settings → API에서:
   - Project URL 복사 → .env.local의 NEXT_PUBLIC_SUPABASE_URL에 붙여넣기
   - anon public key 복사 → .env.local의 NEXT_PUBLIC_SUPABASE_ANON_KEY에 붙여넣기

### 3단계: 개발 서버 실행 (1분)

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속!

### 4단계: 관리자 계정 생성 (1분)

1. **Supabase에서 사용자 생성**
   - Supabase 대시보드 → Authentication → Users
   - "Add user" → "Create new user"
   - 이메일: `admin@example.com`
   - 비밀번호: 원하는 비밀번호
   - "Create user" 클릭

2. **사용자 ID 복사**
   - 생성된 사용자 클릭
   - UUID 복사 (예: abc123-def456-...)

3. **관리자 프로필 생성**
   - Supabase → SQL Editor
   - 다음 SQL 실행 (UUID 부분을 복사한 ID로 변경):
   
   ```sql
   INSERT INTO profiles (id, email, full_name, role)
   VALUES (
     'your-user-uuid-here',  -- 여기에 복사한 UUID 붙여넣기
     'admin@example.com',
     '관리자',
     'admin'
   );
   ```

### 완료! 🎉

이제 http://localhost:3000/login에서 관리자 계정으로 로그인하세요!

---

## 📋 다음 단계

### 학생 추가하기
1. 관리자 대시보드 → "학생 추가" 버튼
2. 학생 정보 입력 (이름, 이메일, 비밀번호)
3. "학생 추가" 클릭

### 수업 업로드하기
1. "수업 업로드" 버튼 클릭
2. 학생 선택
3. 수업 정보 입력
4. ClassIn 칠판 이미지 업로드
5. (선택) 영상 링크 추가
6. "업로드" 클릭

### 학생으로 로그인하기
1. 로그아웃
2. 학생 계정으로 로그인
3. 본인의 수업 자료 확인!

---

## 🆘 문제 해결

### "Cannot connect to database" 에러
→ `.env.local` 파일의 Supabase URL과 키를 확인하세요

### 이미지가 업로드되지 않음
→ Storage 버킷 이름이 정확히 `blackboard-images`인지 확인하세요

### 로그인이 안 됨
→ Supabase Authentication에 사용자가 생성되었는지 확인하세요

---

## 📚 자세한 문서

- **SETUP_GUIDE.md**: 전체 설정 가이드
- **PROJECT_STRUCTURE.md**: 프로젝트 구조 및 기술 스택
- **README.md**: 프로젝트 개요

---

## 💡 팁

1. **개발 중**: 
   - 브라우저 개발자 도구(F12)를 열어두면 에러를 쉽게 확인할 수 있습니다
   - Supabase 대시보드의 Logs 메뉴에서 데이터베이스 쿼리를 확인할 수 있습니다

2. **프로덕션 배포**:
   - Vercel에 배포하는 것이 가장 쉽습니다
   - `vercel` 명령어 한 번이면 끝!

3. **PWA 모바일 앱**:
   - 모바일 브라우저에서 "홈 화면에 추가"하면 앱처럼 사용 가능합니다

---

즐거운 개발 되세요! 🚀
