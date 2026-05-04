import { create } from 'zustand';
import { FormTemplateService, getSupabaseEnabled } from '../services/supabaseService';
import type { SupabaseFormTemplate } from '../services/supabaseService';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'multiple_select' | 'currency';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  defaultValue?: boolean; // Pour les checkboxes
  acceptedFileTypes?: string; // Pour les champs file
  maxFileSize?: number; // Pour les champs file (en MB)
  allowMultipleFiles?: boolean; // Pour les champs file
  currencyCode?: string; // Pour les champs currency
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Fonction utilitaire pour convertir SupabaseFormTemplate vers FormTemplate
const convertSupabaseFormTemplate = (supabaseTemplate: SupabaseFormTemplate): FormTemplate => ({
  id: supabaseTemplate.id,
  name: supabaseTemplate.name,
  description: supabaseTemplate.description || '',
  fields: supabaseTemplate.fields,
  createdAt: new Date(supabaseTemplate.created_at),
  updatedAt: new Date(supabaseTemplate.updated_at),
  isActive: supabaseTemplate.is_active
});

interface FormTemplateState {
  templates: FormTemplate[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  getTemplate: (id: string) => FormTemplate | undefined;
  addTemplate: (template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FormTemplate>;
  updateTemplate: (id: string, updates: Partial<FormTemplate>) => Promise<FormTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (id: string) => Promise<FormTemplate | null>;
}

export const useFormTemplateStore = create<FormTemplateState>((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabaseTemplates = await FormTemplateService.getFormTemplates();
      const templates = supabaseTemplates.map(convertSupabaseFormTemplate);
      set({ templates, isLoading: false });
    } catch (error) {
      console.error('Error fetching templates:', error);
      set({ error: 'Failed to fetch templates', isLoading: false });
    }
  },

  getTemplate: (id) => {
    return get().templates.find(template => template.id === id);
  },

  addTemplate: async (templateData) => {
    set({ isLoading: true, error: null });
    try {
      const supabaseTemplate = await FormTemplateService.createFormTemplate({
        name: templateData.name,
        description: templateData.description,
        fields: templateData.fields,
        is_active: templateData.isActive
      });
      
      const newTemplate = convertSupabaseFormTemplate(supabaseTemplate);

      set(state => ({
        templates: [...state.templates, newTemplate],
        isLoading: false
      }));

      return newTemplate;
    } catch (error) {
      console.error('Error adding template:', error);
      set({ error: 'Failed to add template', isLoading: false });
      throw error;
    }
  },

  updateTemplate: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const supabaseUpdates: Partial<SupabaseFormTemplate> = {};
      if (updates.name) supabaseUpdates.name = updates.name;
      if (updates.description) supabaseUpdates.description = updates.description;
      if (updates.fields) supabaseUpdates.fields = updates.fields;
      if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive;
      
      const supabaseTemplate = await FormTemplateService.updateFormTemplate(id, supabaseUpdates);
      const updatedTemplate = convertSupabaseFormTemplate(supabaseTemplate);
      
      set(state => ({
        templates: state.templates.map(t => t.id === id ? updatedTemplate : t),
        isLoading: false
      }));

      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      set({ error: 'Failed to update template', isLoading: false });
      throw error;
    }
  },

  deleteTemplate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await FormTemplateService.deleteFormTemplate(id);
      
      set(state => ({
        templates: state.templates.filter(t => t.id !== id),
        isLoading: false
      }));

      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      set({ error: 'Failed to delete template', isLoading: false });
      return false;
    }
  },

  duplicateTemplate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const template = get().templates.find(t => t.id === id);
      if (!template) {
        set({ error: 'Template not found', isLoading: false });
        return null;
      }

      const supabaseTemplate = await FormTemplateService.createFormTemplate({
        name: `${template.name} (copie)`,
        description: template.description,
        fields: template.fields,
        is_active: template.isActive
      });
      
      const newTemplate = convertSupabaseFormTemplate(supabaseTemplate);

      set(state => ({
        templates: [...state.templates, newTemplate],
        isLoading: false
      }));

      return newTemplate;
    } catch (error) {
      console.error('Error duplicating template:', error);
      set({ error: 'Failed to duplicate template', isLoading: false });
      throw error;
    }
  }
}));