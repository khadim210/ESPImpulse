import React, { useState, memo } from 'react';
import { useRolePermissionStore, UserRole, Permission } from '../../stores/rolePermissionStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import { X, Save, RefreshCw, Shield, Users, Settings, BarChart3 } from 'lucide-react';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RoleManagementModal: React.FC<RoleManagementModalProps> = memo(({ isOpen, onClose }) => {
  const { 
    rolePermissions, 
    permissionGroups, 
    updateRolePermissions, 
    resetToDefaults,
    isLoading 
  } = useRolePermissionStore();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [tempPermissions, setTempPermissions] = useState<Permission[]>(
    rolePermissions[selectedRole] || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const roles: { value: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'admin', label: 'Administrateur', icon: <Shield className="h-4 w-4" />, color: 'text-error-600' },
    { value: 'manager', label: 'Gestionnaire', icon: <Settings className="h-4 w-4" />, color: 'text-secondary-600' },
    { value: 'partner', label: 'Partenaire', icon: <BarChart3 className="h-4 w-4" />, color: 'text-primary-600' },
    { value: 'submitter', label: 'Soumissionnaire', icon: <Users className="h-4 w-4" />, color: 'text-accent-600' }
  ];

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setTempPermissions(rolePermissions[role] || []);
  };

  const handlePermissionToggle = (permission: Permission) => {
    setTempPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateRolePermissions(selectedRole, tempPermissions);
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetToDefaults();
      setTempPermissions(rolePermissions[selectedRole] || []);
    } catch (error) {
      console.error('Error resetting permissions:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectAll = () => {
    const allPermissions = permissionGroups.flatMap(group => 
      group.permissions.map(p => p.id)
    );
    setTempPermissions(allPermissions);
  };

  const handleDeselectAll = () => {
    setTempPermissions([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary-600" />
            Gestion des rôles et permissions
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Role Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sélectionner un rôle</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {roles.map(role => (
                    <button
                      key={role.value}
                      onClick={() => handleRoleChange(role.value)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-none first:rounded-t-lg last:rounded-b-lg transition-colors ${
                        selectedRole === role.value
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={`mr-3 ${role.color}`}>{role.icon}</span>
                      {role.label}
                      <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {rolePermissions[role.value]?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="w-full"
              >
                Tout sélectionner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="w-full"
              >
                Tout désélectionner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                isLoading={isResetting}
                leftIcon={<RefreshCw className="h-4 w-4" />}
                className="w-full"
              >
                Réinitialiser
              </Button>
            </div>
          </div>

          {/* Permissions */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className={roles.find(r => r.value === selectedRole)?.color}>
                    {roles.find(r => r.value === selectedRole)?.icon}
                  </span>
                  <span className="ml-2">
                    Permissions pour {roles.find(r => r.value === selectedRole)?.label}
                  </span>
                  <span className="ml-auto text-sm bg-primary-100 text-primary-800 px-3 py-1 rounded-full">
                    {tempPermissions.length} permissions
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <div className="space-y-6">
                  {permissionGroups.map(group => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        {group.name}
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {group.permissions.filter(p => tempPermissions.includes(p.id)).length}/{group.permissions.length}
                        </span>
                      </h4>
                      <div className="space-y-3">
                        {group.permissions.map(permission => (
                          <label key={permission.id} className="flex items-start">
                            <input
                              type="checkbox"
                              checked={tempPermissions.includes(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id)}
                              className="mt-1 rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-between">
                <div className="text-sm text-gray-500">
                  {tempPermissions.length} permission(s) sélectionnée(s)
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Enregistrer
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
});

RoleManagementModal.displayName = 'RoleManagementModal';

export default RoleManagementModal;