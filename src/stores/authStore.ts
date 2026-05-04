import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthService, UserService } from '../services/supabaseService';
import type { SupabaseUser } from '../services/supabaseService';

export type UserRole = 'admin' | 'partner' | 'manager' | 'submitter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
}

// Fonction utilitaire pour convertir SupabaseUser vers User
const convertSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  name: supabaseUser.name,
  email: supabaseUser.email,
  role: supabaseUser.role,
  organization: supabaseUser.organization
});

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole, organization?: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      
      login: async (email, password) => {
        try {
          if (!password) {
            throw new Error('Password is required');
          }
          
          // Authentification avec Supabase
          const authData = await AuthService.signIn(email, password);
          
          if (!authData.user) {
            throw new Error('Authentication failed');
          }
          
          // Récupérer le profil utilisateur
          const userProfile = await AuthService.getCurrentUserProfile();
          
          if (!userProfile) {
            throw new Error('User profile not found');
          }
          
          const user = convertSupabaseUser(userProfile);
          const token = authData.session?.access_token || '';
          
          set({ user, isAuthenticated: true, token });
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },
      
      register: async (name, email, password, role, organization) => {
        try {
          if (!name || !email || !password || !role) {
            throw new Error('Missing required fields');
          }
          
          // Inscription avec Supabase
          const authData = await AuthService.signUp(email, password, {
            name,
            role,
            organization
          });
          
          if (!authData.user) {
            throw new Error('Registration failed');
          }
          
          // Créer le profil utilisateur
          const userProfile = await UserService.createUser({
            name,
            email,
            role: role as UserRole,
            organization,
            is_active: true,
            auth_user_id: authData.user.id
          });
          
          const user = convertSupabaseUser(userProfile);
          const token = authData.session?.access_token || '';
          
          set({ user, isAuthenticated: true, token });
          return true;
        } catch (error) {
          console.error('Registration failed:', error);
          return false;
        }
      },
      
      logout: () => {
        AuthService.signOut().catch(console.error);
        set({ user: null, isAuthenticated: false, token: null });
      },
      
      setUser: (user) => {
        set({ user });
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);