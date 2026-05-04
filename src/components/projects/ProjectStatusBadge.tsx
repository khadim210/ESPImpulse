import React from 'react';
import Badge from '../ui/Badge';
import { ProjectStatus } from '../../stores/projectStore';

type StatusConfig = {
  label: string;
  variant: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline';
};

const statusConfigs: Record<ProjectStatus, StatusConfig> = {
  draft: { label: 'Brouillon', variant: 'default' },
  submitted: { label: 'Soumis', variant: 'primary' },
  eligible: { label: 'Éligible', variant: 'success' },
  ineligible: { label: 'Non Éligible', variant: 'error' },
  under_review: { label: 'En revue', variant: 'secondary' },
  pre_selected: { label: 'Présélectionné', variant: 'accent' },
  selected: { label: 'Sélectionné', variant: 'success' },
  formalization: { label: 'Formalisation', variant: 'secondary' },
  financed: { label: 'Financé', variant: 'success' },
  monitoring: { label: 'Suivi', variant: 'primary' },
  closed: { label: 'Clôturé', variant: 'default' },
  rejected: { label: 'Rejeté', variant: 'error' },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({ status, className }) => {
  const config = statusConfigs[status] || { label: 'Inconnu', variant: 'default' };
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};

export default ProjectStatusBadge;