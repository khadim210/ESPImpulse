/*
  # Ajout des critères d'éligibilité basés sur les champs de formulaire

  ## Description
  Cette migration ajoute une nouvelle colonne pour stocker les critères d'éligibilité
  basés directement sur les champs du formulaire associé au programme.

  ## Nouvelles colonnes
  - `field_eligibility_criteria` (jsonb): Stocke les règles d'éligibilité pour chaque champ
    Structure:
    [
      {
        "fieldId": "champ-1",          // ID du champ du formulaire
        "fieldName": "budget",          // Nom du champ
        "fieldLabel": "Budget du projet", // Label du champ
        "isEligibilityCriteria": true,  // Si c'est un critère d'éligibilité
        "conditions": {
          "operator": ">=",             // Opérateur: >, <, >=, <=, ==, !=, contains, between, in
          "value": 50000,               // Valeur à comparer
          "value2": null,               // Valeur 2 pour "between"
          "errorMessage": "Le budget minimum requis est de 50 000"
        }
      }
    ]

  ## Avantages
  - Lien direct entre les champs du formulaire et les critères d'éligibilité
  - Validation automatique basée sur les données du formulaire
  - Configuration visuelle des conditions par champ
  - Flexibilité pour différents types de conditions

  ## Sécurité
  - Colonne nullable pour compatibilité avec les programmes existants
  - Valeur par défaut: tableau JSON vide
*/

-- Ajouter la colonne pour les critères d'éligibilité basés sur les champs
ALTER TABLE programs
ADD COLUMN IF NOT EXISTS field_eligibility_criteria jsonb DEFAULT '[]'::jsonb;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN programs.field_eligibility_criteria IS 
'Critères d''éligibilité basés sur les champs du formulaire associé. Structure: array of {fieldId, fieldName, fieldLabel, isEligibilityCriteria, conditions{operator, value, value2, errorMessage}}';

-- Index pour améliorer les performances de requête sur cette colonne JSONB
CREATE INDEX IF NOT EXISTS idx_programs_field_eligibility_criteria 
ON programs USING gin(field_eligibility_criteria);

-- Statistiques après migration
DO $$
BEGIN
  RAISE NOTICE '=== Migration terminée ===';
  RAISE NOTICE 'Colonne field_eligibility_criteria ajoutée à la table programs';
  RAISE NOTICE 'Total programmes en base: %', (SELECT COUNT(*) FROM programs);
END $$;