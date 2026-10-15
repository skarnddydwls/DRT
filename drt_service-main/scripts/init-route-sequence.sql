BEGIN;
LOCK TABLE drt.cmm_route_info IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE next_id BIGINT;
BEGIN
  IF to_regclass('drt.seq_route_id') IS NULL THEN
    SELECT COALESCE(MAX(SUBSTRING(route_id FROM 3)::BIGINT), 0) + 1
      INTO next_id FROM drt.cmm_route_info WHERE route_id ~ '^RT[0-9]{8}$';
    EXECUTE format('CREATE SEQUENCE drt.seq_route_id MINVALUE 1 MAXVALUE 99999999 START WITH %s', next_id);
  END IF;
END $$;
COMMIT;
