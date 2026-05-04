# Woluma-Flow - Nouvelles Fonctionnalités

Ce dossier contient la documentation et les migrations pour les nouvelles fonctionnalités développées pour Woluma-Flow.

## Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Structure](#structure)
- [Installation](#installation)
- [Documentation Complète](#documentation-complète)

## Vue d'ensemble

Ce package contient deux fonctionnalités majeures :

### 1. Système d'Éligibilité des Projets

Un système complet de vérification d'éligibilité permettant de filtrer les projets soumis selon des critères définis, avant de passer à la phase d'évaluation détaillée.

**Avantages:**
- Gain de temps sur l'évaluation
- Processus standardisé
- Traçabilité complète
- Validation automatique et manuelle

**Lien:** [Documentation Éligibilité](./eligibility/README.md)

### 2. Configuration IA Multi-Provider

Un système de configuration flexible permettant d'utiliser différents fournisseurs d'IA (OpenAI, Anthropic, Google, Mistral, etc.) pour l'évaluation automatique des projets.

**Avantages:**
- Support de 7 providers IA
- Configuration centralisée
- Sécurité renforcée
- Évaluation automatisée

**Lien:** [Documentation IA](./ai-configuration/README.md)

## Fonctionnalités

### Éligibilité des Projets

```
┌─────────────────────────────────────────┐
│                                         │
│  1. Soumission du Projet                │
│     ↓                                   │
│  2. Vérification d'Éligibilité          │
│     ├── Critères Textuels (manuel)     │
│     └── Critères de Champs (auto)      │
│     ↓                                   │
│  3. Décision                            │
│     ├── Eligible → Évaluation           │
│     └── Ineligible → Rejet              │
│                                         │
└─────────────────────────────────────────┘
```

**Points Clés:**
- ✅ Critères configurables par programme
- ✅ Validation automatique sur les données
- ✅ Interface de vérification intuitive
- ✅ Audit trail complet
- ✅ Nouveaux statuts: `eligible` / `ineligible`

### Configuration IA

```
┌─────────────────────────────────────────┐
│                                         │
│  Providers Supportés:                   │
│                                         │
│  • OpenAI (GPT-4, GPT-3.5)             │
│  • Anthropic (Claude 3)                │
│  • Google (Gemini Pro)                 │
│  • Mistral AI                          │
│  • Cohere                              │
│  • Hugging Face                        │
│  • API Personnalisée                   │
│                                         │
└─────────────────────────────────────────┘
```

**Points Clés:**
- ✅ Interface de configuration unifiée
- ✅ Stockage sécurisé des clés API
- ✅ Paramètres personnalisables (température, tokens)
- ✅ Activation/désactivation simple
- ✅ Support multi-provider

## Structure

```
feature/
├── README.md                          # Ce fichier
│
├── eligibility/                       # Fonctionnalité Éligibilité
│   ├── README.md                      # Documentation complète
│   └── migrations/                    # Migrations SQL
│       ├── 20251029152705_add_field_eligibility_criteria_to_programs.sql
│       ├── 20251104195231_add_eligibility_status_enum.sql
│       ├── 20251104195242_add_eligibility_fields_columns.sql
│       └── 20251104200208_add_eligibility_criteria_text_to_programs.sql
│
└── ai-configuration/                  # Fonctionnalité IA
    ├── README.md                      # Documentation complète
    └── migrations/                    # Migrations SQL
        └── 20251112163412_add_ai_configuration_parameters.sql
```

## Installation

### Prérequis

- Supabase configuré et connecté
- Droits d'administration sur la base de données
- Node.js et npm installés

### Étape 1: Appliquer les Migrations

#### Option A: Via Supabase SQL Editor (Recommandé)

1. Se connecter au Dashboard Supabase
2. Aller dans **SQL Editor**
3. Copier-coller le contenu de chaque migration dans l'ordre
4. Exécuter chaque migration

**Ordre d'exécution pour Éligibilité:**
```sql
-- 1. Ajouter field_eligibility_criteria à programs
-- Fichier: eligibility/migrations/20251029152705_add_field_eligibility_criteria_to_programs.sql

-- 2. Ajouter les statuts eligible/ineligible
-- Fichier: eligibility/migrations/20251104195231_add_eligibility_status_enum.sql

-- 3. Ajouter les colonnes de suivi à projects
-- Fichier: eligibility/migrations/20251104195242_add_eligibility_fields_columns.sql

-- 4. Ajouter eligibility_criteria (texte) à programs
-- Fichier: eligibility/migrations/20251104200208_add_eligibility_criteria_text_to_programs.sql
```

**Pour Configuration IA:**
```sql
-- Créer la table system_parameters avec toutes les colonnes IA
-- Fichier: ai-configuration/migrations/20251112163412_add_ai_configuration_parameters.sql
```

#### Option B: Via Supabase CLI

```bash
# Si vous avez Supabase CLI installé
supabase migration up
```

### Étape 2: Vérifier les Migrations

```sql
-- Vérifier les nouvelles colonnes dans programs
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'programs'
  AND column_name IN ('eligibility_criteria', 'field_eligibility_criteria');

-- Vérifier les nouveaux statuts
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'project_status'
);

-- Vérifier les colonnes dans projects
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name LIKE 'eligibility_%';

-- Vérifier la table system_parameters
SELECT * FROM system_parameters LIMIT 1;
```

### Étape 3: Configurer les Permissions

Les politiques RLS sont créées automatiquement par les migrations. Vérifiez qu'elles sont bien en place :

```sql
-- Vérifier les politiques RLS
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('projects', 'programs', 'system_parameters');
```

### Étape 4: Tester les Fonctionnalités

#### Test Éligibilité

1. Se connecter en tant qu'**admin** ou **manager**
2. Aller dans **Gestion des Programmes**
3. Éditer un programme existant
4. Ajouter des critères d'éligibilité (textuels)
5. Aller dans **Éligibilité**
6. Vérifier qu'un projet soumis apparaît
7. Approuver ou rejeter le projet

#### Test Configuration IA

1. Se connecter en tant qu'**admin**
2. Aller dans **Paramètres**
3. Cliquer sur l'onglet **IA & APIs**
4. Sélectionner un fournisseur (ex: OpenAI)
5. Entrer une clé API de test
6. Configurer les paramètres
7. Cliquer sur **Enregistrer la configuration IA**
8. Vérifier le message de succès

## Documentation Complète

### Éligibilité

Pour la documentation détaillée sur le système d'éligibilité:
- **[Lire la documentation complète](./eligibility/README.md)**

Contenu:
- Architecture détaillée
- Workflow complet
- Types de critères
- Configuration
- Exemples d'utilisation
- Dépannage
- Tests

### Configuration IA

Pour la documentation détaillée sur la configuration IA:
- **[Lire la documentation complète](./ai-configuration/README.md)**

Contenu:
- Liste complète des providers
- Configuration de chaque provider
- Paramètres IA (température, tokens)
- Format des prompts
- Sécurité des clés API
- Coûts estimés
- Dépannage
- Tests

## Composants Frontend Impactés

### Éligibilité

**Nouveaux fichiers:**
- `src/pages/eligibility/EligibilityPage.tsx` - Page de vérification

**Fichiers modifiés:**
- `src/stores/projectStore.ts` - Actions d'éligibilité
- `src/stores/programStore.ts` - Critères d'éligibilité
- `src/layouts/DashboardLayout.tsx` - Lien navigation
- `src/App.tsx` - Route /eligibility

**Nouveaux types:**
```typescript
// Nouveaux statuts
type ProjectStatus =
  | 'draft'
  | 'submitted'
  | 'eligible'      // NOUVEAU
  | 'ineligible'    // NOUVEAU
  | 'under_review'
  | ...

// Colonnes ajoutées
interface Project {
  ...
  eligibility_notes?: string;
  eligibility_checked_by?: string;
  eligibility_checked_at?: Date;
  submitted_at?: Date;
}

interface Program {
  ...
  eligibility_criteria?: string;
  field_eligibility_criteria?: EligibilityField[];
}
```

### Configuration IA

**Nouveaux fichiers:**
- `src/services/parametersService.ts` - Service de paramètres
- (Migration seulement, pas de nouveaux composants)

**Fichiers modifiés:**
- `src/pages/admin/ParametersPage.tsx` - Onglet IA & APIs
- `src/stores/parametersStore.ts` - État des paramètres
- `src/services/aiEvaluationService.ts` - Utilise les paramètres

**Nouveaux types:**
```typescript
interface SystemParameters {
  // AI Configuration
  aiProvider: string;

  // Provider-specific configs
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  // ... etc

  // General AI settings
  aiTemperature: number;
  aiMaxTokens: number;
  enableAiEvaluation: boolean;
}
```

## Base de Données

### Nouvelles Tables

**`system_parameters`**
- Stocke toute la configuration système
- Inclut toutes les configs IA
- RLS: Admin uniquement
- Trigger auto pour updated_at

### Colonnes Ajoutées

**`programs`**
- `eligibility_criteria` (text) - Critères textuels
- `field_eligibility_criteria` (jsonb) - Critères automatiques

**`projects`**
- `eligibility_notes` (text) - Notes de vérification
- `eligibility_checked_by` (uuid) - ID vérificateur
- `eligibility_checked_at` (timestamptz) - Date vérification
- `submitted_at` (timestamptz) - Date soumission

### Enums Modifiés

**`project_status`**
```sql
-- Nouveaux statuts ajoutés
'eligible'    -- Entre 'submitted' et 'under_review'
'ineligible'  -- Rejet après éligibilité
```

## Sécurité

### Row Level Security (RLS)

Toutes les fonctionnalités respectent les politiques RLS existantes:

**system_parameters:**
- ✅ Lecture: Admin uniquement
- ✅ Écriture: Admin uniquement
- ✅ Clés API protégées

**projects (éligibilité):**
- ✅ Lecture: Admin, Manager, Owner
- ✅ Modification status: Admin, Manager uniquement
- ✅ Audit trail complet

### Protection des Données Sensibles

**Clés API:**
- Stockage chiffré dans Supabase
- Type="password" dans les inputs
- Jamais exposées dans le frontend
- Transmission HTTPS uniquement
- Pas de logs en console

**Données Projet:**
- Politiques RLS maintenues
- Audit trail pour modifications
- GDPR compliant

## Workflow Global

```
SOUMISSION
    ↓
┌────────────────────┐
│   ELIGIBILITÉ      │
│                    │
│  • Critères Texte  │
│  • Critères Auto   │
└────────────────────┘
    ↓
┌────────────────────┐
│   ÉVALUATION IA    │  ← Configuration IA utilisée ici
│                    │
│  • Provider choisi │
│  • Modèle         │
│  • Paramètres     │
└────────────────────┘
    ↓
  DÉCISION
```

## Maintenance

### Rollback

Si besoin d'annuler les migrations:

```sql
-- ATTENTION: Ceci supprimera les données

-- Rollback Éligibilité
DROP INDEX IF EXISTS idx_projects_eligibility_status;
DROP INDEX IF EXISTS idx_projects_eligibility_checked_at;
ALTER TABLE projects DROP COLUMN IF EXISTS eligibility_notes;
ALTER TABLE projects DROP COLUMN IF EXISTS eligibility_checked_by;
ALTER TABLE projects DROP COLUMN IF EXISTS eligibility_checked_at;
ALTER TABLE projects DROP COLUMN IF EXISTS submitted_at;
ALTER TABLE programs DROP COLUMN IF EXISTS eligibility_criteria;
ALTER TABLE programs DROP COLUMN IF EXISTS field_eligibility_criteria;

-- Rollback Configuration IA
DROP TABLE IF EXISTS system_parameters CASCADE;
DROP FUNCTION IF EXISTS update_system_parameters_updated_at();
```

### Mise à Jour

Pour mettre à jour les fonctionnalités:

1. Sauvegarder la base de données
2. Appliquer les nouvelles migrations
3. Tester en environnement de dev
4. Déployer en production
5. Vérifier les logs

### Monitoring

Requêtes utiles pour le monitoring:

```sql
-- Stats éligibilité
SELECT
  status,
  COUNT(*) as count
FROM projects
WHERE status IN ('submitted', 'eligible', 'ineligible')
GROUP BY status;

-- Vérifier config IA
SELECT
  ai_provider,
  enable_ai_evaluation,
  updated_at
FROM system_parameters;

-- Projets récemment vérifiés
SELECT
  p.title,
  p.status,
  p.eligibility_checked_at,
  u.name as checked_by
FROM projects p
LEFT JOIN users u ON u.id = p.eligibility_checked_by
WHERE p.eligibility_checked_at IS NOT NULL
ORDER BY p.eligibility_checked_at DESC
LIMIT 10;
```

## Support

### Problèmes Courants

#### "Migration failed"
- Vérifier les permissions admin
- Vérifier la connexion Supabase
- Lire les logs d'erreur

#### "Eligibility page is empty"
- Vérifier qu'il y a des projets avec status='submitted'
- Vérifier les permissions utilisateur
- Vérifier les politiques RLS

#### "Cannot save AI configuration"
- Vérifier que l'utilisateur est admin
- Vérifier la table system_parameters existe
- Consulter la console pour erreurs

### Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation OpenAI](https://platform.openai.com/docs)
- [Documentation Anthropic](https://docs.anthropic.com)
- [Documentation Google Gemini](https://ai.google.dev/docs)

### Contact

Pour toute question ou assistance:
- Consulter les READMEs détaillés dans chaque dossier
- Vérifier les logs Supabase
- Contacter l'équipe de développement

---

## Changelog

### Version 1.0.0 (2025-11-13)

**Éligibilité:**
- ✅ Système de critères textuels
- ✅ Système de critères automatiques
- ✅ Interface de vérification
- ✅ Nouveaux statuts eligible/ineligible
- ✅ Audit trail complet

**Configuration IA:**
- ✅ Support de 7 providers IA
- ✅ Interface de configuration unifiée
- ✅ Stockage sécurisé des clés API
- ✅ Paramètres personnalisables
- ✅ Bouton d'enregistrement dédié

---

**Version:** 1.0.0
**Date:** 2025-11-13
**Auteur:** Woluma-Flow Team
**Licence:** Propriétaire
