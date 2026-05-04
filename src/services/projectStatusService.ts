import { supabase } from './supabaseService';
import { canTransitionTo } from '../utils/statusTransitions';
import type { ProjectStatus } from '../stores/projectStore';
import type { UserRole } from '../stores/authStore';

export interface StatusChangeResult {
  success: boolean;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface StatusHistoryEntry {
  id: string;
  projectId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  changedAt: Date;
  comment: string | null;
  metadata: Record<string, any>;
  changerName?: string;
  projectTitle?: string;
}

export const ProjectStatusService = {
  async changeProjectStatus(
    projectId: string,
    newStatus: ProjectStatus,
    currentStatus: ProjectStatus,
    userRole: UserRole,
    comment?: string,
    metadata?: Record<string, any>
  ): Promise<StatusChangeResult> {
    const validation = canTransitionTo(currentStatus, newStatus, userRole);

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    if (validation.requiresConfirmation) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: validation.confirmationMessage,
      };
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project status:', error);
        return {
          success: false,
          error: 'Erreur lors de la mise à jour du statut',
        };
      }

      if (comment || metadata) {
        await this.addCommentToLastHistory(projectId, comment, metadata);
      }

      return { success: true };
    } catch (error) {
      console.error('Error changing project status:', error);
      return {
        success: false,
        error: 'Erreur lors du changement de statut',
      };
    }
  },

  async addCommentToLastHistory(
    projectId: string,
    comment?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: lastHistory } = await supabase
        .from('project_status_history')
        .select('id')
        .eq('project_id', projectId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .single();

      if (lastHistory) {
        await supabase
          .from('project_status_history')
          .update({
            comment: comment || null,
            metadata: metadata || {},
          })
          .eq('id', lastHistory.id);
      }
    } catch (error) {
      console.error('Error adding comment to history:', error);
    }
  },

  async getProjectHistory(projectId: string): Promise<StatusHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('project_status_history')
        .select(`
          *,
          changer:changed_by(name),
          project:project_id(title)
        `)
        .eq('project_id', projectId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Error fetching project history:', error);
        return [];
      }

      return (data || []).map((entry: any) => ({
        id: entry.id,
        projectId: entry.project_id,
        oldStatus: entry.old_status,
        newStatus: entry.new_status,
        changedBy: entry.changed_by,
        changedAt: new Date(entry.changed_at),
        comment: entry.comment,
        metadata: entry.metadata || {},
        changerName: entry.changer?.name,
        projectTitle: entry.project?.title,
      }));
    } catch (error) {
      console.error('Error fetching project history:', error);
      return [];
    }
  },

  async getAllStatusHistory(
    limit: number = 100,
    offset: number = 0
  ): Promise<StatusHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('project_status_history')
        .select(`
          *,
          changer:users!project_status_history_changed_by_fkey(name),
          project:projects(title)
        `)
        .order('changed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching all status history:', error);
        return [];
      }

      return (data || []).map((entry: any) => ({
        id: entry.id,
        projectId: entry.project_id,
        oldStatus: entry.old_status,
        newStatus: entry.new_status,
        changedBy: entry.changed_by,
        changedAt: new Date(entry.changed_at),
        comment: entry.comment,
        metadata: entry.metadata || {},
        changerName: entry.changer?.name,
        projectTitle: entry.project?.title,
      }));
    } catch (error) {
      console.error('Error fetching all status history:', error);
      return [];
    }
  },

  async getStatusHistoryStats(): Promise<{
    totalChanges: number;
    changesByStatus: Record<string, number>;
    recentChanges: number;
  }> {
    try {
      const { data: allData, error: allError } = await supabase
        .from('project_status_history')
        .select('new_status', { count: 'exact', head: false });

      const { count: recentCount, error: recentError } = await supabase
        .from('project_status_history')
        .select('*', { count: 'exact', head: true })
        .gte('changed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (allError || recentError) {
        console.error('Error fetching status history stats:', allError || recentError);
        return {
          totalChanges: 0,
          changesByStatus: {},
          recentChanges: 0,
        };
      }

      const changesByStatus: Record<string, number> = {};
      allData?.forEach((entry: any) => {
        const status = entry.new_status;
        changesByStatus[status] = (changesByStatus[status] || 0) + 1;
      });

      return {
        totalChanges: allData?.length || 0,
        changesByStatus,
        recentChanges: recentCount || 0,
      };
    } catch (error) {
      console.error('Error fetching status history stats:', error);
      return {
        totalChanges: 0,
        changesByStatus: {},
        recentChanges: 0,
      };
    }
  },
};
