import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import logoImage from '../assets/Logo_senegal-ucad.png';

const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - ESP branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-secondary-400 transform translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-4">
            <img
              src={logoImage}
              alt="ESP - Ecole Supérieure Polytechnique"
              className="h-16 w-16 rounded-full border-2 border-secondary-400/50 object-cover"
            />
            <div>
              <div className="text-white font-bold text-xl tracking-tight">R&D Impulse !</div>
              <div className="text-secondary-300 text-sm">Ecole Supérieure Polytechnique</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-white text-3xl font-bold leading-tight">
              Plateforme de Gestion des Projets de Recherche &amp; Développement
            </h2>
            <p className="mt-4 text-secondary-200 text-base leading-relaxed">
              Soumettez, évaluez et suivez vos projets d'innovation et de recherche à travers un processus structuré et transparent.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
              <div className="text-secondary-300 text-2xl font-bold">R&D</div>
              <div className="text-white/70 text-xs mt-1">Recherche & Développement</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
              <div className="text-secondary-300 text-2xl font-bold">ESP</div>
              <div className="text-white/70 text-xs mt-1">Ecole Polytechnique</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
              <div className="text-secondary-300 text-2xl font-bold">UCAD</div>
              <div className="text-white/70 text-xs mt-1">Université de Dakar</div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-xs">
            &copy; {new Date().getFullYear()} ESP &mdash; Université Cheikh Anta Diop de Dakar. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <img
            src={logoImage}
            alt="ESP - Ecole Supérieure Polytechnique"
            className="h-16 w-16 rounded-full border-2 border-primary-200 object-cover"
          />
          <h1 className="mt-3 text-xl font-bold text-primary-700">R&D Impulse !</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Ecole Supérieure Polytechnique &mdash; UCAD</p>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 py-8 px-8">
            <Outlet />
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} ESP &mdash; UCAD. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
