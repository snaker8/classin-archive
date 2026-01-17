-- ============================================
-- ClassIn 학습 아카이브 플랫폼 데이터베이스 스키마
-- ============================================

-- 1. 사용자 프로필 테이블 (profiles)
-- Supabase Auth와 연동되는 사용자 추가 정보
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 수업 테이블 (classes)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  class_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 수업 자료 테이블 (materials)
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blackboard_image', 'video_link')),
  content_url TEXT NOT NULL,
  title TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 인덱스 생성
-- ============================================

CREATE INDEX idx_classes_student_id ON classes(student_id);
CREATE INDEX idx_classes_class_date ON classes(class_date);
CREATE INDEX idx_materials_class_id ON materials(class_id);
CREATE INDEX idx_materials_order ON materials(class_id, order_index);

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- profiles 테이블 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profiles: 본인 정보만 조회 가능
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- profiles: 관리자는 모든 프로필 조회 가능
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- profiles: 관리자는 프로필 생성 가능
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- profiles: 본인 또는 관리자가 업데이트 가능
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- classes 테이블 RLS 활성화
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- classes: 학생은 본인 수업만 조회
CREATE POLICY "Students can view own classes"
  ON classes FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- classes: 관리자만 생성 가능
CREATE POLICY "Admins can insert classes"
  ON classes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- classes: 관리자만 수정 가능
CREATE POLICY "Admins can update classes"
  ON classes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- classes: 관리자만 삭제 가능
CREATE POLICY "Admins can delete classes"
  ON classes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- materials 테이블 RLS 활성화
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- materials: 해당 수업의 학생 또는 관리자만 조회
CREATE POLICY "Students can view own class materials"
  ON materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = materials.class_id
      AND (classes.student_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM profiles
             WHERE id = auth.uid() AND role = 'admin'
           ))
    )
  );

-- materials: 관리자만 생성 가능
CREATE POLICY "Admins can insert materials"
  ON materials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- materials: 관리자만 수정 가능
CREATE POLICY "Admins can update materials"
  ON materials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- materials: 관리자만 삭제 가능
CREATE POLICY "Admins can delete materials"
  ON materials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 트리거 함수
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 추가
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Storage 버킷 및 정책
-- ============================================

-- 칠판 이미지 저장용 버킷 생성 (Supabase Dashboard에서 실행)
-- bucket name: 'blackboard-images'
-- public: false

-- Storage 정책은 Supabase Dashboard에서 설정:
-- 1. 관리자만 업로드 가능
-- 2. 해당 학생 또는 관리자만 다운로드 가능

-- ============================================
-- 초기 데이터 (선택사항)
-- ============================================

-- 관리자 계정 생성 후 프로필 추가 예시
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES (
--   'your-admin-user-id',
--   'admin@example.com',
--   '관리자',
--   'admin'
-- );
