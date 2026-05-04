/*
  # Ajout des paramètres de configuration IA

  1. Nouvelles Colonnes
    - `ai_provider` - Fournisseur d'IA sélectionné (openai, anthropic, google, mistral, etc.)
    - Configuration pour chaque fournisseur (clés API, modèles)
    - Paramètres généraux de l'IA (température, max tokens, activation)

  2. Modifications
    - Ajout des colonnes à la table `system_parameters` si elle existe
    - Sinon création de la table avec tous les paramètres

  3. Sécurité
    - Les clés API sont stockées de manière sécurisée
    - Accès restreint aux administrateurs uniquement
*/

-- Créer la table system_parameters si elle n'existe pas
CREATE TABLE IF NOT EXISTS system_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- General
  site_name text DEFAULT 'Woluma-Flow',
  site_description text DEFAULT 'Plateforme d''Évaluation et de Financement de Projets',
  admin_email text DEFAULT 'admin@woluma.com',
  default_language text DEFAULT 'fr',
  timezone text DEFAULT 'UTC',

  -- AI Configuration
  ai_provider text DEFAULT 'openai',

  -- OpenAI
  openai_api_key text DEFAULT '',
  openai_model text DEFAULT 'gpt-4',
  openai_org_id text DEFAULT '',

  -- Anthropic
  anthropic_api_key text DEFAULT '',
  anthropic_model text DEFAULT 'claude-3-opus-20240229',

  -- Google
  google_api_key text DEFAULT '',
  google_model text DEFAULT 'gemini-pro',

  -- Mistral
  mistral_api_key text DEFAULT '',
  mistral_model text DEFAULT 'mistral-large-latest',

  -- Cohere
  cohere_api_key text DEFAULT '',
  cohere_model text DEFAULT 'command',

  -- Hugging Face
  huggingface_api_key text DEFAULT '',
  huggingface_model text DEFAULT '',

  -- Custom API
  custom_api_url text DEFAULT '',
  custom_api_key text DEFAULT '',
  custom_api_headers text DEFAULT '',

  -- AI General Settings
  ai_temperature numeric(3,2) DEFAULT 0.7,
  ai_max_tokens integer DEFAULT 2000,
  enable_ai_evaluation boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Si la table existe déjà, ajouter les colonnes manquantes
DO $$
BEGIN
  -- AI Configuration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'ai_provider') THEN
    ALTER TABLE system_parameters ADD COLUMN ai_provider text DEFAULT 'openai';
  END IF;

  -- OpenAI
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'openai_api_key') THEN
    ALTER TABLE system_parameters ADD COLUMN openai_api_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'openai_model') THEN
    ALTER TABLE system_parameters ADD COLUMN openai_model text DEFAULT 'gpt-4';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'openai_org_id') THEN
    ALTER TABLE system_parameters ADD COLUMN openai_org_id text DEFAULT '';
  END IF;

  -- Anthropic
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'anthropic_api_key') THEN
    ALTER TABLE system_parameters ADD COLUMN anthropic_api_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'anthropic_model') THEN
    ALTER TABLE system_parameters ADD COLUMN anthropic_model text DEFAULT 'claude-3-opus-20240229';
  END IF;

  -- Google
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'google_api_key') THEN
    ALTER TABLE system_parameters ADD COLUMN google_api_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'google_model') THEN
    ALTER TABLE system_parameters ADD COLUMN google_model text DEFAULT 'gemini-pro';
  END IF;

  -- Mistral
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'mistral_api_key') THEN
    ALTER TABLE system_parameters ADD COLUMN mistral_api_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'mistral_model') THEN
    ALTER TABLE system_parameters ADD COLUMN mistral_model text DEFAULT 'mistral-large-latest';
  END IF;

  -- Cohere
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'cohere_api_key') THEN
    ALTER TABLE system_parameters ADD COLUMN cohere_api_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'cohere_model') THEN
    ALTER TABLE system_parameters ADD COLUMN cohere_model text DEFAULT 'command';
  END IF;

  -- Hugging Face
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'huggingface_api_key') THEN
    ALTER TABLE system_parameters ADD COLUMN huggingface_api_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'huggingface_model') THEN
    ALTER TABLE system_parameters ADD COLUMN huggingface_model text DEFAULT '';
  END IF;

  -- Custom API
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'custom_api_url') THEN
    ALTER TABLE system_parameters ADD COLUMN custom_api_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'custom_api_key') THEN
    ALTER TABLE system_parameters ADD COLUMN custom_api_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'custom_api_headers') THEN
    ALTER TABLE system_parameters ADD COLUMN custom_api_headers text DEFAULT '';
  END IF;

  -- AI General Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'ai_temperature') THEN
    ALTER TABLE system_parameters ADD COLUMN ai_temperature numeric(3,2) DEFAULT 0.7;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'ai_max_tokens') THEN
    ALTER TABLE system_parameters ADD COLUMN ai_max_tokens integer DEFAULT 2000;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_parameters' AND column_name = 'enable_ai_evaluation') THEN
    ALTER TABLE system_parameters ADD COLUMN enable_ai_evaluation boolean DEFAULT false;
  END IF;
END $$;

-- Activer RLS sur la table
ALTER TABLE system_parameters ENABLE ROW LEVEL SECURITY;

-- Politique: Seuls les administrateurs peuvent lire les paramètres
DROP POLICY IF EXISTS "Administrators can read system parameters" ON system_parameters;
CREATE POLICY "Administrators can read system parameters"
  ON system_parameters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Politique: Seuls les administrateurs peuvent modifier les paramètres
DROP POLICY IF EXISTS "Administrators can update system parameters" ON system_parameters;
CREATE POLICY "Administrators can update system parameters"
  ON system_parameters
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Politique: Seuls les administrateurs peuvent insérer des paramètres
DROP POLICY IF EXISTS "Administrators can insert system parameters" ON system_parameters;
CREATE POLICY "Administrators can insert system parameters"
  ON system_parameters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Créer un enregistrement par défaut s'il n'existe pas
INSERT INTO system_parameters (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM system_parameters LIMIT 1);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_system_parameters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_system_parameters_timestamp ON system_parameters;
CREATE TRIGGER update_system_parameters_timestamp
  BEFORE UPDATE ON system_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_system_parameters_updated_at();
