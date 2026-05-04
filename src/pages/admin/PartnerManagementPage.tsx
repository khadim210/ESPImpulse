import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useProgramStore, Partner } from '../../stores/programStore';
import { useUserManagementStore } from '../../stores/userManagementStore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter
} from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, CreditCard as Edit, Trash2, Save, Building, Mail, Phone, MapPin, Users, Search, Filter, User } from 'lucide-react';

const partnerSchema = Yup.object().shape({
  name: Yup.string().required('Le nom du partenaire est requis'),
  description: Yup.string(),
  contactEmail: Yup.string().email('Email invalide').required('Email de contact requis'),
  contactPhone: Yup.string(),
  address: Yup.string(),
  assignedManagerId: Yup.string(),
  assignedUserId: Yup.string()
});

interface PartnerFormValues {
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  assignedManagerId: string;
  assignedUserId: string;
  isActive: boolean;
}

const PartnerManagementPage: React.FC = () => {
  const { 
    partners, 
    isLoading, 
    error,
    fetchPartners, 
    addPartner, 
    updatePartner, 
    deletePartner 
  } = useProgramStore();
  
  const { users, fetchUsers, updateUser } = useUserManagementStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const managers = users.filter(user => user.role === 'manager' && user.isActive);
  const partnerUsers = users.filter(user => user.role === 'partner' && user.isActive);

  useEffect(() => {
    fetchPartners();
    fetchUsers();
  }, [fetchPartners, fetchUsers]);

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (partner.description && partner.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && partner.isActive) ||
                         (statusFilter === 'inactive' && !partner.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleCreatePartner = async (values: PartnerFormValues, { resetForm, setSubmitting }: any) => {
    try {
      const result = await addPartner({
        name: values.name,
        description: values.description,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        address: values.address,
        isActive: values.isActive,
        assignedManagerId: values.assignedManagerId || undefined
      });

      if (values.assignedUserId && result) {
        await updateUser(values.assignedUserId, { partnerId: result.id });
      }

      resetForm();
      setShowCreateModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Erreur lors de la creation du partenaire:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      alert(`Erreur lors de la creation du partenaire: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePartner = async (values: PartnerFormValues, { setSubmitting }: any) => {
    if (!editingPartner) return;

    try {
      await updatePartner(editingPartner.id, {
        name: values.name,
        description: values.description,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        address: values.address,
        isActive: values.isActive,
        assignedManagerId: values.assignedManagerId || undefined
      });

      const currentAssignedUser = getAssignedUserForPartner(editingPartner.id);
      const newAssignedUserId = values.assignedUserId;

      if (currentAssignedUser && currentAssignedUser.id !== newAssignedUserId) {
        await updateUser(currentAssignedUser.id, { partnerId: undefined });
      }

      if (newAssignedUserId && (!currentAssignedUser || currentAssignedUser.id !== newAssignedUserId)) {
        await updateUser(newAssignedUserId, { partnerId: editingPartner.id });
      }

      setEditingPartner(null);
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la mise a jour du partenaire:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    try {
      await deletePartner(partnerId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Erreur lors de la suppression du partenaire:', error);
    }
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'Aucun manager assigne';
    const manager = managers.find(m => m.id === managerId);
    return manager ? manager.name : 'Manager introuvable';
  };

  const getAssignedUserForPartner = (partnerId: string) => {
    return partnerUsers.find(u => u.partnerId === partnerId);
  };

  const getAssignedUserName = (partnerId: string) => {
    const user = getAssignedUserForPartner(partnerId);
    return user ? user.name : 'Aucun utilisateur assigne';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des partenaires</h1>
          <p className="text-gray-600">Creez et gerez les partenaires de financement</p>
        </div>
        <Button
          onClick={() => {
            setEditingPartner(null);
            setShowCreateModal(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nouveau partenaire
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Rechercher un partenaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative w-48">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((partner) => (
          <Card key={partner.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Building className="h-5 w-5 text-primary-600 mr-2" />
                    {partner.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{partner.description}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  partner.isActive 
                    ? 'bg-success-100 text-success-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {partner.isActive ? 'Actif' : 'Inactif'}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{partner.contactEmail}</span>
                </div>
                
                {partner.contactPhone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{partner.contactPhone}</span>
                  </div>
                )}
                
                {partner.address && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="line-clamp-2">{partner.address}</span>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{getManagerName(partner.assignedManagerId)}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>{getAssignedUserName(partner.id)}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPartner(partner)}
                  leftIcon={<Edit className="h-4 w-4" />}
                >
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(partner.id)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPartners.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? "Aucun partenaire ne correspond à vos critères de recherche"
              : "Aucun partenaire n'est disponible pour le moment"}
          </div>
          <Button
            variant="primary"
            className="mt-4"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Créer votre premier partenaire
          </Button>
        </div>
      )}

      {/* Create/Edit Partner Modal */}
      {(showCreateModal || editingPartner) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPartner ? 'Modifier le partenaire' : 'Créer un nouveau partenaire'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPartner(null);
                    setShowCreateModal(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <Formik
                initialValues={{
                  name: editingPartner?.name || '',
                  description: editingPartner?.description || '',
                  contactEmail: editingPartner?.contactEmail || '',
                  contactPhone: editingPartner?.contactPhone || '',
                  address: editingPartner?.address || '',
                  assignedManagerId: editingPartner?.assignedManagerId || '',
                  assignedUserId: editingPartner ? (getAssignedUserForPartner(editingPartner.id)?.id || '') : '',
                  isActive: editingPartner?.isActive ?? true,
                }}
                validationSchema={partnerSchema}
                onSubmit={editingPartner ? handleUpdatePartner : handleCreatePartner}
                enableReinitialize
              >
                {({ isSubmitting, values }) => (
                  <Form className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom du partenaire*
                      </label>
                      <Field
                        name="name"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Nom de l'organisation partenaire"
                      />
                      <ErrorMessage name="name" component="div" className="mt-1 text-sm text-error-600" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <Field
                        as="textarea"
                        name="description"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Description du partenaire et de ses activités"
                      />
                      <ErrorMessage name="description" component="div" className="mt-1 text-sm text-error-600" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email de contact*
                        </label>
                        <Field
                          name="contactEmail"
                          type="email"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="contact@partenaire.com"
                        />
                        <ErrorMessage name="contactEmail" component="div" className="mt-1 text-sm text-error-600" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Téléphone de contact
                        </label>
                        <Field
                          name="contactPhone"
                          type="tel"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="+33 1 23 45 67 89"
                        />
                        <ErrorMessage name="contactPhone" component="div" className="mt-1 text-sm text-error-600" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Adresse
                      </label>
                      <Field
                        as="textarea"
                        name="address"
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Adresse complète du partenaire"
                      />
                      <ErrorMessage name="address" component="div" className="mt-1 text-sm text-error-600" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Manager assigne
                      </label>
                      <Field
                        as="select"
                        name="assignedManagerId"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="">Aucun manager assigne</option>
                        {managers.map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="assignedManagerId" component="div" className="mt-1 text-sm text-error-600" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Compte utilisateur associe
                      </label>
                      <Field
                        as="select"
                        name="assignedUserId"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="">Aucun utilisateur assigne</option>
                        {partnerUsers.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </Field>
                      <p className="mt-1 text-xs text-gray-500">
                        Selectionnez un utilisateur avec le role "Partenaire" a associer a ce compte partenaire
                      </p>
                      <ErrorMessage name="assignedUserId" component="div" className="mt-1 text-sm text-error-600" />
                    </div>

                    <div>
                      <label className="flex items-center">
                        <Field
                          name="isActive"
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">Partenaire actif</span>
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingPartner(null);
                          setShowCreateModal(false);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSubmitting}
                        leftIcon={<Save className="h-4 w-4" />}
                      >
                        {editingPartner ? 'Mettre à jour' : 'Créer le partenaire'}
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100">
                <Trash2 className="h-6 w-6 text-error-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Supprimer le partenaire</h3>
              <p className="text-sm text-gray-500 mt-2">
                Êtes-vous sûr de vouloir supprimer ce partenaire ? Cette action est irréversible et supprimera également tous les programmes associés.
              </p>
              <div className="flex justify-center space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDeletePartner(showDeleteConfirm)}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerManagementPage;