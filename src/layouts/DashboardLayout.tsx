import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePermissions } from '../hooks/usePermissions';
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  FileText,
  BarChart3,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  User,
  FileInput,
  Users,
  Settings,
  Target,
  Building,
  ClipboardCheck,
  History,
  BookOpen,
  Briefcase,
  Sliders,
  Building2
} from 'lucide-react';
import Button from '../components/ui/Button';
import logoImage from '../assets/Logo_senegal-ucad.png';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, onClick }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
        ${isActive
          ? 'bg-primary-700 text-white shadow-md'
          : 'text-gray-300 hover:bg-primary-700 hover:text-white'}
      `}
      onClick={onClick}
    >
      <span className="mr-3 h-5 w-5">{icon}</span>
      {label}
    </NavLink>
  );
};

interface NavSubMenuProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  paths: string[];
  defaultOpen?: boolean;
}

const NavSubMenu: React.FC<NavSubMenuProps> = ({ icon, label, children, paths, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();

  const isActiveParent = paths.some(path => location.pathname.startsWith(path));

  React.useEffect(() => {
    if (isActiveParent) {
      setIsOpen(true);
    }
  }, [isActiveParent]);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActiveParent
            ? 'bg-primary-700/50 text-white'
            : 'text-gray-300 hover:bg-primary-700 hover:text-white'
        }`}
      >
        <div className="flex items-center">
          <span className="mr-3 h-5 w-5">{icon}</span>
          {label}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <div className="mt-1 ml-4 pl-4 border-l border-secondary-400/30 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

const SubNavItem: React.FC<NavItemProps> = ({ to, icon, label, onClick }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
        ${isActive
          ? 'bg-primary-700 text-white shadow-md'
          : 'text-gray-300 hover:bg-primary-700/70 hover:text-white'}
      `}
      onClick={onClick}
    >
      <span className="mr-2 h-4 w-4">{icon}</span>
      {label}
    </NavLink>
  );
};

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { checkPermission } = usePermissions();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`md:hidden ${sidebarOpen ? 'fixed inset-0 z-40 flex' : 'hidden'}`}>
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75" 
          onClick={() => setSidebarOpen(false)}
        />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-primary-700">
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gradient-to-b from-primary-800 via-primary-700 to-primary-600">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Fermer la barre latérale</span>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex flex-col items-center px-4 mb-6 pt-2">
              <img
                src={logoImage}
                alt="ESP - Ecole Supérieure Polytechnique"
                className="h-14 w-14 rounded-full border-2 border-secondary-400/60 object-cover"
              />
              <div className="mt-2 text-center">
                <span className="text-white font-bold text-sm leading-tight block">R&D Impulse !</span>
                <span className="text-secondary-300 text-xs leading-tight block">ESP - UCAD</span>
              </div>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {checkPermission('dashboard.view') && (
                <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Tableau de bord" onClick={() => setSidebarOpen(false)} />
              )}

              {(checkPermission('parameters.edit') || checkPermission('form_templates.view')) && (
                <NavSubMenu icon={<Building2 />} label="Organisation" paths={['/dashboard/programs', '/dashboard/partners', '/dashboard/form-templates']}>
                  {checkPermission('parameters.edit') && (
                    <SubNavItem to="/dashboard/programs" icon={<Target />} label="Programmes" onClick={() => setSidebarOpen(false)} />
                  )}
                  {checkPermission('parameters.edit') && (
                    <SubNavItem to="/dashboard/partners" icon={<Building />} label="Partenaires" onClick={() => setSidebarOpen(false)} />
                  )}
                  {checkPermission('form_templates.view') && (
                    <SubNavItem to="/dashboard/form-templates" icon={<FileInput />} label="Formulaires" onClick={() => setSidebarOpen(false)} />
                  )}
                </NavSubMenu>
              )}

              {checkPermission('projects.view') && (
                <NavItem to="/dashboard/projects" icon={<FolderKanban />} label="Soumissions" onClick={() => setSidebarOpen(false)} />
              )}
              {(checkPermission('evaluation.view') || checkPermission('parameters.edit')) && (
                <NavItem to="/dashboard/eligibility" icon={<ClipboardCheck />} label="Eligibilite" onClick={() => setSidebarOpen(false)} />
              )}
              {checkPermission('evaluation.view') && (
                <NavItem to="/dashboard/evaluation" icon={<ListChecks />} label="Evaluation" onClick={() => setSidebarOpen(false)} />
              )}
              {checkPermission('formalization.view') && (
                <NavItem to="/dashboard/formalization" icon={<FileText />} label="Formalisation" onClick={() => setSidebarOpen(false)} />
              )}
              {checkPermission('monitoring.view') && (
                <NavItem to="/dashboard/monitoring" icon={<BarChart3 />} label="Suivi" onClick={() => setSidebarOpen(false)} />
              )}
              {checkPermission('statistics.view') && (
                <NavItem to="/dashboard/statistics" icon={<BarChart3 />} label="Statistiques" onClick={() => setSidebarOpen(false)} />
              )}

              {checkPermission('parameters.view') && (
                <NavSubMenu icon={<Settings />} label="Parametres" paths={['/dashboard/parameters', '/dashboard/activity-sectors', '/dashboard/users', '/dashboard/status-history', '/dashboard/user-manual']}>
                  <SubNavItem to="/dashboard/parameters" icon={<Sliders />} label="Configuration" onClick={() => setSidebarOpen(false)} />
                  {checkPermission('parameters.edit') && (
                    <SubNavItem to="/dashboard/activity-sectors" icon={<Briefcase />} label="Secteurs d'activite" onClick={() => setSidebarOpen(false)} />
                  )}
                  {checkPermission('users.view') && (
                    <SubNavItem to="/dashboard/users" icon={<Users />} label="Utilisateurs" onClick={() => setSidebarOpen(false)} />
                  )}
                  {checkPermission('status_history.view') && (
                    <SubNavItem to="/dashboard/status-history" icon={<History />} label="Historique des statuts" onClick={() => setSidebarOpen(false)} />
                  )}
                  <SubNavItem to="/dashboard/user-manual" icon={<BookOpen />} label="Manuel Utilisateur" onClick={() => setSidebarOpen(false)} />
                </NavSubMenu>
              )}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-secondary-400 p-4">
            <button
              className="flex-shrink-0 group block w-full"
              onClick={handleLogout}
            >
              <div className="flex items-center">
                <div className="ml-3">
                  <div className="text-sm font-medium text-white flex items-center">
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
        </div>
      </div>
      
      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-gradient-to-b from-primary-800 via-primary-700 to-primary-600 shadow-xl">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex flex-col items-center flex-shrink-0 px-4 mb-6 pt-2">
                <img
                  src={logoImage}
                  alt="ESP - Ecole Supérieure Polytechnique"
                  className="h-14 w-14 rounded-full border-2 border-secondary-400/60 object-cover"
                />
                <div className="mt-2 text-center">
                  <span className="text-white font-bold text-sm leading-tight block">R&D Impulse !</span>
                  <span className="text-secondary-300 text-xs leading-tight block">ESP - UCAD</span>
                </div>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {checkPermission('dashboard.view') && (
                  <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Tableau de bord" />
                )}

                {(checkPermission('parameters.edit') || checkPermission('form_templates.view')) && (
                  <NavSubMenu icon={<Building2 />} label="Organisation" paths={['/dashboard/programs', '/dashboard/partners', '/dashboard/form-templates']}>
                    {checkPermission('parameters.edit') && (
                      <SubNavItem to="/dashboard/programs" icon={<Target />} label="Programmes" />
                    )}
                    {checkPermission('parameters.edit') && (
                      <SubNavItem to="/dashboard/partners" icon={<Building />} label="Partenaires" />
                    )}
                    {checkPermission('form_templates.view') && (
                      <SubNavItem to="/dashboard/form-templates" icon={<FileInput />} label="Formulaires" />
                    )}
                  </NavSubMenu>
                )}

                {checkPermission('projects.view') && (
                  <NavItem to="/dashboard/projects" icon={<FolderKanban />} label="Soumissions" />
                )}
                {(checkPermission('evaluation.view') || checkPermission('parameters.edit')) && (
                  <NavItem to="/dashboard/eligibility" icon={<ClipboardCheck />} label="Eligibilite" />
                )}
                {checkPermission('evaluation.view') && (
                  <NavItem to="/dashboard/evaluation" icon={<ListChecks />} label="Evaluation" />
                )}
                {checkPermission('formalization.view') && (
                  <NavItem to="/dashboard/formalization" icon={<FileText />} label="Formalisation" />
                )}
                {checkPermission('monitoring.view') && (
                  <NavItem to="/dashboard/monitoring" icon={<BarChart3 />} label="Suivi" />
                )}

                {checkPermission('parameters.view') && (
                  <NavSubMenu icon={<Settings />} label="Parametres" paths={['/dashboard/parameters', '/dashboard/activity-sectors', '/dashboard/users', '/dashboard/status-history', '/dashboard/user-manual']}>
                    <SubNavItem to="/dashboard/parameters" icon={<Sliders />} label="Configuration" />
                    {checkPermission('parameters.edit') && (
                      <SubNavItem to="/dashboard/activity-sectors" icon={<Briefcase />} label="Secteurs d'activite" />
                    )}
                    {checkPermission('users.view') && (
                      <SubNavItem to="/dashboard/users" icon={<Users />} label="Utilisateurs" />
                    )}
                    {checkPermission('status_history.view') && (
                      <SubNavItem to="/dashboard/status-history" icon={<History />} label="Historique des statuts" />
                    )}
                    <SubNavItem to="/dashboard/user-manual" icon={<BookOpen />} label="Manuel Utilisateur" />
                  </NavSubMenu>
                )}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-secondary-400 p-4">
              <button
                className="flex-shrink-0 w-full group block"
                onClick={handleLogout}
              >
                <div className="flex items-center">
                  <div className="ml-3 w-full">
                    <div className="text-sm font-medium text-white flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Se déconnecter
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Ouvrir la barre latérale</span>
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <header className="flex justify-between items-center py-4 border-b border-gray-200 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-primary-700">
                    R&D Impulse !
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">Ecole Supérieure Polytechnique &mdash; UCAD</p>
                </div>
                
                <div className="relative">
                  <button
                    className="flex items-center text-sm border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 hover:border-primary-200 transition-colors"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center text-white">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="ml-2 text-gray-700 font-medium">{user?.name}</span>
                    <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
                  </button>
                  
                  {userMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <NavLink 
                        to="/dashboard/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Profil
                      </NavLink>
                      {checkPermission('users.view') && (
                        <NavLink 
                          to="/dashboard/users" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Gestion des utilisateurs
                        </NavLink>
                      )}
                      {checkPermission('parameters.view') && (
                        <NavLink 
                          to="/dashboard/parameters" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Paramètres
                        </NavLink>
                      )}
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                      >
                        Se déconnecter
                      </button>
                    </div>
                  )}
                </div>
              </header>
              
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;