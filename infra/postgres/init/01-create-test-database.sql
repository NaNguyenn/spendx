-- The integration suite runs against its own database so a test run can never
-- truncate development data. See backend/.env.test.
CREATE DATABASE spendx_test OWNER spendx;
