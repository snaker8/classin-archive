# Claude Code로 ClassIn 학습 아카이브 플랫폼 개발하기

## 🚀 Claude Code란?

Claude Code는 Anthropic에서 제공하는 명령줄 기반 AI 코딩 도구입니다. 터미널에서 직접 Claude와 대화하며 코드를 작성하고, 파일을 생성하고, 전체 프로젝트를 개발할 수 있습니다.

## 📋 사전 준비

### 1. Claude Code 설치

```bash
# npm을 사용한 설치 (권장)
npm install -g @anthropic-ai/claude-code

# 또는 공식 웹사이트에서 설치
# https://claude.ai/code
```

### 2. API 키 설정

1. https://console.anthropic.com 접속
2. API Keys 메뉴에서 새 키 생성
3. 환경 변수 설정:

```bash
# Mac/Linux
export ANTHROPIC_API_KEY=your_api_key_here

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="your_api_key_here"

# 또는 .env 파일에 저장
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

### 3. Node.js 설치 확인

```bash
node --version  # v18 이상 권장
npm --version
```

## 🎯 프로젝트 시작하기

### Step 1: 작업 디렉토리 생성

```bash
# 원하는 위치에 프로젝트 폴더 생성
mkdir classin-archive
cd classin-archive

# Claude Code 시작
claude
```

### Step 2: 프로젝트 초기화 요청

Claude Code를 실행한 후, 다음과 같이 요청하세요:

```
나: 제공된 ZIP 파일의 프로젝트를 설정하고 싶어요. 
    Next.js 14, Supabase, Tailwind CSS를 사용하는 
    ClassIn 학습 아카이브 플랫폼입니다.
    
Claude: [파일 구조 분석 후 package.json 생성 시작]
```

## 💡 Claude Code 작업 방식

### 방법 1: 제공된 프로젝트 파일 사용

```bash
# 1. ZIP 파일 압축 해제
unzip classin-archive-complete.zip
cd classin-archive

# 2. Claude Code 실행
claude

# 3. Claude에게 요청
나: 이 프로젝트의 구조를 분석하고 의존성을 설치해줘

Claude: [package.json 확인 후 npm install 실행]
```

### 방법 2: 처음부터 Claude와 함께 구축

```bash
# 빈 디렉토리에서 시작
mkdir my-classin-project
cd my-classin-project
claude

# Claude에게 단계별로 요청
나: Next.js 14 프로젝트를 생성하고, 
    Supabase 연동 설정을 해줘.
    
나: 학생용 E-Book 뷰어를 만들어줘.
    react-pageflip과 react-zoom-pan-pinch를 사용해서.
    
나: 관리자 업로드 대시보드를 만들어줘.
    드래그 앤 드롭 기능 포함.
```

## 🔧 주요 작업 명령어

### 파일 생성 및 수정

```
나: components/ui/button.tsx 파일을 생성해줘.
    Shadcn/UI 스타일로.

Claude: [파일 생성]

나: app/student/dashboard/page.tsx에서
    달력 위젯을 추가해줘.

Claude: [파일 수정]
```

### 의존성 설치

```
나: react-pageflip, react-zoom-pan-pinch, 
    react-day-picker를 설치해줘.

Claude: [package.json 수정 후 npm install 실행]
```

### 환경 설정

```
나: .env.example 파일을 만들고
    필요한 환경 변수를 알려줘.

Claude: [파일 생성 및 설명 제공]
```

### 테스트 및 실행

```
나: 개발 서버를 실행해줘.

Claude: [npm run dev 실행]

나: 빌드가 정상적으로 되는지 확인해줘.

Claude: [npm run build 실행 및 결과 확인]
```

## 📝 효과적인 프롬프트 작성법

### 1. 구체적으로 요청하기

❌ 나쁜 예:
```
"대시보드를 만들어줘"
```

✅ 좋은 예:
```
"학생용 대시보드를 만들어줘. 
- 달력 위젯으로 수업 날짜 표시
- 수업 카드를 그리드로 배치
- 검색 및 필터 기능
- 모바일 반응형
react-day-picker를 사용해서 구현해줘."
```

### 2. 단계별로 진행하기

```
Step 1: 기본 구조 설정
나: Next.js 프로젝트를 생성하고 Tailwind CSS를 설정해줘.

Step 2: Supabase 연동
나: Supabase 클라이언트를 설정하고 인증 기능을 구현해줘.

Step 3: UI 컴포넌트
나: Shadcn/UI의 Button, Card, Input 컴포넌트를 추가해줘.

Step 4: 페이지 개발
나: 학생 대시보드 페이지를 만들어줘.
```

### 3. 기존 코드 참조하기

```
나: app/admin/classes/new/page.tsx를 참고해서
    app/student/dashboard/page.tsx를 만들어줘.
    비슷한 스타일로 하되, 학생용으로 수정해줘.
```

### 4. 문제 해결 요청하기

```
나: npm install 할 때 오류가 나. 
    오류 메시지: [오류 내용 붙여넣기]
    어떻게 해결하지?

Claude: [문제 진단 및 해결 방법 제시]
```

## 🎨 주요 기능 개발 순서

### Phase 1: 기본 설정 (30분)

```bash
claude

나: Next.js 14 프로젝트를 App Router로 생성해줘.
나: Tailwind CSS를 설정해줘.
나: .gitignore와 기본 설정 파일들을 만들어줘.
```

### Phase 2: Supabase 연동 (30분)

```bash
나: Supabase 클라이언트 설정 파일을 만들어줘.
나: 데이터베이스 스키마 SQL 파일을 작성해줘.
    - profiles 테이블 (학생/관리자)
    - classes 테이블 (수업)
    - materials 테이블 (자료)
나: 환경 변수 설정 방법을 알려줘.
```

### Phase 3: UI 컴포넌트 (1시간)

```bash
나: Shadcn/UI의 다음 컴포넌트들을 설치해줘:
    Button, Card, Input, Calendar, Dialog, Toast
    
나: 각 컴포넌트를 components/ui/ 폴더에 생성해줘.
```

### Phase 4: 로그인 페이지 (30분)

```bash
나: app/login/page.tsx를 만들어줘.
    이메일/비밀번호 로그인 폼.
    Supabase Auth 사용.
```

### Phase 5: 관리자 대시보드 (2시간)

```bash
나: 관리자 레이아웃을 만들어줘.
    헤더에 로고와 로그아웃 버튼.
    
나: 관리자 대시보드를 만들어줘.
    학생 목록, 수업 통계 표시.
    
나: 수업 업로드 페이지를 만들어줘.
    - 좌측: 학생 선택 사이드바
    - 우측: 업로드 폼
    - 드래그 앤 드롭 (react-dropzone)
    - 이미지 순서 변경 (@dnd-kit)
```

### Phase 6: 학생 대시보드 (2시간)

```bash
나: 학생 레이아웃을 만들어줘.
    
나: 학생 대시보드를 만들어줘.
    - 웰컴 배너
    - 달력 위젯 (react-day-picker)
    - 검색 바
    - 수업 카드 그리드
```

### Phase 7: E-Book 뷰어 (3시간)

```bash
나: E-Book 뷰어 페이지를 만들어줘.
    - 3D 플립 효과 (react-pageflip)
    - 확대/축소 (react-zoom-pan-pinch)
    - 페이지 네비게이션
    - 썸네일 바
    - 모바일 반응형
```

### Phase 8: 테스트 및 배포 (1시간)

```bash
나: 빌드 오류를 확인하고 수정해줘.
나: Vercel 배포 설정을 알려줘.
나: README.md를 작성해줘.
```

## 🐛 일반적인 문제 해결

### 문제 1: TypeScript 오류

```
나: TypeScript 타입 오류가 나. 
    Property 'id' does not exist on type 'Class'
    
Claude: [타입 정의 수정 또는 추가]
```

### 문제 2: 빌드 오류

```
나: npm run build 할 때 오류가 나.
    Module not found: Can't resolve 'react-pageflip'
    
Claude: [의존성 확인 및 재설치]
```

### 문제 3: Supabase 연결 오류

```
나: Supabase에 연결이 안 돼.
    환경 변수가 제대로 설정되었는지 확인해줘.
    
Claude: [.env.local 파일 확인 및 수정]
```

### 문제 4: 스타일 문제

```
나: 모바일에서 레이아웃이 깨져.
    반응형을 수정해줘.
    
Claude: [Tailwind 반응형 클래스 추가]
```

## 💼 실전 예시: 전체 대화 흐름

```bash
$ claude

Claude: 안녕하세요! 무엇을 도와드릴까요?

나: ClassIn 학습 아카이브 플랫폼을 만들고 싶어.
    Next.js 14, Supabase, Tailwind CSS를 사용할 거야.
    먼저 프로젝트 구조를 잡아줘.

Claude: 알겠습니다. 프로젝트를 초기화하겠습니다.
        [package.json, tsconfig.json, tailwind.config.ts 등 생성]

나: 좋아. 이제 Supabase 연동을 설정해줘.
    lib/supabase/client.ts 파일을 만들어줘.

Claude: [Supabase 클라이언트 파일 생성]

나: 데이터베이스 스키마를 작성해줘.
    students, classes, materials 테이블이 필요해.

Claude: [supabase/schema.sql 생성]

나: 로그인 페이지를 만들어줘.

Claude: [app/login/page.tsx 생성]

나: 학생 대시보드를 만들어줘.
    달력 위젯과 수업 카드가 필요해.

Claude: [app/student/dashboard/page.tsx 생성]

나: 개발 서버를 실행해서 확인해줘.

Claude: [npm run dev 실행 및 결과 확인]

나: 완벽해! 이제 E-Book 뷰어를 만들어줘.

Claude: [app/student/viewer/[id]/page.tsx 생성]

나: 모든 기능이 작동하는지 테스트해줘.

Claude: [테스트 실행 및 결과 리포트]

나: 배포 준비를 해줘. Vercel에 배포하려고 해.

Claude: [vercel.json 생성 및 배포 가이드 제공]
```

## 📚 추가 리소스

### Claude Code 공식 문서
- https://docs.anthropic.com/claude/docs/claude-code

### 도움이 되는 프롬프트 예시
```
"이 파일의 버그를 찾아줘"
"이 코드를 최적화해줘"
"이 기능을 테스트하는 코드를 작성해줘"
"이 컴포넌트에 주석을 추가해줘"
"이 API의 오류 처리를 개선해줘"
```

### 유용한 팁
1. **세션 저장**: Claude Code는 대화 내역을 저장하므로 언제든 이전 작업을 이어갈 수 있습니다
2. **파일 컨텍스트**: Claude는 현재 디렉토리의 모든 파일을 인식합니다
3. **멀티태스킹**: 여러 파일을 동시에 수정 요청 가능
4. **리팩토링**: 기존 코드 개선을 자주 요청하세요

## 🎯 다음 단계

1. **Claude Code 설치 및 API 키 설정**
2. **제공된 프로젝트 파일 압축 해제**
3. **Claude Code 실행**
4. **단계별로 프로젝트 구축 또는 기존 코드 분석**
5. **테스트 및 배포**

---

**행운을 빕니다! Claude Code와 함께라면 빠르고 정확하게 개발할 수 있습니다! 🚀**

> 💡 **Pro Tip**: Claude Code는 학습 도구이기도 합니다. 
> "왜 이렇게 했어?"라고 물어보면 코드의 원리를 자세히 설명해줍니다!
