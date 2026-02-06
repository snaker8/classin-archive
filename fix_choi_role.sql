-- 최현철 선생님의 역할을 'student' -> 'teacher'로 강제 변경
UPDATE public.profiles 
SET role = 'teacher' 
WHERE full_name = '최현철' AND role = 'student';

-- 확인용 출력
SELECT full_name, role FROM public.profiles WHERE full_name = '최현철';
