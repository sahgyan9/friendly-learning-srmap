-- =============================================================================
-- SRM Portal Student Finance Storage & Fee/Fine Alerts
--
-- Why this exists:
-- Persists fee dues and fee payment history from the SRM AP student portal
-- (Section 8 `feeduegroups.jsp` and Section 7 `studentreportresources.jsp`),
-- and enables in-app and web push notifications when new fees or fines are raised.
-- =============================================================================

-- 1. Student Fee Dues Table
CREATE TABLE IF NOT EXISTS public.student_fee_dues (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  register_number     text,
  fee_category        text NOT NULL,
  fee_head            text NOT NULL,
  due_amount          numeric(12,2) NOT NULL DEFAULT 0.00,
  collected_amount    numeric(12,2) NOT NULL DEFAULT 0.00,
  to_be_paid_amount   numeric(12,2) NOT NULL DEFAULT 0.00,
  is_fine             boolean NOT NULL DEFAULT false,
  portal_fee_due_id   text,
  portal_fee_head_id  text,
  last_synced_at      timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_fee_dues_item UNIQUE (user_id, fee_category, fee_head)
);

CREATE INDEX IF NOT EXISTS idx_student_fee_dues_user_id ON public.student_fee_dues (user_id);

ALTER TABLE public.student_fee_dues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own fee dues" ON public.student_fee_dues;
CREATE POLICY "Users can view their own fee dues"
  ON public.student_fee_dues FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage fee dues" ON public.student_fee_dues;
CREATE POLICY "Service role can manage fee dues"
  ON public.student_fee_dues FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.student_fee_dues TO authenticated, anon;
GRANT ALL ON public.student_fee_dues TO service_role;

-- 2. Student Fee Paid History Table
CREATE TABLE IF NOT EXISTS public.student_fee_paid_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  register_number     text,
  term                text NOT NULL,
  fee_type            text NOT NULL,
  due_date            text,
  amount              numeric(12,2) NOT NULL DEFAULT 0.00,
  receipt_date        text,
  payment_mode        text,
  receipt_number      text NOT NULL DEFAULT '',
  paid_amount         numeric(12,2) NOT NULL DEFAULT 0.00,
  balance_due         numeric(12,2) NOT NULL DEFAULT 0.00,
  last_synced_at      timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_fee_paid_history UNIQUE (user_id, term, fee_type, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_student_fee_paid_history_user_id ON public.student_fee_paid_history (user_id);

ALTER TABLE public.student_fee_paid_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own fee history" ON public.student_fee_paid_history;
CREATE POLICY "Users can view their own fee history"
  ON public.student_fee_paid_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage fee history" ON public.student_fee_paid_history;
CREATE POLICY "Service role can manage fee history"
  ON public.student_fee_paid_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.student_fee_paid_history TO authenticated, anon;
GRANT ALL ON public.student_fee_paid_history TO service_role;

-- 3. Extend notifications.type constraint to include 'fee_alert'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['message', 'badge', 'mention', 'system', 'alumni_prompt', 'attendance_alert', 'fee_alert']));
