import { supabase } from './supabaseService';

export interface DocumentRequest {
  id: string;
  project_id: string;
  document_name: string;
  document_type: string;
  description: string;
  requested_by: string;
  requested_at: Date;
  due_date?: Date;
  status: 'pending' | 'submitted' | 'validated' | 'rejected';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentSubmission {
  id: string;
  request_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  submitted_by: string;
  submitted_at: Date;
  validation_status: 'pending' | 'approved' | 'rejected';
  validation_notes?: string;
  validated_by?: string;
  validated_at?: Date;
  created_at: Date;
}

export interface TechnicalSupport {
  id: string;
  project_id: string;
  support_type: 'formation' | 'conseil' | 'mentoring' | 'autre';
  title: string;
  description: string;
  scheduled_date?: Date;
  duration_hours: number;
  provider?: string;
  participants?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  completion_notes?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DisbursementPlan {
  id: string;
  project_id: string;
  total_amount: number;
  currency: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DisbursementTranche {
  id: string;
  plan_id: string;
  tranche_number: number;
  amount: number;
  percentage: number;
  scheduled_date?: Date;
  conditions?: string;
  status: 'pending' | 'in_progress' | 'disbursed' | 'cancelled';
  actual_disbursement_date?: Date;
  actual_amount?: number;
  disbursement_reference?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectArchive {
  id: string;
  project_id: string;
  archive_type: 'closure' | 'export' | 'backup';
  archive_path: string;
  archive_size: number;
  status: 'active' | 'archived' | 'deleted';
  archived_by: string;
  archived_at: Date;
  notes?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

class FormalizationService {
  async createDocumentRequest(data: Partial<DocumentRequest>): Promise<DocumentRequest | null> {
    const { data: result, error } = await supabase
      .from('document_requests')
      .insert({
        project_id: data.project_id,
        document_name: data.document_name,
        document_type: data.document_type,
        description: data.description,
        requested_by: data.requested_by,
        due_date: data.due_date,
        notes: data.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document request:', error);
      return null;
    }

    return result;
  }

  async getDocumentRequestsByProject(projectId: string): Promise<DocumentRequest[]> {
    const { data, error } = await supabase
      .from('document_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching document requests:', error);
      return [];
    }

    return data || [];
  }

  async updateDocumentRequest(id: string, updates: Partial<DocumentRequest>): Promise<boolean> {
    const { error } = await supabase
      .from('document_requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating document request:', error);
      return false;
    }

    return true;
  }

  async deleteDocumentRequest(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('document_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document request:', error);
      return false;
    }

    return true;
  }

  async uploadDocument(file: File, requestId: string): Promise<string | null> {
    const fileName = `${requestId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('formalization-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading document:', uploadError);
      return null;
    }

    return fileName;
  }

  async createDocumentSubmission(data: Partial<DocumentSubmission>): Promise<DocumentSubmission | null> {
    const { data: result, error } = await supabase
      .from('document_submissions')
      .insert({
        request_id: data.request_id,
        file_name: data.file_name,
        file_path: data.file_path,
        file_size: data.file_size,
        submitted_by: data.submitted_by
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document submission:', error);
      return null;
    }

    const updateSuccess = await this.updateDocumentRequest(data.request_id!, { status: 'submitted' });
    if (!updateSuccess) {
      console.error('Failed to update document request status to submitted');
    }

    return result;
  }

  async getDocumentSubmissions(requestId: string): Promise<DocumentSubmission[]> {
    const { data, error } = await supabase
      .from('document_submissions')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching document submissions:', error);
      return [];
    }

    return data || [];
  }

  async validateDocumentSubmission(
    submissionId: string,
    validatedBy: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('document_submissions')
      .update({
        validation_status: status,
        validation_notes: notes,
        validated_by: validatedBy,
        validated_at: new Date()
      })
      .eq('id', submissionId);

    if (error) {
      console.error('Error validating document submission:', error);
      return false;
    }

    return true;
  }

  async createTechnicalSupport(data: Partial<TechnicalSupport>): Promise<TechnicalSupport | null> {
    const { data: result, error } = await supabase
      .from('technical_support')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating technical support:', error);
      return null;
    }

    return result;
  }

  async getTechnicalSupportByProject(projectId: string): Promise<TechnicalSupport[]> {
    const { data, error } = await supabase
      .from('technical_support')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching technical support:', error);
      return [];
    }

    return data || [];
  }

  async updateTechnicalSupport(id: string, updates: Partial<TechnicalSupport>): Promise<boolean> {
    const { error } = await supabase
      .from('technical_support')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id);

    if (error) {
      console.error('Error updating technical support:', error);
      return false;
    }

    return true;
  }

  async deleteTechnicalSupport(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('technical_support')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting technical support:', error);
      return false;
    }

    return true;
  }

  async createDisbursementPlan(data: Partial<DisbursementPlan>, tranches: Partial<DisbursementTranche>[]): Promise<DisbursementPlan | null> {
    const { data: plan, error: planError } = await supabase
      .from('disbursement_plan')
      .insert({
        project_id: data.project_id,
        total_amount: data.total_amount,
        currency: data.currency,
        created_by: data.created_by
      })
      .select()
      .single();

    if (planError) {
      console.error('Error creating disbursement plan:', planError);
      return null;
    }

    const tranchesData = tranches.map((tranche, index) => ({
      plan_id: plan.id,
      tranche_number: index + 1,
      amount: tranche.amount,
      percentage: tranche.percentage,
      scheduled_date: tranche.scheduled_date,
      conditions: tranche.conditions,
      status: tranche.status || 'pending'
    }));

    const { error: tranchesError } = await supabase
      .from('disbursement_tranches')
      .insert(tranchesData);

    if (tranchesError) {
      console.error('Error creating disbursement tranches:', tranchesError);
      await supabase.from('disbursement_plan').delete().eq('id', plan.id);
      return null;
    }

    return plan;
  }

  async getDisbursementPlanByProject(projectId: string): Promise<{ plan: DisbursementPlan | null; tranches: DisbursementTranche[] }> {
    const { data: plan, error: planError } = await supabase
      .from('disbursement_plan')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (planError) {
      console.error('Error fetching disbursement plan:', planError);
      return { plan: null, tranches: [] };
    }

    if (!plan) {
      return { plan: null, tranches: [] };
    }

    const { data: tranches, error: tranchesError } = await supabase
      .from('disbursement_tranches')
      .select('*')
      .eq('plan_id', plan.id)
      .order('tranche_number', { ascending: true });

    if (tranchesError) {
      console.error('Error fetching disbursement tranches:', tranchesError);
      return { plan, tranches: [] };
    }

    return { plan, tranches: tranches || [] };
  }

  async updateDisbursementTranche(id: string, updates: Partial<DisbursementTranche>): Promise<boolean> {
    const { error } = await supabase
      .from('disbursement_tranches')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id);

    if (error) {
      console.error('Error updating disbursement tranche:', error);
      return false;
    }

    return true;
  }

  async createProjectArchive(projectId: string, archivedBy: string, notes?: string): Promise<{ success: boolean; archiveId?: string }> {
    const { data, error } = await supabase
      .from('project_archives')
      .insert({
        project_id: projectId,
        archive_type: 'export',
        archived_by: archivedBy,
        notes: notes,
        metadata: { exported_at: new Date().toISOString() }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project archive:', error);
      return { success: false };
    }

    return { success: true, archiveId: data.id };
  }

  async getDownloadUrl(filePath: string): Promise<string | null> {
    const { data } = await supabase.storage
      .from('formalization-documents')
      .createSignedUrl(filePath, 3600);

    return data?.signedUrl || null;
  }
}

export const formalizationService = new FormalizationService();
