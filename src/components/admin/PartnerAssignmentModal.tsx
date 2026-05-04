import React, { useState, useEffect } from 'react';
import { useUserManagementStore } from '../../stores/userManagementStore';
import { useProgramStore, Partner } from '../../stores/programStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import { X, Save, Users, Building, UserCheck } from 'lucide-react';

interface PartnerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PartnerAssignmentModal: React.FC<PartnerAssignmentModalProps> = ({ isOpen, onClose }) => {
  const { users } = useUserManagementStore();
  const { 
    partners, 
    fetchPartners, 
    assignPartnerToManager,
    isLoading 
  } = useProgramStore();
  
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPartners();
      // Initialize assignments with current values
      const currentAssignments: Record<string, string> = {};
      partners.forEach(partner => {
        if (partner.assignedManagerId) {
          currentAssignments[partner.id] = partner.assignedManagerId;
        }
      });
      setAssignments(currentAssignments);
    }
  }, [isOpen, fetchPartners, partners]);

  const managers = users.filter(user => user.role === 'manager' && user.isActive);

  const handleAssignmentChange = (partnerId: string, managerId: string) => {
    setAssignments(prev => ({
      ...prev,
      [partnerId]: managerId === '' ? undefined : managerId
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all assignments
      const promises = Object.entries(assignments).map(([partnerId, managerId]) => {
        if (managerId) {
          return assignPartnerToManager(partnerId, managerId);
        }
        return Promise.resolve(true);
      });
      
      await Promise.all(promises);
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getManagerName = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    return manager ? manager.name : 'Manager introuvable';
  };

  const getAssignedPartnersCount = (managerId: string) => {
    return Object.values(assignments).filter(id => id === managerId).length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600" />
            Attribution des partenaires aux managers
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Partners List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Partenaires ({partners.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {partners.map(partner => (
                    <div key={partner.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{partner.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{partner.description}</p>
                          <div className="text-xs text-gray-400 mt-2">
                            {partner.contactEmail}
                          </div>
                        </div>
                        <div className={`ml-4 px-2 py-1 rounded-full text-xs font-medium ${
                          partner.isActive 
                            ? 'bg-success-100 text-success-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {partner.isActive ? 'Actif' : 'Inactif'}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Manager assigné
                        </label>
                        <select
                          value={assignments[partner.id] || ''}
                          onChange={(e) => handleAssignmentChange(partner.id, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                          <option value="">Aucun manager assigné</option>
                          {managers.map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Managers Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" />
                  Résumé des managers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {managers.map(manager => (
                    <div key={manager.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{manager.name}</h4>
                          <p className="text-sm text-gray-500">{manager.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary-600">
                            {getAssignedPartnersCount(manager.id)}
                          </div>
                          <div className="text-xs text-gray-500">
                            partenaire{getAssignedPartnersCount(manager.id) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {managers.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Aucun manager disponible</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-between mt-6">
          <div className="text-sm text-gray-500">
            {Object.keys(assignments).length} attribution(s) configurée(s)
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
              Enregistrer les attributions
            </Button>
          </div>
        </CardFooter>
      </div>
    </div>
  );
};

export default PartnerAssignmentModal;