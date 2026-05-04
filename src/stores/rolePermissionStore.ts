import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Permission =
  | 'dashboard.view'
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'projects.submit'
  | 'projects.change_status'
  | 'eligibility.view'
  | 'eligibility.check'
  | 'evaluation.view'
  | 'evaluation.evaluate'
  | 'formalization.view'
  | 'formalization.manage'
  | 'monitoring.view'
  | 'monitoring.manage'
  | 'statistics.view'
  | 'form_templates.view'
  | 'form_templates.create'
  | 'form_templates.edit'
  | 'form_templates.delete'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'parameters.view'
  | 'parameters.edit'
  | 'status_history.view'
  | 'profile.view'
  | 'profile.edit';

export type UserRole = 'admin' | 'partner' | 'manager' | 'submitter';

export interface RolePermissions {
  [key: string]: Permission[];
}

export interface PermissionGroup {
  id: string;
  name: string;
  permissions: {
    id: Permission;
    name: string;
    description: string;
  }[];
}

interface RolePermissionState {
  rolePermissions: RolePermissions;
  permissionGroups: PermissionGroup[];
  isLoading: boolean;
  error: string | null;
  updateRolePermissions: (role: UserRole, permissions: Permission[]) => Promise<void>;
  hasPermission: (role: UserRole, permission: Permission) => boolean;
  getRolePermissions: (role: UserRole) => Permission[];
  resetToDefaults: () => Promise<void>;
}

const defaultPermissionGroups: PermissionGroup[] = [
  {
    id: 'dashboard',
    name: 'Tableau de bord',
    permissions: [
      { id: 'dashboard.view', name: 'Voir le tableau de bord', description: 'Accès à la page principale du tableau de bord' }
    ]
  },
  {
    id: 'projects',
    name: 'Projets',
    permissions: [
      { id: 'projects.view', name: 'Voir les projets', description: 'Consulter la liste des projets' },
      { id: 'projects.create', name: 'Créer des projets', description: 'Créer de nouveaux projets' },
      { id: 'projects.edit', name: 'Modifier les projets', description: 'Modifier les projets existants' },
      { id: 'projects.delete', name: 'Supprimer les projets', description: 'Supprimer des projets' },
      { id: 'projects.submit', name: 'Soumettre les projets', description: 'Soumettre des projets pour évaluation' },
      { id: 'projects.change_status', name: 'Changer le statut', description: 'Modifier le statut des projets' }
    ]
  },
  {
    id: 'eligibility',
    name: 'Éligibilité',
    permissions: [
      { id: 'eligibility.view', name: 'Voir l\'éligibilité', description: 'Consulter les vérifications d\'éligibilité' },
      { id: 'eligibility.check', name: 'Vérifier l\'éligibilité', description: 'Effectuer des vérifications d\'éligibilité' }
    ]
  },
  {
    id: 'evaluation',
    name: 'Évaluation',
    permissions: [
      { id: 'evaluation.view', name: 'Voir les évaluations', description: 'Consulter les évaluations de projets' },
      { id: 'evaluation.evaluate', name: 'Évaluer les projets', description: 'Effectuer des évaluations de projets' }
    ]
  },
  {
    id: 'formalization',
    name: 'Formalisation',
    permissions: [
      { id: 'formalization.view', name: 'Voir la formalisation', description: 'Consulter les formalisations' },
      { id: 'formalization.manage', name: 'Gérer la formalisation', description: 'Gérer le processus de formalisation' }
    ]
  },
  {
    id: 'monitoring',
    name: 'Suivi',
    permissions: [
      { id: 'monitoring.view', name: 'Voir le suivi', description: 'Consulter le suivi des projets' },
      { id: 'monitoring.manage', name: 'Gérer le suivi', description: 'Gérer le suivi des projets' }
    ]
  },
  {
    id: 'statistics',
    name: 'Statistiques',
    permissions: [
      { id: 'statistics.view', name: 'Voir les statistiques', description: 'Consulter les statistiques' }
    ]
  },
  {
    id: 'form_templates',
    name: 'Modèles de formulaires',
    permissions: [
      { id: 'form_templates.view', name: 'Voir les modèles', description: 'Consulter les modèles de formulaires' },
      { id: 'form_templates.create', name: 'Créer des modèles', description: 'Créer de nouveaux modèles' },
      { id: 'form_templates.edit', name: 'Modifier les modèles', description: 'Modifier les modèles existants' },
      { id: 'form_templates.delete', name: 'Supprimer les modèles', description: 'Supprimer des modèles' }
    ]
  },
  {
    id: 'users',
    name: 'Gestion des utilisateurs',
    permissions: [
      { id: 'users.view', name: 'Voir les utilisateurs', description: 'Consulter la liste des utilisateurs' },
      { id: 'users.create', name: 'Créer des utilisateurs', description: 'Créer de nouveaux utilisateurs' },
      { id: 'users.edit', name: 'Modifier les utilisateurs', description: 'Modifier les utilisateurs existants' },
      { id: 'users.delete', name: 'Supprimer les utilisateurs', description: 'Supprimer des utilisateurs' }
    ]
  },
  {
    id: 'parameters',
    name: 'Paramètres système',
    permissions: [
      { id: 'parameters.view', name: 'Voir les paramètres', description: 'Consulter les paramètres système' },
      { id: 'parameters.edit', name: 'Modifier les paramètres', description: 'Modifier les paramètres système' }
    ]
  },
  {
    id: 'status_history',
    name: 'Historique des statuts',
    permissions: [
      { id: 'status_history.view', name: 'Voir l\'historique', description: 'Consulter l\'historique des changements de statut' }
    ]
  },
  {
    id: 'profile',
    name: 'Profil',
    permissions: [
      { id: 'profile.view', name: 'Voir le profil', description: 'Consulter son profil' },
      { id: 'profile.edit', name: 'Modifier le profil', description: 'Modifier son profil' }
    ]
  }
];

const defaultRolePermissions: RolePermissions = {
  admin: [
    'dashboard.view',
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.submit', 'projects.change_status',
    'eligibility.view', 'eligibility.check',
    'evaluation.view', 'evaluation.evaluate',
    'formalization.view', 'formalization.manage',
    'monitoring.view', 'monitoring.manage',
    'statistics.view',
    'form_templates.view', 'form_templates.create', 'form_templates.edit', 'form_templates.delete',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'parameters.view', 'parameters.edit',
    'status_history.view',
    'profile.view', 'profile.edit'
  ],
  manager: [
    'dashboard.view',
    'projects.view', 'projects.change_status',
    'eligibility.view', 'eligibility.check',
    'evaluation.view', 'evaluation.evaluate',
    'formalization.view', 'formalization.manage',
    'monitoring.view', 'monitoring.manage',
    'statistics.view',
    'form_templates.view', 'form_templates.create', 'form_templates.edit', 'form_templates.delete',
    'status_history.view',
    'profile.view', 'profile.edit'
  ],
  partner: [
    'dashboard.view',
    'projects.view',
    'eligibility.view',
    'evaluation.view',
    'formalization.view',
    'monitoring.view',
    'statistics.view',
    'status_history.view',
    'profile.view', 'profile.edit'
  ],
  submitter: [
    'dashboard.view',
    'projects.view', 'projects.create', 'projects.edit', 'projects.submit',
    'profile.view', 'profile.edit'
  ]
};

export const useRolePermissionStore = create<RolePermissionState>()(
  persist(
    (set, get) => ({
      rolePermissions: { ...defaultRolePermissions },
      permissionGroups: [...defaultPermissionGroups],
      isLoading: false,
      error: null,

      updateRolePermissions: async (role: UserRole, permissions: Permission[]) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            rolePermissions: {
              ...state.rolePermissions,
              [role]: permissions
            },
            isLoading: false
          }));
        } catch (error) {
          console.error('Error updating role permissions:', error);
          set({ error: 'Failed to update role permissions', isLoading: false });
          throw error;
        }
      },

      hasPermission: (role: UserRole, permission: Permission) => {
        const rolePerms = get().rolePermissions[role] || [];
        return rolePerms.includes(permission);
      },

      getRolePermissions: (role: UserRole) => {
        return get().rolePermissions[role] || [];
      },

      resetToDefaults: async () => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          set({
            rolePermissions: { ...defaultRolePermissions },
            isLoading: false
          });
        } catch (error) {
          console.error('Error resetting permissions:', error);
          set({ error: 'Failed to reset permissions', isLoading: false });
          throw error;
        }
      }
    }),
    {
      name: 'role-permissions-storage',
    }
  )
);