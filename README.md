🚀 R&D Impulse! — Plateforme d'Évaluation et de Financement de Projets R&D
Autres noms : ESPImpulse · Woluma-Flow

R&D Impulse! est une application web complète de gestion du cycle de vie des projets de recherche et développement, de la soumission jusqu'au financement et au suivi. Elle permet aux porteurs de projets, aux comités d'évaluation et aux administrations de collaborer sur une plateforme unique, sécurisée et intelligente.

✨ Fonctionnalités
📝 Gestion des Projets
Création et soumission de projets R&D avec formulaire structuré (titre, description, budget, durée, tags, fichiers joints)
Cycle de vie complet : brouillon → soumis → éligible → en évaluation → pré-sélectionné → sélectionné → formalisation → financé → suivi → clôturé
Attribution d'un programme et d'un partenaire à chaque projet
Soumission publique sans authentification (lien dédié par programme)
✅ Système d'Éligibilité
Critères d'éligibilité textuels (vérification manuelle) et automatiques (validation par champs)
Configurable par programme
Audit trail complet : qui a vérifié, quand, et quelles notes
Statuts dédiés : eligible / ineligible
🤖 Évaluation Assistée par IA
Évaluation automatique des projets via 5 providers IA :
Google Gemini
OpenAI (ChatGPT)
Anthropic (Claude)
Mistral AI
Mode mock (hors ligne / test)
Analyse détaillée : forces, faiblesses, opportunités, risques (SWOT-like)
Notation pondérée par critères personnalisables
Configuration centralisée des clés API et des modèles (température, max tokens)
Mode simulation pour tester sans consommation de crédits API
📋 Formalisation
Demande de documents aux porteurs de projets
Plans de décaissement et gestion des tranches financières
Suivi technique avec accompagnement personnalisé
Édition de rapports PDF exportables (avec logo institutionnel)
📊 Suivi & Statistiques
Tableau de bord avec indicateurs clés (KPIs) par statut
Graphiques interactifs (barres, doughnut, courbes) via Chart.js
Filtres par programme, partenaire, période, secteur d'activité
Export des données vers Excel (.xlsx) et PDF
👥 Gestion des Utilisateurs & Rôles
Rôles granulaires : soumetteur, manager, admin
Permissions par rôle et par programme
Gestion des comptes, profils et partenaires
⚙️ Administration
Programmes, partenaires, secteurs d'activité
Modèles de formulaires personnalisables (glisser-déposer via dnd-kit)
Paramètres système et configuration IA
Historique des statuts
Guide utilisateur intégré
Verrouillage des programmes (soumissions fermées)
🛠️ Stack Technique
Couche	Technologie
Frontend	React 18 · TypeScript · Vite 6
Styling	TailwindCSS · Headless UI · Lucide Icons
State	Zustand
Forms	Formik + Yup
Graphiques	Chart.js + react-chartjs-2
PDF	jsPDF + jspdf-autotable
Excel	SheetJS (xlsx)
Backend / BDD	Supabase (PostgreSQL + Auth + RLS)
Serverless	Supabase Edge Functions (email, administration)
Drag & Drop	dnd-kit
Date	date-fns
🏗️ Architecture du Projet
ESPImpulse/
├── src/
│   ├── components/         # Composants UI réutilisables
│   ├── hooks/              # Hooks personnalisés (permissions, filtres, modales)
│   ├── layouts/            # Layouts (Auth, Dashboard)
│   ├── pages/              # Pages de l'application
│   │   ├── admin/          # Administration utilisateurs, programmes, etc.
│   │   ├── auth/           # Connexion, inscription
│   │   ├── dashboard/      # Tableau de bord principal
│   │   ├── eligibility/    # Vérification d'éligibilité
│   │   ├── evaluation/     # Évaluation (manuelle + IA)
│   │   ├── formalization/  # Formalisation des projets financés
│   │   ├── manager/        # Constructeur de formulaires
│   │   ├── monitoring/     # Suivi des projets
│   │   ├── profile/        # Profil utilisateur
│   │   ├── projects/       # CRUD projets
│   │   ├── public/         # Soumission publique
│   │   └── statistics/     # Statistiques et indicateurs
│   ├── services/           # Services (IA, Supabase, email, formalisation)
│   ├── stores/             # Stores Zustand (auth, projects, programs, etc.)
│   └── utils/              # Utilitaires (PDF, Excel, dates, fichiers, devise)
├── supabase/
│   ├── migrations/         # Migrations SQL (schéma, RLS, indexes)
│   └── functions/          # Edge Functions (admin, notifications)
├── feature/                # Documentation des fonctionnalités ajoutées
│   ├── eligibility/        # Système d'éligibilité (docs + migrations)
│   └── ai-configuration/   # Configuration IA multi-provider (docs + migrations)
└── [fichiers de config]    # Vite, ESLint, Tailwind, TypeScript, PostCSS
🚀 Démarrage Rapide
Prérequis
Node.js ≥ 18
npm ≥ 9
Un projet Supabase (gratuit) avec les migrations appliquées
Installation
# 1. Cloner le dépôt
git clone https://github.com/khadim210/ESPImpulse.git
cd ESPImpulse

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.production.example .env
Renseignez vos clés Supabase dans .env :

VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
VITE_APP_URL=http://localhost:5173
Lancer en développement
npm run dev
L'application sera accessible sur http://localhost:5173.

Build production
npm run build
Les fichiers optimisés seront dans le dossier dist/.

🗄️ Base de Données
Les migrations Supabase se trouvent dans supabase/migrations/. Principales tables :

profiles — Utilisateurs et rôles
programs — Programmes de financement
partners — Partenaires techniques/financiers
projects — Projets avec statuts et cycle de vie
activity_sectors — Secteurs d'activité
form_templates — Modèles de formulaires personnalisés
formalization_documents — Documents de formalisation
disbursement_plans — Plans de décaissement
system_parameters — Configuration IA et paramètres système
status_history — Historique des changements de statut
Politiques RLS (Row Level Security)
Toutes les tables sont protégées par Row Level Security avec des politiques fines selon les rôles (admin, manager, submitter).

🤖 Évaluation IA
Le service aiEvaluationService supporte actuellement 5 providers :

Provider	Modèles	Configuration
Gemini	gemini-pro, gemini-1.5-flash	Clé API Google AI
ChatGPT	gpt-4o-mini, gpt-4	Clé API OpenAI
Claude	claude-sonnet-4-5	Clé API Anthropic
Mistral	mistral-large	Clé API Mistral
Mock	—	Aucune clé (simulation)
La configuration se fait depuis l'interface admin → Paramètres → IA & APIs.

📄 Licence
Ce projet est développé dans le cadre d'un projet R&D institutionnel. Tous droits réservés.

👤 Auteur
Ahmath Bamba Mbacké — @khadim210

Conçu pour simplifier et accélérer le financement de la recherche & développement.
