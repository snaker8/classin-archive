@echo off
echo ClassIn Archive 시스템 전체를 시작합니다...
cd /d "d:\클래스인 학습자료\classin-archive"

echo 폴더 모니터링 스크립트를 백그라운드에서 실행합니다...
start "Folder Monitor" cmd /k "node dist-monitor\folder-monitor.js"

echo 영상 처리 워커(Python)를 백그라운드에서 실행합니다...
start "Video Processor" cmd /k "cd scripts\video-processing && python main.py"

:: 브라우저를 3초 뒤에 엽니다
timeout /t 3 >nul
start http://localhost:3000

:: 웹 서버 실행
echo 웹 서버(Next.js)를 시작합니다...
npm run dev
pause
