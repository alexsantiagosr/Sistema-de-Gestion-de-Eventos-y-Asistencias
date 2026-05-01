-- Ejecutar este script en el editor SQL de Supabase

CREATE OR REPLACE FUNCTION auto_finish_events()
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  WITH updated AS (
    UPDATE events
    SET status = 'finished'
    WHERE status = 'active'
      AND (date + (duration * INTERVAL '1 minute')) <= NOW()
    RETURNING id
  )
  SELECT count(*) INTO updated_count FROM updated;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
