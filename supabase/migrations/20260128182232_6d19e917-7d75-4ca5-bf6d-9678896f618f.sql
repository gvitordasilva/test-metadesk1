-- Add unique constraint on user_id if not exists, then insert admin user
DO $$
BEGIN
  -- Check if user already has a role
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = '1801501f-f97f-4945-a0af-8a53ca33d36c') THEN
    UPDATE user_roles SET role = 'admin' WHERE user_id = '1801501f-f97f-4945-a0af-8a53ca33d36c';
  ELSE
    INSERT INTO user_roles (user_id, role) VALUES ('1801501f-f97f-4945-a0af-8a53ca33d36c', 'admin');
  END IF;
END $$;