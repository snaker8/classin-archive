-- Create teacher_board_master table to track all unique teacher board uploads
CREATE TABLE IF NOT EXISTS public.teacher_board_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_url TEXT NOT NULL UNIQUE,
    class_date DATE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.teacher_board_master ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Enable read access for all authenticated users" 
ON public.teacher_board_master FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all access for admins/managers
CREATE POLICY "Enable all access for admins" 
ON public.teacher_board_master FOR ALL 
USING (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager', 'super_manager')
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_teacher_board_master_date ON public.teacher_board_master(class_date);
CREATE INDEX IF NOT EXISTS idx_teacher_board_master_url ON public.teacher_board_master(content_url);
