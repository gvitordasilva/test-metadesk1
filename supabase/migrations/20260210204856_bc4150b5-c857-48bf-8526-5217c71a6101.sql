
-- Function to log complaint changes to audit log
CREATE OR REPLACE FUNCTION public.log_complaint_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO complaint_audit_log (complaint_id, action, field_changed, old_value, new_value, user_id, user_email)
    VALUES (NEW.id, 'status_change', 'status', OLD.status, NEW.status, auth.uid(), 
      (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;

  -- Assignment change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO complaint_audit_log (complaint_id, action, field_changed, old_value, new_value, user_id, user_email)
    VALUES (NEW.id, 'assignment', 'assigned_to', OLD.assigned_to, NEW.assigned_to, auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;

  -- Workflow change
  IF OLD.workflow_id IS DISTINCT FROM NEW.workflow_id THEN
    INSERT INTO complaint_audit_log (complaint_id, action, field_changed, old_value, new_value, user_id, user_email)
    VALUES (NEW.id, 'workflow_change', 'workflow_id', OLD.workflow_id::text, NEW.workflow_id::text, auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;

  -- Workflow step advance
  IF OLD.current_workflow_step_id IS DISTINCT FROM NEW.current_workflow_step_id THEN
    INSERT INTO complaint_audit_log (complaint_id, action, field_changed, old_value, new_value, user_id, user_email)
    VALUES (NEW.id, 'workflow_step_advance', 'current_workflow_step_id', OLD.current_workflow_step_id::text, NEW.current_workflow_step_id::text, auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;

  -- Internal notes change
  IF OLD.internal_notes IS DISTINCT FROM NEW.internal_notes THEN
    INSERT INTO complaint_audit_log (complaint_id, action, field_changed, old_value, new_value, user_id, user_email)
    VALUES (NEW.id, 'note_added', 'internal_notes', NULL, NEW.internal_notes, auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;

  -- Category change
  IF OLD.category IS DISTINCT FROM NEW.category THEN
    INSERT INTO complaint_audit_log (complaint_id, action, field_changed, old_value, new_value, user_id, user_email)
    VALUES (NEW.id, 'field_update', 'category', OLD.category, NEW.category, auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on complaints UPDATE
CREATE TRIGGER trg_complaint_audit_log
  AFTER UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.log_complaint_activity();

-- Also log new complaint creation
CREATE OR REPLACE FUNCTION public.log_complaint_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO complaint_audit_log (complaint_id, action, field_changed, old_value, new_value, user_id, user_email)
  VALUES (NEW.id, 'created', 'status', NULL, NEW.status, auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_complaint_creation_log
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.log_complaint_creation();
