import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useProjectStore, ProjectStatus } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { useFormTemplateStore } from '../../stores/formTemplateStore';
import { useActivitySectorStore } from '../../stores/activitySectorStore';
import { useUserManagementStore } from '../../stores/userManagementStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ProjectStatusBadge from '../../components/projects/ProjectStatusBadge';
import ProcessDiagram from '../../components/workflow/ProcessDiagram';
import FileLink from '../../components/projects/FileLink';
import { Calendar, Clock, DollarSign, CreditCard as Edit, ArrowLeft, Send, CheckCircle, AlertTriangle, FileText, Download, ExternalLink, Phone, Briefcase, User, CreditCard as Edit3, Save, X, Upload, AlertCircle, FileCheck } from 'lucide-react';
import { formatFileSize, UploadedFile } from '../../utils/fileUpload';
import { generateEvaluationReport } from '../../utils/pdfGenerator';
import { formatCurrency } from '../../utils/currency';
import { ProjectStatusService } from '../../services/projectStatusService';
import { formalizationService, DocumentRequest, DocumentSubmission } from '../../services/formalizationService';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { checkPermission } = usePermissions();
  const { projects, getProject, updateProject, fetchProjects } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  const { templates, fetchTemplates, getTemplate } = useFormTemplateStore();
  const { sectors, fetchSectors, getSector } = useActivitySectorStore();
  const { users, fetchUsers, getUser } = useUserManagementStore();

  const [project, setProject] = useState(id ? getProject(id) : undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [documentSubmissions, setDocumentSubmissions] = useState<Record<string, DocumentSubmission[]>>({});
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      console.log('📄 ProjectDetailPage: Fetching fresh data from Supabase...');

      await Promise.all([
        fetchPrograms(),
        fetchPartners(),
        fetchTemplates(),
        fetchProjects(),
        fetchSectors(),
        fetchUsers()
      ]);

      if (id) {
        const projectData = getProject(id);
        console.log('📊 Project data loaded:', {
          id: projectData?.id,
          hasEvaluationScores: !!projectData?.evaluationScores,
          evaluationScores: projectData?.evaluationScores,
          totalScore: projectData?.totalEvaluationScore
        });
        setProject(projectData);

        const docRequests = await formalizationService.getDocumentRequestsByProject(id);
        setDocumentRequests(docRequests);

        const submissionsMap: Record<string, DocumentSubmission[]> = {};
        for (const doc of docRequests) {
          const submissions = await formalizationService.getDocumentSubmissions(doc.id);
          submissionsMap[doc.id] = submissions;
        }
        setDocumentSubmissions(submissionsMap);

        if (!projectData) {
          console.log('⚠️ Project not found, redirecting...');
          navigate('/dashboard/projects');
        }
      }
    };

    loadData();
  }, [id, navigate]);
  
  const handleSubmitProject = async () => {
    if (!project || !id || !user) return;

    setIsSubmitting(true);

    try {
      const result = await ProjectStatusService.changeProjectStatus(
        id,
        'submitted',
        project.status,
        user.role,
        'Projet soumis pour évaluation'
      );

      if (result.success) {
        const updatedProject = await updateProject(id, {
          submissionDate: new Date(),
        });

        if (updatedProject) {
          setProject(updatedProject);
          setShowSubmitConfirm(false);
          await fetchProjects();
        }
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error submitting project:', error);
      alert('Erreur lors de la soumission du projet');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGeneratePdfReport = async () => {
    if (!project) return;

    setIsGeneratingPdf(true);
    try {
      const program = programs.find(p => p.id === project.programId);
      const partner = program ? partners.find(p => p.id === program.partnerId) : null;

      if (program) {
        await generateEvaluationReport(project, program, partner);
      }
    } catch (error) {
      console.error('Error generating PDF report:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!project) return;
    setEditFormData({
      title: project.title || '',
      description: project.description || '',
      budget: project.budget || 0,
      submitterPhone: project.submitterPhone || '',
      submitterName: project.submitterName || '',
      projectDescription: project.projectDescription || '',
      projectAgeMonths: project.projectAgeMonths || '',
      activitySectorId: project.activitySectorId || '',
      formData: project.formData || {}
    });
    setShowEditModal(true);
  };

  const handleSaveProjectEdit = async () => {
    if (!project || !id) return;

    setIsProcessing(true);
    try {
      const updatedProject = await updateProject(id, {
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

      if (updatedProject) {
        setProject(updatedProject);
      }
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

  const handleDocumentUpload = async (requestId: string, file: File) => {
    if (!user || !id) return;

    setIsUploadingDocument(true);
    setUploadingRequestId(requestId);

    try {
      const filePath = await formalizationService.uploadDocument(file, requestId);
      if (filePath) {
        await formalizationService.createDocumentSubmission({
          request_id: requestId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          submitted_by: user.email || user.name || 'Soumissionnaire'
        });

        const updatedRequests = await formalizationService.getDocumentRequestsByProject(id);
        setDocumentRequests(updatedRequests);

        const submissions = await formalizationService.getDocumentSubmissions(requestId);
        setDocumentSubmissions(prev => ({ ...prev, [requestId]: submissions }));

        alert('Document televerse avec succes!');
      }
    } catch (error) {
      console.error('Erreur upload document:', error);
      alert('Erreur lors du televersement du document');
    } finally {
      setIsUploadingDocument(false);
      setUploadingRequestId(null);
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="h-3.5 w-3.5" /> },
      submitted: { label: 'Soumis', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Upload className="h-3.5 w-3.5" /> },
      validated: { label: 'Valide', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="h-3.5 w-3.5" /> },
      rejected: { label: 'Rejete', color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="h-3.5 w-3.5" /> }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const pendingDocuments = documentRequests.filter(d => d.status === 'pending');
  const submittedDocuments = documentRequests.filter(d => d.status !== 'pending');

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Chargement du projet...</div>
      </div>
    );
  }
  
  const canSubmit = project.status === 'draft' && user?.id === project.submitterId;
  const canEdit = project.status === 'draft' && user?.id === project.submitterId && checkPermission('projects.edit');
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
          onClick={() => navigate('/dashboard/projects')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour aux projets
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-2 sm:mb-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {project.title}
            </h1>
            {(() => {
              const program = programs.find(p => p.id === project.programId);
              return program ? (
                <p className="text-sm text-gray-600 mt-1">
                  Programme: <span className="font-medium">{program.name}</span>
                </p>
              ) : null;
            })()}
          </div>
          
          <div className="flex space-x-3">
            {canEdit && checkPermission('projects.edit') && (
              <Button
                variant="outline"
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={() => navigate(`/dashboard/projects/${project.id}/edit`)}
              >
                Modifier
              </Button>
            )}
            
            {canSubmit && checkPermission('projects.submit') && (
              <Button
                variant="primary"
                leftIcon={<Send className="h-4 w-4" />}
                onClick={() => setShowSubmitConfirm(true)}
              >
                Soumettre
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {showSubmitConfirm && (
        <Card className="mb-6 border-2 border-warning-300">
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-warning-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Confirmer la soumission</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Une fois soumis, vous ne pourrez plus modifier votre projet. Êtes-vous sûr de vouloir soumettre ce projet pour évaluation ?
                </p>
                <div className="mt-4 flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowSubmitConfirm(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    isLoading={isSubmitting}
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                    onClick={handleSubmitProject}
                  >
                    Confirmer la soumission
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Détails du projet</CardTitle>
                <div className="flex items-center gap-3">
                  <ProjectStatusBadge status={project.status} />
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
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-primary-600 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {project.projectDescription || project.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-4">
                  {project.submitterName && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-500">Porteur:</span>
                      <span className="ml-1 font-medium text-gray-900">{project.submitterName}</span>
                    </div>
                  )}
                  {project.activitySectorId && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-500">Secteur:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {getSector(project.activitySectorId)?.name || 'Non defini'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {(project.submitterPhone || project.projectAgeMonths) && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Informations Complementaires</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.submitterPhone && (
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Phone className="h-5 w-5 text-blue-500 mr-3" />
                        <div>
                          <div className="text-sm text-gray-500">Telephone</div>
                          <div className="font-medium">{project.submitterPhone}</div>
                        </div>
                      </div>
                    )}

                    {project.projectAgeMonths !== undefined && project.projectAgeMonths !== null && (
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-500 mr-3" />
                        <div>
                          <div className="text-sm text-gray-500">Duree d'existence du projet</div>
                          <div className="font-medium">
                            {project.projectAgeMonths} mois
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Cree le</div>
                  <div className="font-medium">{project.createdAt.toLocaleDateString()}</div>
                </div>
              </div>
              
              {project.submissionDate && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center">
                    <Send className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Soumis le</div>
                      <div className="font-medium">{project.submissionDate.toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {(() => {
                const program = programs.find(p => p.id === project.programId);
                const template = program?.formTemplateId ? getTemplate(program.formTemplateId) : null;

                if (!template || !template.fields || template.fields.length === 0) return null;

                return (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Formulaire de soumission: {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {template.description || 'Réponses du formulaire du programme'}
                    </p>
                    <div className="space-y-4">
                      {template.fields.map(field => {
                        const value = project.formData?.[field.id] ?? project.formData?.[field.name];

                        return (
                          <div key={field.id} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label}
                              {field.required && <span className="text-error-500 ml-1">*</span>}
                            </label>
                            {field.description && (
                              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                            )}
                            {value === undefined || value === null || value === '' ? (
                              <p className="text-sm text-gray-400 italic">Non renseigné</p>
                            ) : field.type === 'file' || (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'path' in value[0]) ? (
                              <div className="space-y-2">
                                {(Array.isArray(value) ? value : [value]).map((file, idx) => {
                                  if (typeof file === 'object' && file !== null && 'name' in file && 'path' in file) {
                                    return <FileLink key={idx} file={file as UploadedFile} />;
                                  }
                                  return <p key={idx} className="text-sm text-gray-400 italic">Fichier non disponible</p>;
                                })}
                              </div>
                            ) : field.type === 'textarea' ? (
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">{value}</p>
                            ) : field.type === 'checkbox' ? (
                              <p className="text-sm text-gray-900">{value ? '✓ Oui' : '✗ Non'}</p>
                            ) : field.type === 'multiple_select' && Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-2">
                                {value.map((v, idx) => (
                                  <span key={idx} className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            ) : field.type === 'date' && value ? (
                              <p className="text-sm text-gray-900">{new Date(value).toLocaleDateString()}</p>
                            ) : (
                              <p className="text-sm text-gray-900">{String(value)}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          
          {user?.role !== 'submitter' && (project.totalEvaluationScore !== undefined || project.evaluationScores || project.evaluationScore !== undefined) && (
            <Card className="mt-6 border-l-4 border-l-primary-500">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 text-primary-600 mr-2" />
                    Résultats d'évaluation
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePdfReport}
                    isLoading={isGeneratingPdf}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Rapport PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(project.totalEvaluationScore !== undefined || project.evaluationScore !== undefined) && (
                  <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-6 rounded-lg border border-primary-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-primary-800">Score d'évaluation total</h3>
                        <p className="text-sm text-primary-600">Calculé selon les critères pondérés</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary-700">
                          {project.totalEvaluationScore || project.evaluationScore}%
                        </div>
                        <div className={`text-sm font-medium ${
                          (project.totalEvaluationScore || project.evaluationScore || 0) >= 80 ? 'text-success-600' :
                          (project.totalEvaluationScore || project.evaluationScore || 0) >= 60 ? 'text-warning-600' : 'text-error-600'
                        }`}>
                          {(project.totalEvaluationScore || project.evaluationScore || 0) >= 80 ? 'Excellent' :
                           (project.totalEvaluationScore || project.evaluationScore || 0) >= 60 ? 'Satisfaisant' : 'À améliorer'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="overflow-hidden h-3 text-xs flex rounded-full bg-white shadow-inner">
                        <div 
                          style={{ width: `${Math.min(100, project.totalEvaluationScore || project.evaluationScore || 0)}%` }} 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                            (project.totalEvaluationScore || project.evaluationScore || 0) >= 80 ? 'bg-gradient-to-r from-success-500 to-success-600' :
                            (project.totalEvaluationScore || project.evaluationScore || 0) >= 60 ? 'bg-gradient-to-r from-warning-500 to-warning-600' :
                            'bg-gradient-to-r from-error-500 to-error-600'
                          }`}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    {project.recommendedStatus && (
                      <div className="mt-4 flex items-center">
                        <span className="text-sm font-medium text-primary-700 mr-2">Recommandation :</span>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                          project.recommendedStatus === 'selected' ? 'bg-success-100 text-success-800' :
                          project.recommendedStatus === 'pre_selected' ? 'bg-warning-100 text-warning-800' :
                          'bg-error-100 text-error-800'
                        }`}>
                          {project.recommendedStatus === 'selected' ? '✅ Sélectionné' :
                           project.recommendedStatus === 'pre_selected' ? '⚠️ Présélectionné' :
                           '❌ Rejeté'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {project.evaluationDate && (
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Évalué le {project.evaluationDate.toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                    {project.evaluatedBy && (
                      <span className="ml-4 text-primary-600">
                        • Évaluateur: {getUser(project.evaluatedBy)?.name || 'Inconnu'}
                      </span>
                    )}
                  </div>
                )}
                
                {project.evaluationScores && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-gray-800">Détail par critère</h4>
                      <span className="text-xs text-gray-500">
                        {Object.keys(project.evaluationScores).length} critère(s) évalué(s)
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const program = programs.find(p => p.id === project.programId);
                        if (!program) {
                          console.log('⚠️ Program not found for project:', project.programId);
                          return null;
                        }

                        console.log('📋 Displaying evaluation for program:', program.name, {
                          criteriaCount: program.evaluationCriteria.length,
                          projectEvaluationScores: project.evaluationScores,
                          projectEvaluationComments: project.evaluationComments
                        });

                        return program.evaluationCriteria.map((criterion, index) => {
                          const score = project.evaluationScores![criterion.id] || 0;
                          const comment = project.evaluationComments?.[criterion.id] || '';
                          const percentage = (score / criterion.maxScore) * 100;

                          console.log(`  Criterion ${index + 1}: ${criterion.name}`, {
                            criterionId: criterion.id,
                            score,
                            maxScore: criterion.maxScore,
                            percentage,
                            hasComment: !!comment
                          });
                          
                          return (
                            <div key={criterion.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center mb-1">
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 text-xs font-medium rounded-full mr-2">
                                      {index + 1}
                                    </span>
                                    <h5 className="font-medium text-gray-900">{criterion.name}</h5>
                                  </div>
                                  <p className="text-sm text-gray-600 ml-8">{criterion.description}</p>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {score}/{criterion.maxScore}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Poids: {criterion.weight}%
                                  </div>
                                </div>
                              </div>
                              
                              <div className="ml-8">
                                <div className="flex items-center mb-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        percentage >= 75 ? 'bg-gradient-to-r from-success-400 to-success-500' :
                                        percentage >= 50 ? 'bg-gradient-to-r from-warning-400 to-warning-500' : 
                                        'bg-gradient-to-r from-error-400 to-error-500'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {Math.round(percentage)}%
                                  </span>
                                </div>
                                
                                {comment && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded-md border-l-3 border-l-primary-400">
                                    <div className="flex items-start">
                                      <FileText className="h-4 w-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="text-xs font-medium text-primary-700 uppercase tracking-wide">Justification</span>
                                        <p className="text-sm text-gray-700 mt-1">{comment}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                
                {project.evaluationNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Synthèse de l'évaluation</h4>
                        <p className="text-sm text-blue-700 leading-relaxed">{project.evaluationNotes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessDiagram currentStatus={project.status} />
            </CardContent>
          </Card>
          
          {project.status === 'formalization' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Formalisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">NDA signe</span>
                  <span className={`flex items-center ${project.ndaSigned ? 'text-success-600' : 'text-gray-400'}`}>
                    {project.ndaSigned ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Dossier complet</span>
                  <span className={`flex items-center ${project.formalizationCompleted ? 'text-success-600' : 'text-gray-400'}`}>
                    {project.formalizationCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {documentRequests.length > 0 && (
            <Card className="mb-6 border-l-4 border-l-amber-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-amber-600" />
                    Documents demandes
                  </CardTitle>
                  {pendingDocuments.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      {pendingDocuments.length} en attente
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingDocuments.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          {pendingDocuments.length} document(s) en attente de soumission
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Veuillez telecharger les documents demandes ci-dessous
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {documentRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`border rounded-lg p-4 transition-all ${
                        request.status === 'pending'
                          ? 'border-amber-200 bg-white hover:border-amber-300'
                          : request.status === 'validated'
                          ? 'border-green-200 bg-green-50'
                          : request.status === 'rejected'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {request.document_name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Type: {request.document_type === 'legal' ? 'Document legal' :
                                   request.document_type === 'financial' ? 'Document financier' :
                                   request.document_type === 'technical' ? 'Document technique' :
                                   request.document_type === 'administrative' ? 'Document administratif' : 'Autre'}
                          </p>
                        </div>
                        {getDocumentStatusBadge(request.status)}
                      </div>

                      {request.description && (
                        <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                      )}

                      {request.due_date && (
                        <div className="flex items-center text-xs text-gray-500 mb-3">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Date limite: {new Date(request.due_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div className="mt-3">
                          <label className="block">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDocumentUpload(request.id, file);
                                }
                              }}
                              disabled={isUploadingDocument}
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full"
                              disabled={isUploadingDocument && uploadingRequestId === request.id}
                              leftIcon={<Upload className="h-4 w-4" />}
                              onClick={(e) => {
                                const input = (e.target as HTMLElement).closest('label')?.querySelector('input');
                                input?.click();
                              }}
                            >
                              {isUploadingDocument && uploadingRequestId === request.id
                                ? 'Televersement...'
                                : 'Telecharger le document'}
                            </Button>
                          </label>
                        </div>
                      )}

                      {documentSubmissions[request.id]?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-700">Document(s) soumis:</p>
                          {documentSubmissions[request.id].map((submission) => (
                            <div
                              key={submission.id}
                              className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileCheck className="h-4 w-4 text-blue-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {submission.file_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(submission.file_size)} - {new Date(submission.submitted_at || submission.created_at).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const url = await formalizationService.getDownloadUrl(submission.file_path);
                                  if (url) window.open(url, '_blank');
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {request.status === 'validated' && (
                        <div className="mt-2 flex items-center text-sm text-green-700">
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          Document valide par l'equipe
                        </div>
                      )}

                      {request.status === 'rejected' && request.notes && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                          <span className="font-medium">Raison du rejet:</span> {request.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {submittedDocuments.length > 0 && pendingDocuments.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progression</span>
                      <span className="font-medium text-gray-900">
                        {submittedDocuments.length}/{documentRequests.length} soumis
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(submittedDocuments.length / documentRequests.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {Object.values(documentSubmissions).flat().length > 0 && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <FileCheck className="h-5 w-5 mr-2 text-green-600" />
                  Documents soumis ({Object.values(documentSubmissions).flat().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(documentSubmissions).map(([requestId, submissions]) => {
                    const request = documentRequests.find(r => r.id === requestId);
                    return submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <FileCheck className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {submission.file_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {request?.document_name && (
                                <span className="text-green-700 font-medium">{request.document_name}</span>
                              )}
                              {request?.document_name && ' - '}
                              {formatFileSize(submission.file_size)} - Soumis le {new Date(submission.submitted_at || submission.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                          onClick={async () => {
                            const url = await formalizationService.getDownloadUrl(submission.file_path);
                            if (url) window.open(url, '_blank');
                          }}
                        >
                          Ouvrir
                        </Button>
                      </div>
                    ));
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showEditModal && project && (
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
                Modifiez les informations du projet "{project.title}"
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

export default ProjectDetailPage;