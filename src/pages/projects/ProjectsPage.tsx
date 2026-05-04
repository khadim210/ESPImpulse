import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useProjectStore, ProjectStatus } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { useUserManagementStore } from '../../stores/userManagementStore';
import { useActivitySectorStore } from '../../stores/activitySectorStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ProjectStatusBadge from '../../components/projects/ProjectStatusBadge';
import { FolderPlus, FileSpreadsheet, Filter, Search, Trash2, AlertCircle, Download, FileDown, ChevronDown } from 'lucide-react';
import { exportSubmissionsToExcel, exportSubmissionsToPDF } from '../../utils/submissionExport';
import { useFilteredProjects, getAccessiblePrograms, getAccessiblePartners } from '../../hooks/useFilteredProjects';

const ProjectsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { checkPermission } = usePermissions();
  const { addProject, fetchProjects, filterProjectsByUser, deleteProject } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  const { users, fetchUsers } = useUserManagementStore();
  const { sectors, fetchSectors } = useActivitySectorStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [selectedProgramForImport, setSelectedProgramForImport] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState<string>('');
  const [selectedProgramForExport, setSelectedProgramForExport] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 10;

  useEffect(() => {
    console.log('📁 ProjectsPage: Fetching all data...');
    fetchProjects();
    fetchPrograms();
    fetchPartners();
    fetchUsers();
    fetchSectors();
  }, [fetchProjects, fetchPrograms, fetchPartners, fetchUsers, fetchSectors]);
  
  const userProjects = user ? filterProjectsByUser(user) : [];

  const accessiblePrograms = useMemo(
    () => getAccessiblePrograms(user, programs, partners),
    [user, programs, partners]
  );

  const accessiblePartners = useMemo(
    () => getAccessiblePartners(accessiblePrograms, partners),
    [accessiblePrograms, partners]
  );

  const { filteredProjects, statusCounts } = useFilteredProjects(
    userProjects,
    programs,
    partners,
    user,
    {
      searchTerm,
      statusFilter,
      programFilter,
      partnerFilter
    }
  );

  const filteredPrograms = useMemo(() => {
    if (partnerFilter === 'all') return accessiblePrograms;
    return accessiblePrograms.filter(p => p.partnerId === partnerFilter);
  }, [accessiblePrograms, partnerFilter]);

  useEffect(() => {
    if (partnerFilter !== 'all' && programFilter !== 'all') {
      const programExists = filteredPrograms.some(p => p.id === programFilter);
      if (!programExists) {
        setProgramFilter('all');
      }
    }
  }, [partnerFilter, programFilter, filteredPrograms]);
  
  const sortedProjects = [...filteredProjects].sort((a, b) =>
    b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  const totalPages = Math.ceil(sortedProjects.length / projectsPerPage);
  const paginatedProjects = sortedProjects.slice(
    (currentPage - 1) * projectsPerPage,
    currentPage * projectsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, partnerFilter, programFilter]);
  

  
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProgramForImport || !user) {
      setImportError('Veuillez selectionner un programme et un fichier');
      return;
    }

    setIsImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const selectedProgram = accessiblePrograms.find(p => p.id === selectedProgramForImport);
      if (!selectedProgram) {
        throw new Error('Programme sélectionné introuvable');
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const [index, row] of jsonData.entries()) {
        try {
          const rowData = row as any;
          
          // Validation des champs requis
          if (!rowData.Titre || !rowData.Description || !rowData.Budget || !rowData.Durée) {
            errors.push(`Ligne ${index + 2}: Champs requis manquants (Titre, Description, Budget, Durée)`);
            continue;
          }

          // Conversion et validation du budget
          const budget = typeof rowData.Budget === 'number' ? rowData.Budget : parseFloat(String(rowData.Budget).replace(/[^\d.-]/g, ''));
          if (isNaN(budget) || budget <= 0) {
            errors.push(`Ligne ${index + 2}: Budget invalide`);
            continue;
          }

          // Traitement des tags
          const tags = rowData.Tags ? String(rowData.Tags).split(',').map((tag: string) => tag.trim()).filter(Boolean) : ['import'];

          // Traitement du secteur d'activite
          const sectorName = rowData['Secteur d\'activite'] || rowData['Secteur d\'activité'] || rowData['Secteur'];
          const matchedSector = sectorName ? sectors.find(s => s.name.toLowerCase() === String(sectorName).toLowerCase().trim()) : undefined;

          // Créer le projet
          await addProject({
            title: String(rowData.Titre).trim(),
            description: String(rowData.Description).trim(),
            status: 'draft',
            budget: budget,
            timeline: String(rowData.Durée).trim(),
            submitterId: user.id,
            submitterName: rowData['Nom du porteur'] ? String(rowData['Nom du porteur']).trim() : user.name,
            submitterPhone: rowData['Telephone du porteur'] || rowData['Téléphone du porteur'] ? String(rowData['Telephone du porteur'] || rowData['Téléphone du porteur']).trim() : undefined,
            activitySectorId: matchedSector?.id,
            programId: selectedProgramForImport,
            tags: tags,
          });

          importedCount++;
        } catch (error) {
          errors.push(`Ligne ${index + 2}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      if (importedCount > 0) {
        setImportSuccess(`${importedCount} projet(s) importé(s) avec succès`);
      }

      if (errors.length > 0) {
        setImportError(`Erreurs d'importation:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... et ${errors.length - 5} autres erreurs` : ''}`);
      }

    } catch (error) {
      setImportError(`Erreur lors de l'importation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  }, [selectedProgramForImport, user, accessiblePrograms, addProject, sectors]);

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
    try {
      const success = await deleteProject(projectId);
      if (success) {
        setShowDeleteConfirm(null);
        alert('Projet supprimé avec succès');
      } else {
        alert('Erreur lors de la suppression du projet');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Impossible de supprimer le projet'}`);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const downloadTemplate = useCallback(async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      {
        'Titre': 'Exemple de projet',
        'Description': 'Description detaillee du projet avec ses objectifs et son impact potentiel',
        'Nom du porteur': 'Jean Dupont',
        'Telephone du porteur': '+221 77 123 45 67',
        'Secteur d\'activite': 'Numerique / Tech',
        'Budget': 150000,
        'Durée': '18 mois',
        'Tags': 'innovation, technologie, impact'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modele');

    const colWidths = Object.keys(templateData[0]).map(key => ({
      wch: Math.max(key.length, 25)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'Modele_Import_Projets.xlsx');
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (!selectedProgramForExport) {
      alert('Veuillez selectionner un programme');
      return;
    }

    const program = accessiblePrograms.find(p => p.id === selectedProgramForExport);
    if (!program) {
      alert('Programme non trouve');
      return;
    }

    const programProjects = userProjects.filter(p => p.programId === selectedProgramForExport);
    await exportSubmissionsToExcel({ projects: programProjects, program, users, sectors });
  }, [selectedProgramForExport, accessiblePrograms, userProjects, users, sectors]);

  const handleExportPDF = useCallback(async () => {
    if (!selectedProgramForExport) {
      alert('Veuillez selectionner un programme');
      return;
    }

    const program = accessiblePrograms.find(p => p.id === selectedProgramForExport);
    if (!program) {
      alert('Programme non trouve');
      return;
    }

    const programProjects = userProjects.filter(p => p.programId === selectedProgramForExport);
    await exportSubmissionsToPDF({ projects: programProjects, program, users, sectors });
  }, [selectedProgramForExport, accessiblePrograms, userProjects, users, sectors]);

  const handleQuickExportExcel = useCallback(async () => {
    if (programFilter === 'all') {
      alert('Veuillez selectionner un programme specifique dans les filtres');
      return;
    }

    const program = accessiblePrograms.find(p => p.id === programFilter);
    if (!program) {
      alert('Programme non trouve');
      return;
    }

    const programProjects = filteredProjects.filter(p => p.programId === programFilter);
    if (programProjects.length === 0) {
      alert('Aucune soumission a exporter pour ce programme avec les filtres actuels');
      return;
    }
    await exportSubmissionsToExcel({ projects: programProjects, program, users, sectors });
  }, [programFilter, accessiblePrograms, filteredProjects, users, sectors]);

  const handleQuickExportPDF = useCallback(async () => {
    if (programFilter === 'all') {
      alert('Veuillez selectionner un programme specifique dans les filtres');
      return;
    }

    const program = accessiblePrograms.find(p => p.id === programFilter);
    if (!program) {
      alert('Programme non trouve');
      return;
    }

    const programProjects = filteredProjects.filter(p => p.programId === programFilter);
    if (programProjects.length === 0) {
      alert('Aucune soumission a exporter pour ce programme avec les filtres actuels');
      return;
    }
    await exportSubmissionsToPDF({ projects: programProjects, program, users, sectors });
  }, [programFilter, accessiblePrograms, filteredProjects, users, sectors]);
  
  const getStatusLabel = (status: ProjectStatus): string => {
    const labels: Record<ProjectStatus, string> = {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Soumissions</h1>

        <div className="flex flex-wrap gap-3">
          {/* Export Button with Dropdown */}
          {userProjects.length > 0 && (
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button
                disabled={programFilter === 'all'}
                title={programFilter === 'all' ? 'Sélectionnez un programme dans les filtres pour exporter' : 'Exporter les soumissions'}
                className="inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 active:scale-95 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500 shadow-sm hover:shadow-md text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
                <ChevronDown className="h-4 w-4 ml-2" />
              </Menu.Button>

              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="px-1 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleQuickExportExcel}
                        className={`${
                          active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                        <FileSpreadsheet className="mr-2 h-5 w-5 text-green-600" />
                        Exporter en Excel
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleQuickExportPDF}
                        className={`${
                          active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                        <FileDown className="mr-2 h-5 w-5 text-red-600" />
                        Exporter en PDF
                      </button>
                    )}
                  </Menu.Item>
                </div>
                {programFilter !== 'all' && (
                  <div className="px-3 py-2 text-xs text-gray-600 bg-gray-50">
                    Programme: {accessiblePrograms.find(p => p.id === programFilter)?.name}
                    <br />
                    {filteredProjects.filter(p => p.programId === programFilter).length} soumission(s)
                  </div>
                )}
              </Menu.Items>
            </Menu>
          )}

          {checkPermission('projects.create') && (
            <Link to="/dashboard/projects/create">
              <Button
                variant="primary"
                leftIcon={<FolderPlus className="h-4 w-4" />}
              >
                {user?.role === 'submitter' ? 'Nouvelle soumission' : 'Nouveau projet'}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline h-4 w-4 mr-1" />
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

            {/* Filtre par statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous ({statusCounts.all})</option>
                <option value="draft">Brouillon ({statusCounts.draft})</option>
                <option value="submitted">Soumis ({statusCounts.submitted})</option>
                <option value="under_review">En revue ({statusCounts.under_review})</option>
                <option value="eligible">Éligible ({statusCounts.eligible})</option>
                <option value="ineligible">Non éligible ({statusCounts.ineligible})</option>
                <option value="pre_selected">Présélectionné ({statusCounts.pre_selected})</option>
                <option value="selected">Sélectionné ({statusCounts.selected})</option>
                <option value="formalization">Formalisation ({statusCounts.formalization})</option>
                <option value="financed">Financé ({statusCounts.financed})</option>
                <option value="monitoring">Suivi ({statusCounts.monitoring})</option>
                <option value="closed">Clôturé ({statusCounts.closed})</option>
                <option value="rejected">Rejeté ({statusCounts.rejected})</option>
              </select>
            </div>

            {/* Filtre par partenaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partenaire
              </label>
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les partenaires</option>
                {accessiblePartners.map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par programme */}
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
                {filteredPrograms.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bouton de réinitialisation */}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPartnerFilter('all');
                setProgramFilter('all');
              }}
            >
              Réinitialiser les filtres
            </Button>
            <span className="ml-4 text-sm text-gray-600">
              {filteredProjects.length} projet(s) trouvé(s)
            </span>
          </div>
        </CardContent>
      </Card>
     
      {/* Import Section */}
      {checkPermission('projects.create') && (
        <Card className="border-l-4 border-l-secondary-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 text-secondary-600 mr-2" />
              Importation de projets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un programme*
                </label>
                <select
                  value={selectedProgramForImport}
                  onChange={(e) => setSelectedProgramForImport(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-secondary-500 focus:border-secondary-500 sm:text-sm"
                >
                  <option value="">Choisir un programme...</option>
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
                  Fichier Excel (.xlsx)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileImport}
                  disabled={!selectedProgramForImport || isImporting}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary-50 file:text-secondary-700 hover:file:bg-secondary-100 disabled:opacity-50"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p>Format attendu: Titre, Description, Nom du porteur, Telephone, Secteur d'activite, Budget, Duree, Tags</p>
                <button
                  onClick={downloadTemplate}
                  className="text-secondary-600 hover:text-secondary-700 underline"
                >
                  Telecharger le modele Excel
                </button>
              </div>
              
              {isImporting && (
                <div className="flex items-center text-secondary-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary-600 mr-2"></div>
                  Importation en cours...
                </div>
              )}
            </div>
            
            {importError && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-md">
                <pre className="text-sm whitespace-pre-wrap">{importError}</pre>
              </div>
            )}
            
            {importSuccess && (
              <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-md">
                <p className="text-sm">{importSuccess}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      {(checkPermission('projects.read') || checkPermission('projects.manage')) && (
        <Card className="border-l-4 border-l-primary-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 text-primary-600 mr-2" />
              Exportation des soumissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un programme*
                </label>
                <select
                  value={selectedProgramForExport}
                  onChange={(e) => setSelectedProgramForExport(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Choisir un programme...</option>
                  {accessiblePrograms.map(program => {
                    const partner = partners.find(p => p.id === program.partnerId);
                    const projectCount = userProjects.filter(p => p.programId === program.id).length;
                    return (
                      <option key={program.id} value={program.id}>
                        {program.name} {partner && `(${partner.name})`} - {projectCount} soumission(s)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="md:col-span-2 flex items-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={!selectedProgramForExport}
                  leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                  className="flex-1"
                >
                  Exporter en Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={!selectedProgramForExport}
                  leftIcon={<FileDown className="h-4 w-4" />}
                  className="flex-1"
                >
                  Exporter en PDF
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p className="font-medium text-blue-900 mb-1">À propos de l'exportation :</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Les fichiers incluront toutes les informations des formulaires de soumission</li>
                <li>Le format Excel permet une manipulation facile des données</li>
                <li>Le format PDF est adapté pour l'archivage et l'impression (format auto-ajusté selon le nombre de colonnes)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {paginatedProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {paginatedProjects.map(project => {
            const program = programs.find(p => p.id === project.programId);
            const partner = program ? partners.find(p => p.id === program.partnerId) : null;
            
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="mb-4 md:mb-0">
                      <div className="flex items-start">
                        <h3 className="text-lg font-medium text-gray-900">
                          <Link to={`/dashboard/projects/${project.id}`} className="hover:text-primary-600">
                            {project.title}
                          </Link>
                        </h3>
                        <ProjectStatusBadge status={project.status} className="ml-3" />
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {project.projectDescription || project.description}
                      </p>
                      
                      {program && (
                        <div className="mt-2 flex items-center text-sm text-primary-600">
                          <span className="font-medium">Programme:</span>
                          <span className="ml-1">{program.name}</span>
                          {partner && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-gray-600">{partner.name}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {project.evaluationScores && project.evaluatedBy && (
                        <div className="mt-3 p-2 bg-success-50 border border-success-200 rounded-md">
                          <div className="text-xs font-medium text-success-900 flex items-center">
                            <span className="mr-2">✅</span>
                            Évalué {project.evaluationDate && `le ${new Date(project.evaluationDate).toLocaleDateString()}`}
                          </div>
                          {project.totalEvaluationScore !== undefined && (
                            <div className="text-xs text-success-700 mt-1">
                              Score total: {project.totalEvaluationScore}%
                              {project.recommendedStatus && (
                                <span className="ml-2">
                                  • Recommandation: {
                                    project.recommendedStatus === 'selected' ? 'Sélectionné' :
                                    project.recommendedStatus === 'pre_selected' ? 'Présélectionné' :
                                    'Rejeté'
                                  }
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-between items-end">
                      <div className="text-sm text-gray-500">
                        <div>Budget: {project.budget.toLocaleString()} FCFA</div>
                        <div>Durée: {project.timeline}</div>
                        <div>{project.submissionDate
                          ? `Soumis le ${project.submissionDate.toLocaleDateString()}`
                          : 'Non soumis'}
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link to={`/dashboard/projects/${project.id}`}>
                          <Button variant="outline" size="sm">
                            Voir le détail
                          </Button>
                        </Link>
                        {checkPermission('projects.delete') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(project.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Precedent
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage de <span className="font-medium">{(currentPage - 1) * projectsPerPage + 1}</span> a{' '}
                    <span className="font-medium">{Math.min(currentPage * projectsPerPage, sortedProjects.length)}</span> sur{' '}
                    <span className="font-medium">{sortedProjects.length}</span> resultats
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      &laquo;
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      &lsaquo;
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      &rsaquo;
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      &raquo;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-500">
            {searchTerm || statusFilter !== 'all' || partnerFilter !== 'all' || programFilter !== 'all'
              ? "Aucun projet ne correspond à vos criteres de recherche"
              : "Aucun projet n'est disponible pour le moment"}
          </div>

          {checkPermission('projects.create') && (
            <Link to="/dashboard/projects/create" className="mt-4 inline-block">
              <Button
                variant="primary"
                leftIcon={<FolderPlus className="h-4 w-4" />}
              >
                {user?.role === 'submitter' ? 'Creer votre premiere soumission' : 'Creer votre premier projet'}
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Confirmer la suppression
                </h3>
                <p className="text-sm text-gray-600">
                  Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible et toutes les données associées seront perdues.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingProjectId === showDeleteConfirm}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDeleteProject(showDeleteConfirm)}
                isLoading={deletingProjectId === showDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;