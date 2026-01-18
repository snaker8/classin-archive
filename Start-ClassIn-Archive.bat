@echo off
echo ClassIn Archive 서버를 시작합니다...
cd /d "d:\클래스인 학습자료\classin-archive"

:: 브라우저를 3초 뒤에 엽니다
timeout /t 3 >nul
start http://localhost:3000

:: 서버 실행
npm run dev
pause
