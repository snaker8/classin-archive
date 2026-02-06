-- Create centers table
CREATE TABLE IF NOT EXISTS public.centers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('center', 'hall')), -- 'center' or 'hall'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (for login page)
CREATE POLICY "Enable read access for all users" ON public.centers FOR SELECT USING (true);

-- Allow write access only to admins/managers
CREATE POLICY "Enable write access for admins" ON public.centers FOR ALL USING (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'manager', 'super_manager')
  )
);

-- Add hall column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hall') THEN
        ALTER TABLE public.profiles ADD COLUMN hall TEXT;
    END IF;
END $$;

-- Insert default Centers and Halls
INSERT INTO public.centers (name, type) VALUES
('동래센터', 'center'),
('동부산센터', 'center'),
('사하센터', 'center'),
('명지센터', 'center'),
('특목관', 'hall'),
('의대관', 'hall'),
('중등관', 'hall')
ON CONFLICT DO NOTHING; -- Assuming name/type constraint or just to be safe if run multiple times, but standard insert is fine if table was just created.
