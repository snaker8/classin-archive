DO $$
DECLARE
    r RECORD;
BEGIN
    -- Iterate through all users with role 'teacher'
    FOR r IN SELECT * FROM public.profiles WHERE role = 'teacher' LOOP
        
        -- 1. Check if this teacher is already linked (has a row in teachers with this profile_id)
        IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE profile_id = r.id) THEN
            
            -- 2. Not linked. Check if there is an unlinked teacher record with the same NAME
            IF EXISTS (SELECT 1 FROM public.teachers WHERE name = r.full_name AND profile_id IS NULL) THEN
                
                -- Update the existing unlinked record
                UPDATE public.teachers 
                SET profile_id = r.id,
                    center = COALESCE(teachers.center, r.center), -- Keep existing if set, else use profile's
                    hall = COALESCE(teachers.hall, r.hall)
                WHERE name = r.full_name AND profile_id IS NULL;
                
            ELSE
                -- 3. No record found at all. Create a new one.
                INSERT INTO public.teachers (name, profile_id, center, hall)
                VALUES (r.full_name, r.id, r.center, r.hall);
            END IF;
            
        END IF;
        
    END LOOP;
END $$;
