import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { MigrationService, supabase } from './services/supabaseService';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import CreateProjectPage from './pages/projects/CreateProjectPage';
import EditProjectPage from './pages/projects/EditProjectPage';
import EligibilityPage from './pages/eligibility/EligibilityPage';
import EvaluationPage from './pages/evaluation/EvaluationPage';
import FormalizationPage from './pages/formalization/FormalizationPage';
import MonitoringPage from './pages/monitoring/MonitoringPage';
import StatisticsPage from './pages/statistics/StatisticsPage';
import ProfilePage from './pages/profile/ProfilePage';
import FormBuilderPage from './pages/manager/FormBuilderPage';
import FormTemplatesPage from './pages/manager/FormTemplatesPage';

// Admin Pages
import UserManagementPage from './pages/admin/UserManagementPage';
import ParametersPage from './pages/admin/ParametersPage';
import ProgramManagementPage from './pages/admin/ProgramManagementPage';
import PartnerManagementPage from './pages/admin/PartnerManagementPage';
import StatusHistoryPage from './pages/admin/StatusHistoryPage';
import UserManualPage from './pages/admin/UserManualPage';
import ActivitySectorsPage from './pages/admin/ActivitySectorsPage';

// Public Pages
import PublicSubmissionPage from './pages/public/PublicSubmissionPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Auth Session Listener Component
const AuthSessionListener = ({ children }: { children: React.ReactNode }) => {
  const { logout, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isPublicSubmissionPage = location.pathname.startsWith('/submit/');

      if (isPublicSubmissionPage) {
        return;
      }

      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        if (isAuthenticated) {
          logout();
          navigate('/login', { replace: true });
        }
      }

      if (event === 'TOKEN_REFRESHED' && !session) {
        logout();
        navigate('/login', { replace: true });
      }
    });

    const checkSession = async () => {
      const isPublicSubmissionPage = location.pathname.startsWith('/submit/');
      if (isPublicSubmissionPage) return;

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        if (isAuthenticated && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
          logout();
          navigate('/login', { replace: true });
        }
      }
    };

    if (isAuthenticated) {
      checkSession();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [logout, isAuthenticated, location.pathname, navigate]);

  return <>{children}</>;
};

function App() {
  React.useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (hasSupabaseConfig) {
          const hasSeeded = localStorage.getItem('app_data_seeded');
          if (!hasSeeded && import.meta.env.MODE === 'development') {
            await MigrationService.seedData();
            localStorage.setItem('app_data_seeded', 'true');
          }
        }
      } catch (error) {
        console.error('Supabase initialization error:', error);
      }
    };

    initializeSupabase();
  }, []);
  
  return (
    <Router>
      <AuthSessionListener>
        <Routes>
          {/* Public Routes */}
          <Route path="/submit/:programId" element={<PublicSubmissionPage />} />

          {/* Auth Routes */}
          <Route path="/" element={<AuthLayout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/create" element={<CreateProjectPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:id/edit" element={<EditProjectPage />} />
            <Route path="eligibility" element={<EligibilityPage />} />
            <Route path="evaluation" element={<EvaluationPage />} />
            <Route path="formalization" element={<FormalizationPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="form-templates" element={<FormTemplatesPage />} />
            <Route path="form-templates/create" element={<FormBuilderPage />} />
            <Route path="form-templates/:id/edit" element={<FormBuilderPage />} />
            <Route path="programs" element={<ProgramManagementPage />} />
            <Route path="partners" element={<PartnerManagementPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="parameters" element={<ParametersPage />} />
            <Route path="activity-sectors" element={<ActivitySectorsPage />} />
            <Route path="status-history" element={<StatusHistoryPage />} />
            <Route path="user-manual" element={<UserManualPage />} />
          </Route>
        
        {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthSessionListener>
    </Router>
  );
}

export default App;