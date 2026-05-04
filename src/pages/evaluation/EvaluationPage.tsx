import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useProjectStore, Project, ProjectStatus } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { useActivitySectorStore } from '../../stores/activitySectorStore';
import { useFormTemplateStore } from '../../stores/formTemplateStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription
} from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ProjectStatusBadge from '../../components/projects/ProjectStatusBadge';
import { Search, Filter, CheckCircle, XCircle, ArrowLeft, Save, Award, Target, Sparkles,
  Send,
  Shield,
  AlertTriangle,
  X,
  Printer,
  FileSpreadsheet,
  Phone,
  Briefcase,
  Calendar,
  FileText,
  ClipboardList
} from 'lucide-react';
import FileLink from '../../components/projects/FileLink';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { aiEvaluationService } from '../../services/aiEvaluationService';
import { generateWolumaEvaluationReport } from '../../utils/pdfGenerator';
import logoUrl from '../../assets/Logo_senegal-ucad.png';
import { useParametersStore } from '../../stores/parametersStore';
import { ProjectStatusService } from '../../services/projectStatusService';
import { getAccessiblePrograms } from '../../hooks/useFilteredProjects';

const EvaluationPage: React.FC = () => {
  const { user } = useAuthStore();
  const { checkPermission } = usePermissions();
  const { projects, updateProject, fetchProjects } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  const { sectors, fetchSectors, getSector } = useActivitySectorStore();
  const { templates, fetchTemplates, getTemplate } = useFormTemplateStore();
  const { parameters, loadParameters } = useParametersStore();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAIEvaluating, setIsAIEvaluating] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isBulkEvaluating, setIsBulkEvaluating] = useState(false);
  const [bulkEvaluationProgress, setBulkEvaluationProgress] = useState<{
    current: number;
    total: number;
    currentProject: string;
  } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiAnalysisCache, setAiAnalysisCache] = useState<Record<string, any>>({});
  const [includeFileContents, setIncludeFileContents] = useState(true);
  const [activeTab, setActiveTab] = useState<'evaluation' | 'submission'>('evaluation');
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 10;

  if (!user || !checkPermission('evaluation.evaluate')) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h2>
        <p className="text-gray-500">Vous n'avez pas la permission d'évaluer des projets.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchPrograms();
    fetchPartners();
    fetchSectors();
    fetchTemplates();
    loadParameters();
  }, [fetchPrograms, fetchPartners, fetchSectors, fetchTemplates, loadParameters]);

  useEffect(() => {
    if (parameters.enableAiEvaluation) {
      const provider = parameters.aiProvider === 'openai' ? 'chatgpt' :
                      parameters.aiProvider === 'google' ? 'gemini' : 'mock';

      let apiKey = '';
      let model = 'gpt-4o-mini';

      if (provider === 'chatgpt') {
        apiKey = parameters.openaiApiKey;

        const validModels: Record<string, string> = {
          'gpt-5': 'gpt-4o',
          'gpt-4o': 'gpt-4o',
          'gpt-4': 'gpt-4',
          'gpt-4-turbo': 'gpt-4-turbo-preview',
          'gpt-4-turbo-preview': 'gpt-4-turbo-preview',
          'gpt-3.5-turbo': 'gpt-3.5-turbo',
          'gpt-4o-mini': 'gpt-4o-mini'
        };

        const configuredModel = parameters.openaiModel || 'gpt-4';
        model = validModels[configuredModel] || validModels[configuredModel.toLowerCase()] || 'gpt-4o-mini';
      } else if (provider === 'gemini') {
        apiKey = parameters.googleApiKey;
      }

      aiEvaluationService.configure({
        provider: provider as any,
        apiKey: apiKey,
        model: model
      });
    }
  }, [parameters]);
  
  useEffect(() => {
    if (!checkPermission('evaluation.evaluate')) {
      navigate('/dashboard');
    }
  }, [checkPermission, navigate]);

  const accessiblePrograms = useMemo(
    () => getAccessiblePrograms(user, programs, partners),
    [user, programs, partners]
  );
  
  // Get projects with specific statuses for evaluation
  const submittedProjects = projects.filter(project => {
    // Filter by relevant statuses only
    const hasRelevantStatus = project.status === 'eligible' ||
                              project.status === 'selected' ||
                              project.status === 'pre_selected' ||
                              project.status === 'rejected';

    if (!hasRelevantStatus) return false;

    const isAccessible = accessiblePrograms.some(p => p.id === project.programId);
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.projectDescription || project.description).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = programFilter === 'all' || project.programId === programFilter;
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all' && project.evaluatedAt) {
      const evaluationDate = new Date(project.evaluatedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - evaluationDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case 'today':
          matchesDate = diffDays === 0;
          break;
        case 'week':
          matchesDate = diffDays <= 7;
          break;
        case 'month':
          matchesDate = diffDays <= 30;
          break;
        default:
          matchesDate = true;
      }
    } else if (dateFilter !== 'all' && !project.evaluatedAt) {
      matchesDate = false;
    }

    return isAccessible &&
           matchesSearch &&
           matchesProgram &&
           matchesStatus &&
           matchesDate;
  });

  const totalPages = Math.ceil(submittedProjects.length / projectsPerPage);
  const paginatedProjects = submittedProjects.slice(
    (currentPage - 1) * projectsPerPage,
    currentPage * projectsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, programFilter, statusFilter, dateFilter]);

  const handleSelectProjectForEvaluation = (project: Project) => {
    setSelectedProject(project);
    setIsEvaluating(true);
  };
  
  const handleCancelEvaluation = () => {
    setIsEvaluating(false);
    setSelectedProject(null);
  };
  
  const handleSelectAll = () => {
    const allProjectIds = submittedProjects.map(p => p.id);
    setSelectedProjects(allProjectIds);
  };
  
  const handleDeselectAll = () => {
    setSelectedProjects([]);
  };
  
  const handleBulkAIEvaluation = async () => {
    if (selectedProjects.length === 0) return;
    
    setIsBulkEvaluating(true);
    setBulkEvaluationProgress({
      current: 0,
      total: selectedProjects.length,
      currentProject: ''
    });
    
    try {
      for (let i = 0; i < selectedProjects.length; i++) {
        const projectId = selectedProjects[i];
        const project = submittedProjects.find(p => p.id === projectId);
        const program = project ? programs.find(p => p.id === project.programId) : null;
        
        if (!project || !program || !user) continue;
        
        setBulkEvaluationProgress({
          current: i + 1,
          total: selectedProjects.length,
          currentProject: project.title
        });
        
        try {
          const request = {
            projectData: {
              title: project.title,
              description: project.projectDescription || project.description,
              budget: project.budget,
              timeline: project.timeline,
              tags: project.tags,
              submissionDate: project.submissionDate?.toLocaleDateString(),
              formData: project.formData
            },
            evaluationCriteria: program.evaluationCriteria.map((criterion: any) => ({
              id: criterion.id,
              name: criterion.name,
              description: criterion.description,
              maxScore: criterion.maxScore,
              weight: criterion.weight
            })),
            includeFileContents
          };

          const response = await aiEvaluationService.evaluateProject(request);

          // Stocker l'analyse IA pour la génération du rapport
          setAiAnalysisCache(prev => ({
            ...prev,
            [project.id]: response
          }));

          // Préparer les scores et commentaires
          const evaluationScores: Record<string, number> = {};
          const evaluationComments: Record<string, string> = {};
          let totalScore = 0;

          program.evaluationCriteria.forEach((criterion: any) => {
            const score = response.scores[criterion.name] || 0;
            evaluationScores[criterion.id] = score;

            const observation = response.detailedAnalysis?.observations?.[criterion.name];
            if (observation) {
              evaluationComments[criterion.id] = observation;
            } else {
              const percentage = (score / criterion.maxScore) * 100;
              let comment = '';
              if (percentage >= 75) {
                comment = `Le projet demontre un niveau satisfaisant pour ce critere avec un score de ${score}/${criterion.maxScore}.`;
              } else if (percentage >= 50) {
                comment = `Le projet montre un potentiel d'innovation mais pourrait beneficier d'une approche plus novatrice.`;
              } else {
                comment = `Le projet presente des lacunes importantes sur ce critere.`;
              }
              evaluationComments[criterion.id] = comment;
            }

            totalScore += (score / criterion.maxScore) * criterion.weight;
          });

          // Mettre à jour le projet
          await updateProject(project.id, {
            evaluationScores,
            evaluationComments,
            totalEvaluationScore: Math.round(totalScore),
            evaluationNotes: response.notes,
            recommendedStatus: response.recommendation as ProjectStatus,
            evaluatedBy: user.id,
            evaluationDate: new Date(),
          });

          if (i < selectedProjects.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`Erreur lors de l'évaluation du projet ${project.title}:`, error);
          // Continuer avec le projet suivant même en cas d'erreur
        }
      }
      
      // Réinitialiser la sélection après évaluation
      setSelectedProjects([]);
      
    } catch (error) {
      console.error('Erreur lors de l\'évaluation en lot:', error);
    } finally {
      setIsBulkEvaluating(false);
      setBulkEvaluationProgress(null);
    }
  };
  
  const createEvaluationSchema = (program: any) => {
    const schemaFields: any = {
      evaluationNotes: Yup.string()
        .required('Notes requises')
        .min(20, 'Minimum 20 caractères'),
      decision: Yup.string()
        .required('Décision requise')
        .oneOf(['pre_selected', 'selected', 'rejected'], 'Décision invalide'),
    };
    
    // Add validation for each evaluation criterion
    program.evaluationCriteria.forEach((criterion: any) => {
      schemaFields[`score_${criterion.id}`] = Yup.number()
        .required('Score requis')
        .min(0, 'Minimum 0')
        .max(criterion.maxScore, `Maximum ${criterion.maxScore}`);
    });
    
    return Yup.object().shape(schemaFields);
  };
  
  const handleSubmitEvaluation = async (values: any, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    if (!selectedProject || !user) return;
    
    const program = programs.find(p => p.id === selectedProject.programId);
    if (!program) return;
    
    try {
      // Calculate scores and total
      const evaluationScores: Record<string, number> = {};
      const evaluationComments: Record<string, string> = {};
      let totalScore = 0;
      
      program.evaluationCriteria.forEach(criterion => {
        const score = values[`score_${criterion.id}`];
        const comment = values[`comment_${criterion.id}`] || '';
        evaluationScores[criterion.id] = score;
        evaluationComments[criterion.id] = comment;
        // Calculate weighted score
        totalScore += (score / criterion.maxScore) * criterion.weight;
      });
      
      const updatedProject = await updateProject(selectedProject.id, {
        evaluationScores,
        evaluationComments,
        totalEvaluationScore: Math.round(totalScore),
        evaluationNotes: values.evaluationNotes,
        evaluatedBy: user.id,
        evaluationDate: new Date(),
        recommendedStatus: values.decision as ProjectStatus,
      });

      if (updatedProject) {
        setIsEvaluating(false);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleAIEvaluation = async (project: Project, program: any, setFieldValue: any, setValues: any) => {
    setIsAIEvaluating(true);

    try {
      const partner = partners.find(p => p.id === program?.partnerId);

      const request = {
        projectData: {
          title: project.title,
          description: project.projectDescription || project.description,
          budget: project.budget,
          timeline: project.timeline,
          tags: project.tags,
          submissionDate: project.submissionDate?.toLocaleDateString(),
          formData: project.formData
        },
        evaluationCriteria: program.evaluationCriteria,
        customPrompt: program.customAiPrompt,
        programContext: {
          name: program.name,
          description: program.description || '',
          partnerName: partner?.name || 'Non spécifié',
          budgetRange: `${program.budget.toLocaleString()} FCFA`
        },
        includeFileContents: includeFileContents
      };

      const response = await aiEvaluationService.evaluateProject(request);

      // Stocker l'analyse IA pour la génération du rapport
      setAiAnalysisCache(prev => ({
        ...prev,
        [project.id]: response
      }));

      if (!response || !response.scores) {
        throw new Error('La réponse de l\'IA ne contient pas de scores');
      }

      // Préparer les nouvelles valeurs pour Formik
      const newValues: any = {};
      let processedCount = 0;

      // Mettre à jour les scores et commentaires avec les observations de l'IA
      program.evaluationCriteria.forEach((criterion: any) => {
        const score = response.scores[criterion.name];
        if (score !== undefined) {
          processedCount++;
          newValues[`score_${criterion.id}`] = score;

          const observation = response.detailedAnalysis?.observations?.[criterion.name];
          if (observation) {
            newValues[`comment_${criterion.id}`] = observation;
          } else {
            const percentage = (score / criterion.maxScore) * 100;
            let comment = '';
            if (percentage >= 75) {
              comment = `Le projet demontre un niveau satisfaisant pour ce critere avec un score de ${score}/${criterion.maxScore}.`;
            } else if (percentage >= 50) {
              comment = `Le projet montre un potentiel d'innovation mais pourrait beneficier d'une approche plus novatrice.`;
            } else {
              comment = `Le projet presente des lacunes importantes sur ce critere.`;
            }
            newValues[`comment_${criterion.id}`] = comment;
          }
        }
      });

      newValues.evaluationNotes = response.notes;
      newValues.decision = response.recommendation;

      setValues((prevValues: any) => ({
        ...prevValues,
        ...newValues
      }));
      
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
      alert(`Erreur lors de l\'évaluation par IA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsAIEvaluating(false);
    }
  };
  
  const handleSubmitEvaluatedProject = async (project: Project) => {
    if (!project.recommendedStatus || !user) return;

    try {
      const result = await ProjectStatusService.changeProjectStatus(
        project.id,
        project.recommendedStatus,
        project.status,
        user.role,
        'Application de la recommandation d\'évaluation'
      );

      if (result.success) {
        await updateProject(project.id, {
          manuallySubmitted: true,
        });
        await fetchProjects();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error submitting evaluated project:', error);
      alert('Erreur lors de la soumission du projet évalué');
    }
  };
  
  const handleGenerateReport = async (project: Project) => {
    const program = programs.find(p => p.id === project.programId);
    const partner = program ? partners.find(p => p.id === program.partnerId) : null;

    if (!program) {
      alert('Programme non trouvé pour ce projet');
      return;
    }

    setIsGeneratingReport(true);

    try {
      // Récupérer l'analyse IA stockée si disponible
      const aiAnalysis = aiAnalysisCache[project.id];

      await generateWolumaEvaluationReport(
        project,
        program,
        partner,
        user?.name || 'Systeme',
        aiAnalysis
      );
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const renderScoreIndicator = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    let bgColor = 'bg-error-500';
    
    if (percentage >= 75) {
      bgColor = 'bg-success-500';
    } else if (percentage >= 50) {
      bgColor = 'bg-warning-500';
    } else if (percentage >= 25) {
      bgColor = 'bg-error-300';
    }
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
        <div 
          className={`h-2.5 rounded-full ${bgColor} transition-all duration-300`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  const getEvaluationState = (project: Project) => {
    if (!project.evaluationScores || Object.keys(project.evaluationScores).length === 0) {
      return 'Non évalué';
    }

    const program = programs.find(p => p.id === project.programId);
    if (!program || !program.evaluationCriteria) return 'Non évalué';

    const criteria = program.evaluationCriteria;
    const scores = project.evaluationScores;

    let totalScore = 0;
    let maxScore = 0;

    criteria.forEach(criterion => {
      const score = scores[criterion.id] || 0;
      totalScore += score;
      maxScore += criterion.maxScore;
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const statusLabel = project.status === 'selected' ? 'Sélectionné' :
                       project.status === 'pre_selected' ? 'Présélectionné' :
                       project.status === 'rejected' ? 'Rejeté' :
                       project.status === 'eligible' ? 'Éligible' : 'En attente';

    return `${statusLabel} - Score: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`;
  };

  const handlePrintProjects = useCallback(async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF('l', 'mm', 'a3');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
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
      doc.addImage(logoBase64, 'PNG', margin, 5, 25, 25);
    }

    doc.setFontSize(18);
    doc.text('Rapport d\'Evaluation des Projets', margin + 30, 15);

    doc.setFontSize(10);
    doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, margin + 30, 22);
    doc.text(`Total: ${submittedProjects.length} projet(s)`, margin, 34);

    const summaryData = submittedProjects.map(project => {
      const program = programs.find(p => p.id === project.programId);
      const sector = getSector(project.activitySectorId || '');
      return [
        project.title.length > 30 ? project.title.substring(0, 27) + '...' : project.title,
        project.submitterName || 'N/A',
        project.submitterEmail || 'N/A',
        project.submitterPhone || 'N/A',
        sector?.name || 'N/A',
        program?.name || 'N/A',
        project.status === 'selected' ? 'Selectionne' :
        project.status === 'pre_selected' ? 'Preselectionne' :
        project.status === 'rejected' ? 'Rejete' :
        project.status === 'eligible' ? 'Eligible' : project.status,
        project.totalEvaluationScore !== undefined ? `${project.totalEvaluationScore}%` : 'N/A',
        project.evaluationDate ? new Date(project.evaluationDate).toLocaleDateString('fr-FR') : 'N/A'
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Titre', 'Porteur', 'Email', 'Tel', 'Secteur', 'Programme', 'Statut', 'Score', 'Date']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 },
        5: { cellWidth: 40 },
        6: { cellWidth: 30 },
        7: { cellWidth: 20 },
        8: { cellWidth: 25 }
      },
      margin: { left: margin, right: margin }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    for (const project of submittedProjects) {
      const program = programs.find(p => p.id === project.programId);
      if (!program || !project.evaluationScores) continue;

      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Projet: ${project.title}`, margin, currentY);
      currentY += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Programme: ${program.name} | Score: ${project.totalEvaluationScore || 0}%`, margin, currentY);
      currentY += 8;

      const criteriaData = program.evaluationCriteria.map(criterion => {
        const score = project.evaluationScores?.[criterion.id] || 0;
        const comment = project.evaluationComments?.[criterion.id] || '';
        const percentage = Math.round((score / criterion.maxScore) * 100);
        const truncatedComment = comment.length > 100 ? comment.substring(0, 97) + '...' : comment;

        return [
          criterion.name,
          `${criterion.weight}%`,
          `${score}/${criterion.maxScore}`,
          `${percentage}%`,
          truncatedComment
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Critere', 'Poids', 'Score', '%', 'Justification']],
        body: criteriaData,
        theme: 'striped',
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 20 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 140 }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;

      if (project.evaluationNotes) {
        const notesText = project.evaluationNotes.length > 300
          ? project.evaluationNotes.substring(0, 297) + '...'
          : project.evaluationNotes;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const lines = doc.splitTextToSize(`Notes: ${notesText}`, pageWidth - 2 * margin);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 4 + 10;
      } else {
        currentY += 10;
      }
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} sur ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text('Woluma-Flow', margin, pageHeight - 10);
    }

    doc.save(`Evaluations_Detaillees_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [submittedProjects, programs, getSector]);

  const handleExportExcel = useCallback(async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const summaryData = submittedProjects.map(project => {
      const program = programs.find(p => p.id === project.programId);
      const sector = getSector(project.activitySectorId || '');

      return {
        'Titre': project.title,
        'Nom du porteur': project.submitterName || 'N/A',
        'Email du porteur': project.submitterEmail || 'N/A',
        'Telephone': project.submitterPhone || 'N/A',
        'Secteur d\'activite': sector?.name || 'N/A',
        'Programme': program?.name || 'N/A',
        'Statut': project.status === 'selected' ? 'Selectionne' :
                  project.status === 'pre_selected' ? 'Preselectionne' :
                  project.status === 'rejected' ? 'Rejete' :
                  project.status === 'eligible' ? 'Eligible' : project.status,
        'Score Total (%)': project.totalEvaluationScore !== undefined ? project.totalEvaluationScore : 'N/A',
        'Recommandation': project.recommendedStatus === 'selected' ? 'Selectionne' :
                          project.recommendedStatus === 'pre_selected' ? 'Preselectionne' :
                          project.recommendedStatus === 'rejected' ? 'Rejete' : 'N/A',
        'Date Evaluation': project.evaluationDate ? new Date(project.evaluationDate).toLocaleDateString('fr-FR') : 'N/A',
        'Notes Globales': project.evaluationNotes || '',
      };
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 40 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 25 },
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 80 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resume Evaluations');

    const detailedData: any[] = [];
    for (const project of submittedProjects) {
      const program = programs.find(p => p.id === project.programId);
      if (!program || !project.evaluationScores) continue;

      program.evaluationCriteria?.forEach(criterion => {
        const score = project.evaluationScores?.[criterion.id] || 0;
        const maxScore = criterion.maxScore;
        const percentage = Math.round((score / maxScore) * 100);
        const comment = project.evaluationComments?.[criterion.id] || '';

        detailedData.push({
          'Projet': project.title,
          'Programme': program.name,
          'Critere': criterion.name,
          'Description Critere': criterion.description || '',
          'Poids (%)': criterion.weight,
          'Score': score,
          'Score Max': maxScore,
          'Pourcentage': `${percentage}%`,
          'Contribution au Total': `${Math.round((score / maxScore) * criterion.weight)}%`,
          'Justification': comment,
        });
      });
    }

    if (detailedData.length > 0) {
      const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
      wsDetailed['!cols'] = [
        { wch: 35 }, { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 10 },
        { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 80 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetailed, 'Details par Critere');
    }

    const scoresMatrixData = submittedProjects.map(project => {
      const program = programs.find(p => p.id === project.programId);
      const row: any = {
        'Projet': project.title,
        'Programme': program?.name || 'N/A',
        'Score Total (%)': project.totalEvaluationScore !== undefined ? project.totalEvaluationScore : 'N/A',
      };

      program?.evaluationCriteria?.forEach(criterion => {
        const score = project.evaluationScores?.[criterion.id] || 0;
        const maxScore = criterion.maxScore;
        row[`${criterion.name}`] = `${score}/${maxScore}`;
      });

      return row;
    });

    if (scoresMatrixData.length > 0) {
      const wsMatrix = XLSX.utils.json_to_sheet(scoresMatrixData);
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matrice des Scores');
    }

    const criteriaRefData: any[] = [];
    const addedPrograms = new Set<string>();

    for (const project of submittedProjects) {
      const program = programs.find(p => p.id === project.programId);
      if (program && !addedPrograms.has(program.id)) {
        addedPrograms.add(program.id);
        program.evaluationCriteria?.forEach(criterion => {
          criteriaRefData.push({
            'Programme': program.name,
            'Critere': criterion.name,
            'Description': criterion.description || '',
            'Score Maximum': criterion.maxScore,
            'Poids (%)': criterion.weight,
          });
        });
      }
    }

    if (criteriaRefData.length > 0) {
      const wsCriteria = XLSX.utils.json_to_sheet(criteriaRefData);
      wsCriteria['!cols'] = [
        { wch: 30 }, { wch: 35 }, { wch: 50 }, { wch: 15 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, wsCriteria, 'Reference Criteres');
    }

    XLSX.writeFile(wb, `Evaluations_Completes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [submittedProjects, programs, getSector]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluation des Projets</h1>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            disabled={submittedProjects.length === 0}
          >
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintProjects}
            leftIcon={<Printer className="h-4 w-4" />}
            disabled={submittedProjects.length === 0}
          >
            Export PDF
          </Button>
        </div>
      </div>
      
      {!isEvaluating ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-gray-500 mr-2" />
                <CardTitle>Filtres</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recherche
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Titre ou description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programme
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                  >
                    <option value="all">Tous les programmes</option>
                    {accessiblePrograms.map(program => {
                      const partner = partners.find(p => p.id === program.partnerId);
                      return (
                        <option key={program.id} value={program.id}>
                          {program.name} {partner && `(${partner.name})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="eligible">Éligible</option>
                    <option value="selected">Sélectionné</option>
                    <option value="pre_selected">Présélectionné</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Période d'évaluation
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="all">Toutes les dates</option>
                    <option value="today">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setProgramFilter('all');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Bulk Evaluation Controls */}
          {submittedProjects.length > 0 && (
            <Card className="mb-6 border-l-4 border-l-secondary-500">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-secondary-600" />
                  Évaluation IA en lot
                </CardTitle>
                <CardDescription>
                  Sélectionnez plusieurs projets pour les évaluer automatiquement par IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={isBulkEvaluating}
                    >
                      Tout sélectionner
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={isBulkEvaluating}
                    >
                      Tout désélectionner
                    </Button>
                    <span className="text-sm text-gray-600">
                      {selectedProjects.length} projet(s) sélectionné(s)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFileContents}
                        onChange={(e) => setIncludeFileContents(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={isBulkEvaluating}
                      />
                      <span>Inclure le contenu des fichiers joints</span>
                    </label>
                    <Button
                      variant="secondary"
                      onClick={handleBulkAIEvaluation}
                      disabled={selectedProjects.length === 0 || isBulkEvaluating}
                      isLoading={isBulkEvaluating}
                      leftIcon={<Sparkles className="h-4 w-4" />}
                    >
                      {isBulkEvaluating ? 'Évaluation en cours...' : 'Évaluer par IA'}
                    </Button>
                  </div>
                </div>
                
                {bulkEvaluationProgress && (
                  <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-secondary-800">
                        Évaluation en cours...
                      </span>
                      <span className="text-sm text-secondary-600">
                        {bulkEvaluationProgress.current}/{bulkEvaluationProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-secondary-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(bulkEvaluationProgress.current / bulkEvaluationProgress.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-secondary-700">
                      Projet actuel: {bulkEvaluationProgress.currentProject}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Projets a evaluer ({submittedProjects.length})</h2>

            {paginatedProjects.length > 0 ? (
              <div className="space-y-4">
                {paginatedProjects.map(project => {
                  const program = programs.find(p => p.id === project.programId);
                  const partner = program ? partners.find(p => p.id === program.partnerId) : null;
                  const isSelected = selectedProjects.includes(project.id);
                  const isEvaluated = project.evaluationScores && project.evaluatedBy;

                  return (
                    <div
                      key={project.id}
                      className={`border rounded-md p-4 transition-colors ${
                        isSelected
                          ? 'border-secondary-300 bg-secondary-50'
                          : isEvaluated
                          ? 'border-success-300 bg-success-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedProjects(prev => [...prev, project.id]);
                              } else {
                                setSelectedProjects(prev => prev.filter(id => id !== project.id));
                              }
                            }}
                            disabled={isBulkEvaluating}
                            className="h-4 w-4 text-secondary-600 border-gray-300 rounded focus:ring-secondary-500"
                          />
                        </div>

                        <div>
                          <h3
                            className="text-md font-medium text-gray-900 cursor-pointer hover:text-primary-600"
                            onClick={() => handleSelectProjectForEvaluation(project)}
                          >
                            {project.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.projectDescription || project.description}</p>

                          {program && (
                            <div className="mt-2 flex items-center text-sm text-primary-600">
                              <Target className="h-4 w-4 mr-1" />
                              <span className="font-medium">Programme:</span>
                              <span className="ml-1">{program.name}</span>
                              {partner && (
                                <>
                                  <span className="mx-2">-</span>
                                  <span className="text-gray-600">{partner.name}</span>
                                </>
                              )}
                            </div>
                          )}

                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <span>Budget: {project.budget.toLocaleString()} FCFA - </span>
                            <span>Duree: {project.timeline}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {project.tags.map(tag => (
                              <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="mt-3 text-xs text-gray-500">
                            Soumis le {project.submissionDate?.toLocaleDateString()}
                          </div>

                          {isEvaluated && (
                            <div className="mt-2 p-2 bg-success-100 border border-success-200 rounded-md">
                              <div className="text-xs text-success-800 font-medium">
                                Evalue le {project.evaluationDate?.toLocaleDateString()}
                              </div>
                              <div className="text-xs text-success-700">
                                Score: {project.totalEvaluationScore}% -
                                Recommandation: {project.recommendedStatus === 'selected' ? 'Selectionne' :
                                                project.recommendedStatus === 'pre_selected' ? 'Preselectionne' : 'Rejete'}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end ml-auto">
                          <div className="flex items-center space-x-2">
                            <ProjectStatusBadge status={project.status} />
                            {!isEvaluated ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectProjectForEvaluation(project)}
                                disabled={isBulkEvaluating}
                              >
                                Evaluer
                              </Button>
                            ) : (
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateReport(project)}
                                  disabled={isGeneratingReport}
                                >
                                  Rapport PDF
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleSubmitEvaluatedProject(project)}
                                >
                                  Soumettre
                                </Button>
                              </div>
                            )}
                          </div>
                          {program && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                              <Award className="h-3 w-3 mr-1" />
                              {program.evaluationCriteria.length} criteres
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-gray-700">
                      Affichage de {(currentPage - 1) * projectsPerPage + 1} a {Math.min(currentPage * projectsPerPage, submittedProjects.length)} sur {submittedProjects.length} resultats
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                      >
                        &laquo;
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                      >
                        Precedent
                      </button>
                      <span className="px-3 py-1 text-sm bg-blue-50 border border-blue-200 rounded">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                      >
                        Suivant
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
                      >
                        &raquo;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucun projet a evaluer pour le moment
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {selectedProject && (
            <div>
              <button
                className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
                onClick={handleCancelEvaluation}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour à la liste
              </button>
              
              {(() => {
                const program = programs.find(p => p.id === selectedProject.programId);
                const partner = program ? partners.find(p => p.id === program.partnerId) : null;
                
                if (!program) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      Programme non trouvé pour ce projet
                    </div>
                  );
                }
                
                const initialValues: any = {
                  evaluationNotes: selectedProject.evaluationNotes || '',
                  decision: selectedProject.recommendedStatus || 'pre_selected',
                };

                // Initialize scores for each criterion with existing values if available
                program.evaluationCriteria.forEach(criterion => {
                  initialValues[`score_${criterion.id}`] = selectedProject.evaluationScores?.[criterion.id] || 0;
                  initialValues[`comment_${criterion.id}`] = selectedProject.evaluationComments?.[criterion.id] || '';
                });
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <Card>
                        <CardHeader>
                          <CardTitle>Détails du projet</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{selectedProject.title}</h3>
                            <ProjectStatusBadge status={selectedProject.status} className="mt-2" />
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Description</h4>
                            <p className="text-sm text-gray-600 mt-1">{selectedProject.projectDescription || selectedProject.description}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Programme</h4>
                            <div className="text-sm text-gray-600 mt-1">
                              <div className="flex items-center">
                                <Target className="h-4 w-4 mr-1 text-primary-600" />
                                {program.name}
                              </div>
                              {partner && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Partenaire: {partner.name}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {(selectedProject.submitterPhone || selectedProject.activitySectorId || selectedProject.projectAgeMonths !== undefined) && (
                            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Informations complementaires</h4>
                              {selectedProject.submitterPhone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="h-4 w-4 text-blue-500 mr-2" />
                                  <span className="text-gray-600">Tel:</span>
                                  <span className="ml-2 font-medium text-gray-900">{selectedProject.submitterPhone}</span>
                                </div>
                              )}
                              {selectedProject.activitySectorId && (
                                <div className="flex items-center text-sm">
                                  <Briefcase className="h-4 w-4 text-blue-500 mr-2" />
                                  <span className="text-gray-600">Secteur:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {getSector(selectedProject.activitySectorId)?.name || 'N/A'}
                                  </span>
                                </div>
                              )}
                              {selectedProject.projectAgeMonths !== undefined && selectedProject.projectAgeMonths !== null && (
                                <div className="flex items-center text-sm">
                                  <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                                  <span className="text-gray-600">Duree d'existence:</span>
                                  <span className="ml-2 font-medium text-gray-900">{selectedProject.projectAgeMonths} mois</span>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedProject.projectDescription && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700">Description du projet</h4>
                              <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded whitespace-pre-wrap">
                                {selectedProject.projectDescription}
                              </p>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Tags</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {selectedProject.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Date de soumission</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedProject.submissionDate?.toLocaleDateString()}
                            </p>
                          </div>

                          {selectedProject.evaluationScores && selectedProject.evaluatedBy && (
                            <div className="border-t pt-4">
                              <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                  <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
                                  <h4 className="text-sm font-medium text-success-900">Déjà évalué</h4>
                                </div>
                                <div className="text-xs text-success-700 space-y-1">
                                  {selectedProject.evaluationDate && (
                                    <p>Date: {new Date(selectedProject.evaluationDate).toLocaleDateString()}</p>
                                  )}
                                  {selectedProject.totalEvaluationScore !== undefined && (
                                    <p>Score total: {selectedProject.totalEvaluationScore}%</p>
                                  )}
                                  <p className="italic mt-2">Les champs ci-contre sont pré-remplis avec les valeurs existantes. Vous pouvez les modifier si nécessaire.</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="lg:col-span-2">
                      <div className="mb-4">
                        <div className="border-b border-gray-200">
                          <nav className="-mb-px flex space-x-8">
                            <button
                              type="button"
                              onClick={() => setActiveTab('evaluation')}
                              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                                activeTab === 'evaluation'
                                  ? 'border-primary-500 text-primary-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <Award className="h-4 w-4 mr-2" />
                              Evaluation
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('submission')}
                              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                                activeTab === 'submission'
                                  ? 'border-primary-500 text-primary-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <ClipboardList className="h-4 w-4 mr-2" />
                              Donnees de soumission
                            </button>
                          </nav>
                        </div>
                      </div>

                      {activeTab === 'submission' && (() => {
                        const formTemplate = program.formTemplateId ? getTemplate(program.formTemplateId) : null;
                        const getFieldLabel = (fieldName: string): string => {
                          if (formTemplate && formTemplate.fields) {
                            const field = formTemplate.fields.find(f => f.name === fieldName);
                            if (field) return field.label;
                          }
                          return fieldName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                        };

                        return (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <ClipboardList className="h-5 w-5 mr-2" />
                              Donnees du formulaire de soumission
                            </CardTitle>
                            <CardDescription>
                              Informations saisies lors de la soumission du projet
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {selectedProject.formData && Object.keys(selectedProject.formData).length > 0 ? (
                              <div className="space-y-4">
                                {Object.entries(selectedProject.formData).map(([key, value]) => {
                                  const fieldLabel = getFieldLabel(key);

                                  if (Array.isArray(value) && value.length > 0 && value[0]?.name && value[0]?.path) {
                                    return (
                                      <div key={key} className="border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                          <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                          {fieldLabel}
                                        </h4>
                                        <div className="space-y-2">
                                          {value.map((file: any, idx: number) => (
                                            <FileLink key={idx} file={file} />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (typeof value === 'object' && value !== null && value.name && value.path) {
                                    return (
                                      <div key={key} className="border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                          <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                          {fieldLabel}
                                        </h4>
                                        <FileLink file={value} />
                                      </div>
                                    );
                                  }

                                  if (value === null || value === undefined || value === '') {
                                    return null;
                                  }

                                  return (
                                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                                        {fieldLabel}
                                      </h4>
                                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>Aucune donnee de formulaire disponible</p>
                              </div>
                            )}

                            {selectedProject.attachments && selectedProject.attachments.length > 0 && (
                              <div className="border-t pt-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                  Fichiers joints supplementaires
                                </h4>
                                <div className="space-y-2">
                                  {selectedProject.attachments.map((file: any, idx: number) => (
                                    <FileLink key={idx} file={file} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        );
                      })()}

                      {activeTab === 'evaluation' && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Award className="h-5 w-5 mr-2" />
                            Evaluation du projet
                          </CardTitle>
                          <CardDescription>
                            Evaluez le projet selon les criteres definis pour le programme "{program.name}"
                          </CardDescription>
                        </CardHeader>
                        <Formik
                          initialValues={initialValues}
                          enableReinitialize={true}
                          validationSchema={createEvaluationSchema(program)}
                          onSubmit={handleSubmitEvaluation}
                        >
                          {({ values, isSubmitting, isValid, setFieldValue, setValues }) => (
                            <Form>
                              <CardContent className="space-y-6">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <Award className="h-5 w-5 mr-2 text-primary-600" />
                                    Critères d'évaluation
                                  </h3>
                                  
                                  <div className="space-y-6">
                                    {program.evaluationCriteria.map((criterion, index) => {
                                      const fieldName = `score_${criterion.id}`;
                                      const currentScore = values[fieldName] || 0;
                                      
                                      return (
                                        <div key={criterion.id} className="border border-gray-200 rounded-lg p-4">
                                          <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="text-sm font-medium text-gray-900">
                                                {criterion.name}
                                              </h4>
                                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-800">
                                                Poids: {criterion.weight}%
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{criterion.description}</p>
                                          </div>
                                          
                                          <div className="flex items-center space-x-4">
                                            <div className="flex items-center">
                                              <Field
                                                type="number"
                                                name={fieldName}
                                                min="0"
                                                max={criterion.maxScore}
                                                value={currentScore}
                                                className="block w-20 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-3 py-2"
                                              />
                                              <span className="mx-2 text-gray-500">/{criterion.maxScore}</span>
                                            </div>
                                            <div className="flex-grow">
                                              {renderScoreIndicator(currentScore, criterion.maxScore)}
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium">
                                              {Math.round((currentScore / criterion.maxScore) * criterion.weight)}% du total
                                            </div>
                                          </div>
                                          <ErrorMessage name={fieldName} component="div" className="mt-1 text-sm text-error-600" />
                                          
                                          <div className="mt-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Justification de la note
                                            </label>
                                            <Field
                                              as="textarea"
                                              name={`comment_${criterion.id}`}
                                              rows={2}
                                              value={values[`comment_${criterion.id}`] || ''}
                                              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-3 py-2"
                                              placeholder="Expliquez pourquoi vous attribuez cette note..."
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg border border-primary-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-lg font-medium text-gray-900">Score Total Pondéré</span>
                                      <span className="text-2xl font-bold text-primary-600">
                                        {Math.round(program.evaluationCriteria.reduce((total, criterion) => {
                                          const score = values[`score_${criterion.id}`] || 0;
                                          return total + (score / criterion.maxScore) * criterion.weight;
                                        }, 0))}%
                                      </span>
                                    </div>
                                    <div className="mt-2">
                                      <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div 
                                          className="h-3 rounded-full bg-gradient-to-r from-primary-600 to-secondary-500 transition-all duration-300"
                                          style={{ 
                                            width: `${Math.min(100, program.evaluationCriteria.reduce((total, criterion) => {
                                              const score = values[`score_${criterion.id}`] || 0;
                                              return total + (score / criterion.maxScore) * criterion.weight;
                                            }, 0))}%` 
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes d'évaluation
                                  </label>
                                  <Field
                                    as="textarea"
                                    name="evaluationNotes"
                                    rows={5}
                                    value={values.evaluationNotes || ''}
                                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-3 py-2"
                                    placeholder="Détaillez votre évaluation et vos recommandations..."
                                  />
                                  <ErrorMessage name="evaluationNotes" component="div" className="mt-1 text-sm text-error-600" />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Décision
                                  </label>
                                  <div className="space-y-3">
                                    <label className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                                      <Field
                                        type="radio"
                                        name="decision"
                                        value="pre_selected"
                                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                      />
                                      <div className="ml-3">
                                        <span className="block text-sm font-medium text-gray-900">
                                          Présélectionné
                                        </span>
                                        <span className="block text-sm text-gray-500">
                                          Le projet mérite une évaluation plus approfondie
                                        </span>
                                      </div>
                                    </label>
                                    <label className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                                      <Field
                                        type="radio"
                                        name="decision"
                                        value="selected"
                                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                      />
                                      <div className="ml-3">
                                        <span className="block text-sm font-medium text-gray-900">
                                          Sélectionné
                                        </span>
                                        <span className="block text-sm text-gray-500">
                                          Le projet est retenu pour financement
                                        </span>
                                      </div>
                                    </label>
                                    <label className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                                      <Field
                                        type="radio"
                                        name="decision"
                                        value="rejected"
                                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                      />
                                      <div className="ml-3">
                                        <span className="block text-sm font-medium text-gray-900">
                                          Rejeté
                                        </span>
                                        <span className="block text-sm text-gray-500">
                                          Le projet ne répond pas aux critères
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                  <ErrorMessage name="decision" component="div" className="mt-1 text-sm text-error-600" />
                                </div>
                              </CardContent>
                              
                              <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-between">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleCancelEvaluation}
                                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                                >
                                  Annuler
                                </Button>
                               <div className="flex space-x-3">
                                 <Button
                                   type="button"
                                   variant="secondary"
                                   onClick={() => handleAIEvaluation(selectedProject, program, setFieldValue, setValues)}
                                   leftIcon={<Sparkles className="h-4 w-4" />}
                                   disabled={isSubmitting || isAIEvaluating}
                                   isLoading={isAIEvaluating}
                                 >
                                   {isAIEvaluating ? 'Analyse en cours...' : 'Évaluation IA'}
                                 </Button>
                                <Button
                                  type="submit"
                                  variant="primary"
                                  isLoading={isSubmitting}
                                  disabled={!isValid}
                                  leftIcon={<Save className="h-4 w-4" />}
                                >
                                  Soumettre l'évaluation
                                </Button>
                               </div>
                              </CardFooter>
                            </Form>
                          )}
                        </Formik>
                      </Card>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EvaluationPage;