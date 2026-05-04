import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DatabaseManager } from '../utils/database';
import { ParametersService } from '../services/parametersService';

export interface SystemParameters {
  // General
  siteName: string;
  siteDescription: string;
  adminEmail: string;
  defaultLanguage: string;
  timezone: string;

  // Security
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireEmailVerification: boolean;
  enableTwoFactor: boolean;
  enablePasswordPolicy: boolean;

  // Notifications
  emailNotifications: boolean;
  notifyNewSubmissions: boolean;
  notifyStatusChanges: boolean;
  notifyDeadlines: boolean;
  smtpServer: string;
  smtpPort: number;
  smtpSecure: boolean;

  // Appearance
  defaultTheme: 'light' | 'dark' | 'auto';
  showBranding: boolean;
  primaryColor: string;
  secondaryColor: string;

  // System
  maxProjectsPerUser: number;
  evaluationDeadlineDays: number;
  maxFileSize: number;
  enableMaintenanceMode: boolean;
  enableRegistration: boolean;
  enableBackups: boolean;

  // Database
  databaseType: 'mysql' | 'postgresql';
  databaseMode: 'demo' | 'production';
  databaseHost: string;
  databasePort: number;
  databaseName: string;
  databaseUsername: string;
  databasePassword: string;
  databaseSsl: boolean;

  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  enableSupabase: boolean;

  // AI Configuration
  aiProvider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'huggingface' | 'custom';

  // OpenAI
  openaiApiKey: string;
  openaiModel: string;
  openaiOrgId: string;

  // Anthropic
  anthropicApiKey: string;
  anthropicModel: string;

  // Google
  googleApiKey: string;
  googleModel: string;

  // Mistral
  mistralApiKey: string;
  mistralModel: string;

  // Cohere
  cohereApiKey: string;
  cohereModel: string;

  // Hugging Face
  huggingfaceApiKey: string;
  huggingfaceModel: string;

  // Custom API
  customApiUrl: string;
  customApiKey: string;
  customApiHeaders: string;

  // AI General Settings
  aiTemperature: number;
  aiMaxTokens: number;
  enableAiEvaluation: boolean;
}

interface ParametersState {
  parameters: SystemParameters;
  isLoading: boolean;
  error: string | null;
  loadParameters: () => Promise<void>;
  updateParameters: (updates: Partial<SystemParameters>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  testDatabaseConnection: () => Promise<{ success: boolean; message: string }>;
  initializeDatabase: () => Promise<void>;
  resetDatabase: () => Promise<void>;
}

const defaultParameters: SystemParameters = {
  // General
  siteName: 'Woluma-Flow',
  siteDescription: 'Plateforme d\'Évaluation et de Financement de Projets',
  adminEmail: 'admin@woluma.com',
  defaultLanguage: 'fr',
  timezone: 'UTC',

  // Security
  sessionTimeout: 480, // 8 hours
  maxLoginAttempts: 5,
  requireEmailVerification: false,
  enableTwoFactor: false,
  enablePasswordPolicy: true,

  // Notifications
  emailNotifications: true,
  notifyNewSubmissions: true,
  notifyStatusChanges: true,
  notifyDeadlines: true,
  smtpServer: '',
  smtpPort: 587,
  smtpSecure: true,

  // Appearance
  defaultTheme: 'light',
  showBranding: true,
  primaryColor: '#003366',
  secondaryColor: '#00BFFF',

  // System
  maxProjectsPerUser: 10,
  evaluationDeadlineDays: 30,
  maxFileSize: 10,
  enableMaintenanceMode: false,
  enableRegistration: true,
  enableBackups: true,

  // Database
  databaseType: 'postgresql',
  databaseMode: 'demo',
  databaseHost: 'localhost',
  databasePort: 5432,
  databaseName: 'woluma_flow',
  databaseUsername: 'postgres',
  databasePassword: '',
  databaseSsl: false,

  // Supabase
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseServiceRoleKey: '',
  enableSupabase: true,

  // AI Configuration
  aiProvider: 'openai',

  // OpenAI
  openaiApiKey: '',
  openaiModel: 'gpt-4',
  openaiOrgId: '',

  // Anthropic
  anthropicApiKey: '',
  anthropicModel: 'claude-3-opus-20240229',

  // Google
  googleApiKey: '',
  googleModel: 'gemini-pro',

  // Mistral
  mistralApiKey: '',
  mistralModel: 'mistral-large-latest',

  // Cohere
  cohereApiKey: '',
  cohereModel: 'command',

  // Hugging Face
  huggingfaceApiKey: '',
  huggingfaceModel: '',

  // Custom API
  customApiUrl: '',
  customApiKey: '',
  customApiHeaders: '',

  // AI General Settings
  aiTemperature: 0.7,
  aiMaxTokens: 2000,
  enableAiEvaluation: false,
};

export const useParametersStore = create<ParametersState>()(
  persist(
    (set, get) => ({
      parameters: { ...defaultParameters },
      isLoading: false,
      error: null,

      loadParameters: async () => {
        set({ isLoading: true, error: null });
        try {
          const loadedParams = await ParametersService.loadParameters();

          if (loadedParams) {
            set({
              parameters: loadedParams,
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Error loading parameters:', error);
          set({ error: 'Failed to load parameters', isLoading: false });
        }
      },

      updateParameters: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const updatedParams = { ...get().parameters, ...updates };

          await ParametersService.saveParameters(updates);

          set({
            parameters: updatedParams,
            isLoading: false
          });
        } catch (error) {
          console.error('Error updating parameters:', error);
          set({ error: 'Failed to update parameters', isLoading: false });
          throw error;
        }
      },

      resetToDefaults: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set({
            parameters: { ...defaultParameters },
            isLoading: false
          });
        } catch (error) {
          console.error('Error resetting parameters:', error);
          set({ error: 'Failed to reset parameters', isLoading: false });
          throw error;
        }
      },

      testDatabaseConnection: async () => {
        const { parameters } = get();
        
        if (!parameters.enableSupabase) {
          return { success: false, message: 'Supabase n\'est pas activé' };
        }

        if (!parameters.supabaseUrl || !parameters.supabaseAnonKey) {
          return { success: false, message: 'URL Supabase et clé anonyme requis' };
        }

        try {
          // Test basic connection with a simple query
          const response = await fetch(`${parameters.supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
              'apikey': parameters.supabaseAnonKey,
              'Authorization': `Bearer ${parameters.supabaseAnonKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            return { success: true, message: 'Connexion Supabase réussie' };
          } else {
            const errorText = await response.text();
            return { success: false, message: `Erreur de connexion: ${response.status} - ${errorText}` };
          }
        } catch (error) {
          return { success: false, message: `Erreur réseau: ${error instanceof Error ? error.message : 'Erreur inconnue'}` };
        }
      },

      initializeDatabase: async () => {
        // Placeholder for database initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
      },

      resetDatabase: async () => {
        // Placeholder for database reset
        await new Promise(resolve => setTimeout(resolve, 1000));
      },
    }),
    {
      name: 'parameters-storage',
    }
  )
);