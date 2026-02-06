-- Replace 'your_email@example.com' with the actual email of the user you want to be Super Manager
UPDATE public.profiles
SET role = 'super_manager'
WHERE email = 'snaker@hanmail.net';
