-- Add admin role for initial user (skip if user doesn't exist in this project)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '1801501f-f97f-4945-a0af-8a53ca33d36c') THEN
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = '1801501f-f97f-4945-a0af-8a53ca33d36c') THEN
      UPDATE user_roles SET role = 'admin' WHERE user_id = '1801501f-f97f-4945-a0af-8a53ca33d36c';
    ELSE
      INSERT INTO user_roles (user_id, role) VALUES ('1801501f-f97f-4945-a0af-8a53ca33d36c', 'admin');
    END IF;
  END IF;
END $$;