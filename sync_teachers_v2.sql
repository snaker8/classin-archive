DO $$
DECLARE
    r RECORD;
BEGIN
    -- [변경점] role이 'teacher' 뿐만 아니라 관리자들도 포함하여 동기화 시도
    FOR r IN SELECT * FROM public.profiles 
             WHERE role IN ('teacher', 'manager', 'super_manager', 'admin') 
    LOOP
        
        -- 1. 이미 profile_id가 연결된 선생님 기록이 있는지 확인
        IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE profile_id = r.id) THEN
            
            -- 2. 연결 안 됨. 이름이 같은 선생님 기록이 있는지 확인 (profile_id가 없는 기록 중에서)
            IF EXISTS (SELECT 1 FROM public.teachers WHERE name = r.full_name AND profile_id IS NULL) THEN
                
                -- [매칭 성공] 기존 선생님 기록에 profile_id 업데이트
                UPDATE public.teachers 
                SET profile_id = r.id,
                    center = COALESCE(teachers.center, r.center), -- 기존 값 우선
                    hall = COALESCE(teachers.hall, r.hall)
                WHERE name = r.full_name AND profile_id IS NULL;
                
            ELSE
                -- 3. 이름 같은 기록도 없음. 
                -- 'teacher' 역할인 경우에만 자동으로 새 선생님 기록 생성 (관리자는 자동으로 선생님으로 만들지 않음)
                IF r.role = 'teacher' THEN
                    INSERT INTO public.teachers (name, profile_id, center, hall)
                    VALUES (r.full_name, r.id, r.center, r.hall);
                END IF;
                
                -- 만약 관리자도 자동으로 선생님 목록에 넣고 싶다면 위 IF문을 제거하세요.
            END IF;
            
        END IF;
        
    END LOOP;
END $$;
