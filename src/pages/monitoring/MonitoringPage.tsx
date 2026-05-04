import React, { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { useUserManagementStore } from '../../stores/userManagementStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '../../components/ui/Card';
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Filter
} from 'lucide-react';
import Button from '../../components/ui/Button';
import logoUrl from '../../assets/Logo_senegal-ucad.png';
import { getStatusLabel } from '../../utils/statusTransitions';
import { formatCurrency, formatNumberWithSpaces } from '../../utils/currency';

const MonitoringPage = () => {
  const { projects, fetchProjects, isLoading } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  const { users, fetchUsers } = useUserManagementStore();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchProjects();
    fetchPrograms();
    fetchPartners();
    fetchUsers();
  }, [fetchProjects, fetchPrograms, fetchPartners, fetchUsers]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchProjects();
      fetchPrograms();
      fetchPartners();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchProjects, fetchPrograms, fetchPartners]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (selectedProgram !== 'all') {
      filtered = filtered.filter(p => p.programId === selectedProgram);
    }

    if (selectedPeriod === 'all') {
      return filtered;
    }

    const now = new Date();
    const filterDate = new Date();

    switch (selectedPeriod) {
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        filterDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return filtered;
    }

    return filtered.filter(p => new Date(p.createdAt) >= filterDate);
  }, [projects, selectedPeriod, selectedProgram]);

  const statistics = useMemo(() => {
    const statusOrder = [
      'draft',
      'submitted',
      'under_review',
      'eligible',
      'ineligible',
      'pre_selected',
      'selected',
      'rejected',
      'formalization',
      'financed',
      'monitoring',
      'closed'
    ];

    const getStatusIndex = (status: string) => {
      const index = statusOrder.indexOf(status);
      return index === -1 ? -1 : index;
    };

    const hasPassedStatus = (projectStatus: string, targetStatus: string) => {
      const projectIndex = getStatusIndex(projectStatus);
      const targetIndex = getStatusIndex(targetStatus);
      if (projectIndex === -1 || targetIndex === -1) return false;

      if (targetStatus === 'ineligible') {
        return projectStatus === 'ineligible';
      }
      if (targetStatus === 'rejected') {
        return projectStatus === 'rejected';
      }

      if (projectStatus === 'ineligible') {
        return targetIndex <= getStatusIndex('under_review');
      }
      if (projectStatus === 'rejected') {
        return targetIndex <= getStatusIndex('pre_selected');
      }

      return projectIndex >= targetIndex;
    };

    const countPassedSoumis = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'submitted')
    ).length;
    const countPassedExamen = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'under_review')
    ).length;
    const countPassedEligible = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'eligible')
    ).length;
    const countIneligible = filteredProjects.filter(p =>
      p.status === 'ineligible'
    ).length;
    const countPassedPreSelected = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'pre_selected')
    ).length;
    const countPassedSelected = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'selected')
    ).length;
    const countRejected = filteredProjects.filter(p =>
      p.status === 'rejected'
    ).length;
    const countPassedFormalization = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'formalization')
    ).length;
    const countPassedFinanced = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'financed')
    ).length;
    const countPassedMonitoring = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'monitoring')
    ).length;
    const countPassedClosed = filteredProjects.filter(p =>
      hasPassedStatus(p.status, 'closed')
    ).length;

    const draftProjects = filteredProjects.filter(p => p.status === 'draft');

    const activeProjects = filteredProjects.filter(p =>
      ['monitoring', 'financed', 'formalization', 'selected'].includes(p.status)
    );

    const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const successfulProjects = filteredProjects.filter(p =>
      ['financed', 'monitoring', 'closed'].includes(p.status)
    ).length;
    const totalProjects = filteredProjects.length;
    const successRate = totalProjects > 0 ? Math.round((successfulProjects / totalProjects) * 100) : 0;

    const recentUpdates = filteredProjects
      .filter(p => p.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
      .map(p => {
        let type = 'report';
        let description = `Projet "${p.title}" mis a jour`;

        if (p.status === 'financed' && p.submittedAt) {
          const submittedDate = new Date(p.submittedAt);
          const updatedDate = new Date(p.updatedAt);
          if (updatedDate.getTime() - submittedDate.getTime() < 86400000) {
            type = 'milestone';
            description = `Projet "${p.title}" a ete finance`;
          }
        } else if (p.status === 'monitoring') {
          type = 'meeting';
          description = `Suivi du projet "${p.title}"`;
        }

        return {
          id: p.id,
          date: new Date(p.updatedAt).toLocaleDateString('fr-FR'),
          description,
          type,
          projectId: p.id
        };
      });

    const statusDistribution = {
      draft: draftProjects.length,
      submitted: countPassedSoumis,
      under_review: countPassedExamen,
      eligible: countPassedEligible,
      ineligible: countIneligible,
      pre_selected: countPassedPreSelected,
      selected: countPassedSelected,
      rejected: countRejected,
      formalization: countPassedFormalization,
      financed: countPassedFinanced,
      monitoring: countPassedMonitoring,
      closed: countPassedClosed
    };

    const milestones = [
      {
        id: 1,
        name: 'Brouillons',
        status: draftProjects.length > 0 ? 'in_progress' as const : 'pending' as const,
        count: draftProjects.length,
        date: 'Continu'
      },
      {
        id: 2,
        name: 'Soumis',
        status: countPassedSoumis > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedSoumis,
        date: 'Continu'
      },
      {
        id: 3,
        name: 'En cours d\'examen',
        status: countPassedExamen > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedExamen,
        date: 'Continu'
      },
      {
        id: 4,
        name: 'Eligibles',
        status: countPassedEligible > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedEligible,
        date: 'Continu'
      },
      {
        id: 5,
        name: 'Ineligibles',
        status: countIneligible > 0 ? 'completed' as const : 'pending' as const,
        count: countIneligible,
        date: 'Continu'
      },
      {
        id: 6,
        name: 'Pre-selectionnes',
        status: countPassedPreSelected > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedPreSelected,
        date: 'Continu'
      },
      {
        id: 7,
        name: 'Selectionnes',
        status: countPassedSelected > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedSelected,
        date: 'Continu'
      },
      {
        id: 8,
        name: 'Rejetes',
        status: countRejected > 0 ? 'completed' as const : 'pending' as const,
        count: countRejected,
        date: 'Continu'
      },
      {
        id: 9,
        name: 'En formalisation',
        status: countPassedFormalization > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedFormalization,
        date: 'Continu'
      },
      {
        id: 10,
        name: 'Finances',
        status: countPassedFinanced > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedFinanced,
        date: 'Continu'
      },
      {
        id: 11,
        name: 'En suivi',
        status: countPassedMonitoring > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedMonitoring,
        date: 'Continu'
      },
      {
        id: 12,
        name: 'Clotures',
        status: countPassedClosed > 0 ? 'completed' as const : 'pending' as const,
        count: countPassedClosed,
        date: 'Continu'
      }
    ];

    const risks = [];
    if (activeProjects.length > 10) {
      risks.push({
        id: 1,
        description: `Charge de travail élevée: ${activeProjects.length} projets actifs`,
        level: 'medium' as const,
        status: 'active' as const
      });
    }

    const overdueProjects = filteredProjects.filter(p => {
      if (!p.submissionDate) return false;
      const daysSinceSubmission = Math.floor(
        (Date.now() - new Date(p.submissionDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceSubmission > 90 && ['submitted', 'under_review'].includes(p.status);
    });

    if (overdueProjects.length > 0) {
      risks.push({
        id: 2,
        description: `${overdueProjects.length} projet(s) en attente depuis plus de 90 jours`,
        level: 'high' as const,
        status: 'active' as const
      });
    }

    const lowScoreProjects = filteredProjects.filter(p =>
      p.totalEvaluationScore && p.totalEvaluationScore < 50
    );

    if (lowScoreProjects.length > 0) {
      risks.push({
        id: 3,
        description: `${lowScoreProjects.length} projet(s) avec score d'évaluation faible`,
        level: 'low' as const,
        status: 'active' as const
      });
    }

    if (risks.length === 0) {
      risks.push({
        id: 0,
        description: 'Aucun risque identifié pour le moment',
        level: 'low' as const,
        status: 'mitigated' as const
      });
    }

    return {
      activeProjectsCount: activeProjects.length,
      successRate,
      totalBudget,
      statusDistribution,
      milestones,
      risks,
      recentUpdates
    };
  }, [filteredProjects]);

  const renderProgressBar = (percentage: number, color: string) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div 
        className={`h-2.5 rounded-full ${color} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );

  const handleManualRefresh = async () => {
    await Promise.all([fetchProjects(), fetchPrograms()]);
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['Statistiques du tableau de bord'],
      [''],
      ['Métrique', 'Valeur'],
      ['Période', selectedPeriod === 'all' ? 'Toutes les périodes' : selectedPeriod === 'month' ? 'Dernier mois' : selectedPeriod === 'quarter' ? 'Dernier trimestre' : 'Dernière année'],
      ['Date d\'export', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['Projets actifs', statistics.activeProjectsCount],
      ['Taux de réussite', `${statistics.successRate}%`],
      ['Budget total actif', formatCurrency(statistics.totalBudget)],
      ['Risques actifs', statistics.risks.filter(r => r.status === 'active').length],
      [''],
      ['Distribution par statut', ''],
      ['Monitoring', statistics.statusDistribution.monitoring],
      ['Financé', statistics.statusDistribution.financed],
      ['Formalisation', statistics.statusDistribution.formalization],
      ['Clôturé', statistics.statusDistribution.closed],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    const activeProjects = filteredProjects.filter(p => ['monitoring', 'financed', 'formalization'].includes(p.status));
    const projectsData = activeProjects.map(p => {
      const program = programs.find(pr => pr.id === p.programId);
      const submitter = users.find(u => u.id === p.submitterId);
      const daysSinceUpdate = p.updatedAt ? Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : '-';
      const daysSinceSubmission = p.submissionDate ? Math.floor((Date.now() - new Date(p.submissionDate).getTime()) / (1000 * 60 * 60 * 24)) : '-';

      return {
        'Titre': p.title,
        'Programme': program?.name || 'N/A',
        'Porteur': p.submitterName || submitter?.name || 'N/A',
        'Telephone': p.submitterPhone || 'N/A',
        'Email': submitter?.email || 'N/A',
        'Statut': getStatusLabel(p.status as any),
        'Budget': formatCurrency(p.budget),
        'Score évaluation': p.totalEvaluationScore ? `${p.totalEvaluationScore}%` : 'N/A',
        'Date soumission': p.submissionDate ? new Date(p.submissionDate).toLocaleDateString('fr-FR') : 'N/A',
        'Jours depuis soumission': daysSinceSubmission,
        'Dernière mise à jour': p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('fr-FR') : 'N/A',
        'Jours depuis MAJ': daysSinceUpdate,
      };
    });
    const wsProjects = XLSX.utils.json_to_sheet(projectsData);
    XLSX.utils.book_append_sheet(wb, wsProjects, 'Projets actifs');

    const milestonesData = statistics.milestones.map(m => ({
      'Étape': m.name,
      'Statut': m.status === 'completed' ? 'Complété' : m.status === 'in_progress' ? 'En cours' : 'À venir',
      'Nombre': m.count,
    }));
    const wsMilestones = XLSX.utils.json_to_sheet(milestonesData);
    XLSX.utils.book_append_sheet(wb, wsMilestones, 'Jalons');

    const risksData = statistics.risks.map(r => ({
      'Description': r.description,
      'Niveau': r.level === 'high' ? 'Élevé' : r.level === 'medium' ? 'Moyen' : 'Faible',
      'Statut': r.status === 'active' ? 'Actif' : 'Atténué',
    }));
    const wsRisks = XLSX.utils.json_to_sheet(risksData);
    XLSX.utils.book_append_sheet(wb, wsRisks, 'Risques');

    const updatesData = statistics.recentUpdates.map(u => ({
      'Date': u.date,
      'Type': u.type === 'meeting' ? 'Réunion' : u.type === 'report' ? 'Rapport' : 'Jalon',
      'Description': u.description,
    }));
    const wsUpdates = XLSX.utils.json_to_sheet(updatesData);
    XLSX.utils.book_append_sheet(wb, wsUpdates, 'Mises à jour');

    const allProjectsData = filteredProjects.map(p => {
      const program = programs.find(pr => pr.id === p.programId);
      const submitter = users.find(u => u.id === p.submitterId);
      return {
        'Titre': p.title,
        'Programme': program?.name || 'N/A',
        'Porteur': p.submitterName || submitter?.name || 'N/A',
        'Telephone': p.submitterPhone || 'N/A',
        'Email': submitter?.email || 'N/A',
        'Statut': getStatusLabel(p.status as any),
        'Budget': formatCurrency(p.budget),
        'Score': p.totalEvaluationScore || 'N/A',
        'Date création': new Date(p.createdAt).toLocaleDateString('fr-FR'),
        'Date soumission': p.submissionDate ? new Date(p.submissionDate).toLocaleDateString('fr-FR') : 'N/A',
      };
    });
    const wsAllProjects = XLSX.utils.json_to_sheet(allProjectsData);
    XLSX.utils.book_append_sheet(wb, wsAllProjects, 'Tous les projets');

    XLSX.writeFile(wb, `suivi-projets-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF();
    const margin = 14;
    let yPosition = 15;

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
    doc.text('Rapport de Suivi des Projets', margin + 30, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, margin + 30, yPosition);
    yPosition += 5;
    doc.text(`Periode: ${selectedPeriod === 'all' ? 'Toutes les periodes' : selectedPeriod === 'month' ? 'Dernier mois' : selectedPeriod === 'quarter' ? 'Dernier trimestre' : 'Derniere annee'}`, margin + 30, yPosition);
    yPosition = 40;

    doc.setFontSize(14);
    doc.text('Statistiques principales', 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [['Métrique', 'Valeur']],
      body: [
        ['Projets actifs', statistics.activeProjectsCount.toString()],
        ['Taux de réussite', `${statistics.successRate}%`],
        ['Budget total actif', formatCurrency(statistics.totalBudget)],
        ['Risques actifs', statistics.risks.filter(r => r.status === 'active').length.toString()],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.text('Distribution par statut', 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [['Statut', 'Nombre']],
      body: [
        ['Monitoring', statistics.statusDistribution.monitoring.toString()],
        ['Financé', statistics.statusDistribution.financed.toString()],
        ['Formalisation', statistics.statusDistribution.formalization.toString()],
        ['Clôturé', statistics.statusDistribution.closed.toString()],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.addPage();
    yPosition = 15;

    doc.setFontSize(14);
    doc.text('Projets actifs', 14, yPosition);
    yPosition += 7;

    const activeProjects = filteredProjects.filter(p => ['monitoring', 'financed', 'formalization'].includes(p.status));
    const projectsTableData = activeProjects.slice(0, 20).map(p => {
      const program = programs.find(pr => pr.id === p.programId);
      const submitter = users.find(u => u.id === p.submitterId);
      return [
        p.title.length > 25 ? p.title.substring(0, 22) + '...' : p.title,
        p.submitterName || submitter?.name || 'N/A',
        p.submitterPhone || 'N/A',
        submitter?.email || 'N/A',
        getStatusLabel(p.status as any),
        formatCurrency(p.budget),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Projet', 'Porteur', 'Telephone', 'Email', 'Statut', 'Budget']],
      body: projectsTableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(14);
    doc.text('Risques identifiés', 14, yPosition);
    yPosition += 7;

    const risksTableData = statistics.risks.map(r => [
      r.description,
      r.level === 'high' ? 'Élevé' : r.level === 'medium' ? 'Moyen' : 'Faible',
      r.status === 'active' ? 'Actif' : 'Atténué',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Niveau', 'Statut']],
      body: risksTableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`suivi-projets-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi des Projets</h1>
          <p className="text-sm text-gray-600 mt-1">
            Statistiques mises a jour automatiquement toutes les 30 secondes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            leftIcon={<Download className="h-4 w-4" />}
          >
            PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
            disabled={isLoading}
          >
            Actualiser
          </Button>

          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <span>Auto-actualisation</span>
          </label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <CardTitle>Filtres</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Programme
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="all">Tous les programmes</option>
                {programs.map(program => {
                  const partner = partners.find(p => p.id === program.partnerId);
                  return (
                    <option key={program.id} value={program.id}>
                      {program.name} {partner ? `(${partner.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periode
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="all">Toutes les periodes</option>
                <option value="month">Dernier mois</option>
                <option value="quarter">Dernier trimestre</option>
                <option value="year">Derniere annee</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {filteredProjects.length} projet(s) correspondant aux filtres
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedProgram('all');
                setSelectedPeriod('all');
              }}
            >
              Reinitialiser les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projets actifs</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{statistics.activeProjectsCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  En suivi, financement ou formalisation
                </p>
              </div>
              <div className="p-2 bg-primary-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            {renderProgressBar(
              filteredProjects.length > 0 ? Math.min((statistics.activeProjectsCount / filteredProjects.length) * 100, 100) : 0,
              'bg-primary-600'
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de réussite</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{statistics.successRate}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Projets financés ou terminés
                </p>
              </div>
              <div className="p-2 bg-success-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success-600" />
              </div>
            </div>
            {renderProgressBar(statistics.successRate, 'bg-success-600')}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Risques identifiés</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {statistics.risks.filter(r => r.status === 'active').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Nécessitant une attention
                </p>
              </div>
              <div className="p-2 bg-warning-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-warning-600" />
              </div>
            </div>
            {renderProgressBar(
              statistics.risks.length > 0 ? (statistics.risks.filter(r => r.status === 'active').length / statistics.risks.length) * 100 : 0,
              'bg-warning-600'
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Budget total actif</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {formatNumberWithSpaces(statistics.totalBudget)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Projets en cours
                </p>
              </div>
              <div className="p-2 bg-secondary-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-secondary-600" />
              </div>
            </div>
            {renderProgressBar(100, 'bg-secondary-600')}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Étapes du workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.milestones.map(milestone => (
                <div key={milestone.id} className="flex items-center">
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${milestone.status === 'completed' ? 'bg-success-100' :
                      milestone.status === 'in_progress' ? 'bg-primary-100' : 'bg-gray-100'}
                  `}>
                    {milestone.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-success-600" />
                    ) : milestone.status === 'in_progress' ? (
                      <Clock className="h-5 w-5 text-primary-600" />
                    ) : (
                      <Calendar className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{milestone.name}</p>
                      <span className="text-sm font-semibold text-gray-700">{milestone.count}</span>
                    </div>
                    <div className="mt-1">
                      <span className={`
                        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${milestone.status === 'completed' ? 'bg-success-100 text-success-800' :
                          milestone.status === 'in_progress' ? 'bg-primary-100 text-primary-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {milestone.status === 'completed' ? 'Complété' :
                         milestone.status === 'in_progress' ? 'En cours' : 'À venir'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risques identifiés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.risks.map(risk => (
                <div key={risk.id} className="flex items-start">
                  <div className={`
                    flex-shrink-0 w-2 h-2 mt-2 rounded-full
                    ${risk.level === 'high' ? 'bg-error-500' :
                      risk.level === 'medium' ? 'bg-warning-500' : 'bg-success-500'}
                  `} />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{risk.description}</p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className={`
                        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${risk.level === 'high' ? 'bg-error-100 text-error-800' :
                          risk.level === 'medium' ? 'bg-warning-100 text-warning-800' :
                          'bg-success-100 text-success-800'}
                      `}>
                        {risk.level === 'high' ? 'Élevé' :
                         risk.level === 'medium' ? 'Moyen' : 'Faible'}
                      </span>
                      <span className={`
                        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${risk.status === 'active' ? 'bg-error-100 text-error-800' :
                          'bg-success-100 text-success-800'}
                      `}>
                        {risk.status === 'active' ? 'Actif' : 'Atténué'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mises à jour récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {statistics.recentUpdates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune mise à jour récente</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {statistics.recentUpdates.map((update, updateIdx) => (
                  <li key={update.id}>
                    <div className="relative pb-8">
                      {updateIdx !== statistics.recentUpdates.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`
                            h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                            ${update.type === 'meeting' ? 'bg-primary-100' :
                              update.type === 'report' ? 'bg-warning-100' : 'bg-success-100'}
                          `}>
                            {update.type === 'meeting' ? (
                              <Calendar className="h-5 w-5 text-primary-600" />
                            ) : update.type === 'report' ? (
                              <BarChart3 className="h-5 w-5 text-warning-600" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-success-600" />
                            )}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-700">{update.description}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time dateTime={update.date}>{update.date}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringPage;