-- Ensure Admins, Managers, and Super Managers can view ALL profiles
-- (Drop existing policy if it conflicts or is too narrow)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('admin', 'manager', 'super_manager')
  )
);

-- Also ensure they can UPDATE profiles (for promotion)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('admin', 'manager', 'super_manager')
  )
);
