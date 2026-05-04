import { supabase } from './supabaseService';
import type { SystemParameters } from '../stores/parametersStore';

export class ParametersService {
  static async loadParameters(): Promise<SystemParameters | null> {
    try {
      const { data, error } = await supabase
        .from('system_parameters')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapFromDatabase(data);
    } catch (error) {
      console.error('Error loading parameters:', error);
      return null;
    }
  }

  static async saveParameters(params: Partial<SystemParameters>): Promise<void> {
    try {
      const dbData = this.mapToDatabase(params);

      const { data: existingData, error: selectError } = await supabase
        .from('system_parameters')
        .select('id')
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing parameters:', selectError);
        throw new Error(`Failed to check existing parameters: ${selectError.message}`);
      }

      if (existingData) {
        const { error } = await supabase
          .from('system_parameters')
          .update(dbData)
          .eq('id', existingData.id);

        if (error) {
          console.error('Error updating parameters:', error);
          throw new Error(`Failed to update parameters: ${error.message}`);
        }
      } else {
        const { error } = await supabase
          .from('system_parameters')
          .insert([dbData]);

        if (error) {
          console.error('Error inserting parameters:', error);
          throw new Error(`Failed to insert parameters: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error saving parameters:', error);
      throw error;
    }
  }

  private static mapFromDatabase(data: any): SystemParameters {
    return {
      siteName: data.site_name || '',
      siteDescription: data.site_description || '',
      adminEmail: data.admin_email || '',
      defaultLanguage: data.default_language || 'fr',
      timezone: data.timezone || 'UTC',

      sessionTimeout: data.session_timeout || 480,
      maxLoginAttempts: data.max_login_attempts || 5,
      requireEmailVerification: data.require_email_verification || false,
      enableTwoFactor: data.enable_two_factor || false,
      enablePasswordPolicy: data.enable_password_policy || true,

      emailNotifications: data.email_notifications || false,
      notifyNewSubmissions: data.notify_new_submissions || false,
      notifyStatusChanges: data.notify_status_changes || false,
      notifyDeadlines: data.notify_deadlines || false,
      smtpServer: data.smtp_server || '',
      smtpPort: data.smtp_port || 587,
      smtpSecure: data.smtp_secure || true,

      defaultTheme: data.default_theme || 'light',
      showBranding: data.show_branding || true,
      primaryColor: data.primary_color || '#003366',
      secondaryColor: data.secondary_color || '#00BFFF',

      maxProjectsPerUser: data.max_projects_per_user || 10,
      evaluationDeadlineDays: data.evaluation_deadline_days || 30,
      maxFileSize: data.max_file_size || 10,
      enableMaintenanceMode: data.enable_maintenance_mode || false,
      enableRegistration: data.enable_registration || true,
      enableBackups: data.enable_backups || true,

      databaseType: data.database_type || 'postgresql',
      databaseMode: data.database_mode || 'demo',
      databaseHost: data.database_host || 'localhost',
      databasePort: data.database_port || 5432,
      databaseName: data.database_name || 'woluma_flow',
      databaseUsername: data.database_username || 'postgres',
      databasePassword: data.database_password || '',
      databaseSsl: data.database_ssl || false,

      supabaseUrl: data.supabase_url || '',
      supabaseAnonKey: data.supabase_anon_key || '',
      supabaseServiceRoleKey: data.supabase_service_role_key || '',
      enableSupabase: data.enable_supabase !== false,

      aiProvider: data.ai_provider || 'openai',
      openaiApiKey: data.openai_api_key || '',
      openaiModel: data.openai_model || 'gpt-4',
      openaiOrgId: data.openai_org_id || '',
      anthropicApiKey: data.anthropic_api_key || '',
      anthropicModel: data.anthropic_model || 'claude-3-opus-20240229',
      googleApiKey: data.google_api_key || '',
      googleModel: data.google_model || 'gemini-pro',
      mistralApiKey: data.mistral_api_key || '',
      mistralModel: data.mistral_model || 'mistral-large-latest',
      cohereApiKey: data.cohere_api_key || '',
      cohereModel: data.cohere_model || 'command',
      huggingfaceApiKey: data.huggingface_api_key || '',
      huggingfaceModel: data.huggingface_model || '',
      customApiUrl: data.custom_api_url || '',
      customApiKey: data.custom_api_key || '',
      customApiHeaders: data.custom_api_headers || '',
      aiTemperature: data.ai_temperature || 0.7,
      aiMaxTokens: data.ai_max_tokens || 2000,
      enableAiEvaluation: data.enable_ai_evaluation || false,
    };
  }

  private static mapToDatabase(params: Partial<SystemParameters>): any {
    const dbData: any = {};

    if (params.siteName !== undefined) dbData.site_name = params.siteName;
    if (params.siteDescription !== undefined) dbData.site_description = params.siteDescription;
    if (params.adminEmail !== undefined) dbData.admin_email = params.adminEmail;
    if (params.defaultLanguage !== undefined) dbData.default_language = params.defaultLanguage;
    if (params.timezone !== undefined) dbData.timezone = params.timezone;

    if (params.aiProvider !== undefined) dbData.ai_provider = params.aiProvider;
    if (params.openaiApiKey !== undefined) dbData.openai_api_key = params.openaiApiKey;
    if (params.openaiModel !== undefined) dbData.openai_model = params.openaiModel;
    if (params.openaiOrgId !== undefined) dbData.openai_org_id = params.openaiOrgId;
    if (params.anthropicApiKey !== undefined) dbData.anthropic_api_key = params.anthropicApiKey;
    if (params.anthropicModel !== undefined) dbData.anthropic_model = params.anthropicModel;
    if (params.googleApiKey !== undefined) dbData.google_api_key = params.googleApiKey;
    if (params.googleModel !== undefined) dbData.google_model = params.googleModel;
    if (params.mistralApiKey !== undefined) dbData.mistral_api_key = params.mistralApiKey;
    if (params.mistralModel !== undefined) dbData.mistral_model = params.mistralModel;
    if (params.cohereApiKey !== undefined) dbData.cohere_api_key = params.cohereApiKey;
    if (params.cohereModel !== undefined) dbData.cohere_model = params.cohereModel;
    if (params.huggingfaceApiKey !== undefined) dbData.huggingface_api_key = params.huggingfaceApiKey;
    if (params.huggingfaceModel !== undefined) dbData.huggingface_model = params.huggingfaceModel;
    if (params.customApiUrl !== undefined) dbData.custom_api_url = params.customApiUrl;
    if (params.customApiKey !== undefined) dbData.custom_api_key = params.customApiKey;
    if (params.customApiHeaders !== undefined) dbData.custom_api_headers = params.customApiHeaders;
    if (params.aiTemperature !== undefined) dbData.ai_temperature = params.aiTemperature;
    if (params.aiMaxTokens !== undefined) dbData.ai_max_tokens = params.aiMaxTokens;
    if (params.enableAiEvaluation !== undefined) dbData.enable_ai_evaluation = params.enableAiEvaluation;

    return dbData;
  }
}
