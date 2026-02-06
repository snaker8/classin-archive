-- Add center and hall columns to teachers table
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS center TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS hall TEXT;

-- Verify columns on profiles as well (just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hall') THEN
        ALTER TABLE public.profiles ADD COLUMN hall TEXT;
    END IF;
END $$;
