-- Drop the existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint including 'super_manager'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'teacher', 'manager', 'admin', 'super_manager'));

-- Now retry setting the super manager
UPDATE public.profiles
SET role = 'super_manager'
WHERE email = 'snaker@hanmail.net';
