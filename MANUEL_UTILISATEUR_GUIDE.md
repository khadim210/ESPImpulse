# Guide d'utilisation du Générateur de Manuel Utilisateur

## Accès au générateur

Le générateur de manuel utilisateur est accessible à tous les utilisateurs connectés via le menu principal de l'application.

### Comment y accéder

1. **Connectez-vous** à l'application avec vos identifiants
2. Dans le **menu latéral gauche**, cliquez sur **"Manuel Utilisateur"** (icône de livre)
3. Vous accédez à la page de génération du manuel

### URL directe

Vous pouvez également accéder directement via l'URL :
```
/dashboard/user-manual
```

## Nouvelle fonctionnalité : Captures d'écran automatiques

Le générateur inclut maintenant un système de capture automatique des interfaces pour illustrer le manuel avec des images réelles de l'application.

## Contenu du manuel généré

Le manuel utilisateur PDF généré couvre l'ensemble des fonctionnalités de la plateforme :

### 1. Introduction
- Présentation de l'application
- Rôles utilisateurs (Admin, Manager, Partner, Submitter)
- Prérequis techniques

### 2. Connexion et Inscription
- Création de compte
- Connexion à l'application
- Récupération de mot de passe

### 3. Tableau de bord
- Vue d'ensemble
- Navigation dans l'application

### 4. Soumission de Projets
- Créer un nouveau projet
- Vérification d'éligibilité
- Documents requis
- Soumission publique (sans compte)

### 5. Suivi de Projets
- Liste des projets
- Détails d'un projet
- Statuts des projets
- Modifier un projet

### 6. Évaluation (pour Managers)
- Accéder aux projets à évaluer
- Processus d'évaluation
- Évaluation IA (si configurée)

### 7. Formalisation
- Projets approuvés
- Demande de documents
- Plan de décaissement
- Support technique

### 8. Suivi et Monitoring
- Suivi des projets actifs
- Rapports périodiques

### 9. Statistiques et Rapports
- Tableaux de bord statistiques
- Export de données

### 10. Administration (pour Admins)
- Gestion des utilisateurs
- Gestion des partenaires
- Gestion des programmes
- Modèles de formulaires
- Configuration de l'IA
- Historique des statuts

### 11. Profil Utilisateur
- Modifier mon profil
- Changer mon mot de passe
- Se déconnecter

### 12. Bonnes Pratiques
- Sécurité
- Soumission de projets
- Qualité du dossier

### 13. Aide et Support
- Obtenir de l'aide
- Problèmes courants
- Contact

## Capture des interfaces (Recommandé)

Pour générer un manuel complet avec des captures d'écran réelles, suivez ces étapes :

### Processus de capture automatique

1. Sur la page **Manuel Utilisateur**, localisez la carte bleue **"Captures d'écran des interfaces"**
2. Cliquez sur le bouton **"Capturer les interfaces"**
3. Une alerte vous informe du processus - cliquez sur **OK** pour continuer
4. Le système va automatiquement :
   - Naviguer vers 10 pages principales de l'application
   - Capturer une image de chaque interface
   - Revenir à la page du manuel
5. Un message de confirmation s'affiche une fois terminé
6. Vous voyez maintenant le nombre de captures disponibles (ex: "10 captures disponibles")

### Pages capturées automatiquement

Le système capture les interfaces suivantes :
- Tableau de bord
- Liste des projets
- Éligibilité
- Évaluation
- Formalisation
- Monitoring
- Statistiques
- Gestion des utilisateurs
- Gestion des programmes
- Paramètres de l'application

### Remarques importantes

- **Temps requis** : Le processus prend environ 20-30 secondes
- **Navigation automatique** : Ne fermez pas votre navigateur pendant la capture
- **Qualité** : Les captures sont en haute résolution (2x)
- **Stockage** : Les images sont stockées temporairement dans la mémoire du navigateur
- **Rafraîchissement** : Si vous rafraîchissez la page, les captures seront perdues

## Génération du PDF

### Étapes pour un manuel avec images

1. **D'abord** : Utilisez le bouton **"Capturer les interfaces"** (recommandé)
2. Attendez que le processus soit terminé
3. Cliquez sur le bouton **"Télécharger le Manuel PDF"**
4. La génération du PDF commence (cela peut prendre quelques secondes)
5. Le PDF est automatiquement téléchargé dans votre dossier de téléchargements

### Étapes pour un manuel sans images

1. Sur la page **Manuel Utilisateur**, cliquez directement sur **"Télécharger le Manuel PDF"**
2. Le PDF sera généré avec des emplacements réservés pour les images
3. Un message en gris clair indique où les images auraient été placées

### Caractéristiques du PDF

- **Format** : A4 (210 x 297 mm)
- **Nombre de pages** : Environ 50-70 pages (selon les images)
- **Contenu** :
  - Page de garde avec logo et titre
  - Table des matières
  - 12 sections principales avec sous-sections
  - Instructions étape par étape
  - **Captures d'écran illustrées** (si capturées)
  - Légendes sous chaque image
  - Numérotation des pages
  - En-têtes et pieds de page professionnels

### Images dans le PDF

Lorsque vous utilisez la fonction de capture :
- **13 captures d'écran** sont intégrées automatiquement
- Chaque image est **placée au bon endroit** dans le contexte
- Les images ont une **largeur optimale** pour la lisibilité
- Chaque capture a une **légende descriptive**
- Les images sont en **haute résolution** pour l'impression
- Format : PNG avec fond blanc

### Nom du fichier

Le PDF généré est nommé automatiquement avec la date du jour :
```
Manuel_Utilisateur_YYYY-MM-DD.pdf
```

Exemple : `Manuel_Utilisateur_2026-02-09.pdf`

## Utilisation du manuel

### Pour les administrateurs

- Distribuez le manuel aux nouveaux utilisateurs
- Utilisez-le pour les sessions de formation
- Mettez-le à disposition sur votre intranet
- Imprimez-le si nécessaire

### Pour les utilisateurs

- Consultez le manuel avant la première utilisation
- Gardez-le comme référence pour les fonctionnalités avancées
- Partagez-le avec vos collègues

### Pour les partenaires

- Utilisez le manuel pour former vos équipes
- Référez-vous aux sections pertinentes selon votre rôle
- Consultez la section "Aide et Support" en cas de problème

## Mise à jour du manuel

Le contenu du manuel est intégré directement dans le code de l'application. Pour mettre à jour le contenu :

1. Ouvrir le fichier `/src/pages/admin/UserManualPage.tsx`
2. Modifier le contenu de la variable `manualContent`
3. Reconstruire l'application avec `npm run build`
4. Redéployer l'application

## Notes techniques

### Bibliothèques utilisées

- **jsPDF** : Génération du PDF
- **React** : Interface utilisateur
- **Lucide React** : Icônes

### Compatibilité

- Fonctionne sur tous les navigateurs modernes
- Pas de plugin nécessaire
- Génération côté client (aucune donnée envoyée au serveur)

### Sécurité

- Aucune donnée sensible n'est incluse dans le manuel
- Le manuel contient uniquement des instructions générales
- Peut être partagé librement

## Dépannage

### Problèmes de capture d'écran

**Les captures ne se lancent pas**
1. Vérifiez que vous êtes bien connecté
2. Assurez-vous d'avoir les permissions nécessaires
3. Essayez avec un autre navigateur (Chrome recommandé)
4. Désactivez temporairement les extensions de navigateur

**Le processus s'arrête en cours de route**
1. Ne fermez pas le navigateur pendant la capture
2. Vérifiez votre connexion Internet
3. Relancez le processus de capture

**Les images capturées sont de mauvaise qualité**
1. Agrandissez votre fenêtre de navigateur avant de capturer
2. Désactivez le zoom du navigateur (100%)
3. Fermez les autres onglets pour libérer de la mémoire

**Les captures ont disparu**
1. Les captures sont stockées en mémoire uniquement
2. Ne rafraîchissez pas la page après la capture
3. Générez le PDF immédiatement après la capture
4. Si perdu, relancez simplement le processus de capture

### Problèmes de génération PDF

**Le PDF ne se télécharge pas**
1. Vérifiez que les popups ne sont pas bloqués
2. Vérifiez l'espace disque disponible
3. Essayez avec un autre navigateur
4. Videz le cache du navigateur

**Le PDF semble incomplet**
1. Attendez que la génération soit complète
2. Vérifiez votre connexion Internet
3. Rechargez la page et réessayez

**Les images ne s'affichent pas dans le PDF**
1. Vérifiez que vous avez bien capturé les interfaces d'abord
2. Le compteur devrait afficher "X captures disponibles"
3. Si les captures sont perdues, recommencez le processus
4. Essayez de générer le PDF avec moins d'images

**Erreur lors de la génération**
1. Rechargez la page
2. Déconnectez-vous et reconnectez-vous
3. Videz le cache du navigateur
4. Contactez le support technique

### Problèmes de navigation automatique

**Le système ne navigue pas automatiquement**
1. Autorisez les redirections dans votre navigateur
2. N'utilisez pas le mode navigation privée
3. Essayez avec un autre navigateur

**Pages non accessibles**
1. Vérifiez que vous avez les permissions pour toutes les pages
2. Certaines pages nécessitent des droits Admin/Manager
3. Le manuel sera généré avec les captures disponibles seulement

## Conseils d'utilisation optimale

### Pour obtenir les meilleures captures d'écran

1. **Préparez votre environnement**
   - Fermez les onglets inutiles
   - Mettez votre navigateur en plein écran (F11)
   - Désactivez le zoom (Ctrl+0 pour 100%)
   - Utilisez Chrome ou Firefox pour de meilleurs résultats

2. **Remplissez votre profil**
   - Ajoutez des données de test dans l'application
   - Créez quelques projets exemples
   - Les captures seront plus représentatives

3. **Choisissez le bon moment**
   - Effectuez les captures quand le serveur est peu chargé
   - Assurez-vous d'avoir une bonne connexion Internet
   - Prévoyez 2-3 minutes sans interruption

4. **Permissions nécessaires**
   - Connectez-vous avec un compte ADMIN pour capturer toutes les pages
   - Ou acceptez que certaines pages ne soient pas capturées

### Pour une meilleure distribution

1. **Nommage du fichier**
   - Le PDF est nommé avec la date : `Manuel_Utilisateur_2026-02-09.pdf`
   - Renommez-le si vous créez plusieurs versions
   - Exemple : `Manuel_Utilisateur_v1.0_FR.pdf`

2. **Partage**
   - Le manuel peut être partagé librement
   - Hébergez-le sur votre intranet ou serveur de fichiers
   - Envoyez-le par email aux nouveaux utilisateurs
   - Imprimez-le pour les formations en présentiel

3. **Mises à jour**
   - Générez un nouveau manuel après chaque mise à jour importante
   - Gardez l'ancien pour référence historique
   - Informez les utilisateurs des changements

### Cas d'usage recommandés

**Pour les administrateurs**
- Générez le manuel avec toutes les captures (compte ADMIN)
- Distribuez-le lors de l'onboarding
- Utilisez-le comme support de formation
- Mettez-le à jour tous les 6 mois

**Pour les formateurs**
- Imprimez le manuel pour les sessions de formation
- Projetez les pages pertinentes pendant les présentations
- Distribuez-le comme document de référence

**Pour les utilisateurs finaux**
- Consultez le manuel pour les tâches inhabituelles
- Gardez-le en favori pour accès rapide
- Référez-vous à la section pertinente selon votre rôle

## Support

Pour toute question ou problème avec le générateur de manuel :

- **Email** : support@woluma.com
- **Documentation** : Ce fichier
- **Contact administrateur** : Via l'application

## Notes techniques avancées

### Technologies utilisées

- **jsPDF** : Génération des documents PDF
- **html2canvas** : Capture d'écran des interfaces
- **React** : Interface utilisateur du générateur
- **TypeScript** : Typage fort pour la fiabilité

### Limites connues

- Les captures sont stockées en mémoire (non persistées)
- Le processus de capture nécessite JavaScript activé
- Les popups doivent être autorisées pour le téléchargement
- Taille maximale du PDF : environ 10-15 MB avec images

### Personnalisation future

Pour personnaliser le contenu du manuel :
1. Éditez le fichier `/src/pages/admin/UserManualPage.tsx`
2. Modifiez la variable `manualContent`
3. Ajoutez ou modifiez des sections selon vos besoins
4. Reconstruisez l'application avec `npm run build`

---

**Version** : 2.0
**Date de création** : 2026-02-09
**Dernière mise à jour** : 2026-02-09
**Nouveautés v2.0** : Ajout du système de captures d'écran automatiques
