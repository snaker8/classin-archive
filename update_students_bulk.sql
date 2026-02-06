-- 1. Ensure 'center' column exists in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS center TEXT;

-- 2. Ensure 'hall' column exists in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hall TEXT;

-- 3. Reload the schema cache (optional but recommended if using API immediately)
NOTIFY pgrst, 'reload config';

-- 4. Bulk Update all Students
UPDATE public.profiles
SET 
  center = '동래센터',
  hall = '의대관'
WHERE role = 'student';
