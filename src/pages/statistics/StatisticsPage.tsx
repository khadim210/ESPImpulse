import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '../../components/ui/Card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const StatisticsPage = () => {
  const { user } = useAuthStore();
  const { projects } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  
  const [timeframe, setTimeframe] = useState('year');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');

  // Fetch data on component mount
  React.useEffect(() => {
    console.log('📊 StatisticsPage: Fetching programs and partners...');
    fetchPrograms();
    fetchPartners();
  }, [fetchPrograms, fetchPartners]);

  // Get accessible programs based on user role
  const getAccessiblePrograms = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return programs;
    } else if (user.role === 'manager') {
      // Manager can see programs from their assigned partners
      const managerPartners = partners.filter(p => p.assignedManagerId === user.id);
      const partnerIds = managerPartners.map(p => p.id);
      return programs.filter(p => partnerIds.includes(p.partnerId));
    } else if (user.role === 'partner') {
      // Partner can see their own programs
      const userPartner = partners.find(p => 
        p.contactEmail === user.email || 
        p.name === user.organization
      );
      if (userPartner) {
        return programs.filter(p => p.partnerId === userPartner.id);
      }
      // Fallback: show all programs if partner not found
      return programs;
    }
    
    return programs; // For submitters, show all programs
  };
  
  const accessiblePrograms = getAccessiblePrograms();
  
  // Get programs filtered by selected partner
  const getFilteredPrograms = () => {
    if (partnerFilter === 'all') {
      return accessiblePrograms;
    }
    return accessiblePrograms.filter(p => p.partnerId === partnerFilter);
  };
  
  const filteredPrograms = getFilteredPrograms();
  
  // Reset program filter when partner changes
  React.useEffect(() => {
    if (partnerFilter !== 'all' && programFilter !== 'all') {
      const programExists = filteredPrograms.some(p => p.id === programFilter);
      if (!programExists) {
        setProgramFilter('all');
      }
    }
  }, [partnerFilter, programFilter, filteredPrograms]);
  
  // Get unique partners from accessible programs
  const getAccessiblePartners = () => {
    const partnerIds = [...new Set(accessiblePrograms.map(p => p.partnerId))];
    return partners.filter(partner => partnerIds.includes(partner.id));
  };
  
  const accessiblePartners = getAccessiblePartners();
  
  // Filter projects based on selected filters
  const getFilteredProjects = () => {
    let filtered = projects;
    
    // Filter by partner
    if (partnerFilter !== 'all') {
      const partnerPrograms = programs.filter(p => p.partnerId === partnerFilter).map(p => p.id);
      filtered = filtered.filter(project => partnerPrograms.includes(project.programId));
    }
    
    // Filter by program
    if (programFilter !== 'all') {
      filtered = filtered.filter(project => project.programId === programFilter);
    }
    
    // Filter by user access
    const accessibleProgramIds = accessiblePrograms.map(p => p.id);
    filtered = filtered.filter(project => accessibleProgramIds.includes(project.programId));
    
    return filtered;
  };
  
  const filteredProjects = getFilteredProjects();

  // Mock data for project statistics
  const generateMockData = (projects: any[]) => ({
    projectsByStatus: {
      labels: ['Soumis', 'En revue', 'Présélectionné', 'Sélectionné', 'Financé', 'Clôturé'],
      datasets: [{
        label: 'Nombre de projets',
        data: [
          projects.filter(p => p.status === 'submitted').length,
          projects.filter(p => p.status === 'under_review').length,
          projects.filter(p => p.status === 'pre_selected').length,
          projects.filter(p => p.status === 'selected').length,
          projects.filter(p => p.status === 'financed').length,
          projects.filter(p => p.status === 'closed').length
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)', // primary
          'rgba(16, 185, 129, 0.5)', // secondary
          'rgba(251, 191, 36, 0.5)', // warning
          'rgba(34, 197, 94, 0.5)',  // success
          'rgba(239, 68, 68, 0.5)',  // error
          'rgba(107, 114, 128, 0.5)' // gray
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(251, 191, 36)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(107, 114, 128)'
        ],
        borderWidth: 1
      }]
    },
    monthlySubmissions: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
      datasets: [{
        label: 'Projets soumis',
        data: [5, 8, 12, 9, 7, 15, 10, 13, 11, 8, 14, 12],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4
      }]
    },
    budgetDistribution: {
      labels: ['< 50k€', '50k€-100k€', '100k€-250k€', '250k€-500k€', '> 500k€'],
      datasets: [{
        label: 'Nombre de projets',
        data: [
          projects.filter(p => p.budget < 50000).length,
          projects.filter(p => p.budget >= 50000 && p.budget < 100000).length,
          projects.filter(p => p.budget >= 100000 && p.budget < 250000).length,
          projects.filter(p => p.budget >= 250000 && p.budget < 500000).length,
          projects.filter(p => p.budget >= 500000).length
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(251, 191, 36, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(239, 68, 68, 0.7)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(251, 191, 36)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1
      }]
    }
  });
  
  const mockData = generateMockData(filteredProjects);

  const generateKpis = (projects: any[]) => [
    {
      label: 'Taux d\'acceptation',
      value: '45%',
      change: '+5%',
      positive: true
    },
    {
      label: 'Budget moyen',
      value: projects.length > 0 ? `${Math.round(projects.reduce((sum, p) => sum + p.budget, 0) / projects.length / 1000)}k€` : '0€',
      change: '+12%',
      positive: true
    },
    {
      label: 'Durée moyenne',
      value: '18 mois',
      change: '-2 mois',
      positive: false
    },
    {
      label: 'Projets actifs',
      value: projects.filter(p => ['submitted', 'under_review', 'pre_selected', 'selected', 'formalization', 'financed', 'monitoring'].includes(p.status)).length.toString(),
      change: '+3',
      positive: true
    }
  ];
  
  const kpis = generateKpis(filteredProjects);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm appearance-none"
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
            >
              <option value="all">Tous les partenaires</option>
              {accessiblePartners.map(partner => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm appearance-none"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
            >
              <option value="all">Tous les programmes</option>
              {filteredPrograms.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="month">Dernier mois</option>
            <option value="quarter">Dernier trimestre</option>
            <option value="year">Dernière année</option>
            <option value="all">Toutes les périodes</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{kpi.value}</p>
                </div>
                <div className={`flex items-center ${kpi.positive ? 'text-success-600' : 'text-error-600'}`}>
                  {kpi.positive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium ml-1">{kpi.change}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribution par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar
                data={mockData.projectsByStatus}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Soumissions mensuelles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Line
                data={mockData.monthlySubmissions}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 5
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribution des budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar
                data={mockData.budgetDistribution}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 5
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des projets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <Doughnut
                data={mockData.projectsByStatus}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tableau récapitulatif</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget total
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée moyenne
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { 
                    status: 'Soumis', 
                    count: filteredProjects.filter(p => p.status === 'submitted').length,
                    budget: `${Math.round(filteredProjects.filter(p => p.status === 'submitted').reduce((sum, p) => sum + p.budget, 0) / 1000000)}M€`,
                    duration: '15 mois' 
                  },
                  { 
                    status: 'En revue', 
                    count: filteredProjects.filter(p => p.status === 'under_review').length,
                    budget: `${Math.round(filteredProjects.filter(p => p.status === 'under_review').reduce((sum, p) => sum + p.budget, 0) / 1000000)}M€`,
                    duration: '18 mois' 
                  },
                  { 
                    status: 'Présélectionné', 
                    count: filteredProjects.filter(p => p.status === 'pre_selected').length,
                    budget: `${Math.round(filteredProjects.filter(p => p.status === 'pre_selected').reduce((sum, p) => sum + p.budget, 0) / 1000000)}M€`,
                    duration: '16 mois' 
                  },
                  { 
                    status: 'Sélectionné', 
                    count: filteredProjects.filter(p => p.status === 'selected').length,
                    budget: `${Math.round(filteredProjects.filter(p => p.status === 'selected').reduce((sum, p) => sum + p.budget, 0) / 1000000)}M€`,
                    duration: '20 mois' 
                  },
                  { 
                    status: 'Financé', 
                    count: filteredProjects.filter(p => p.status === 'financed').length,
                    budget: `${Math.round(filteredProjects.filter(p => p.status === 'financed').reduce((sum, p) => sum + p.budget, 0) / 1000000)}M€`,
                    duration: '24 mois' 
                  },
                  { 
                    status: 'Clôturé', 
                    count: filteredProjects.filter(p => p.status === 'closed').length,
                    budget: `${Math.round(filteredProjects.filter(p => p.status === 'closed').reduce((sum, p) => sum + p.budget, 0) / 1000000)}M€`,
                    duration: '12 mois' 
                  }
                ].map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.budget}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsPage;