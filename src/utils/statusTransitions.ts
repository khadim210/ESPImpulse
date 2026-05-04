import type { ProjectStatus } from '../stores/projectStore';
import type { UserRole } from '../stores/authStore';

export interface StatusTransition {
  from: ProjectStatus;
  to: ProjectStatus;
  allowedRoles: UserRole[];
  requiresValidation?: boolean;
  validationMessage?: string;
}

export const VALID_TRANSITIONS: StatusTransition[] = [
  {
    from: 'draft',
    to: 'submitted',
    allowedRoles: ['admin', 'submitter'],
  },
  {
    from: 'submitted',
    to: 'eligible',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'submitted',
    to: 'ineligible',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'eligible',
    to: 'under_review',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'eligible',
    to: 'pre_selected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'eligible',
    to: 'selected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'eligible',
    to: 'rejected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'under_review',
    to: 'pre_selected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'under_review',
    to: 'selected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'under_review',
    to: 'rejected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'pre_selected',
    to: 'selected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'pre_selected',
    to: 'rejected',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'selected',
    to: 'formalization',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'formalization',
    to: 'financed',
    allowedRoles: ['admin', 'manager'],
    requiresValidation: true,
    validationMessage: 'Tous les documents requis doivent être validés avant de passer à "financé"',
  },
  {
    from: 'financed',
    to: 'monitoring',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'monitoring',
    to: 'closed',
    allowedRoles: ['admin', 'manager'],
  },
  {
    from: 'selected',
    to: 'rejected',
    allowedRoles: ['admin'],
  },
  {
    from: 'formalization',
    to: 'selected',
    allowedRoles: ['admin'],
  },
];

export interface TransitionValidationResult {
  isValid: boolean;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export function canTransitionTo(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus,
  userRole: UserRole
): TransitionValidationResult {
  if (currentStatus === newStatus) {
    return { isValid: true };
  }

  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === newStatus
  );

  if (!transition) {
    return {
      isValid: false,
      error: `Transition invalide de "${currentStatus}" vers "${newStatus}". Cette transition n'est pas autorisée dans le workflow.`,
    };
  }

  if (!transition.allowedRoles.includes(userRole)) {
    return {
      isValid: false,
      error: `Votre rôle (${userRole}) ne vous permet pas de changer le statut de "${currentStatus}" vers "${newStatus}".`,
    };
  }

  if (transition.requiresValidation && transition.validationMessage) {
    return {
      isValid: true,
      requiresConfirmation: true,
      confirmationMessage: transition.validationMessage,
    };
  }

  return { isValid: true };
}

export function getValidNextStatuses(
  currentStatus: ProjectStatus,
  userRole: UserRole
): ProjectStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === currentStatus && t.allowedRoles.includes(userRole))
    .map((t) => t.to);
}

export function getStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    draft: 'Brouillon',
    submitted: 'Soumis',
    eligible: 'Éligible',
    ineligible: 'Non éligible',
    under_review: 'En évaluation',
    pre_selected: 'Pré-sélectionné',
    selected: 'Sélectionné',
    formalization: 'Formalisation',
    financed: 'Financé',
    monitoring: 'Suivi',
    closed: 'Clôturé',
    rejected: 'Rejeté',
  };
  return labels[status] || status;
}

export function getStatusDescription(status: ProjectStatus): string {
  const descriptions: Record<ProjectStatus, string> = {
    draft: 'Le projet est en cours de rédaction',
    submitted: 'Le projet a été soumis et attend une vérification d\'éligibilité',
    eligible: 'Le projet est éligible et prêt pour l\'évaluation',
    ineligible: 'Le projet ne remplit pas les critères d\'éligibilité',
    under_review: 'Le projet est en cours d\'évaluation',
    pre_selected: 'Le projet a été pré-sélectionné et est en attente de décision finale',
    selected: 'Le projet a été sélectionné pour financement',
    formalization: 'Le projet est en phase de formalisation (documents, contrats)',
    financed: 'Le financement a été approuvé et le projet peut démarrer',
    monitoring: 'Le projet est en cours de réalisation et fait l\'objet d\'un suivi',
    closed: 'Le projet est terminé et clôturé',
    rejected: 'Le projet a été rejeté',
  };
  return descriptions[status] || '';
}

export function getStatusWorkflowStage(status: ProjectStatus): number {
  const stages: Record<ProjectStatus, number> = {
    draft: 1,
    submitted: 2,
    eligible: 2,
    ineligible: 2,
    under_review: 3,
    pre_selected: 3,
    selected: 3,
    rejected: 3,
    formalization: 4,
    financed: 5,
    monitoring: 5,
    closed: 6,
  };
  return stages[status] || 0;
}
