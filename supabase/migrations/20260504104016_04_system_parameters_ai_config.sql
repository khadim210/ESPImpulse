/*
  # Paramètres système et configuration IA

  1. Nouvelles Tables
    - `system_parameters` : configuration générale de la plateforme et paramètres IA

  2. Colonnes
    - Paramètres généraux : site_name, admin_email, langue, fuseau horaire
    - Configuration IA : fournisseur, clés API, modèles (OpenAI, Anthropic, Google, Mistral, Cohere, HuggingFace, custom)
    - Paramètres IA globaux : température, max tokens, activation

  3. Sécurité
    - RLS activé, accès exclusif aux administrateurs
    - Trigger pour updated_at automatique

  4. Données initiales
    - Un enregistrement de configuration par défaut
*/

CREATE TABLE IF NOT EXISTS system_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Général
  site_name text DEFAULT 'R&D Impulse !',
  site_description text DEFAULT 'Plateforme d''Évaluation et de Financement de Projets R&D',
  admin_email text DEFAULT 'admin@esp.sn',
  default_language text DEFAULT 'fr',
  timezone text DEFAULT 'Africa/Dakar',

  -- Configuration IA
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

  -- API personnalisée
  custom_api_url text DEFAULT '',
  custom_api_key text DEFAULT '',
  custom_api_headers text DEFAULT '',

  -- Paramètres IA généraux
  ai_temperature numeric(3,2) DEFAULT 0.7,
  ai_max_tokens integer DEFAULT 2000,
  enable_ai_evaluation boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators can read system parameters"
  ON system_parameters FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Administrators can insert system parameters"
  ON system_parameters FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Administrators can update system parameters"
  ON system_parameters FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_system_parameters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_parameters_timestamp ON system_parameters;
CREATE TRIGGER update_system_parameters_timestamp
  BEFORE UPDATE ON system_parameters
  FOR EACH ROW EXECUTE FUNCTION update_system_parameters_updated_at();

-- Enregistrement par défaut
INSERT INTO system_parameters (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM system_parameters LIMIT 1);
