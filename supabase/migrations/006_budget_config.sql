-- User monthly budget configuration
CREATE TABLE IF NOT EXISTS user_budget_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  savings_goal NUMERIC(12,2) NOT NULL DEFAULT 0,
  investment_goal NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Per-category budget limits: { "Alimentação": 500, "Moradia": 1200, ... }
  category_budgets JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_budget_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budget config"
  ON user_budget_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON user_budget_config TO authenticated;
