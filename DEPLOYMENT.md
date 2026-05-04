# Guide de Déploiement - Woluma-Flow

## Configuration des Variables d'Environnement pour Production

### 1. Configurer l'URL de l'Application

Pour que les liens de soumission publique fonctionnent correctement en production, vous **DEVEZ** configurer la variable `VITE_APP_URL` avec votre domaine de production.

#### Fichier `.env` ou `.env.production`

```env
# IMPORTANT: Remplacez par votre domaine de production (sans slash à la fin)
VITE_APP_URL=https://votre-domaine.com
```

**Exemples:**
- ✅ `VITE_APP_URL=https://app.woluma.com`
- ✅ `VITE_APP_URL=https://woluma-flow.herokuapp.com`
- ❌ `VITE_APP_URL=https://app.woluma.com/` (pas de slash final)
- ❌ `VITE_APP_URL=http://localhost:5173` (pas pour la production)

### 2. Configuration Complète

Créez un fichier `.env.production` à la racine du projet:

```env
# Supabase Configuration
VITE_DEMO_MODE=false
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
VITE_SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role

# Application Configuration
VITE_APP_URL=https://votre-domaine.com
```

### 3. Déploiement

#### Build de Production

```bash
npm run build
```

Le build créera un dossier `dist/` avec tous les fichiers optimisés.

#### Variables d'Environnement sur le Serveur

**Important:** Assurez-vous que votre serveur/plateforme a accès aux variables d'environnement.

**Pour différentes plateformes:**

##### Vercel
1. Allez dans `Settings` > `Environment Variables`
2. Ajoutez chaque variable:
   - `VITE_APP_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - etc.

##### Netlify
1. Allez dans `Site settings` > `Environment variables`
2. Ajoutez les variables comme ci-dessus

##### Heroku
```bash
heroku config:set VITE_APP_URL=https://votre-app.herokuapp.com
heroku config:set VITE_SUPABASE_URL=https://votre-projet.supabase.co
# ... etc
```

##### Docker
Créez un fichier `.env.production` et montez-le dans le container:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Les variables d'environnement seront lues depuis .env.production
CMD ["npm", "run", "preview"]
```

### 4. Vérification du Déploiement

#### Test du Lien de Soumission Publique

1. Connectez-vous à votre application en production
2. Allez dans `Admin` > `Gestion des Programmes`
3. Modifiez un programme
4. Dans l'onglet "Configuration", vérifiez la section "Lien de Soumission Publique"
5. Le lien doit commencer par votre domaine de production: `https://votre-domaine.com/submit/...`

**Avant (incorrect):**
```
https://zpiv56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--365214aa.local-credenti1.webcontainer.io/submit/xxx
```

**Après (correct):**
```
https://app.woluma.com/submit/xxx
```

6. Cliquez sur "Tester" pour ouvrir le lien dans un nouvel onglet
7. Le formulaire de soumission doit s'afficher correctement

### 5. Résolution des Problèmes

#### Le lien contient toujours "localhost" ou une URL incorrecte

**Cause:** La variable `VITE_APP_URL` n'est pas définie ou n'est pas prise en compte.

**Solution:**
1. Vérifiez que `VITE_APP_URL` est bien définie dans `.env.production`
2. Relancez le build: `npm run build`
3. Redéployez l'application
4. Videz le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)

#### Le lien de soumission donne une erreur 404

**Cause:** Le routeur ne gère pas correctement la route `/submit/:programId`

**Solution:**
1. Configurez votre serveur pour rediriger toutes les requêtes vers `index.html` (SPA mode)

**Pour Nginx:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Pour Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Pour Vercel (vercel.json):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 6. Configuration par Environnement

Vous pouvez avoir différentes configurations selon l'environnement:

#### Développement (`.env`)
```env
VITE_APP_URL=http://localhost:5173
```

#### Staging (`.env.staging`)
```env
VITE_APP_URL=https://staging.woluma.com
```

#### Production (`.env.production`)
```env
VITE_APP_URL=https://app.woluma.com
```

### 7. Sécurité

**Important:** Ne commitez **JAMAIS** les fichiers `.env` contenant des clés secrètes!

Le fichier `.gitignore` doit contenir:
```
.env
.env.local
.env.production
.env.staging
```

Utilisez les fichiers `.example` pour documenter les variables requises:
```
.env.example
.env.production.example
```

---

## Support

Pour toute question sur le déploiement, consultez:
- Documentation Vite: https://vitejs.dev/guide/env-and-mode.html
- Documentation Supabase: https://supabase.com/docs
