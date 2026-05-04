import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore, ProjectStatus } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
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

import { 
  FolderPlus, 
  Users, 
  CheckCircle, 
  Clock,
  FileCheck, 
  ListChecks, 
  ArrowRight,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, fetchProjects, filterProjectsByUser } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  
  useEffect(() => {
    console.log('🏠 DashboardPage: Fetching all data...');
    fetchProjects();
    fetchPrograms();
    fetchPartners();
  }, [fetchProjects, fetchPrograms, fetchPartners]);
  
  const userProjects = user ? filterProjectsByUser(user) : [];
  
  const getStatusCounts = () => {
    const counts: Record<ProjectStatus, number> = {
      draft: 0,
      submitted: 0,
      under_review: 0,
      pre_selected: 0,
      selected: 0,
      formalization: 0,
      financed: 0,
      monitoring: 0,
      closed: 0,
      rejected: 0,
    };
    
    userProjects.forEach(project => {
      counts[project.status]++;
    });
    
    return counts;
  };
  
  const statusCounts = getStatusCounts();
  
  const recentProjects = [...userProjects]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  const getNextActions = () => {
    if (!user) return [];
    
    const actions = [];
    
    if (user.role === 'submitter') {
      if (statusCounts.draft > 0) {
        actions.push({
          label: 'Finaliser et soumettre des projets',
          icon: <CheckCircle className="h-6 w-6 text-primary-600" />,
          link: '/dashboard/projects',
        });
      }
      if (statusCounts.submitted + statusCounts.under_review > 0) {
        actions.push({
          label: 'Suivre les projets en cours d\'évaluation',
          icon: <Clock className="h-6 w-6 text-accent-600" />,
          link: '/dashboard/projects',
        });
      }
      actions.push({
        label: 'Créer un nouveau projet',
        icon: <FolderPlus className="h-6 w-6 text-secondary-600" />,
        link: '/dashboard/projects/create',
      });
    }
    
    if (user.role === 'manager') {
      if (statusCounts.submitted > 0) {
        actions.push({
          label: 'Évaluer les projets soumis',
          icon: <ListChecks className="h-6 w-6 text-primary-600" />,
          link: '/dashboard/evaluation',
        });
      }
      if (statusCounts.selected > 0) {
        actions.push({
          label: 'Formaliser les projets sélectionnés',
          icon: <FileCheck className="h-6 w-6 text-secondary-600" />,
          link: '/dashboard/formalization',
        });
      }
      if (statusCounts.financed > 0) {
        actions.push({
          label: 'Suivre les projets financés',
          icon: <Clock className="h-6 w-6 text-accent-600" />,
          link: '/dashboard/monitoring',
        });
      }
    }
    
    if (user.role === 'partner') {
      actions.push({
        label: 'Consulter les projets soumis',
        icon: <ListChecks className="h-6 w-6 text-primary-600" />,
        link: '/dashboard/projects',
      });
      if (statusCounts.financed + statusCounts.monitoring > 0) {
        actions.push({
          label: 'Suivre les projets financés',
          icon: <Clock className="h-6 w-6 text-accent-600" />,
          link: '/dashboard/monitoring',
        });
      }
    }
    
    return actions;
  };
  
  const nextActions = getNextActions();
  
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour, <span className="text-primary-600">{user?.name}</span>
          </h1>
        </div>
        <p className="mt-1 text-lg text-gray-500">
          Bienvenue sur votre tableau de bord {user?.role === 'partner' ? 'partenaire' : user?.role === 'manager' ? 'gestionnaire' : 'soumissionnaire'}
        </p>
      </div>
      
      {user?.role === 'submitter' && userProjects.length > 0 && (
        <div className="mb-8">
          <Card className="border-l-4 border-l-primary-500 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary-50 to-secondary-50">
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 text-primary-600 mr-2" />
                Progression de vos soumissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessDiagram 
                currentStatus={userProjects.length > 0 ? userProjects[0].status : 'draft'}
                className="py-4"
              />
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Soumissions</p>
                <p className="text-3xl font-bold text-primary-600 mt-1">{userProjects.length}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Total des soumissions {user?.role === 'submitter' ? 'envoyées' : ''}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-lg">
                <FolderPlus className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              {Object.entries(statusCounts)
                .filter(([status, count]) => count > 0)
                .map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <ProjectStatusBadge status={status as ProjectStatus} />
                    <span className="font-medium text-gray-700">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 border-t border-gray-200">
            <Link to="/dashboard/projects" className="text-sm text-primary-600 hover:text-primary-700 flex items-center font-medium">
              Voir toutes les soumissions <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="border-l-4 border-l-secondary-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actions recommandées</p>
                <p className="text-2xl font-bold text-secondary-600 mt-1">{nextActions.length}</p>
                <p className="text-sm text-gray-500 mt-1">Tâches en attente</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-secondary-100 to-accent-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-secondary-600" />
              </div>
            </div>
            
            <div className="mt-4 space-y-3">
              {nextActions.length > 0 ? (
                nextActions.slice(0, 2).map((action, index) => (
                  <Link 
                    key={index} 
                    to={action.link}
                    className="flex items-start p-3 rounded-md hover:bg-gradient-to-r hover:from-gray-50 hover:to-secondary-50 transition-colors group"
                  >
                    <div className="mr-3 flex-shrink-0 group-hover:scale-110 transition-transform">
                      {action.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 group-hover:text-primary-700">
                        {action.label}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Award className="h-8 w-8 mx-auto mb-2 text-success-500" />
                  <p className="text-sm">Tout est à jour !</p>
                </div>
              )}
            </div>
          </CardContent>
          {user?.role === 'submitter' && (
            <CardFooter className="bg-gradient-to-r from-secondary-50 to-accent-50 border-t border-gray-200">
              <Link to="/dashboard/projects/create">
                <Button 
                  variant="secondary" 
                  leftIcon={<FolderPlus className="h-4 w-4" />}
                  size="sm"
                >
                  Créer un nouveau projet
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>
        
        <Card className="border-l-4 border-l-accent-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activité récente</p>
                <p className="text-2xl font-bold text-accent-600 mt-1">{recentProjects.length}</p>
                <p className="text-sm text-gray-500 mt-1">Soumissions récentes</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-accent-100 to-primary-100 rounded-lg">
                <Clock className="h-6 w-6 text-accent-600" />
              </div>
            </div>
            
            {recentProjects.length > 0 ? (
              <div className="mt-4 space-y-3">
                {recentProjects.slice(0, 3).map(project => (
                  <Link 
                    key={project.id} 
                    to={`/dashboard/projects/${project.id}`}
                    className="block p-3 rounded-md hover:bg-gradient-to-r hover:from-gray-50 hover:to-accent-50 transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-primary-700 truncate">
                        {project.title}
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Modifié le {project.updatedAt.toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-sm">Aucune soumission récente</div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-gradient-to-r from-accent-50 to-primary-50 border-t border-gray-200">
            <Link to="/dashboard/projects" className="text-sm text-accent-600 hover:text-accent-700 flex items-center font-medium">
              Voir l'historique complet <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;