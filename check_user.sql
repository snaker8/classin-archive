-- Check if Choi Hyun-chul exists in profiles or teachers
SELECT 'profile' as source, id, full_name, role FROM public.profiles WHERE full_name LIKE '%현철%';
SELECT 'teacher' as source, id, name, profile_id FROM public.teachers WHERE name LIKE '%현철%';
