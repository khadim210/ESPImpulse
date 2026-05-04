import { create } from 'zustand';
import { UserService, AuthService, getSupabaseEnabled } from '../services/supabaseService';
import type { SupabaseUser } from '../services/supabaseService';

export type UserRole = 'admin' | 'partner' | 'manager' | 'submitter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  authUserId: string;
  partnerId?: string;
}

const convertSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  name: supabaseUser.name,
  email: supabaseUser.email,
  role: supabaseUser.role,
  organization: supabaseUser.organization,
  isActive: supabaseUser.is_active,
  createdAt: new Date(supabaseUser.created_at),
  lastLogin: supabaseUser.last_login ? new Date(supabaseUser.last_login) : undefined,
  authUserId: supabaseUser.auth_user_id,
  partnerId: supabaseUser.partner_id
});

interface UserManagementState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  getUser: (id: string) => User | undefined;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'authUserId'> & { password: string }) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User | null>;
  updateUserPassword: (authUserId: string, newPassword: string) => Promise<void>;
  deleteUser: (id: string) => Promise<boolean>;
  toggleUserStatus: (id: string) => Promise<boolean>;
}

export const useUserManagementStore = create<UserManagementState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('Fetching users from Supabase...');
      const supabaseUsers = await UserService.getUsers();
      console.log('Supabase users received:', supabaseUsers);
      const users = supabaseUsers.map(convertSupabaseUser);
      console.log('Converted users:', users);
      set({ users, isLoading: false });
    } catch (error) {
      console.error('Error fetching users:', error);
      set({ error: 'Failed to fetch users', isLoading: false });
    }
  },

  getUser: (id) => {
    return get().users.find(user => user.id === id);
  },

  addUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const authUser = await AuthService.signUp(userData.email, userData.password, {
        name: userData.name,
        role: userData.role,
        organization: userData.organization
      });

      const supabaseUser = await UserService.createUser({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        organization: userData.organization,
        is_active: userData.isActive,
        auth_user_id: authUser.user?.id,
        partner_id: (userData as any).partnerId || undefined
      });

      const newUser = convertSupabaseUser(supabaseUser);

      set(state => ({
        users: [...state.users, newUser],
        isLoading: false
      }));

      return newUser;
    } catch (error) {
      console.error('Error adding user:', error);
      set({ error: 'Failed to add user', isLoading: false });
      throw error;
    }
  },

  updateUser: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const supabaseUpdates: Partial<SupabaseUser> = {};
      if (updates.name) supabaseUpdates.name = updates.name;
      if (updates.email) supabaseUpdates.email = updates.email;
      if (updates.role) supabaseUpdates.role = updates.role;
      if (updates.organization) supabaseUpdates.organization = updates.organization;
      if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive;
      if (updates.partnerId !== undefined) supabaseUpdates.partner_id = updates.partnerId || undefined;

      const supabaseUser = await UserService.updateUser(id, supabaseUpdates);
      const updatedUser = convertSupabaseUser(supabaseUser);

      set(state => ({
        users: state.users.map(u => u.id === id ? updatedUser : u),
        isLoading: false
      }));

      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      set({ error: 'Failed to update user', isLoading: false });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = get().users.find(u => u.id === id);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      await UserService.deleteUser(id);

      set(state => ({
        users: state.users.filter(u => u.id !== id),
        isLoading: false
      }));

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateUserPassword: async (authUserId, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.updateUserPassword(authUserId, newPassword);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating user password:', error);
      set({ error: 'Failed to update user password', isLoading: false });
      throw error;
    }
  },

  toggleUserStatus: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = get().users.find(u => u.id === id);
      if (!user) {
        set({ error: 'User not found', isLoading: false });
        return false;
      }

      const supabaseUser = await UserService.updateUser(id, {
        is_active: !user.isActive
      });

      const updatedUser = convertSupabaseUser(supabaseUser);

      set(state => ({
        users: state.users.map(u => u.id === id ? updatedUser : u),
        isLoading: false
      }));

      return true;
    } catch (error) {
      console.error('Error toggling user status:', error);
      set({ error: 'Failed to toggle user status', isLoading: false });
      return false;
    }
  },
}));