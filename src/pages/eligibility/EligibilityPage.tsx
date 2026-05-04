import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { useActivitySectorStore } from '../../stores/activitySectorStore';
import { useFormTemplateStore } from '../../stores/formTemplateStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ProjectStatusBadge from '../../components/projects/ProjectStatusBadge';
import { CheckCircle, XCircle, FileText, Calendar, User, AlertTriangle, Filter, CheckSquare, Square, Sparkles, RotateCcw, Search, ChevronDown, ChevronUp, Download, FileSpreadsheet, Phone, Briefcase, CreditCard as Edit3, Save, X } from 'lucide-react';
import logoUrl from '../../assets/Logo_senegal-ucad.png';
import { ProjectStatusService } from '../../services/projectStatusService';

const EligibilityPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, fetchProjects, updateProject } = useProjectStore();
  const { programs, fetchPrograms } = useProgramStore();
  const { sectors, fetchSectors, getSector } = useActivitySectorStore();
  const { templates, fetchTemplates, getTemplate } = useFormTemplateStore();

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [eligibilityNotes, setEligibilityNotes] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSearchTerm, setResetSearchTerm] = useState('');
  const [isFormDataExpanded, setIsFormDataExpanded] = useState(false);
  const [resetStatusFilter, setResetStatusFilter] = useState<string>('eligible');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

  // Filtres
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 10;

  useEffect(() => {
    fetchProjects();
    fetchPrograms();
    fetchSectors();
    fetchTemplates();
  }, [fetchProjects, fetchPrograms, fetchSectors, fetchTemplates]);

  const getProgram = (programId: string) => {
    return programs.find(p => p.id === programId);
  };

  // Filtrage des projets
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p =>
      p.status === 'submitted' ||
      p.status === 'eligible' ||
      p.status === 'ineligible'
    );

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filtre par programme
    if (programFilter !== 'all') {
      filtered = filtered.filter(p => p.programId === programFilter);
    }

    // Filtre par date
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        if (!p.submittedAt) return false;
        const submittedDate = new Date(p.submittedAt);
        const diffDays = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'today':
            return diffDays === 0;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(term) ||
        (p.projectDescription || p.description).toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [projects, statusFilter, programFilter, dateFilter, searchTerm]);

  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * projectsPerPage,
    currentPage * projectsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, programFilter, dateFilter, searchTerm]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
    setEligibilityNotes('');
    setCheckedCriteria({});
    setIsFormDataExpanded(false);
  };

  const handleToggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const handleCriteriaCheck = (criteriaIndex: number, checked: boolean) => {
    setCheckedCriteria(prev => ({
      ...prev,
      [criteriaIndex]: checked
    }));
  };

  const handleFieldCriteriaCheck = (criteriaKey: string, checked: boolean) => {
    setCheckedCriteria(prev => ({
      ...prev,
      [criteriaKey]: checked
    }));
  };

  const generateEligibilityNotes = (
    isApproved: boolean,
    textualCriteria: string[],
    fieldCriteria: any[],
    checkedCriteria: Record<string, boolean>
  ): string => {
    const timestamp = new Date().toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short'
    });

    let notes = `=== ÉVALUATION D'ÉLIGIBILITÉ ===\n`;
    notes += `Date: ${timestamp}\n`;
    notes += `Décision: ${isApproved ? 'ÉLIGIBLE ✓' : 'NON ÉLIGIBLE ✗'}\n\n`;

    if (textualCriteria.length > 0) {
      notes += `--- CRITÈRES TEXTUELS (${textualCriteria.length}) ---\n`;
      const checkedCount = textualCriteria.filter((_, idx) => checkedCriteria[idx]).length;
      const uncheckedCount = textualCriteria.length - checkedCount;

      notes += `Validés: ${checkedCount}/${textualCriteria.length}\n`;
      if (uncheckedCount > 0) {
        notes += `Non validés: ${uncheckedCount}\n`;
      }
      notes += `\n`;

      textualCriteria.forEach((criteria, index) => {
        const isChecked = checkedCriteria[index];
        const status = isChecked ? '✓' : '✗';
        notes += `${status} ${criteria}\n`;
      });
      notes += `\n`;
    }

    if (fieldCriteria.length > 0) {
      notes += `--- CRITÈRES BASÉS SUR FORMULAIRE (${fieldCriteria.length}) ---\n`;
      const fieldCheckedCount = fieldCriteria.filter((_, idx) => checkedCriteria[`field-${idx}`]).length;
      const fieldUncheckedCount = fieldCriteria.length - fieldCheckedCount;

      notes += `Validés: ${fieldCheckedCount}/${fieldCriteria.length}\n`;
      if (fieldUncheckedCount > 0) {
        notes += `Non validés: ${fieldUncheckedCount}\n`;
      }
      notes += `\n`;

      fieldCriteria.forEach((criterion, index) => {
        const isChecked = checkedCriteria[`field-${index}`];
        const status = isChecked ? '✓' : '✗';
        const fieldName = criterion.fieldLabel || criterion.fieldName || `Champ ${index + 1}`;
        notes += `${status} ${fieldName}`;
        if (criterion.conditions) {
          notes += ` - ${criterion.conditions.operator} ${criterion.conditions.value}`;
          if (criterion.conditions.value2) {
            notes += ` et ${criterion.conditions.value2}`;
          }
        }
        notes += `\n`;
      });
      notes += `\n`;
    }

    if (!isApproved) {
      notes += `--- RAISONS DU REJET ---\n`;
      const uncheckedTextualCriteria = textualCriteria.filter((_, idx) => !checkedCriteria[idx]);
      const uncheckedFieldCriteria = fieldCriteria.filter((_, idx) => !checkedCriteria[`field-${idx}`]);

      if (uncheckedTextualCriteria.length > 0 || uncheckedFieldCriteria.length > 0) {
        notes += `Critères non respectés:\n`;
        uncheckedTextualCriteria.forEach(criteria => {
          notes += `• ${criteria}\n`;
        });
        uncheckedFieldCriteria.forEach((criterion, index) => {
          const fieldName = criterion.fieldLabel || criterion.fieldName || `Champ ${index + 1}`;
          notes += `• ${fieldName}`;
          if (criterion.conditions) {
            notes += ` (${criterion.conditions.operator} ${criterion.conditions.value}`;
            if (criterion.conditions.value2) {
              notes += ` et ${criterion.conditions.value2}`;
            }
            notes += `)`;
          }
          notes += `\n`;
        });
        notes += `\n`;
      }
      notes += `Notes complémentaires:\n`;
    } else {
      notes += `--- NOTES COMPLÉMENTAIRES ---\n`;
    }

    return notes;
  };

  const handleApprove = async () => {
    if (!selectedProject || !user) return;

    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;

    const program = getProgram(project.programId);
    const textualCriteria = program?.eligibilityCriteria?.split('\n').filter(c => c.trim()) || [];
    const allFieldCriteria = program?.fieldEligibilityCriteria || [];
    const fieldCriteria = allFieldCriteria.filter(fc => fc.isEligibilityCriteria === true);

    const allTextualChecked = textualCriteria.every((_, index) => checkedCriteria[index]);
    const allFieldChecked = fieldCriteria.every((_, index) => checkedCriteria[`field-${index}`]);

    if ((!allTextualChecked && textualCriteria.length > 0) || (!allFieldChecked && fieldCriteria.length > 0)) {
      alert('Veuillez cocher tous les critères d\'éligibilité avant d\'approuver.');
      return;
    }

    setIsProcessing(true);
    try {
      const generatedNotes = generateEligibilityNotes(true, textualCriteria, fieldCriteria, checkedCriteria);
      const finalNotes = generatedNotes + (eligibilityNotes.trim() ? `\n${eligibilityNotes}` : '');

      const result = await ProjectStatusService.changeProjectStatus(
        selectedProject,
        'eligible',
        project.status,
        user.role,
        'Projet approuvé comme éligible'
      );

      if (result.success) {
        await updateProject(selectedProject, {
          eligibilityNotes: finalNotes,
          eligibilityCheckedBy: user.id,
          eligibilityCheckedAt: new Date().toISOString()
        });

        alert('Projet marqué comme éligible avec succès!');
        setSelectedProject(null);
        setEligibilityNotes('');
        setCheckedCriteria({});
        await fetchProjects();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error approving project:', error);
      alert('Erreur lors de l\'approbation du projet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProject || !user) return;

    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;

    const program = getProgram(project.programId);
    const textualCriteria = program?.eligibilityCriteria?.split('\n').filter(c => c.trim()) || [];
    const allFieldCriteria = program?.fieldEligibilityCriteria || [];
    const fieldCriteria = allFieldCriteria.filter(fc => fc.isEligibilityCriteria === true);

    setIsProcessing(true);
    try {
      const generatedNotes = generateEligibilityNotes(false, textualCriteria, fieldCriteria, checkedCriteria);
      const finalNotes = generatedNotes + (eligibilityNotes.trim() ? `\n${eligibilityNotes}` : '');

      const result = await ProjectStatusService.changeProjectStatus(
        selectedProject,
        'ineligible',
        project.status,
        user.role,
        'Projet marqué comme non éligible'
      );

      if (result.success) {
        await updateProject(selectedProject, {
          eligibilityNotes: finalNotes,
          eligibilityCheckedBy: user.id,
          eligibilityCheckedAt: new Date().toISOString()
        });

        alert('Projet marqué comme non éligible.');
        setSelectedProject(null);
        setEligibilityNotes('');
        setCheckedCriteria({});
        await fetchProjects();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error rejecting project:', error);
      alert('Erreur lors du rejet du projet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedProjects.size === 0 || !user) return;

    if (!window.confirm(`Voulez-vous approuver ${selectedProjects.size} projet(s) ?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const promises = Array.from(selectedProjects).map(projectId =>
        updateProject(projectId, {
          status: 'eligible',
          eligibilityNotes: batchNotes || 'Approuvé en lot',
          eligibilityCheckedBy: user.id,
          eligibilityCheckedAt: new Date().toISOString()
        })
      );

      await Promise.all(promises);
      alert(`${selectedProjects.size} projet(s) approuvé(s) avec succès!`);
      setSelectedProjects(new Set());
      setBatchNotes('');
    } catch (error) {
      console.error('Error batch approving projects:', error);
      alert('Erreur lors de l\'approbation par lot.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedProjects.size === 0 || !user) return;

    if (!batchNotes.trim()) {
      alert('Veuillez fournir une raison pour le rejet par lot.');
      return;
    }

    if (!window.confirm(`Voulez-vous rejeter ${selectedProjects.size} projet(s) ?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const promises = Array.from(selectedProjects).map(projectId =>
        updateProject(projectId, {
          status: 'ineligible',
          eligibilityNotes: batchNotes,
          eligibilityCheckedBy: user.id,
          eligibilityCheckedAt: new Date().toISOString()
        })
      );

      await Promise.all(promises);
      alert(`${selectedProjects.size} projet(s) rejeté(s) avec succès!`);
      setSelectedProjects(new Set());
      setBatchNotes('');
    } catch (error) {
      console.error('Error batch rejecting projects:', error);
      alert('Erreur lors du rejet par lot.');
    } finally {
      setIsProcessing(false);
    }
  };

  const evaluateFieldCriteria = (
    formData: Record<string, unknown> | undefined,
    fieldCriteria: Array<{
      fieldId?: string;
      fieldName?: string;
      fieldLabel?: string;
      conditions?: { operator: string; value: string; value2?: string };
      isEligibilityCriteria?: boolean;
    }>
  ): { passed: number; failed: number; results: Array<{ field: string; passed: boolean; reason: string }> } => {
    if (!formData || fieldCriteria.length === 0) {
      return { passed: 0, failed: 0, results: [] };
    }

    const results: Array<{ field: string; passed: boolean; reason: string }> = [];
    let passed = 0;
    let failed = 0;

    for (const criterion of fieldCriteria) {
      const fieldKey = criterion.fieldId || criterion.fieldName || '';
      const fieldValue = formData[fieldKey];
      const fieldLabel = criterion.fieldLabel || criterion.fieldName || fieldKey;

      if (!criterion.conditions) {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          passed++;
          results.push({ field: fieldLabel, passed: true, reason: 'Champ renseigne' });
        } else {
          failed++;
          results.push({ field: fieldLabel, passed: false, reason: 'Champ non renseigne' });
        }
        continue;
      }

      const { operator, value, value2 } = criterion.conditions;
      const numericFieldValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : (fieldValue as number);
      const numericValue = parseFloat(value);
      const numericValue2 = value2 ? parseFloat(value2) : undefined;

      let criterionPassed = false;
      let reason = '';

      switch (operator) {
        case 'equals':
        case '=':
          criterionPassed = String(fieldValue).toLowerCase() === String(value).toLowerCase();
          reason = criterionPassed ? `Valeur egale a "${value}"` : `Valeur "${fieldValue}" differente de "${value}"`;
          break;
        case 'not_equals':
        case '!=':
          criterionPassed = String(fieldValue).toLowerCase() !== String(value).toLowerCase();
          reason = criterionPassed ? `Valeur differente de "${value}"` : `Valeur egale a "${value}"`;
          break;
        case 'greater_than':
        case '>':
          criterionPassed = !isNaN(numericFieldValue) && numericFieldValue > numericValue;
          reason = criterionPassed ? `${numericFieldValue} > ${numericValue}` : `${numericFieldValue} <= ${numericValue}`;
          break;
        case 'greater_than_or_equal':
        case '>=':
          criterionPassed = !isNaN(numericFieldValue) && numericFieldValue >= numericValue;
          reason = criterionPassed ? `${numericFieldValue} >= ${numericValue}` : `${numericFieldValue} < ${numericValue}`;
          break;
        case 'less_than':
        case '<':
          criterionPassed = !isNaN(numericFieldValue) && numericFieldValue < numericValue;
          reason = criterionPassed ? `${numericFieldValue} < ${numericValue}` : `${numericFieldValue} >= ${numericValue}`;
          break;
        case 'less_than_or_equal':
        case '<=':
          criterionPassed = !isNaN(numericFieldValue) && numericFieldValue <= numericValue;
          reason = criterionPassed ? `${numericFieldValue} <= ${numericValue}` : `${numericFieldValue} > ${numericValue}`;
          break;
        case 'between':
          if (numericValue2 !== undefined) {
            criterionPassed = !isNaN(numericFieldValue) && numericFieldValue >= numericValue && numericFieldValue <= numericValue2;
            reason = criterionPassed ? `${numericFieldValue} entre ${numericValue} et ${numericValue2}` : `${numericFieldValue} hors de [${numericValue}, ${numericValue2}]`;
          }
          break;
        case 'contains':
          criterionPassed = String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          reason = criterionPassed ? `Contient "${value}"` : `Ne contient pas "${value}"`;
          break;
        case 'not_empty':
          criterionPassed = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
          reason = criterionPassed ? 'Champ renseigne' : 'Champ vide';
          break;
        default:
          criterionPassed = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
          reason = criterionPassed ? 'Champ renseigne' : 'Champ non renseigne';
      }

      if (criterionPassed) {
        passed++;
      } else {
        failed++;
      }
      results.push({ field: fieldLabel, passed: criterionPassed, reason });
    }

    return { passed, failed, results };
  };

  const handleAutoEvaluate = async () => {
    if (selectedProjects.size === 0) {
      alert('Veuillez selectionner au moins un projet.');
      return;
    }

    if (!window.confirm(`Voulez-vous evaluer automatiquement l'eligibilite de ${selectedProjects.size} projet(s) ?`)) {
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;
    const evaluationDetails: string[] = [];

    try {
      for (const projectId of Array.from(selectedProjects)) {
        try {
          const project = projects.find(p => p.id === projectId);
          if (!project) {
            failCount++;
            evaluationDetails.push(`${projectId}: Projet non trouve`);
            continue;
          }

          const program = getProgram(project.programId);
          if (!program) {
            failCount++;
            evaluationDetails.push(`${project.title}: Programme non trouve`);
            continue;
          }

          const textualCriteria = program.eligibilityCriteria?.split('\n').filter(c => c.trim()) || [];
          const allFieldCriteria = program.fieldEligibilityCriteria || [];
          const fieldCriteria = allFieldCriteria.filter(fc => fc.isEligibilityCriteria === true);
          const totalCriteria = textualCriteria.length + fieldCriteria.length;

          if (totalCriteria === 0) {
            failCount++;
            evaluationDetails.push(`${project.title}: Aucun critere d'eligibilite defini`);
            continue;
          }

          const fieldEvaluation = evaluateFieldCriteria(
            project.formData as Record<string, unknown> | undefined,
            fieldCriteria
          );

          const fieldCriteriaPassed = fieldEvaluation.failed === 0;
          const isEligible = fieldCriteriaPassed;

          let notes = `=== EVALUATION AUTOMATIQUE D'ELIGIBILITE ===\n`;
          notes += `Date: ${new Date().toLocaleString('fr-FR')}\n`;
          notes += `Decision: ${isEligible ? 'ELIGIBLE' : 'NON ELIGIBLE'}\n\n`;

          if (textualCriteria.length > 0) {
            notes += `--- CRITERES TEXTUELS (${textualCriteria.length}) ---\n`;
            notes += `Note: Les criteres textuels necessitent une verification manuelle.\n`;
            textualCriteria.forEach((c, i) => {
              notes += `${i + 1}. ${c}\n`;
            });
            notes += `\n`;
          }

          if (fieldCriteria.length > 0) {
            notes += `--- CRITERES DE CHAMPS (${fieldCriteria.length}) ---\n`;
            notes += `Valides: ${fieldEvaluation.passed}/${fieldCriteria.length}\n`;
            if (fieldEvaluation.failed > 0) {
              notes += `Echoues: ${fieldEvaluation.failed}\n`;
            }
            notes += `\n`;
            fieldEvaluation.results.forEach(r => {
              const status = r.passed ? 'OK' : 'ECHEC';
              notes += `[${status}] ${r.field}: ${r.reason}\n`;
            });
          }

          await updateProject(projectId, {
            status: isEligible ? 'eligible' : 'ineligible',
            eligibilityNotes: notes,
            eligibilityCheckedBy: user!.id,
            eligibilityCheckedAt: new Date().toISOString()
          });

          successCount++;
          evaluationDetails.push(`${project.title}: ${isEligible ? 'Eligible' : 'Non eligible'}`);
        } catch (error) {
          console.error(`Erreur evaluation projet ${projectId}:`, error);
          failCount++;
        }
      }

      await fetchProjects();
      alert(`Evaluation terminee!\n${successCount} projet(s) evalue(s)\n${failCount} erreur(s)`);
      setSelectedProjects(new Set());
    } catch (error) {
      console.error('Erreur evaluation automatique:', error);
      alert('Erreur lors de l\'evaluation automatique.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetProjects = async (projectIds: string[]) => {
    if (projectIds.length === 0) return;

    if (!window.confirm(`Voulez-vous réinitialiser ${projectIds.length} projet(s) vers le statut "Soumis" ?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const promises = projectIds.map(projectId =>
        updateProject(projectId, {
          status: 'submitted',
          eligibilityNotes: undefined,
          eligibilityCheckedBy: undefined,
          eligibilityCheckedAt: undefined
        })
      );

      await Promise.all(promises);
      alert(`${projectIds.length} projet(s) réinitialisé(s) avec succès!`);
      setShowResetModal(false);
      setResetSearchTerm('');
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
      alert('Erreur lors de la réinitialisation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getResettableProjects = () => {
    return projects.filter(p => {
      const matchesStatus = resetStatusFilter === 'all' || p.status === resetStatusFilter;
      const matchesSearch = !resetSearchTerm ||
        p.title.toLowerCase().includes(resetSearchTerm.toLowerCase()) ||
        (p.projectDescription || p.description).toLowerCase().includes(resetSearchTerm.toLowerCase());

      return (p.status === 'eligible' || p.status === 'ineligible') && matchesStatus && matchesSearch;
    });
  };

  const handleOpenEditModal = () => {
    if (!selectedProjectData) return;
    setEditFormData({
      title: selectedProjectData.title || '',
      description: selectedProjectData.description || '',
      budget: selectedProjectData.budget || 0,
      submitterPhone: selectedProjectData.submitterPhone || '',
      submitterName: selectedProjectData.submitterName || '',
      projectDescription: selectedProjectData.projectDescription || '',
      projectAgeMonths: selectedProjectData.projectAgeMonths || '',
      activitySectorId: selectedProjectData.activitySectorId || '',
      formData: selectedProjectData.formData || {}
    });
    setShowEditModal(true);
  };

  const handleSaveProjectEdit = async () => {
    if (!selectedProject || !selectedProjectData) return;

    setIsProcessing(true);
    try {
      await updateProject(selectedProject, {
        title: editFormData.title,
        description: editFormData.description,
        budget: Number(editFormData.budget),
        submitterPhone: editFormData.submitterPhone || undefined,
        submitterName: editFormData.submitterName || undefined,
        projectDescription: editFormData.projectDescription || undefined,
        projectAgeMonths: editFormData.projectAgeMonths ? Number(editFormData.projectAgeMonths) : undefined,
        activitySectorId: editFormData.activitySectorId || undefined,
        formData: editFormData.formData
      });

      await fetchProjects();
      setShowEditModal(false);
      alert('Projet mis a jour avec succes!');
    } catch (error) {
      console.error('Erreur mise a jour projet:', error);
      alert('Erreur lors de la mise a jour du projet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormDataFieldChange = (fieldKey: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [fieldKey]: value
      }
    }));
  };

  const getEligibilityStatus = (project: any) => {
    const program = getProgram(project.programId);
    if (!program) return 'N/A';

    const textualCriteria = program.eligibilityCriteria?.split('\n').filter(c => c.trim()) || [];
    const allFieldCriteria = program.fieldEligibilityCriteria || [];
    const fieldCriteria = allFieldCriteria.filter(fc => fc.isEligibilityCriteria === true);
    const totalCriteria = textualCriteria.length + fieldCriteria.length;

    if (totalCriteria === 0) return 'Aucun critère';

    if (project.status === 'eligible') {
      return `✓ Éligible (${totalCriteria} critères validés)`;
    } else if (project.status === 'ineligible') {
      return `✗ Non éligible`;
    } else if (project.status === 'submitted') {
      return `En attente (${totalCriteria} critères à vérifier)`;
    } else {
      return `Statut: ${project.status}`;
    }
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const exportData = filteredProjects.map(project => {
      const program = getProgram(project.programId);
      const sector = getSector(project.activitySectorId || '');
      const textualCriteria = program?.eligibilityCriteria?.split('\n').filter(c => c.trim()) || [];
      const allFieldCriteria = program?.fieldEligibilityCriteria || [];
      const fieldCriteria = allFieldCriteria.filter(fc => fc.isEligibilityCriteria === true);
      const totalCriteria = textualCriteria.length + fieldCriteria.length;

      let eligibilityDetail = '';
      if (totalCriteria > 0) {
        eligibilityDetail = `Total: ${totalCriteria} criteres (${textualCriteria.length} textuels, ${fieldCriteria.length} champs)`;
      } else {
        eligibilityDetail = 'Aucun critere defini';
      }

      return {
        'Titre': project.title,
        'Nom du porteur': project.submitterName || 'N/A',
        'Email du porteur': project.submitterEmail || 'N/A',
        'Telephone': project.submitterPhone || 'N/A',
        'Secteur d\'activite': sector?.name || 'N/A',
        'Description': project.projectDescription || project.description || 'N/A',
        'Programme': program?.name || 'N/A',
        'Budget': project.budget,
        'Statut': project.status,
        'Etat Eligibilite': getEligibilityStatus(project),
        'Details Criteres': eligibilityDetail,
        'Date de soumission': new Date(project.submittedAt || project.createdAt).toLocaleDateString('fr-FR'),
        'Verifie par': project.eligibilityCheckedBy || 'Non verifie',
        'Date de verification': project.eligibilityCheckedAt
          ? new Date(project.eligibilityCheckedAt).toLocaleDateString('fr-FR')
          : 'N/A',
        'Notes': project.eligibilityNotes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 25 },
      { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
      { wch: 40 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 50 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Projets');

    const criteriaData: Record<string, unknown>[] = [];
    const addedPrograms = new Set<string>();

    filteredProjects.forEach(project => {
      const program = getProgram(project.programId);
      if (program && !addedPrograms.has(program.id)) {
        addedPrograms.add(program.id);

        const textualCriteria = program.eligibilityCriteria?.split('\n').filter(c => c.trim()) || [];
        textualCriteria.forEach((criterion, index) => {
          criteriaData.push({
            'Programme': program.name,
            'Type': 'Textuel',
            'Numero': index + 1,
            'Critere': criterion,
          });
        });

        const allFieldCriteria = program.fieldEligibilityCriteria || [];
        const fieldCriteria = allFieldCriteria.filter(fc => fc.isEligibilityCriteria === true);
        fieldCriteria.forEach((criterion, index) => {
          criteriaData.push({
            'Programme': program.name,
            'Type': 'Champ de formulaire',
            'Numero': textualCriteria.length + index + 1,
            'Critere': `${criterion.fieldLabel} (${criterion.fieldName})`,
          });
        });
      }
    });

    if (criteriaData.length > 0) {
      const wsCriteria = XLSX.utils.json_to_sheet(criteriaData);
      XLSX.utils.book_append_sheet(wb, wsCriteria, 'Criteres eligibilite');
    }

    XLSX.writeFile(wb, `Projets_Eligibilite_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    let logoBase64: string | null = null;
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { /* ignore */ }

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, 8, 25, 25);
    }

    doc.setFontSize(18);
    doc.text('Liste des Projets - Etat Eligibilite', margin + 30, 20);

    doc.setFontSize(10);
    doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, margin + 30, 28);
    doc.text(`Total: ${filteredProjects.length} projet(s)`, margin, 40);

    const summaryData = filteredProjects.map(project => {
      const program = getProgram(project.programId);
      const sector = getSector(project.activitySectorId || '');
      return [
        project.title.length > 30 ? project.title.substring(0, 27) + '...' : project.title,
        project.submitterName || 'N/A',
        sector?.name || 'N/A',
        program?.name || 'N/A',
        project.status
      ];
    });

    autoTable(doc, {
      startY: 46,
      head: [['Titre', 'Porteur', 'Secteur', 'Programme', 'Statut']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    });

    filteredProjects.forEach((project, index) => {
      doc.addPage();
      const program = getProgram(project.programId);
      const sector = getSector(project.activitySectorId || '');
      const template = program?.formTemplateId ? getTemplate(program.formTemplateId) : null;

      let yPos = 20;

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`Projet ${index + 1}/${filteredProjects.length}: ${project.title}`, margin, 8);

      doc.setTextColor(0, 0, 0);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Informations du Porteur', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const porteurData = [
        ['Nom du porteur', project.submitterName || 'N/A'],
        ['Email', project.submitterEmail || 'N/A'],
        ['Telephone', project.submitterPhone || 'N/A'],
        ['Secteur d\'activite', sector?.name || 'N/A']
      ];

      autoTable(doc, {
        startY: yPos,
        body: porteurData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 130 }
        },
        margin: { left: margin, right: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Informations du Projet', margin, yPos);
      yPos += 8;

      const projetData = [
        ['Programme', program?.name || 'N/A'],
        ['Statut', project.status],
        ['Budget', project.budget.toLocaleString('fr-FR') + ' FCFA'],
        ['Date de soumission', project.submittedAt ? new Date(project.submittedAt).toLocaleDateString('fr-FR') : 'N/A'],
        ['Description', project.projectDescription || project.description || 'N/A']
      ];

      autoTable(doc, {
        startY: yPos,
        body: projetData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 130 }
        },
        margin: { left: margin, right: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      if (template && template.fields && template.fields.length > 0 && project.formData) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Formulaire de Soumission', margin, yPos);
        yPos += 8;

        const formDataRows: [string, string][] = [];

        template.fields.forEach(field => {
          const value = project.formData?.[field.id] ?? project.formData?.[field.name];
          let displayValue = 'Non renseigne';

          if (value !== undefined && value !== null && value !== '') {
            if (field.type === 'file') {
              if (Array.isArray(value)) {
                displayValue = value.map((f: any) => f.name || 'Fichier').join(', ');
              } else if (typeof value === 'object' && value.name) {
                displayValue = value.name;
              }
            } else if (field.type === 'checkbox') {
              displayValue = value ? 'Oui' : 'Non';
            } else if (field.type === 'multiple_select' && Array.isArray(value)) {
              displayValue = value.join(', ');
            } else if (field.type === 'date' && value) {
              displayValue = new Date(value).toLocaleDateString('fr-FR');
            } else {
              displayValue = String(value);
            }
          }

          if (displayValue.length > 100) {
            displayValue = displayValue.substring(0, 97) + '...';
          }

          formDataRows.push([field.label || field.name, displayValue]);
        });

        autoTable(doc, {
          startY: yPos,
          body: formDataRows,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { cellWidth: 120 }
          },
          margin: { left: margin, right: margin },
          didDrawPage: () => {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
              `Page ${doc.getNumberOfPages()}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
            doc.setTextColor(0, 0, 0);
          }
        });
      }
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} sur ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save(`Projets_Eligibilite_Complet_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const selectedProjectData = selectedProject ? projects.find(p => p.id === selectedProject) : null;
  const selectedProgram = selectedProjectData ? getProgram(selectedProjectData.programId) : null;

  // Combine textual and field-based criteria
  const textualCriteria = selectedProgram?.eligibilityCriteria?.split('\n').filter(c => c.trim()) || [];
  const allFieldCriteria = selectedProgram?.fieldEligibilityCriteria || [];
  const fieldCriteria = allFieldCriteria.filter(fc => fc.isEligibilityCriteria === true);
  const totalCriteriaCount = textualCriteria.length + fieldCriteria.length;
  const criteriaList = textualCriteria;

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Accès Restreint
              </h3>
              <p className="text-gray-600">
                Seuls les administrateurs et managers peuvent accéder à la page de vérification d'éligibilité.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vérification d'Éligibilité</h1>
        <p className="mt-2 text-gray-600">
          Vérifiez l'éligibilité des projets soumis selon les critères définis.
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-500 mr-2" />
              <CardTitle>Filtres</CardTitle>
            </div>
            {selectedProjects.size > 0 && (
              <span className="text-sm font-medium text-blue-600">
                {selectedProjects.size} projet(s) sélectionné(s)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recherche
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Titre ou description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="submitted">Soumis</option>
                <option value="eligible">Éligible</option>
                <option value="ineligible">Non éligible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Programme
              </label>
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les programmes</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de soumission
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setProgramFilter('all');
                  setDateFilter('all');
                  setSearchTerm('');
                  setSelectedProjects(new Set());
                }}
                className="w-full"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setShowResetModal(true)}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Réinitialiser des projets
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            disabled={filteredProjects.length === 0}
          >
            Exporter Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            leftIcon={<Download className="h-4 w-4" />}
            disabled={filteredProjects.length === 0}
          >
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Actions par lot */}
      {selectedProjects.size > 0 && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Actions par lot ({selectedProjects.size} projet(s))
                </h3>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Notes pour l'ensemble des projets sélectionnés (obligatoire pour rejet)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 ml-4">
                <Button
                  variant="primary"
                  onClick={handleAutoEvaluate}
                  isLoading={isProcessing}
                  leftIcon={<Sparkles className="h-5 w-5" />}
                >
                  Évaluation Auto
                </Button>
                <Button
                  variant="success"
                  onClick={handleBatchApprove}
                  isLoading={isProcessing}
                  leftIcon={<CheckCircle className="h-5 w-5" />}
                >
                  Approuver Tout
                </Button>
                <Button
                  variant="danger"
                  onClick={handleBatchReject}
                  isLoading={isProcessing}
                  leftIcon={<XCircle className="h-5 w-5" />}
                >
                  Rejeter Tout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Projets</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredProjects.length} projet(s) affiché(s) sur {projects.length} au total
                  </p>
                </div>
                <button
                  onClick={handleSelectAll}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedProjects.size === filteredProjects.length ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Tout désélectionner
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Tout sélectionner
                    </>
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Aucun projet correspondant aux filtres</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedProjects.map(project => {
                    const program = getProgram(project.programId);
                    const isSelected = selectedProjects.has(project.id);
                    const isCurrentProject = selectedProject === project.id;

                    return (
                      <div
                        key={project.id}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          isCurrentProject
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProject(project.id)}
                            className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                          <button
                            onClick={() => handleSelectProject(project.id)}
                            className="flex-1 text-left"
                          >
                            <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {project.projectDescription || project.description}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{program?.name || 'Programme inconnu'}</span>
                              <ProjectStatusBadge status={project.status} />
                            </div>
                            {project.submittedAt && (
                              <div className="flex items-center text-xs text-gray-400 mt-2">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(project.submittedAt).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        {(currentPage - 1) * projectsPerPage + 1}-{Math.min(currentPage * projectsPerPage, filteredProjects.length)} sur {filteredProjects.length}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-50"
                        >
                          Prec.
                        </button>
                        <span className="px-2 py-1 text-xs">
                          {currentPage}/{totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-50"
                        >
                          Suiv.
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedProjectData ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">Sélectionnez un projet pour commencer la vérification individuelle</p>
                  <p className="text-sm mt-2">ou utilisez les cases à cocher pour les actions par lot</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Détails du Projet</CardTitle>
                    <div className="flex items-center gap-3">
                      <ProjectStatusBadge status={selectedProjectData.status} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenEditModal}
                        leftIcon={<Edit3 className="h-4 w-4" />}
                      >
                        Modifier
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedProjectData.title}</h3>
                    <p className="text-gray-600 mt-2">{selectedProjectData.projectDescription || selectedProjectData.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Soumis le:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {selectedProjectData.submittedAt
                          ? new Date(selectedProjectData.submittedAt).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Programme:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {selectedProgram?.name || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {(selectedProjectData.submitterPhone || selectedProjectData.activitySectorId || selectedProjectData.projectAgeMonths) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t bg-blue-50 p-3 rounded-lg">
                      {selectedProjectData.submitterPhone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 text-blue-500 mr-2" />
                          <div>
                            <span className="text-gray-600">Telephone:</span>
                            <span className="ml-2 font-medium text-gray-900">{selectedProjectData.submitterPhone}</span>
                          </div>
                        </div>
                      )}
                      {selectedProjectData.activitySectorId && (
                        <div className="flex items-center text-sm">
                          <Briefcase className="h-4 w-4 text-blue-500 mr-2" />
                          <div>
                            <span className="text-gray-600">Secteur:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {getSector(selectedProjectData.activitySectorId)?.name || 'N/A'}
                            </span>
                          </div>
                        </div>
                      )}
                      {selectedProjectData.projectAgeMonths !== undefined && selectedProjectData.projectAgeMonths !== null && (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                          <div>
                            <span className="text-gray-600">Duree d'existence:</span>
                            <span className="ml-2 font-medium text-gray-900">{selectedProjectData.projectAgeMonths} mois</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedProjectData.projectDescription && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-2">Description du projet</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                        {selectedProjectData.projectDescription}
                      </p>
                    </div>
                  )}

                  {selectedProjectData.formData && (
                    <div className="pt-4 border-t">
                      <button
                        onClick={() => setIsFormDataExpanded(!isFormDataExpanded)}
                        className="flex items-center justify-between w-full font-medium text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        <span className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Données du Formulaire
                        </span>
                        {isFormDataExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {isFormDataExpanded && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(selectedProjectData.formData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Critères d'Éligibilité</span>
                    {totalCriteriaCount > 0 && (
                      <span className="text-sm font-normal bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        {totalCriteriaCount} critère{totalCriteriaCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Vérifiez tous les critères avant de prendre une décision
                  </p>
                </CardHeader>
                <CardContent>
                  {totalCriteriaCount === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
                      <p className="text-gray-600">
                        Aucun critère d'éligibilité défini pour ce programme.
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Vous pouvez quand même approuver ou rejeter ce projet manuellement.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {textualCriteria.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Critères textuels ({textualCriteria.length})</h4>
                          {textualCriteria.map((criteria, index) => (
                            <label
                              key={`textual-${index}`}
                              className="flex items-start p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checkedCriteria[index] || false}
                                onChange={(e) => handleCriteriaCheck(index, e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-3 text-gray-700">{criteria}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {fieldCriteria.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            Criteres bases sur les champs du formulaire ({fieldCriteria.length})
                          </h4>
                          {fieldCriteria.map((criterion, index) => {
                            const fieldKey = criterion.fieldId || criterion.fieldName || '';
                            const formData = selectedProjectData?.formData as Record<string, unknown> | undefined;
                            const fieldValue = formData?.[fieldKey];
                            const displayValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
                              ? String(fieldValue)
                              : '(non renseigne)';

                            const getOperatorLabel = (op: string) => {
                              const labels: Record<string, string> = {
                                'equals': 'doit etre egal a',
                                '=': 'doit etre egal a',
                                'not_equals': 'doit etre different de',
                                '!=': 'doit etre different de',
                                'greater_than': 'doit etre superieur a',
                                '>': 'doit etre superieur a',
                                'greater_than_or_equal': 'doit etre superieur ou egal a',
                                '>=': 'doit etre superieur ou egal a',
                                'less_than': 'doit etre inferieur a',
                                '<': 'doit etre inferieur a',
                                'less_than_or_equal': 'doit etre inferieur ou egal a',
                                '<=': 'doit etre inferieur ou egal a',
                                'between': 'doit etre compris entre',
                                'contains': 'doit contenir',
                                'not_empty': 'doit etre renseigne',
                                'in': 'in'
                              };
                              return labels[op] || op;
                            };

                            let meetsCondition = false;
                            if (criterion.conditions && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                              const { operator, value, value2 } = criterion.conditions;
                              const numericFieldValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : (fieldValue as number);
                              const numericValue = parseFloat(value);
                              const numericValue2 = value2 ? parseFloat(value2) : undefined;

                              switch (operator) {
                                case 'equals':
                                case '=':
                                  meetsCondition = String(fieldValue).toLowerCase() === String(value).toLowerCase();
                                  break;
                                case 'not_equals':
                                case '!=':
                                  meetsCondition = String(fieldValue).toLowerCase() !== String(value).toLowerCase();
                                  break;
                                case 'greater_than':
                                case '>':
                                  meetsCondition = !isNaN(numericFieldValue) && numericFieldValue > numericValue;
                                  break;
                                case 'greater_than_or_equal':
                                case '>=':
                                  meetsCondition = !isNaN(numericFieldValue) && numericFieldValue >= numericValue;
                                  break;
                                case 'less_than':
                                case '<':
                                  meetsCondition = !isNaN(numericFieldValue) && numericFieldValue < numericValue;
                                  break;
                                case 'less_than_or_equal':
                                case '<=':
                                  meetsCondition = !isNaN(numericFieldValue) && numericFieldValue <= numericValue;
                                  break;
                                case 'between':
                                  if (numericValue2 !== undefined) {
                                    meetsCondition = !isNaN(numericFieldValue) && numericFieldValue >= numericValue && numericFieldValue <= numericValue2;
                                  }
                                  break;
                                case 'contains':
                                  meetsCondition = String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
                                  break;
                                case 'not_empty':
                                  meetsCondition = true;
                                  break;
                                case 'in':
                                  const allowedValues = value.split(',').map(v => v.trim().toLowerCase());
                                  meetsCondition = allowedValues.includes(String(fieldValue).toLowerCase());
                                  break;
                                default:
                                  meetsCondition = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
                              }
                            } else if (!criterion.conditions && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                              meetsCondition = true;
                            }

                            return (
                              <label
                                key={`field-${index}`}
                                className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                                  meetsCondition
                                    ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                    : 'border-red-300 bg-red-50 hover:bg-red-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checkedCriteria[`field-${index}`] || false}
                                  onChange={(e) => handleFieldCriteriaCheck(`field-${index}`, e.target.checked)}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="ml-3 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {criterion.fieldLabel || criterion.fieldName || `Champ ${index + 1}`}
                                    </span>
                                    {meetsCondition ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  {criterion.conditions && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      <span className="italic">{getOperatorLabel(criterion.conditions.operator)}</span>
                                      {' '}<span className="font-medium">{criterion.conditions.value}</span>
                                      {criterion.conditions.value2 && (
                                        <span> et <span className="font-medium">{criterion.conditions.value2}</span></span>
                                      )}
                                    </div>
                                  )}
                                  <div className={`text-sm mt-1 px-2 py-1 rounded inline-block ${
                                    meetsCondition
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    <span className="font-medium">Valeur actuelle:</span> {displayValue}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Notes d'Éligibilité</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Ajoutez des notes complémentaires pour votre décision
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const preview = generateEligibilityNotes(
                          true,
                          textualCriteria,
                          fieldCriteria,
                          checkedCriteria
                        );
                        alert('Aperçu de l\'évaluation:\n\n' + preview + '\n\nCes notes seront automatiquement ajoutées lors de la validation.');
                      }}
                      leftIcon={<FileText className="h-4 w-4" />}
                    >
                      Aperçu
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        ℹ️ Un rapport détaillé avec l'état de tous les critères sera automatiquement généré lors de la validation ou du rejet.
                      </p>
                    </div>
                    <textarea
                      value={eligibilityNotes}
                      onChange={(e) => setEligibilityNotes(e.target.value)}
                      placeholder="Ajoutez ici vos notes complémentaires (optionnel)..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </CardContent>
              </Card>

              {selectedProjectData.status === 'submitted' ? (
                <div className="flex gap-4">
                  <Button
                    variant="success"
                    onClick={handleApprove}
                    isLoading={isProcessing}
                    leftIcon={<CheckCircle className="h-5 w-5" />}
                    className="flex-1"
                  >
                    Approuver (Éligible)
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleReject}
                    isLoading={isProcessing}
                    leftIcon={<XCircle className="h-5 w-5" />}
                    className="flex-1"
                  >
                    Rejeter (Non Éligible)
                  </Button>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Ce projet ne peut pas être évalué
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Statut actuel: <ProjectStatusBadge status={selectedProjectData.status} />
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">
                        Seuls les projets avec le statut "Soumis" peuvent être approuvés ou rejetés.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de réinitialisation */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <RotateCcw className="h-6 w-6 mr-2 text-blue-600" />
                  Réinitialiser des projets
                </h2>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Recherchez et réinitialisez les projets éligibles/non éligibles vers le statut "Soumis"
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="inline h-4 w-4 mr-1" />
                    Recherche
                  </label>
                  <input
                    type="text"
                    value={resetSearchTerm}
                    onChange={(e) => setResetSearchTerm(e.target.value)}
                    placeholder="Titre ou description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="inline h-4 w-4 mr-1" />
                    Statut
                  </label>
                  <select
                    value={resetStatusFilter}
                    onChange={(e) => setResetStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tous</option>
                    <option value="eligible">Éligible</option>
                    <option value="ineligible">Non éligible</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {getResettableProjects().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Aucun projet trouvé</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">
                        {getResettableProjects().length} projet(s) trouvé(s)
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleResetProjects(getResettableProjects().map(p => p.id))}
                        isLoading={isProcessing}
                        leftIcon={<RotateCcw className="h-4 w-4" />}
                      >
                        Réinitialiser tout
                      </Button>
                    </div>
                    {getResettableProjects().map(project => {
                      const program = getProgram(project.programId);
                      return (
                        <div
                          key={project.id}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{project.title}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {project.projectDescription || project.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{program?.name || 'Programme inconnu'}</span>
                                <ProjectStatusBadge status={project.status} />
                                {project.eligibilityCheckedAt && (
                                  <span className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(project.eligibilityCheckedAt).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                              {project.eligibilityNotes && (
                                <p className="text-xs text-gray-500 mt-2 italic">
                                  "{project.eligibilityNotes}"
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetProjects([project.id])}
                              isLoading={isProcessing}
                              className="ml-4"
                            >
                              Réinitialiser
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowResetModal(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedProjectData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Edit3 className="h-6 w-6 mr-2 text-blue-600" />
                  Modifier le projet
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Modifiez les informations du projet "{selectedProjectData.title}"
              </p>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre du projet
                  </label>
                  <input
                    type="text"
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description courte
                  </label>
                  <textarea
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget (FCFA)
                  </label>
                  <input
                    type="number"
                    value={editFormData.budget || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, budget: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du soumetteur
                  </label>
                  <input
                    type="text"
                    value={editFormData.submitterName || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, submitterName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telephone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.submitterPhone || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, submitterPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duree d'existence du projet (mois)
                  </label>
                  <input
                    type="number"
                    value={editFormData.projectAgeMonths || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, projectAgeMonths: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secteur d'activite
                  </label>
                  <select
                    value={editFormData.activitySectorId || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, activitySectorId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selectionner un secteur</option>
                    {sectors.map(sector => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description detaillee du projet
                  </label>
                  <textarea
                    value={editFormData.projectDescription || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {editFormData.formData && Object.keys(editFormData.formData).length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Donnees du formulaire
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(editFormData.formData).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key}
                        </label>
                        {typeof value === 'boolean' ? (
                          <select
                            value={value ? 'true' : 'false'}
                            onChange={(e) => handleFormDataFieldChange(key, e.target.value === 'true')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="true">Oui</option>
                            <option value="false">Non</option>
                          </select>
                        ) : typeof value === 'number' ? (
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => handleFormDataFieldChange(key, Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : typeof value === 'string' && value.length > 100 ? (
                          <textarea
                            value={value as string}
                            onChange={(e) => handleFormDataFieldChange(key, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(value || '')}
                            onChange={(e) => handleFormDataFieldChange(key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveProjectEdit}
                isLoading={isProcessing}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EligibilityPage;
