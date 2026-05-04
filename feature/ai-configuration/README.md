# Configuration IA et Évaluation Automatique

## Vue d'ensemble

Cette fonctionnalité permet de configurer et d'utiliser différents fournisseurs d'intelligence artificielle pour l'évaluation automatique des projets. Le système supporte plusieurs providers IA et offre une interface unifiée pour leur configuration.

## Architecture

### Composants Frontend

#### Pages
- **`src/pages/admin/ParametersPage.tsx`**
  - Interface de configuration des paramètres système
  - Onglet dédié à la configuration IA
  - Sélection du fournisseur IA
  - Configuration des clés API et modèles
  - Réglages des paramètres (température, tokens max)
  - Bouton d'enregistrement dédié

#### Services
- **`src/services/aiEvaluationService.ts`**
  - Service de communication avec les APIs IA
  - Implémentation pour chaque provider
  - Gestion des requêtes et réponses
  - Gestion des erreurs

- **`src/services/parametersService.ts`**
  - Service de gestion des paramètres système
  - Chargement et sauvegarde des configurations
  - Mapping entre frontend et base de données

#### Stores
- **`src/stores/parametersStore.ts`**
  - État global des paramètres
  - Actions pour mettre à jour la configuration
  - Synchronisation avec localStorage et Supabase

### Base de Données

#### Table `system_parameters`

```sql
CREATE TABLE system_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- General Settings
  site_name text DEFAULT 'Woluma-Flow',
  site_description text,
  admin_email text,
  default_language text DEFAULT 'fr',
  timezone text DEFAULT 'UTC',

  -- AI Provider Selection
  ai_provider text DEFAULT 'openai',

  -- OpenAI Configuration
  openai_api_key text DEFAULT '',
  openai_model text DEFAULT 'gpt-4',
  openai_org_id text DEFAULT '',

  -- Anthropic Configuration
  anthropic_api_key text DEFAULT '',
  anthropic_model text DEFAULT 'claude-3-opus-20240229',

  -- Google Configuration
  google_api_key text DEFAULT '',
  google_model text DEFAULT 'gemini-pro',

  -- Mistral Configuration
  mistral_api_key text DEFAULT '',
  mistral_model text DEFAULT 'mistral-large-latest',

  -- Cohere Configuration
  cohere_api_key text DEFAULT '',
  cohere_model text DEFAULT 'command',

  -- Hugging Face Configuration
  huggingface_api_key text DEFAULT '',
  huggingface_model text DEFAULT '',

  -- Custom API Configuration
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
```

## Fournisseurs IA Supportés

### 1. OpenAI (GPT)

**Configuration requise:**
- Clé API OpenAI
- Modèle (ex: gpt-4, gpt-3.5-turbo)
- Organization ID (optionnel)

**Modèles disponibles:**
- `gpt-4` - Plus performant, plus coûteux
- `gpt-4-turbo` - Rapide et performant
- `gpt-3.5-turbo` - Économique
- `gpt-4o` - Multimodal

**Obtenir une clé:**
1. Créer un compte sur [platform.openai.com](https://platform.openai.com)
2. Aller dans API Keys
3. Créer une nouvelle clé secrète
4. Copier la clé (elle ne sera affichée qu'une fois)

### 2. Anthropic (Claude)

**Configuration requise:**
- Clé API Anthropic

**Modèles disponibles:**
- `claude-3-opus-20240229` - Plus performant
- `claude-3-sonnet-20240229` - Équilibré
- `claude-3-haiku-20240307` - Rapide et économique
- `claude-2.1` - Version précédente

**Obtenir une clé:**
1. Créer un compte sur [console.anthropic.com](https://console.anthropic.com)
2. Aller dans API Keys
3. Générer une nouvelle clé
4. Copier la clé

### 3. Google (Gemini)

**Configuration requise:**
- Clé API Google

**Modèles disponibles:**
- `gemini-pro` - Texte
- `gemini-pro-vision` - Multimodal
- `gemini-ultra` - Plus performant

**Obtenir une clé:**
1. Accéder à [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Créer une clé API
3. Copier la clé

### 4. Mistral AI

**Configuration requise:**
- Clé API Mistral

**Modèles disponibles:**
- `mistral-large-latest` - Plus performant
- `mistral-medium-latest` - Équilibré
- `mistral-small-latest` - Économique
- `open-mistral-7b` - Open source

**Obtenir une clé:**
1. Créer un compte sur [console.mistral.ai](https://console.mistral.ai)
2. Générer une clé API
3. Copier la clé

### 5. Cohere

**Configuration requise:**
- Clé API Cohere

**Modèles disponibles:**
- `command` - Génération de texte
- `command-light` - Version allégée
- `command-nightly` - Dernières fonctionnalités

**Obtenir une clé:**
1. Créer un compte sur [cohere.com](https://cohere.com)
2. Accéder au Dashboard
3. Générer une clé API
4. Copier la clé

### 6. Hugging Face

**Configuration requise:**
- Clé API Hugging Face
- Nom du modèle (ex: "meta-llama/Llama-2-70b")

**Modèles populaires:**
- `meta-llama/Llama-2-70b-chat-hf`
- `mistralai/Mistral-7B-Instruct-v0.2`
- `tiiuae/falcon-180B-chat`

**Obtenir une clé:**
1. Créer un compte sur [huggingface.co](https://huggingface.co)
2. Aller dans Settings → Access Tokens
3. Créer un nouveau token
4. Copier le token

### 7. API Personnalisée

**Configuration requise:**
- URL de l'API
- Clé API (optionnel)
- Headers personnalisés (optionnel, format JSON)

**Format attendu:**
```json
POST /api/evaluate
{
  "model": "model-name",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 2000
}

Response:
{
  "choices": [{
    "message": {
      "content": "..."
    }
  }]
}
```

## Paramètres IA

### Température (0.0 - 2.0)

Contrôle la créativité et la randomisation des réponses :
- **0.0 - 0.3** : Déterministe, précis, factuel
- **0.4 - 0.7** : Équilibré (recommandé pour l'évaluation)
- **0.8 - 1.0** : Créatif, varié
- **1.1 - 2.0** : Très créatif, imprévisible

**Recommandation pour l'évaluation :** `0.7`

### Max Tokens

Limite le nombre de tokens générés dans la réponse :
- **500 - 1000** : Réponses courtes
- **1000 - 2000** : Réponses moyennes (recommandé)
- **2000 - 4000** : Réponses longues
- **4000+** : Analyses détaillées

**Recommandation pour l'évaluation :** `2000`

### Activation de l'IA

Toggle pour activer/désactiver l'évaluation automatique par IA :
- **Activé** : L'IA évalue automatiquement les projets soumis
- **Désactivé** : Évaluation manuelle uniquement

## Configuration

### Interface Utilisateur

1. **Accéder aux Paramètres**
   ```
   Navigation → Paramètres (Admin uniquement)
   ```

2. **Onglet Configuration IA**
   ```
   Paramètres → IA & APIs
   ```

3. **Sélectionner un Fournisseur**
   - Choisir parmi les 7 fournisseurs disponibles
   - Les champs de configuration s'adaptent automatiquement

4. **Configurer le Fournisseur**
   - Entrer la clé API (obligatoire)
   - Sélectionner le modèle
   - Configurer les paramètres additionnels

5. **Régler les Paramètres Généraux**
   - Ajuster la température
   - Définir le max tokens
   - Activer/désactiver l'évaluation automatique

6. **Enregistrer**
   - Cliquer sur "Enregistrer la configuration IA"
   - Message de confirmation
   - Configuration sauvegardée dans Supabase

### Variables d'Environnement (Alternative)

Pour une configuration en dur (déconseillé en production) :

```env
# AI Provider
VITE_AI_PROVIDER=openai

# OpenAI
VITE_OPENAI_API_KEY=sk-...
VITE_OPENAI_MODEL=gpt-4

# Anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_ANTHROPIC_MODEL=claude-3-opus-20240229

# Etc.
```

## Workflow d'Évaluation Automatique

```
1. SOUMISSION DU PROJET
   ↓
   Projet soumis avec status = 'submitted'

2. VÉRIFICATION DE LA CONFIGURATION
   ↓
   - enable_ai_evaluation = true ?
   - Clé API configurée ?
   - Modèle sélectionné ?

3. PRÉPARATION DU PROMPT
   ↓
   Génération du contexte :
   - Données du projet
   - Critères d'évaluation du programme
   - Critères d'éligibilité
   - Instructions spécifiques

4. APPEL À L'API IA
   ↓
   Envoi de la requête au provider sélectionné
   - Messages formatés
   - Paramètres appliqués
   - Timeout : 30s

5. TRAITEMENT DE LA RÉPONSE
   ↓
   Parsing de la réponse JSON :
   - Scores par critère
   - Commentaires
   - Recommandations
   - Statut suggéré

6. ENREGISTREMENT
   ↓
   Mise à jour du projet :
   - evaluation_scores
   - evaluation_comments
   - recommended_status
   - total_evaluation_score

7. NOTIFICATION
   ↓
   (Future) Notification aux parties concernées
```

## Format du Prompt

### Structure du Prompt d'Évaluation

```
Vous êtes un expert en évaluation de projets pour [NOM_PROGRAMME].

PROJET À ÉVALUER:
- Titre: [TITRE]
- Description: [DESCRIPTION]
- Budget: [BUDGET]
- Timeline: [TIMELINE]

DONNÉES DU FORMULAIRE:
[FORM_DATA en JSON]

CRITÈRES D'ÉLIGIBILITÉ:
[LISTE DES CRITÈRES]

CRITÈRES D'ÉVALUATION:
[CRITÈRES AVEC POIDS]

INSTRUCTIONS:
Évaluez ce projet selon les critères ci-dessus.
Pour chaque critère, donnez :
1. Un score de 0 à 100
2. Un commentaire justificatif
3. Des recommandations d'amélioration

Répondez au format JSON suivant:
{
  "scores": {
    "critere_1": 85,
    "critere_2": 70,
    ...
  },
  "comments": {
    "critere_1": "...",
    "critere_2": "...",
    ...
  },
  "total_score": 78,
  "recommendation": "eligible|ineligible",
  "overall_comment": "...",
  "suggestions": [...]
}
```

### Prompt Personnalisé par Programme

Chaque programme peut avoir un prompt personnalisé dans `programs.custom_ai_prompt`.

## Sécurité

### Protection des Clés API

1. **Stockage sécurisé**
   - Clés stockées dans Supabase (chiffrement au repos)
   - Jamais exposées dans le frontend
   - Transmission via HTTPS uniquement

2. **Affichage masqué**
   - Champs `type="password"`
   - Clés jamais loggées en console
   - Pas de stockage dans localStorage pour les clés

3. **Row Level Security (RLS)**
   ```sql
   -- Seuls les admins peuvent lire/modifier
   CREATE POLICY "Admins only"
     ON system_parameters
     FOR ALL
     TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM users
         WHERE users.auth_user_id = auth.uid()
         AND users.role = 'admin'
       )
     );
   ```

### Limites de Taux (Rate Limiting)

Chaque provider a ses propres limites :
- **OpenAI** : 3 requêtes/min (free), illimité (payant)
- **Anthropic** : 50 requêtes/min
- **Google** : 60 requêtes/min
- **Mistral** : Variable selon le plan
- **Cohere** : 100 requêtes/min
- **Hugging Face** : 1000 requêtes/h

**Gestion recommandée :**
- Implémenter une file d'attente
- Ajouter des retry avec backoff exponentiel
- Monitorer les erreurs 429 (Too Many Requests)

## Migration

### Migration à Appliquer

**Fichier:** `20251112163412_add_ai_configuration_parameters.sql`

Cette migration :
- Crée la table `system_parameters`
- Ajoute toutes les colonnes de configuration IA
- Active RLS avec politiques admin-only
- Crée un enregistrement par défaut
- Ajoute un trigger pour `updated_at`

**Application:**
```bash
# Via Supabase CLI (si disponible)
supabase migration up

# Via SQL Editor
# Copier-coller le contenu du fichier SQL
```

**Vérification:**
```sql
-- Vérifier que la table existe
SELECT * FROM system_parameters LIMIT 1;

-- Vérifier les politiques RLS
SELECT * FROM pg_policies WHERE tablename = 'system_parameters';
```

## Tests

### Test de Configuration

```typescript
// 1. Sauvegarder une configuration
await updateParameters({
  aiProvider: 'openai',
  openaiApiKey: 'sk-test...',
  openaiModel: 'gpt-4',
  aiTemperature: 0.7,
  aiMaxTokens: 2000,
  enableAiEvaluation: true
});

// 2. Vérifier la sauvegarde
const params = await loadParameters();
expect(params.aiProvider).toBe('openai');
```

### Test d'Évaluation

```typescript
// 1. Configurer l'IA
// 2. Créer un projet de test
const project = {
  title: "Test Project",
  description: "Description...",
  program_id: "..."
};

// 3. Déclencher l'évaluation
const result = await aiEvaluationService.evaluateProject(project);

// 4. Vérifier le résultat
expect(result.scores).toBeDefined();
expect(result.total_score).toBeGreaterThan(0);
```

## Dépannage

### Erreur : "Failed to update parameters"

**Causes possibles :**
- Table `system_parameters` n'existe pas
- Utilisateur n'est pas admin
- Problème de connexion Supabase

**Solutions :**
1. Appliquer la migration
2. Vérifier le rôle utilisateur
3. Vérifier les politiques RLS

### Erreur : "API Key invalid"

**Causes possibles :**
- Clé API incorrecte
- Clé expirée
- Mauvais format

**Solutions :**
1. Régénérer la clé depuis le dashboard du provider
2. Vérifier qu'il n'y a pas d'espaces avant/après
3. Tester la clé avec curl

### Erreur : "Rate limit exceeded"

**Causes possibles :**
- Trop de requêtes
- Plan gratuit dépassé

**Solutions :**
1. Attendre quelques minutes
2. Upgrader le plan
3. Implémenter un système de queue

### L'évaluation ne se déclenche pas

**Causes possibles :**
- `enable_ai_evaluation` désactivé
- Clé API non configurée
- Erreur silencieuse

**Solutions :**
1. Vérifier l'activation dans les paramètres
2. Vérifier la console pour les erreurs
3. Tester manuellement l'API

## Coûts Estimés

### Par Évaluation (estimation)

| Provider | Modèle | Coût/1000 tokens | Coût/évaluation |
|----------|--------|------------------|-----------------|
| OpenAI | GPT-4 | $0.03-$0.06 | $0.10-$0.20 |
| OpenAI | GPT-3.5 | $0.001-$0.002 | $0.005-$0.01 |
| Anthropic | Claude 3 Opus | $0.015-$0.075 | $0.05-$0.25 |
| Anthropic | Claude 3 Sonnet | $0.003-$0.015 | $0.01-$0.05 |
| Google | Gemini Pro | Gratuit* | $0 |
| Mistral | Large | €0.002-€0.006 | €0.01-€0.02 |
| Cohere | Command | $0.001-$0.002 | $0.005-$0.01 |
| HF | Variable | $0-$0.01 | $0-$0.03 |

*Gratuit avec limites, puis payant

**Recommandation :**
- **Budget serré** : Google Gemini Pro ou GPT-3.5
- **Équilibre** : Claude 3 Sonnet ou Mistral
- **Performance max** : GPT-4 ou Claude 3 Opus

## Évolutions Futures

### Améliorations Prévues

1. **Multi-provider parallèle**
   - Utiliser plusieurs IA simultanément
   - Agréger les résultats
   - Consensus scoring

2. **Fine-tuning**
   - Entraîner des modèles spécifiques
   - Améliorer la précision
   - Réduire les coûts

3. **Analyse avancée**
   - Extraction d'entités
   - Analyse de sentiment
   - Détection de plagiat

4. **Monitoring**
   - Dashboard des évaluations IA
   - Tracking des coûts
   - Métriques de qualité

5. **A/B Testing**
   - Comparer différents providers
   - Optimiser les prompts
   - Mesurer la performance

## Support

### Ressources

- [Documentation OpenAI](https://platform.openai.com/docs)
- [Documentation Anthropic](https://docs.anthropic.com)
- [Documentation Google Gemini](https://ai.google.dev/docs)
- [Documentation Mistral](https://docs.mistral.ai)
- [Documentation Cohere](https://docs.cohere.com)
- [Documentation Hugging Face](https://huggingface.co/docs)

### Contact

Pour toute question ou problème :
- Consulter les logs Supabase
- Vérifier la console navigateur
- Contacter l'équipe de développement

---

**Version:** 1.0.0
**Dernière mise à jour:** 2025-11-13
**Auteur:** Woluma-Flow Team
