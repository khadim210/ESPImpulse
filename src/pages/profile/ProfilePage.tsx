import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { AuthService, supabaseAdmin } from '../../services/supabaseService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { User, Lock, Save, AlertCircle, CheckCircle, Database, Trash2 } from 'lucide-react';

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    organization: user?.organization || ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await AuthService.updateProfile(profileData);
      if (user) {
        setUser({ ...user, ...profileData });
      }
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
      setIsEditingProfile(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil' });
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await AuthService.updatePassword(passwordData.newPassword);
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la modification du mot de passe' });
      console.error('Error updating password:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDatabase = async () => {
    if (clearConfirmText !== 'VIDER LA BASE') {
      setMessage({ type: 'error', text: 'Veuillez taper exactement "VIDER LA BASE" pour confirmer' });
      return;
    }

    setIsClearing(true);
    setMessage(null);
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }

      const tables = ['projects', 'programs', 'partners', 'form_templates'];

      for (const table of tables) {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
          console.error(`Error clearing ${table}:`, error);
        }
      }

      setMessage({ type: 'success', text: 'Base de données vidée avec succès (comptes utilisateurs conservés)' });
      setShowClearConfirm(false);
      setClearConfirmText('');

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors du vidage de la base de données' });
      console.error('Error clearing database:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="mt-1 text-gray-600">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border flex items-start ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-500 mr-2" />
              <CardTitle>Informations du profil</CardTitle>
            </div>
            {!isEditingProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
              >
                Modifier
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">L'email ne peut pas être modifié</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              disabled={!isEditingProfile}
              className={`block w-full rounded-md shadow-sm sm:text-sm ${
                isEditingProfile
                  ? 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  : 'border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organisation
            </label>
            <input
              type="text"
              value={profileData.organization}
              onChange={(e) => setProfileData({ ...profileData, organization: e.target.value })}
              disabled={!isEditingProfile}
              className={`block w-full rounded-md shadow-sm sm:text-sm ${
                isEditingProfile
                  ? 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  : 'border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle
            </label>
            <input
              type="text"
              value={user?.role || ''}
              disabled
              className="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Le rôle ne peut pas être modifié</p>
          </div>

          {isEditingProfile && (
            <div className="flex space-x-3 pt-4">
              <Button
                variant="primary"
                onClick={handleProfileSave}
                isLoading={isSaving}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Enregistrer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileData({
                    name: user?.name || '',
                    organization: user?.organization || ''
                  });
                }}
                disabled={isSaving}
              >
                Annuler
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Lock className="h-5 w-5 text-gray-500 mr-2" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            {!isChangingPassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangingPassword(true)}
              >
                Changer le mot de passe
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isChangingPassword ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Au moins 6 caractères"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Retapez le nouveau mot de passe"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="primary"
                  onClick={handlePasswordChange}
                  isLoading={isSaving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Mettre à jour le mot de passe
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                  disabled={isSaving}
                >
                  Annuler
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600">
              <p>Modifiez votre mot de passe pour sécuriser votre compte.</p>
              <p className="mt-2">Votre mot de passe doit contenir au moins 6 caractères.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Database className="h-5 w-5 text-gray-500 mr-2" />
              <CardTitle>Gestion de la base de données</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showClearConfirm ? (
              <div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Attention</h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        Cette action supprimera toutes les données (projets, programmes, partenaires, formulaires)
                        mais conservera tous les comptes utilisateurs.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(true)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Vider la base de données
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Confirmation requise</h4>
                      <p className="mt-1 text-sm text-red-700">
                        Cette action est irréversible. Tapez exactement <strong>VIDER LA BASE</strong> pour confirmer.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmation
                  </label>
                  <input
                    type="text"
                    value={clearConfirmText}
                    onChange={(e) => setClearConfirmText(e.target.value)}
                    placeholder="Tapez: VIDER LA BASE"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    onClick={handleClearDatabase}
                    isLoading={isClearing}
                    disabled={clearConfirmText !== 'VIDER LA BASE'}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  >
                    Confirmer le vidage
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowClearConfirm(false);
                      setClearConfirmText('');
                    }}
                    disabled={isClearing}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
