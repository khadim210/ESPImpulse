import { create } from 'zustand';
import { supabase } from '../services/supabaseService';

export interface ActivitySector {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ActivitySectorState {
  sectors: ActivitySector[];
  isLoading: boolean;
  error: string | null;
  fetchSectors: () => Promise<void>;
  addSector: (sector: Omit<ActivitySector, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSector: (id: string, updates: Partial<ActivitySector>) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  getSector: (id: string) => ActivitySector | undefined;
}

export const useActivitySectorStore = create<ActivitySectorState>((set, get) => ({
  sectors: [],
  isLoading: false,
  error: null,

  fetchSectors: async () => {
    if (!supabase) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('activity_sectors')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const sectors: ActivitySector[] = (data || []).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        isActive: s.is_active,
        displayOrder: s.display_order,
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at)
      }));

      set({ sectors, isLoading: false });
    } catch (error) {
      console.error('Error fetching activity sectors:', error);
      set({ error: 'Erreur lors du chargement des secteurs', isLoading: false });
    }
  },

  addSector: async (sector) => {
    if (!supabase) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('activity_sectors')
        .insert({
          name: sector.name,
          description: sector.description,
          is_active: sector.isActive,
          display_order: sector.displayOrder
        })
        .select()
        .single();

      if (error) throw error;

      const newSector: ActivitySector = {
        id: data.id,
        name: data.name,
        description: data.description,
        isActive: data.is_active,
        displayOrder: data.display_order,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      set(state => ({
        sectors: [...state.sectors, newSector].sort((a, b) => a.displayOrder - b.displayOrder),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error adding activity sector:', error);
      set({ error: 'Erreur lors de l\'ajout du secteur', isLoading: false });
      throw error;
    }
  },

  updateSector: async (id, updates) => {
    if (!supabase) return;

    set({ isLoading: true, error: null });
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;

      const { error } = await supabase
        .from('activity_sectors')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        sectors: state.sectors.map(s =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
        ).sort((a, b) => a.displayOrder - b.displayOrder),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating activity sector:', error);
      set({ error: 'Erreur lors de la mise a jour du secteur', isLoading: false });
      throw error;
    }
  },

  deleteSector: async (id) => {
    if (!supabase) return;

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('activity_sectors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        sectors: state.sectors.filter(s => s.id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting activity sector:', error);
      set({ error: 'Erreur lors de la suppression du secteur', isLoading: false });
      throw error;
    }
  },

  getSector: (id) => {
    return get().sectors.find(s => s.id === id);
  }
}));
