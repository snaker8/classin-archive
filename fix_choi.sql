DO $$
DECLARE
    target_name TEXT := '최현철';
    user_record RECORD;
BEGIN
    -- 1. '최현철'이라는 이름의 가입자(Profile) 확인
    SELECT * INTO user_record FROM public.profiles WHERE full_name = target_name LIMIT 1;
    
    IF user_record.id IS NOT NULL THEN
        RAISE NOTICE 'Found profile for %', target_name;

        -- 2. 만약 역할이 'student'라면 'teacher'로 변경
        IF user_record.role = 'student' THEN
            UPDATE public.profiles SET role = 'teacher' WHERE id = user_record.id;
            RAISE NOTICE 'Updated role to teacher';
        END IF;
        
        -- 3. 선생님 테이블(teachers)에 연결 확인
        IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE profile_id = user_record.id) THEN
            
            -- 연결된 기록이 없으면, 이름이 같은 기존 선생님 기록이 있는지 확인
            IF EXISTS (SELECT 1 FROM public.teachers WHERE name = target_name AND profile_id IS NULL) THEN
                -- 이름이 같은 기존 기록에 연결
                UPDATE public.teachers SET profile_id = user_record.id WHERE name = target_name AND profile_id IS NULL;
                RAISE NOTICE 'Linked to existing teacher record';
            ELSE
                -- 아예 없으면 새로 생성
                INSERT INTO public.teachers (name, profile_id, center, hall)
                VALUES (user_record.full_name, user_record.id, user_record.center, user_record.hall);
                RAISE NOTICE 'Created new teacher record';
            END IF;
            
        ELSE
             RAISE NOTICE 'Teacher is already linked';
        END IF;
    ELSE
        RAISE NOTICE 'Proflle for % not found. They have not signed up yet.', target_name;
    END IF;
END $$;
