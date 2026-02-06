-- Check if the user exists in auth.users by phone or email
-- NOTE: We are checking for '01053656324' and variations.

SELECT 
    id, 
    email, 
    phone, 
    role, 
    created_at, 
    last_sign_in_at,
    banned_until
FROM auth.users 
WHERE phone LIKE '%53656324%' 
   OR email LIKE '%choi%';

-- Also check profile to match
SELECT * FROM public.profiles WHERE full_name = '최현철';
