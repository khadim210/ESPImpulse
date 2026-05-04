import { useMemo } from 'react';
import type { Project, ProjectStatus } from '../stores/projectStore';
import type { Program, Partner } from '../stores/programStore';
import type { User } from '../stores/authStore';

interface FilterOptions {
  searchTerm?: string;
  statusFilter?: ProjectStatus | 'all';
  programFilter?: string;
  partnerFilter?: string;
  dateFilter?: 'all' | 'today' | 'week' | 'month';
  dateField?: 'submittedAt' | 'evaluatedAt' | 'createdAt';
  allowedStatuses?: ProjectStatus[];
}

interface UseFilteredProjectsResult {
  filteredProjects: Project[];
  accessiblePrograms: Program[];
  accessiblePartners: Partner[];
  statusCounts: Record<ProjectStatus | 'all', number>;
}

export function getAccessiblePrograms(
  user: User | null,
  programs: Program[],
  partners: Partner[]
): Program[] {
  if (!user) return [];

  if (user.role === 'admin') {
    return programs;
  }

  if (user.role === 'manager') {
    const managerPartners = partners.filter(p => p.assignedManagerId === user.id);
    const partnerIds = managerPartners.map(p => p.id);
    return programs.filter(p => partnerIds.includes(p.partnerId));
  }

  if (user.role === 'partner') {
    const userPartner = partners.find(p =>
      p.contactEmail === user.email ||
      p.name === user.organization
    );
    if (userPartner) {
      return programs.filter(p => p.partnerId === userPartner.id);
    }
  }

  return programs;
}

export function getAccessiblePartners(
  accessiblePrograms: Program[],
  partners: Partner[]
): Partner[] {
  const partnerIds = [...new Set(accessiblePrograms.map(p => p.partnerId))];
  return partners.filter(partner => partnerIds.includes(partner.id));
}

export function useFilteredProjects(
  projects: Project[],
  programs: Program[],
  partners: Partner[],
  user: User | null,
  options: FilterOptions = {}
): UseFilteredProjectsResult {
  const {
    searchTerm = '',
    statusFilter = 'all',
    programFilter = 'all',
    partnerFilter = 'all',
    dateFilter = 'all',
    dateField = 'submittedAt',
    allowedStatuses
  } = options;

  const accessiblePrograms = useMemo(
    () => getAccessiblePrograms(user, programs, partners),
    [user, programs, partners]
  );

  const accessiblePartners = useMemo(
    () => getAccessiblePartners(accessiblePrograms, partners),
    [accessiblePrograms, partners]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (allowedStatuses && !allowedStatuses.includes(project.status)) {
        return false;
      }

      const isAccessible = accessiblePrograms.some(p => p.id === project.programId);
      if (!isAccessible) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          project.title.toLowerCase().includes(search) ||
          project.description.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }

      if (programFilter !== 'all' && project.programId !== programFilter) {
        return false;
      }

      if (partnerFilter !== 'all') {
        const program = accessiblePrograms.find(p => p.id === project.programId);
        if (!program || program.partnerId !== partnerFilter) {
          return false;
        }
      }

      if (dateFilter !== 'all') {
        const dateValue = project[dateField];
        if (!dateValue) return false;

        const date = new Date(dateValue);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'today':
            if (diffDays !== 0) return false;
            break;
          case 'week':
            if (diffDays > 7) return false;
            break;
          case 'month':
            if (diffDays > 30) return false;
            break;
        }
      }

      return true;
    });
  }, [
    projects,
    accessiblePrograms,
    searchTerm,
    statusFilter,
    programFilter,
    partnerFilter,
    dateFilter,
    dateField,
    allowedStatuses
  ]);

  const statusCounts = useMemo(() => {
    const counts: Record<ProjectStatus | 'all', number> = {
      all: projects.length,
      draft: 0,
      submitted: 0,
      under_review: 0,
      eligible: 0,
      ineligible: 0,
      pre_selected: 0,
      selected: 0,
      formalization: 0,
      financed: 0,
      monitoring: 0,
      closed: 0,
      rejected: 0
    };

    projects.forEach(project => {
      if (counts[project.status] !== undefined) {
        counts[project.status]++;
      }
    });

    return counts;
  }, [projects]);

  return {
    filteredProjects,
    accessiblePrograms,
    accessiblePartners,
    statusCounts
  };
}

export function getStatusLabel(status: ProjectStatus | string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    submitted: 'Soumis',
    under_review: 'En revue',
    eligible: 'Eligible',
    ineligible: 'Non eligible',
    pre_selected: 'Preselectionne',
    selected: 'Selectionne',
    formalization: 'Formalisation',
    financed: 'Finance',
    monitoring: 'Suivi',
    closed: 'Cloture',
    rejected: 'Rejete'
  };
  return labels[status] || status;
}

export function calculateDateFilter(
  date: Date | undefined,
  filter: 'all' | 'today' | 'week' | 'month'
): boolean {
  if (filter === 'all') return true;
  if (!date) return false;

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  switch (filter) {
    case 'today':
      return diffDays === 0;
    case 'week':
      return diffDays <= 7;
    case 'month':
      return diffDays <= 30;
    default:
      return true;
  }
}
