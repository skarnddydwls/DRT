BEGIN;

INSERT INTO drt.cmm_common_code
  (common_code, common_code_name, use_yn, created_at, updated_at)
VALUES
  ('CHASSIS_NO', '운수사', 'Y', NOW(), NOW()),
  ('VEHICLE_TYPE', '차량종류', 'Y', NOW(), NOW()),
  ('VEHICLE_STATUS', '차량상태', 'Y', NOW(), NOW())
ON CONFLICT (common_code) DO NOTHING;

WITH seed AS (
  SELECT 'CHASSIS_NO' AS common_code, chassis_no AS value,
    ROW_NUMBER() OVER (ORDER BY vehicle_id) AS rn
  FROM drt.cmm_vehicle_info WHERE NULLIF(TRIM(chassis_no), '') IS NOT NULL
  UNION ALL
  SELECT 'VEHICLE_TYPE', vehicle_type, ROW_NUMBER() OVER (ORDER BY vehicle_id)
  FROM drt.cmm_vehicle_info WHERE NULLIF(TRIM(vehicle_type), '') IS NOT NULL
  UNION ALL
  SELECT 'VEHICLE_STATUS', vehicle_status, ROW_NUMBER() OVER (ORDER BY vehicle_id)
  FROM drt.cmm_vehicle_info WHERE NULLIF(TRIM(vehicle_status), '') IS NOT NULL
)
INSERT INTO drt.cmm_detail_code
  (common_code, detail_code, value_1, value_2, use_yn, created_at, updated_at)
SELECT common_code, 'CD001', value, value, 'Y', NOW(), NOW()
FROM seed S
WHERE rn = 1 AND NOT EXISTS (
  SELECT 1 FROM drt.cmm_detail_code D WHERE D.common_code = S.common_code
)
ON CONFLICT (common_code, detail_code) DO NOTHING;

COMMIT;
