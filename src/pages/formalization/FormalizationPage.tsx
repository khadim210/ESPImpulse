import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useProjectStore } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { useUserManagementStore } from '../../stores/userManagementStore';
import { useActivitySectorStore } from '../../stores/activitySectorStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { generateEligibilityReport, generateWolumaEvaluationReport } from '../../utils/pdfGenerator';
import {
  FileText,
  GraduationCap,
  DollarSign,
  Archive,
  Shield,
  Plus,
  Download,
  Upload,
  CheckCircle,
  Clock,
  CreditCard as Edit,
  Trash2,
  AlertCircle,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  Briefcase,
  Target,
  ChevronRight
} from 'lucide-react';
import { getAccessiblePrograms } from '../../hooks/useFilteredProjects';
import logoUrl from '../../assets/Logo_senegal-ucad.png';
import DocumentRequestModal from '../../components/formalization/DocumentRequestModal';
import TechnicalSupportModal from '../../components/formalization/TechnicalSupportModal';
import DisbursementPlanModal from '../../components/formalization/DisbursementPlanModal';
import { formalizationService } from '../../services/formalizationService';
import { EmailService } from '../../services/emailService';
import type {
  DocumentRequest,
  DocumentSubmission,
  TechnicalSupport,
  DisbursementPlan,
  DisbursementTranche
} from '../../services/formalizationService';

const FormalizationPage: React.FC = () => {
  const { user } = useAuthStore();
  const { checkPermission } = usePermissions();
  const { projects, fetchProjects } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  const { users, fetchUsers, getUser } = useUserManagementStore();
  const { sectors, fetchSectors, getSector } = useActivitySectorStore();

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [selectedSupport, setSelectedSupport] = useState<TechnicalSupport | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [documentSubmissions, setDocumentSubmissions] = useState<Record<string, DocumentSubmission[]>>({});
  const [technicalSupports, setTechnicalSupports] = useState<TechnicalSupport[]>([]);
  const [disbursementPlan, setDisbursementPlan] = useState<DisbursementPlan | null>(null);
  const [disbursementTranches, setDisbursementTranches] = useState<DisbursementTranche[]>([]);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 10;

  useEffect(() => {
    fetchPrograms();
    fetchPartners();
    fetchProjects();
    fetchUsers();
    fetchSectors();
  }, [fetchPrograms, fetchPartners, fetchProjects, fetchUsers, fetchSectors]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject);
    }
  }, [selectedProject]);

  const loadProjectData = async (projectId: string) => {
    try {
      const [docs, supports, financial] = await Promise.all([
        formalizationService.getDocumentRequestsByProject(projectId),
        formalizationService.getTechnicalSupportByProject(projectId),
        formalizationService.getDisbursementPlanByProject(projectId)
      ]);

      setDocumentRequests(docs);
      setTechnicalSupports(supports);
      setDisbursementPlan(financial.plan);
      setDisbursementTranches(financial.tranches);

      const submissionsMap: Record<string, DocumentSubmission[]> = {};
      for (const doc of docs) {
        const submissions = await formalizationService.getDocumentSubmissions(doc.id);
        submissionsMap[doc.id] = submissions;
      }
      setDocumentSubmissions(submissionsMap);
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  if (!user || !checkPermission('evaluation.evaluate')) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">Acces restreint</h2>
        <p className="text-gray-500">Vous n'avez pas acces a cette section.</p>
      </div>
    );
  }

  const accessiblePrograms = useMemo(
    () => getAccessiblePrograms(user, programs, partners),
    [user, programs, partners]
  );

  const selectedProjectsData = useMemo(() => {
    return projects.filter(p => {
      const hasRelevantStatus = p.status === 'selected' || p.recommendedStatus === 'selected';
      if (!hasRelevantStatus) return false;

      const isAccessible = accessiblePrograms.some(prog => prog.id === p.programId);
      if (!isAccessible) return false;

      const matchesSearch = searchTerm === '' ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.projectDescription || p.description).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProgram = programFilter === 'all' || p.programId === programFilter;

      let matchesDate = true;
      if (dateFilter !== 'all' && p.submissionDate) {
        const submissionDate = new Date(p.submissionDate);
        const now = new Date();

        if (dateFilter === 'today') {
          matchesDate = submissionDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = submissionDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = submissionDate >= monthAgo;
        }
      }

      return matchesSearch && matchesProgram && matchesDate;
    });
  }, [projects, accessiblePrograms, searchTerm, programFilter, dateFilter]);

  const totalPages = Math.ceil(selectedProjectsData.length / projectsPerPage);
  const paginatedProjects = selectedProjectsData.slice(
    (currentPage - 1) * projectsPerPage,
    currentPage * projectsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, programFilter, dateFilter]);

  const currentProject = projects.find(p => p.id === selectedProject);
  const currentProgram = currentProject ? programs.find(p => p.id === currentProject.programId) : null;
  const currentPartner = currentProgram ? partners.find(p => p.id === currentProgram.partnerId) : null;
  const submitterUser = currentProject ? getUser(currentProject.submitterId) : undefined;

  const handleCreateDocumentRequest = async (values: any) => {
    const result = await formalizationService.createDocumentRequest({
      ...values,
      requested_by: user.id
    });

    if (result && currentProject) {
      const submitterEmail = currentProject.submitterEmail || submitterUser?.email;
      const submitterName = currentProject.submitterName || submitterUser?.name || 'Porteur de projet';

      if (submitterEmail) {
        const documentTypeLabels: Record<string, string> = {
          'legal': 'Document legal',
          'financial': 'Document financier',
          'technical': 'Document technique',
          'administrative': 'Document administratif',
          'other': 'Autre'
        };

        await EmailService.sendDocumentRequestNotification(
          submitterEmail,
          submitterName,
          currentProject.title,
          values.document_name,
          documentTypeLabels[values.document_type] || values.document_type,
          values.description,
          values.due_date
        );
      }
    }

    loadProjectData(selectedProject);
  };

  const handleUploadDocument = async (requestId: string, file: File, submittedBy: string) => {
    setIsUploading(requestId);
    try {
      const filePath = await formalizationService.uploadDocument(file, requestId);
      if (filePath) {
        await formalizationService.createDocumentSubmission({
          request_id: requestId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          submitted_by: submittedBy
        });
        loadProjectData(selectedProject);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors du televersement');
    } finally {
      setIsUploading(null);
    }
  };

  const handleViewDocument = async (filePath: string, fileName: string) => {
    try {
      const url = await formalizationService.getDownloadUrl(filePath);
      if (url) {
        setPreviewUrl(url);
        setPreviewFileName(fileName);
      }
    } catch (error) {
      console.error('Error getting document URL:', error);
      alert('Erreur lors de l\'ouverture du document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCreateTechnicalSupport = async (values: any) => {
    if (selectedSupport) {
      await formalizationService.updateTechnicalSupport(selectedSupport.id, values);
    } else {
      await formalizationService.createTechnicalSupport({
        ...values,
        created_by: user.id
      });
    }
    setSelectedSupport(null);
    loadProjectData(selectedProject);
  };

  const handleDeleteSupport = async (id: string) => {
    if (confirm('Confirmer la suppression de cet accompagnement ?')) {
      await formalizationService.deleteTechnicalSupport(id);
      loadProjectData(selectedProject);
    }
  };

  const handleDeleteDocumentRequest = async (id: string) => {
    if (confirm('Confirmer la suppression de cette demande de document ?')) {
      await formalizationService.deleteDocumentRequest(id);
      loadProjectData(selectedProject);
    }
  };

  const handleSaveDisbursementPlan = async (values: any) => {
    await formalizationService.createDisbursementPlan(
      {
        project_id: values.project_id,
        total_amount: values.total_amount,
        currency: values.currency,
        created_by: user.id
      },
      values.tranches
    );
    loadProjectData(selectedProject);
  };

  const handleUpdateTranche = async (trancheId: string, updates: Partial<DisbursementTranche>) => {
    await formalizationService.updateDisbursementTranche(trancheId, updates);
    loadProjectData(selectedProject);
  };

  const handleArchiveProject = async () => {
    if (!currentProject) return;

    if (!confirm(`Confirmer l'archivage du projet "${currentProject.title}" ?`)) {
      return;
    }

    setIsArchiving(true);
    try {
      const result = await formalizationService.createProjectArchive(
        selectedProject,
        user.id,
        'Projet archive depuis la page de formalisation'
      );

      if (result.success) {
        alert('Projet archive avec succes');
      }
    } catch (error) {
      console.error('Error archiving project:', error);
      alert('Erreur lors de l\'archivage');
    } finally {
      setIsArchiving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      submitted: { label: 'Soumis', color: 'bg-blue-100 text-blue-800' },
      validated: { label: 'Valide', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejete', color: 'bg-red-100 text-red-800' },
      planned: { label: 'Planifie', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Termine', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annule', color: 'bg-gray-100 text-gray-800' },
      disbursed: { label: 'Decaisse', color: 'bg-green-100 text-green-800' },
      approved: { label: 'Approuve', color: 'bg-green-100 text-green-800' }
    };

    const badge = badges[status as keyof typeof badges] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const handleExportFormalizationPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF('l', 'mm', 'a4');
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
    doc.text('Projets en Formalisation - Resume', margin + 30, 15);

    doc.setFontSize(10);
    doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, margin + 30, 22);
    doc.text(`Total: ${selectedProjectsData.length} projet(s)`, margin, 34);

    const allData = await Promise.all(
      selectedProjectsData.map(async (project) => {
        const [docs, supports, financial] = await Promise.all([
          formalizationService.getDocumentRequestsByProject(project.id),
          formalizationService.getTechnicalSupportByProject(project.id),
          formalizationService.getDisbursementPlanByProject(project.id)
        ]);

        const docsApproved = docs.filter(d => d.status === 'approved').length;
        const supportsCompleted = supports.filter(s => s.status === 'completed').length;
        const tranchesDisbursed = financial.tranches.filter(t => t.status === 'disbursed').length;
        const totalAmount = financial.plan?.total_amount || 0;
        const amountDisbursed = financial.tranches
          .filter(t => t.status === 'disbursed')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          project,
          docs: `${docsApproved}/${docs.length} approuves`,
          support: `${supportsCompleted}/${supports.length} completes`,
          financial: financial.tranches.length > 0
            ? `${tranchesDisbursed}/${financial.tranches.length} tranches (${amountDisbursed.toLocaleString('fr-FR')} / ${totalAmount.toLocaleString('fr-FR')} ${financial.plan?.currency || 'XOF'})`
            : 'Pas de plan',
          progress: docs.length > 0 ? Math.round((docsApproved / docs.length) * 100) : 0
        };
      })
    );

    const tableData = allData.map(data => {
      const program = programs.find(p => p.id === data.project.programId);
      return [
        data.project.title.length > 25 ? data.project.title.substring(0, 22) + '...' : data.project.title,
        program?.name.substring(0, 20) || 'N/A',
        data.docs,
        data.support,
        data.financial.length > 35 ? data.financial.substring(0, 32) + '...' : data.financial,
        `${data.progress}%`
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Projet', 'Programme', 'Documents', 'Accompagnement', 'Plan Financier', 'Progression']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 65 },
        5: { cellWidth: 20 }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: any) => {
        const pageCount = doc.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber} sur ${pageCount}`,
          doc.internal.pageSize.width / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    doc.save(`Formalisation_Projets_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportFormalizationExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const allData = await Promise.all(
      selectedProjectsData.map(async (project) => {
        const [docs, supports, financial] = await Promise.all([
          formalizationService.getDocumentRequestsByProject(project.id),
          formalizationService.getTechnicalSupportByProject(project.id),
          formalizationService.getDisbursementPlanByProject(project.id)
        ]);

        const program = programs.find(p => p.id === project.programId);
        const docsApproved = docs.filter(d => d.status === 'approved').length;
        const supportsCompleted = supports.filter(s => s.status === 'completed').length;
        const tranchesDisbursed = financial.tranches.filter(t => t.status === 'disbursed').length;
        const totalAmount = financial.plan?.total_amount || 0;
        const amountDisbursed = financial.tranches
          .filter(t => t.status === 'disbursed')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          project,
          program,
          docs,
          supports,
          financial,
          docsApproved,
          supportsCompleted,
          tranchesDisbursed,
          totalAmount,
          amountDisbursed
        };
      })
    );

    const summaryData = allData.map(data => ({
      'Titre': data.project.title,
      'Programme': data.program?.name || 'N/A',
      'Budget': data.project.budget,
      'Documents approuves': `${data.docsApproved}/${data.docs.length}`,
      'Accompagnement complete': `${data.supportsCompleted}/${data.supports.length}`,
      'Tranches decaissees': `${data.tranchesDisbursed}/${data.financial.tranches.length}`,
      'Montant total': data.totalAmount,
      'Montant decaisse': data.amountDisbursed,
      'Devise': data.financial.plan?.currency || 'XOF',
      'Progression': data.docs.length > 0 ? `${Math.round((data.docsApproved / data.docs.length) * 100)}%` : '0%',
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resume');

    const docsData: any[] = [];
    allData.forEach(data => {
      data.docs.forEach(doc => {
        docsData.push({
          'Projet': data.project.title,
          'Type de document': doc.document_type,
          'Titre': doc.title,
          'Description': doc.description || '',
          'Statut': doc.status === 'pending' ? 'En attente' :
                    doc.status === 'submitted' ? 'Soumis' :
                    doc.status === 'validated' ? 'Valide' :
                    doc.status === 'approved' ? 'Approuve' : 'Rejete',
          'Date limite': doc.due_date ? new Date(doc.due_date).toLocaleDateString('fr-FR') : 'N/A',
          'Date soumission': doc.submitted_at ? new Date(doc.submitted_at).toLocaleDateString('fr-FR') : 'N/A',
          'Fichier': doc.file_path || 'Non fourni',
        });
      });
    });

    if (docsData.length > 0) {
      const wsDocs = XLSX.utils.json_to_sheet(docsData);
      XLSX.utils.book_append_sheet(wb, wsDocs, 'Documents');
    }

    const supportsData: any[] = [];
    allData.forEach(data => {
      data.supports.forEach(support => {
        supportsData.push({
          'Projet': data.project.title,
          'Titre': support.title,
          'Type': support.type,
          'Description': support.description || '',
          'Statut': support.status === 'pending' ? 'En attente' :
                    support.status === 'scheduled' ? 'Planifie' :
                    support.status === 'in_progress' ? 'En cours' :
                    support.status === 'completed' ? 'Complete' : 'Annule',
          'Date prevue': support.scheduled_date ? new Date(support.scheduled_date).toLocaleDateString('fr-FR') : 'N/A',
          'Duree (heures)': support.duration_hours || 0,
          'Prestataire': support.provider || 'N/A',
          'Participants': support.participants || 'N/A',
        });
      });
    });

    if (supportsData.length > 0) {
      const wsSupports = XLSX.utils.json_to_sheet(supportsData);
      XLSX.utils.book_append_sheet(wb, wsSupports, 'Accompagnement');
    }

    const tranchesData: any[] = [];
    allData.forEach(data => {
      data.financial.tranches.forEach(tranche => {
        tranchesData.push({
          'Projet': data.project.title,
          'Numero de tranche': tranche.tranche_number,
          'Montant': tranche.amount,
          'Pourcentage': tranche.percentage ? `${tranche.percentage}%` : 'N/A',
          'Devise': data.financial.plan?.currency || 'XOF',
          'Statut': tranche.status === 'pending' ? 'En attente' :
                    tranche.status === 'approved' ? 'Approuve' : 'Decaisse',
          'Date prevue': tranche.scheduled_date ? new Date(tranche.scheduled_date).toLocaleDateString('fr-FR') : 'N/A',
          'Date effective': tranche.actual_disbursement_date ? new Date(tranche.actual_disbursement_date).toLocaleDateString('fr-FR') : 'N/A',
          'Conditions': tranche.conditions || 'Aucune',
        });
      });
    });

    if (tranchesData.length > 0) {
      const wsTranches = XLSX.utils.json_to_sheet(tranchesData);
      XLSX.utils.book_append_sheet(wb, wsTranches, 'Tranches de paiement');
    }

    XLSX.writeFile(wb, `Formalisation_Detaillee_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!selectedProject) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Formalisation des Projets</h1>
            <p className="text-gray-600">
              Gestion des documents, accompagnement et decaissement
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleExportFormalizationExcel}
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              disabled={selectedProjectsData.length === 0}
            >
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleExportFormalizationPDF}
              leftIcon={<Printer className="h-4 w-4" />}
              disabled={selectedProjectsData.length === 0}
            >
              Export PDF
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-500 mr-2" />
              <CardTitle>Filtres</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  Periode de soumission
                </label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  setDateFilter('all');
                }}
              >
                Reinitialiser les filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedProjectsData.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun projet selectionne disponible
                </h3>
                <p className="text-gray-600 mb-4">
                  Les projets doivent etre evalues avec une recommandation "Selectionne" pour apparaitre ici.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-left max-w-md mx-auto">
                  <p className="text-sm text-blue-900 font-medium mb-2">Pour voir des projets ici :</p>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Allez dans la page "Evaluation"</li>
                    <li>Evaluez des projets eligibles</li>
                    <li>Attribuez une recommandation "Selectionne"</li>
                    <li>Les projets apparaitront automatiquement ici</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Projets disponibles ({selectedProjectsData.length})
            </h2>
            <div className="grid gap-4">
              {paginatedProjects.map(project => {
                const program = programs.find(p => p.id === project.programId);
                const partner = program ? partners.find(p => p.id === program.partnerId) : null;
                const isFormalized = project.status === 'selected';

                return (
                  <Card
                    key={project.id}
                    className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isFormalized
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isFormalized ? 'Selectionne' : 'Recommande'}
                            </span>
                          </div>

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.projectDescription || project.description}</p>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {program && (
                              <div className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                <span>{program.name}</span>
                              </div>
                            )}
                            {partner && (
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                <span>{partner.name}</span>
                              </div>
                            )}
                            {project.submissionDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(project.submissionDate).toLocaleDateString('fr-FR')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center text-blue-600">
                          <span className="text-sm font-medium mr-1">Voir details</span>
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-gray-700">
                  Affichage de {(currentPage - 1) * projectsPerPage + 1} a {Math.min(currentPage * projectsPerPage, selectedProjectsData.length)} sur {selectedProjectsData.length} resultats
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
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setSelectedProject('')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="mb-4"
        >
          Retour a la liste
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Formalisation du projet</h1>
            <p className="text-gray-600">
              {currentProject?.title}
            </p>
          </div>
        </div>
      </div>

      {currentProject?.status !== 'selected' && currentProject?.recommendedStatus === 'selected' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-900 mb-1">
                Projet recommande pour selection
              </h4>
              <p className="text-sm text-amber-700">
                Ce projet a ete evalue et recommande pour selection, mais n'a pas encore ete formellement valide.
                Pour le valider definitivement, retournez a la page "Evaluation" et cliquez sur "Soumettre le resultat".
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Porteur de projet</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {currentProject?.submitterName || 'Non renseigne'}
                  </p>
                  <p className="text-sm text-gray-500">Porteur de projet</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{currentProject?.submitterEmail || submitterUser?.email || 'Non renseigne'}</span>
              </div>

              {currentProject?.submitterPhone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{currentProject.submitterPhone}</span>
                </div>
              )}

              {currentProject?.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{currentProject.location}</span>
                </div>
              )}

              {currentProject?.activitySector && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>{currentProject.activitySector}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Details du projet</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Titre</h4>
                <p className="text-gray-900 font-medium">{currentProject?.title}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Programme</h4>
                <p className="text-gray-900">{currentProgram?.name || 'N/A'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Partenaire</h4>
                <p className="text-gray-900">{currentPartner?.name || 'N/A'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Date de soumission</h4>
                <p className="text-gray-900">
                  {currentProject?.submissionDate
                    ? new Date(currentProject.submissionDate).toLocaleDateString('fr-FR')
                    : 'N/A'
                  }
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Statut</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentProject?.status === 'selected'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentProject?.status === 'selected' ? 'Selectionne' : 'Recommande'}
                </span>
              </div>

              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-700 text-sm">{currentProject?.projectDescription || currentProject?.description}</p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={async () => {
                      if (!currentProject) return;
                      setIsGeneratingPdf(true);
                      try {
                        const program = programs.find(p => p.id === currentProject.programId);
                        const partner = partners.find(p => p.id === program?.partnerId) || null;
                        const sector = getSector(currentProject.activitySectorId || '');
                        await generateEligibilityReport(currentProject, program!, partner, sector?.name);
                      } finally {
                        setIsGeneratingPdf(false);
                      }
                    }}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Rapport d'eligibilite
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentProject) return;
                      setIsGeneratingPdf(true);
                      try {
                        const program = programs.find(p => p.id === currentProject.programId);
                        const partner = partners.find(p => p.id === program?.partnerId) || null;
                        await generateWolumaEvaluationReport(currentProject, program!, partner, user?.name);
                      } finally {
                        setIsGeneratingPdf(false);
                      }
                    }}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Rapport d'evaluation
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <section id="documents">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle>Gestion des Documents</CardTitle>
                </div>
                <Button onClick={() => setShowDocumentModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle demande
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune demande de document</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documentRequests.map((request) => {
                    const submissions = documentSubmissions[request.id] || [];
                    const latestSubmission = submissions[0];
                    const hasDocument = !!latestSubmission;

                    return (
                      <div
                        key={request.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{request.document_name}</h4>
                            <p className="text-sm text-gray-500">Type: {request.document_type}</p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>

                        <p className="text-gray-700 text-sm mb-3">{request.description}</p>

                        {request.due_date && (
                          <p className="text-sm text-gray-500 mb-3">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Date limite: {new Date(request.due_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}

                        {hasDocument && (
                          <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{latestSubmission.file_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(latestSubmission.file_size)} - Soumis le {new Date(latestSubmission.submitted_at).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewDocument(latestSubmission.file_path, latestSubmission.file_name)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Voir le document"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                                <a
                                  href="#"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    const url = await formalizationService.getDownloadUrl(latestSubmission.file_path);
                                    if (url) window.open(url, '_blank');
                                  }}
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Telecharger"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                            {submissions.length > 1 && (
                              <p className="mt-2 text-xs text-gray-500">
                                {submissions.length - 1} version(s) precedente(s)
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input
                              type="file"
                              id={`file-input-${request.id}`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const email = prompt('Email du soumissionnaire:');
                                  if (email) {
                                    handleUploadDocument(request.id, file, email);
                                  }
                                }
                                e.target.value = '';
                              }}
                              disabled={isUploading === request.id || request.status === 'validated'}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={isUploading === request.id || request.status === 'validated'}
                              onClick={() => {
                                const input = document.getElementById(`file-input-${request.id}`) as HTMLInputElement;
                                input?.click();
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {isUploading === request.id ? 'Televersement...' : hasDocument ? 'Remplacer' : 'Uploader'}
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              formalizationService.updateDocumentRequest(request.id, {
                                status: 'validated'
                              }).then(() => loadProjectData(selectedProject));
                            }}
                            disabled={request.status !== 'submitted'}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Valider
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocumentRequest(request.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="support">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  <CardTitle>Accompagnement Technique</CardTitle>
                </div>
                <Button
                  onClick={() => {
                    setSelectedSupport(null);
                    setShowSupportModal(true);
                  }}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel accompagnement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {technicalSupports.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun accompagnement planifie</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {technicalSupports.map((support) => (
                    <div
                      key={support.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{support.title}</h4>
                          <p className="text-sm text-gray-500">Type: {support.support_type}</p>
                        </div>
                        {getStatusBadge(support.status)}
                      </div>

                      <p className="text-gray-700 text-sm mb-3">{support.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        {support.scheduled_date && (
                          <div>
                            <span className="font-medium text-gray-500">Date:</span>{' '}
                            <span className="text-gray-900">
                              {new Date(support.scheduled_date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                        {support.duration_hours > 0 && (
                          <div>
                            <span className="font-medium text-gray-500">Duree:</span>{' '}
                            <span className="text-gray-900">{support.duration_hours}h</span>
                          </div>
                        )}
                        {support.provider && (
                          <div>
                            <span className="font-medium text-gray-500">Prestataire:</span>{' '}
                            <span className="text-gray-900">{support.provider}</span>
                          </div>
                        )}
                        {support.participants && (
                          <div>
                            <span className="font-medium text-gray-500">Participants:</span>{' '}
                            <span className="text-gray-900">{support.participants}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSupport(support);
                            setShowSupportModal(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSupport(support.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="financial">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <CardTitle>Plan de Decaissement</CardTitle>
                </div>
                {!disbursementPlan && (
                  <Button onClick={() => setShowFinancialModal(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Creer le plan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {disbursementPlan ? (
                <div>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-lg font-semibold text-blue-900">
                      Montant total: {disbursementPlan.total_amount.toLocaleString()} {disbursementPlan.currency}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {disbursementTranches.map((tranche) => (
                      <div
                        key={tranche.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Tranche {tranche.tranche_number}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {tranche.amount.toLocaleString()} {disbursementPlan.currency} ({tranche.percentage}%)
                            </p>
                          </div>
                          {getStatusBadge(tranche.status)}
                        </div>

                        {tranche.scheduled_date && (
                          <p className="text-sm text-gray-600 mb-2">
                            Date prevue: {new Date(tranche.scheduled_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}

                        {tranche.conditions && (
                          <p className="text-sm text-gray-700 mb-3">
                            <span className="font-medium">Conditions:</span> {tranche.conditions}
                          </p>
                        )}

                        {tranche.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTranche(tranche.id, { status: 'disbursed', actual_disbursement_date: new Date() })}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marquer comme decaisse
                          </Button>
                        )}

                        {tranche.actual_disbursement_date && (
                          <p className="text-sm text-green-600 mt-2">
                            Decaisse le: {new Date(tranche.actual_disbursement_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun plan de decaissement cree</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="archive">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-blue-600" />
                <CardTitle>Archivage et Export</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <Archive className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Archiver le projet: {currentProject?.title}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  L'archivage permet de cloturer officiellement le projet et d'exporter
                  l'ensemble du dossier (documents, evaluations, accompagnement, decaissements)
                  au format ZIP.
                </p>

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleArchiveProject}
                    disabled={isArchiving}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {isArchiving ? 'Archivage...' : 'Archiver le projet'}
                  </Button>

                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter en ZIP
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-left text-sm text-yellow-800">
                      <p className="font-medium mb-1">Attention</p>
                      <p>
                        Cette action est definitive. Le projet sera marque comme archive
                        et ne pourra plus etre modifie.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <DocumentRequestModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSubmit={handleCreateDocumentRequest}
        projectId={selectedProject}
      />

      <TechnicalSupportModal
        isOpen={showSupportModal}
        onClose={() => {
          setShowSupportModal(false);
          setSelectedSupport(null);
        }}
        onSubmit={handleCreateTechnicalSupport}
        projectId={selectedProject}
        support={selectedSupport || undefined}
      />

      {currentProject && (
        <DisbursementPlanModal
          isOpen={showFinancialModal}
          onClose={() => setShowFinancialModal(false)}
          onSubmit={handleSaveDisbursementPlan}
          projectId={selectedProject}
          projectBudget={currentProject.budget}
          existingPlan={disbursementPlan && { ...disbursementPlan, tranches: disbursementTranches }}
        />
      )}

      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">{previewFileName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Ouvrir dans un nouvel onglet
                </a>
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setPreviewFileName('');
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {previewFileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[60vh] rounded-lg border"
                  title={previewFileName}
                />
              ) : previewFileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewUrl}
                    alt={previewFileName}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <FileText className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Ce type de fichier ne peut pas etre previsualise directement.
                  </p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Telecharger le fichier
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormalizationPage;
