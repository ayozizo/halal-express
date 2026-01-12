-- Switch currency defaults to USD and migrate existing rows

ALTER TABLE "Invoice" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'USD';

UPDATE "Invoice" SET "currency" = 'USD' WHERE "currency" IS NULL OR UPPER("currency") = 'SAR';
UPDATE "Payment" SET "currency" = 'USD' WHERE "currency" IS NULL OR UPPER("currency") = 'SAR';
