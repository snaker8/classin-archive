-- Add profile_id to teachers table to link with Auth users
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Optional: Add constraint to ensure one teacher record per profile? 
-- ALTER TABLE public.teachers ADD CONSTRAINT unique_teacher_profile UNIQUE (profile_id);

-- Policy to allow teachers to view their own record?
-- existing policies might be loose, but let's ensure:
CREATE POLICY "Enable read access for own teacher profile" ON public.teachers FOR SELECT USING (
  profile_id = auth.uid()
);
