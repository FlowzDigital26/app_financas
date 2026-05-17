-- Flowz Habitz: hábitos e registros diários

CREATE TABLE IF NOT EXISTS habitos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome             TEXT NOT NULL,
  icone            TEXT DEFAULT '⭐',
  cor              TEXT DEFAULT '#2ECC9A',
  descricao        TEXT,
  data_inicio      DATE NOT NULL DEFAULT CURRENT_DATE,
  frequencia       TEXT NOT NULL DEFAULT 'diaria',
  dias_semana      TEXT[] DEFAULT '{}',
  intervalo_dias   INTEGER DEFAULT 1,
  vezes_por_dia    INTEGER DEFAULT 1,
  periodo          TEXT DEFAULT 'manha',
  horario          TIME,
  streak_atual     INTEGER DEFAULT 0,
  streak_maximo    INTEGER DEFAULT 0,
  ativo            BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habito_registros (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habito_id           UUID REFERENCES habitos(id) ON DELETE CASCADE NOT NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data                DATE NOT NULL DEFAULT CURRENT_DATE,
  concluido           BOOLEAN DEFAULT false,
  vezes_concluido     INTEGER DEFAULT 0,
  horario_conclusao   TIMESTAMPTZ,
  nota                TEXT,
  humor               INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habito_id, data)
);

ALTER TABLE habitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE habito_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own habitos"
  ON habitos FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own registros"
  ON habito_registros FOR ALL USING (auth.uid() = user_id);
