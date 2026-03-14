-- Extend reports type check constraint to include 'general' and 'other'
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_type_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_type_check
  CHECK (type IN ('hazard', 'food_status', 'campus_update', 'safety', 'accessibility', 'general', 'other'));
