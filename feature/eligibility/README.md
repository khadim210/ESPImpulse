# Fonctionnalité d'Éligibilité des Projets

## Vue d'ensemble

Cette fonctionnalité permet de gérer le processus de vérification d'éligibilité des projets soumis aux programmes. Elle offre deux types de critères d'éligibilité :

1. **Critères textuels** - Liste de critères à cocher manuellement
2. **Critères basés sur les champs** - Validation automatique basée sur les données du formulaire

## Architecture

### Composants Frontend

#### Pages
- **`src/pages/eligibility/EligibilityPage.tsx`**
  - Interface de vérification d'éligibilité
  - Liste des projets soumis en attente de vérification
  - Formulaire de validation avec critères
  - Actions : Approuver (Eligible) / Rejeter (Ineligible)

#### Stores
- **`src/stores/projectStore.ts`**
  - Gestion de l'état des projets
  - Actions pour mettre à jour le statut d'éligibilité
  - Suivi des notes et de l'auditeur

- **`src/stores/programStore.ts`**
  - Gestion des critères d'éligibilité des programmes
  - Configuration des règles de validation

### Base de Données

#### Nouvelles Colonnes dans `projects`

```sql
-- Suivi de la vérification d'éligibilité
eligibility_notes         text          -- Notes de l'évaluateur
eligibility_checked_by    uuid          -- ID de l'utilisateur qui a vérifié
eligibility_checked_at    timestamptz   -- Date/heure de vérification
submitted_at              timestamptz   -- Date de soumission
```

#### Nouvelles Colonnes dans `programs`

```sql
-- Critères d'éligibilité
eligibility_criteria            text   -- Critères textuels (un par ligne)
field_eligibility_criteria      jsonb  -- Critères automatiques basés sur les champs
```

#### Nouveaux Statuts

```sql
-- Ajout à l'enum project_status
'eligible'    -- Projet éligible après vérification
'ineligible'  -- Projet non-éligible après vérification
```

## Workflow d'Éligibilité

```
1. SOUMISSION
   ↓
   Projet créé avec status = 'draft'

2. ENVOI
   ↓
   status = 'submitted'
   submitted_at = now()

3. VÉRIFICATION D'ÉLIGIBILITÉ
   ↓
   Manager/Admin accède à la page Éligibilité

4. ÉVALUATION
   ↓
   a) Vérification des critères textuels (checkbox)
   b) Validation automatique des critères de champs
   c) Ajout de notes si nécessaire

5. DÉCISION
   ↓
   → Si APPROUVÉ:
     - status = 'eligible'
     - eligibility_checked_by = current_user
     - eligibility_checked_at = now()

   → Si REJETÉ:
     - status = 'ineligible'
     - eligibility_notes = raison du rejet
     - eligibility_checked_by = current_user
     - eligibility_checked_at = now()

6. SUITE DU PROCESSUS
   ↓
   Si eligible → Peut passer en 'under_review'
   Si ineligible → Fin du processus
```

## Types de Critères d'Éligibilité

### 1. Critères Textuels

Définis dans `programs.eligibility_criteria` (texte libre, un critère par ligne)

**Exemple:**
```
Être une entreprise légalement enregistrée
Avoir au moins 2 ans d'existence
Budget entre 50 000 et 500 000 XOF
Projet innovant dans le secteur technologique
```

**Utilisation:**
- Affichés sous forme de checkboxes dans l'interface
- Vérification manuelle par l'évaluateur
- Flexibilité totale

### 2. Critères Basés sur les Champs

Définis dans `programs.field_eligibility_criteria` (JSONB)

**Structure:**
```json
[
  {
    "fieldId": "budget",
    "fieldName": "budget",
    "fieldLabel": "Budget du projet",
    "isEligibilityCriteria": true,
    "conditions": {
      "operator": "between",
      "value": 50000,
      "value2": 500000,
      "errorMessage": "Le budget doit être entre 50 000 et 500 000 XOF"
    }
  },
  {
    "fieldId": "years_experience",
    "fieldName": "years_experience",
    "fieldLabel": "Années d'expérience",
    "isEligibilityCriteria": true,
    "conditions": {
      "operator": ">=",
      "value": 2,
      "errorMessage": "Au moins 2 ans d'expérience requis"
    }
  }
]
```

**Opérateurs disponibles:**
- `>` - Supérieur à
- `<` - Inférieur à
- `>=` - Supérieur ou égal à
- `<=` - Inférieur ou égal à
- `==` - Égal à
- `!=` - Différent de
- `contains` - Contient (pour texte)
- `between` - Entre deux valeurs
- `in` - Dans une liste

**Utilisation:**
- Validation automatique basée sur `projects.form_data`
- Messages d'erreur personnalisés
- Bloque la soumission si non respecté

## Configuration dans les Programmes

### Depuis l'Interface Admin

1. Aller dans **Gestion des Programmes**
2. Créer ou modifier un programme
3. Section **Critères d'Éligibilité** :
   - **Critères généraux** : Saisir un critère par ligne
   - **Critères automatiques** : Configurer les règles sur les champs du formulaire

### Exemple de Configuration

**Programme : Financement PME**

Critères généraux (texte):
```
Être une PME enregistrée au Sénégal
Avoir au moins 2 employés permanents
Présenter un business plan détaillé
Domaine d'activité : Agriculture, Technologie ou Commerce
```

Critères automatiques (champs):
```json
[
  {
    "fieldId": "budget",
    "conditions": {
      "operator": "between",
      "value": 100000,
      "value2": 5000000,
      "errorMessage": "Budget entre 100K et 5M XOF requis"
    }
  },
  {
    "fieldId": "num_employees",
    "conditions": {
      "operator": ">=",
      "value": 2,
      "errorMessage": "Au moins 2 employés requis"
    }
  }
]
```

## Sécurité et Permissions

### Row Level Security (RLS)

Les politiques RLS existantes s'appliquent :
- Seuls les **admins** et **managers** peuvent accéder à la page d'éligibilité
- Les **submitters** peuvent voir le statut de leurs projets
- Les **partners** peuvent voir les projets de leurs programmes

### Audit Trail

Chaque vérification d'éligibilité est tracée :
- `eligibility_checked_by` : Qui a vérifié
- `eligibility_checked_at` : Quand
- `eligibility_notes` : Pourquoi (en cas de rejet)

## Migrations

Les migrations suivantes doivent être appliquées dans l'ordre :

1. **`20251029152705_add_field_eligibility_criteria_to_programs.sql`**
   - Ajoute `field_eligibility_criteria` à `programs`

2. **`20251104195231_add_eligibility_status_enum.sql`**
   - Ajoute les statuts 'eligible' et 'ineligible' à l'enum

3. **`20251104195242_add_eligibility_fields_columns.sql`**
   - Ajoute les colonnes de suivi d'éligibilité à `projects`

4. **`20251104200208_add_eligibility_criteria_text_to_programs.sql`**
   - Ajoute `eligibility_criteria` (texte) à `programs`

Toutes les migrations sont **idempotentes** (peuvent être réexécutées sans problème).

## Utilisation

### Pour un Manager/Admin

1. **Accéder à la page Éligibilité**
   ```
   Navigation → Éligibilité
   ```

2. **Voir les projets en attente**
   - Liste des projets avec status = 'submitted'
   - Informations du programme associé
   - Critères d'éligibilité à vérifier

3. **Évaluer un projet**
   - Cocher les critères textuels validés
   - Voir les critères automatiques (validés ou non)
   - Ajouter des notes si nécessaire

4. **Prendre une décision**
   - **Approuver** → status = 'eligible'
   - **Rejeter** → status = 'ineligible'

### Pour un Submitter

1. **Soumettre un projet**
   - Remplir le formulaire
   - S'assurer que les critères automatiques sont respectés

2. **Suivre le statut**
   - Voir le statut d'éligibilité sur la page du projet
   - Lire les notes en cas de rejet

## Tests

### Test des Critères Textuels

```typescript
// 1. Créer un programme avec critères textuels
const program = {
  eligibility_criteria: "Critère 1\nCritère 2\nCritère 3"
};

// 2. Soumettre un projet
const project = {
  program_id: program.id,
  status: 'submitted'
};

// 3. Vérifier l'éligibilité
// → Tous les critères doivent être cochés pour approuver
```

### Test des Critères Automatiques

```typescript
// 1. Créer un programme avec critère budget
const program = {
  field_eligibility_criteria: [{
    fieldId: 'budget',
    conditions: {
      operator: '>=',
      value: 50000
    }
  }]
};

// 2. Soumettre un projet avec budget insuffisant
const project = {
  form_data: { budget: 30000 }
};
// → Devrait échouer la validation

// 3. Soumettre un projet avec budget suffisant
const project2 = {
  form_data: { budget: 60000 }
};
// → Devrait passer la validation
```

## Dépannage

### Problème : Les critères ne s'affichent pas

**Solution :**
- Vérifier que le programme a des critères définis
- Vérifier la console pour les erreurs
- S'assurer que les migrations sont appliquées

### Problème : Impossible d'approuver un projet

**Solution :**
- Vérifier que tous les critères textuels sont cochés
- Vérifier que les critères automatiques passent
- Vérifier les permissions utilisateur (admin/manager)

### Problème : Les statuts ne se mettent pas à jour

**Solution :**
- Vérifier les politiques RLS
- Vérifier la connexion Supabase
- Consulter les logs dans la console

## Évolutions Futures

### Améliorations Possibles

1. **Validation en temps réel**
   - Afficher les erreurs de critères pendant la saisie du formulaire
   - Empêcher la soumission si critères non respectés

2. **Critères avancés**
   - Conditions combinées (AND/OR)
   - Critères dépendants (si X alors Y)
   - Scores d'éligibilité

3. **Notifications**
   - Alerter le submitter en cas de rejet
   - Notifier les managers des nouveaux projets à vérifier

4. **Statistiques**
   - Taux d'éligibilité par programme
   - Raisons de rejet les plus fréquentes
   - Temps moyen de vérification

## Support

Pour toute question ou problème :
- Consulter la documentation Supabase
- Vérifier les logs de la console
- Contacter l'équipe de développement

---

**Version:** 1.0.0
**Dernière mise à jour:** 2025-11-13
**Auteur:** Woluma-Flow Team
