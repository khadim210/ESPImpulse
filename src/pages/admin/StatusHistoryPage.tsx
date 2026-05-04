import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { History, Download, FileSpreadsheet, Filter, Search } from 'lucide-react';
import logoUrl from '../../assets/Logo_senegal-ucad.png';
import { ProjectStatusService, StatusHistoryEntry } from '../../services/projectStatusService';
import { getStatusLabel } from '../../utils/statusTransitions';

const StatusHistoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const { checkPermission } = usePermissions();
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    totalChanges: 0,
    changesByStatus: {} as Record<string, number>,
    recentChanges: 0,
  });

  useEffect(() => {
    if (!checkPermission('status_history.view')) {
      return;
    }
    loadHistory();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterStatus, history]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await ProjectStatusService.getAllStatusHistory(200);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await ProjectStatusService.getStatusHistoryStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.changerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((entry) => entry.newStatus === filterStatus);
    }

    setFilteredHistory(filtered);
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filteredHistory.map((entry) => ({
      Projet: entry.projectTitle || 'N/A',
      'Ancien statut': entry.oldStatus ? getStatusLabel(entry.oldStatus as any) : 'N/A',
      'Nouveau statut': getStatusLabel(entry.newStatus as any),
      'Modifie par': entry.changerName || 'Systeme',
      Date: new Date(entry.changedAt).toLocaleString('fr-FR'),
      Commentaire: entry.comment || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historique');
    XLSX.writeFile(wb, `historique-statuts-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF();
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

    doc.setFontSize(16);
    doc.text('Historique des changements de statut', margin + 30, 15);

    doc.setFontSize(10);
    doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, margin + 30, 22);

    const tableData = filteredHistory.map((entry) => [
      entry.projectTitle || 'N/A',
      entry.oldStatus ? getStatusLabel(entry.oldStatus as any) : 'N/A',
      getStatusLabel(entry.newStatus as any),
      entry.changerName || 'Systeme',
      new Date(entry.changedAt).toLocaleDateString('fr-FR'),
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['Projet', 'Ancien statut', 'Nouveau statut', 'Modifie par', 'Date']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`historique-statuts-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const uniqueStatuses = Array.from(new Set(history.map((h) => h.newStatus)));

  if (!checkPermission('status_history.view')) {
    return (
      <div className="p-8">
        <Card>
          <CardContent>
            <p className="text-center text-gray-600">
              Vous n'avez pas la permission d'accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-8 h-8" />
          Historique des changements de statut
        </h1>
        <p className="text-gray-600 mt-2">
          Consultez l'historique complet de tous les changements de statut des projets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">{stats.totalChanges}</div>
            <div className="text-sm text-gray-600">Total des changements</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{stats.recentChanges}</div>
            <div className="text-sm text-gray-600">Changements cette semaine</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">
              {Object.keys(stats.changesByStatus).length}
            </div>
            <div className="text-sm text-gray-600">Statuts différents</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres et recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="inline w-4 h-4 mr-1" />
                Rechercher
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom du projet ou utilisateur..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter className="inline w-4 h-4 mr-1" />
                Filtrer par statut
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status as any)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Historique ({filteredHistory.length} {filteredHistory.length > 1 ? 'changements' : 'changement'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Chargement...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Aucun changement de statut trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Projet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ancien statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Nouveau statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Modifié par
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Commentaire
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.projectTitle || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.oldStatus ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
                            {getStatusLabel(entry.oldStatus as any)}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                          {getStatusLabel(entry.newStatus as any)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.changerName || 'Système'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(entry.changedAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.comment || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusHistoryPage;
