import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { Plus, CreditCard as Edit, Trash2, Save, Settings, CheckCircle, ListChecks, Bot, GripVertical, Users, Calendar, Target, FileText, Lock, Unlock, Copy, AlertTriangle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useProgramStore } from '../../stores/programStore';
import { useFormTemplateStore } from '../../stores/formTemplateStore';
import { useUserManagementStore } from '../../stores/userManagementStore';
import { useAuthStore } from '../../stores/authStore';
import { getPublicSubmissionUrl } from '../../utils/url';
import { formatCurrency } from '../../utils/currency';

const programSchema = Yup.object().shape({
  name: Yup.string().required('Le nom du programme est requis'),
  description: Yup.string().required('La description est requise'),
  partnerId: Yup.string().required('Un partenaire doit être sélectionné'),
  startDate: Yup.date().required('La date de début est requise'),
  endDate: Yup.date()
    .min(Yup.ref('startDate'), 'La date de fin doit être après la date de début')
    .required('La date de fin est requise'),
  managerId: Yup.string(),
  selectionCriteria: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required('Le nom du critère est requis'),
      type: Yup.string().required('Le type est requis'),
      description: Yup.string(),
      required: Yup.boolean()
    })
  ),
  evaluationCriteria: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required('Le nom du critère est requis'),
      weight: Yup.number().min(0).max(100).required('Le poids est requis'),
      maxScore: Yup.number().min(1).required('Le score maximum est requis'),
      description: Yup.string()
    })
  ),
  customAiPrompt: Yup.string()
});

const ProgramManagementPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [lastInitializedFormId, setLastInitializedFormId] = useState<string | null>(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

  const {
    programs,
    isLoading,
    partners,
    fetchPrograms,
    addProgram,
    updateProgram,
    deleteProgram,
    toggleProgramLock
  } = useProgramStore();

  const { templates, fetchTemplates } = useFormTemplateStore();
  const { users, fetchUsers } = useUserManagementStore();
  const { user: currentUser } = useAuthStore();

  // Filtrer les managers
  const managers = users.filter(user => user.role === 'manager');

  useEffect(() => {
    fetchPrograms();
    fetchTemplates();
    fetchUsers();
  }, [fetchPrograms, fetchTemplates, fetchUsers]);

  const handleCreateProgram = async (values: any) => {
    try {
      console.log('Creating program with values:', values);

      // Convert empty strings to null for optional UUID fields
      const programData = {
        ...values,
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
        budget: 0,
        currency: 'XOF',
        formTemplateId: values.formTemplateId || null,
        managerId: values.managerId || null,
        fieldEligibilityCriteria: values.fieldEligibilityCriteria || [],
        selectionCriteria: values.selectionCriteria || [],
        evaluationCriteria: values.evaluationCriteria || [],
        isActive: true
      };

      console.log('Program data to send:', programData);

      await addProgram(programData);
      setShowCreateModal(false);
      setActiveTab('general');
      setLastInitializedFormId(null);
    } catch (error) {
      console.error('Erreur lors de la création du programme:', error);
      alert('Erreur lors de la création du programme. Vérifiez les logs de la console.');
    }
  };

  const handleUpdateProgram = async (values: any) => {
    if (!editingProgram) return;

    try {
      console.log('🔧 Updating program with values:', values);
      console.log('🔧 Editing program:', editingProgram);

      // Only send the fields that need to be updated, with proper conversion
      const programData = {
        name: values.name,
        description: values.description,
        partnerId: values.partnerId,
        formTemplateId: values.formTemplateId || null,
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
        managerId: values.managerId || null,
        fieldEligibilityCriteria: values.fieldEligibilityCriteria || [],
        selectionCriteria: values.selectionCriteria || [],
        evaluationCriteria: values.evaluationCriteria || [],
        customAiPrompt: values.customAiPrompt || null
      };

      console.log('🔧 Program data to update:', programData);
      console.log('🔧 Field eligibility criteria:', programData.fieldEligibilityCriteria);

      const result = await updateProgram(editingProgram.id, programData);
      console.log('🔧 Update result:', result);

      setEditingProgram(null);
      setShowCreateModal(false);
      setActiveTab('general');
      setLastInitializedFormId(null);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du programme:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      alert('Erreur lors de la mise à jour du programme. Vérifiez les logs de la console.');
    }
  };

  const handleEditProgram = (program: any) => {
    setEditingProgram(program);
    setShowCreateModal(true);
    setActiveTab('general');
    setLastInitializedFormId(null);
  };

  const handleDeleteProgram = async (programId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) {
      try {
        await deleteProgram(programId);
      } catch (error) {
        console.error('Erreur lors de la suppression du programme:', error);
      }
    }
  };

  const handleToggleLock = async (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program || !currentUser) return;

    const action = program.isLocked ? 'déverrouiller' : 'verrouiller';
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} ce programme ?`)) {
      try {
        await toggleProgramLock(programId, currentUser.id);
      } catch (error) {
        console.error('Erreur lors du verrouillage/déverrouillage:', error);
      }
    }
  };

  const findDuplicatePrograms = () => {
    const duplicates: { [key: string]: any[] } = {};

    programs.forEach(program => {
      const key = program.name.toLowerCase().trim();
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(program);
    });

    return Object.values(duplicates).filter(group => group.length > 1);
  };

  const duplicateGroups = findDuplicatePrograms();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des programmes</h1>
          <p className="text-gray-600">Creez et gerez les programmes de financement</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {duplicateGroups.length > 0 && (
            <Button
              variant="warning"
              onClick={() => setShowDuplicatesModal(true)}
              leftIcon={<AlertTriangle className="h-4 w-4" />}
            >
              {duplicateGroups.length} doublons détectés
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingProgram(null);
              setShowCreateModal(true);
              setActiveTab('general');
              setLastInitializedFormId(null);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Nouveau programme
          </Button>
        </div>
      </div>

      {/* Liste des programmes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <Card key={program.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                  {program.isLocked && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Verrouillé
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{program.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={program.isLocked ? "warning" : "outline"}
                size="sm"
                onClick={() => handleToggleLock(program.id)}
                leftIcon={program.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              >
                {program.isLocked ? 'Déverrouiller' : 'Verrouiller'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditProgram(program)}
                leftIcon={<Edit className="h-4 w-4" />}
              >
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteProgram(program.id)}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Supprimer
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span>{partners.find(p => p.id === program.partnerId)?.name || 'Aucun partenaire'}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  {program.startDate ? new Date(program.startDate).toLocaleDateString() : 'Non défini'} - 
                  {program.endDate ? new Date(program.endDate).toLocaleDateString() : 'Non défini'}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Target className="h-4 w-4 mr-2" />
                <span>
                  {(() => {
                    const textCriteria = program.eligibilityCriteria?.split('\n').filter(c => c.trim()).length || 0;
                    const fieldCriteria = program.fieldEligibilityCriteria?.filter(f => f.isEligibilityCriteria).length || 0;
                    const total = textCriteria + fieldCriteria;
                    return `${total} critère${total > 1 ? 's' : ''} d'éligibilité`;
                  })()}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="success">Actif</Badge>
                {program.isLocked && <Badge variant="error">Verrouillé</Badge>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de création/modification */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingProgram ? 'Modifier le programme' : 'Créer un nouveau programme'}
              </h2>
            </div>

            <div className="p-6">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProgram ? 'Modifier le programme' : 'Créer un nouveau programme'}
                </h3>
                
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      type="button"
                      onClick={() => setActiveTab('general')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'general'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Settings className="h-4 w-4 inline mr-2" />
                      Général
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('eligibility')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'eligibility'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4 inline mr-2" />
                      Critères d'éligibilité
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('evaluation')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'evaluation'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <ListChecks className="h-4 w-4 inline mr-2" />
                      Critères d'évaluation
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ai')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'ai'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Bot className="h-4 w-4 inline mr-2" />
                      Prompt IA
                    </button>
                  </nav>
                </div>

                <Formik
                  initialValues={{
                    name: editingProgram?.name || '',
                    description: editingProgram?.description || '',
                    partnerId: editingProgram?.partnerId || '',
                    formTemplateId: editingProgram?.formTemplateId || '',
                    startDate: editingProgram?.startDate ? editingProgram.startDate.toISOString().split('T')[0] : '',
                    endDate: editingProgram?.endDate ? editingProgram.endDate.toISOString().split('T')[0] : '',
                    managerId: editingProgram?.managerId || '',
                    selectionCriteria: editingProgram?.selectionCriteria || [],
                    fieldEligibilityCriteria: editingProgram?.fieldEligibilityCriteria || [],
                    evaluationCriteria: editingProgram?.evaluationCriteria || [],
                    customAiPrompt: editingProgram?.customAiPrompt || '',
                  }}
                  validationSchema={programSchema}
                  onSubmit={editingProgram ? handleUpdateProgram : handleCreateProgram}
                  enableReinitialize
                >
                  {({ values, isSubmitting, setFieldValue }) => {
                    console.log('📋 Current Program Formik values:', values);
                    // Utiliser useEffect pour initialiser les critères d'éligibilité
                    React.useEffect(() => {
                      const selectedTemplate = templates.find(t => t.id === values.formTemplateId);

                      if (selectedTemplate && lastInitializedFormId !== values.formTemplateId) {
                        const initialCriteria = selectedTemplate.fields.map(field => {
                          const existingCriteria = values.fieldEligibilityCriteria?.find(
                            (c: any) => c.fieldId === field.id
                          );

                          return existingCriteria || {
                            fieldId: field.id,
                            fieldName: field.name,
                            fieldLabel: field.label,
                            fieldType: field.type,
                            isEligibilityCriteria: false,
                            conditions: {
                              operator: '==',
                              value: '',
                              value2: '',
                              errorMessage: `Le champ "${field.label}" ne respecte pas les critères d'éligibilité`
                            }
                          };
                        });

                        setFieldValue('fieldEligibilityCriteria', initialCriteria);
                        setLastInitializedFormId(values.formTemplateId);
                      }
                    }, [values.formTemplateId, lastInitializedFormId]);

                    return (
                    <Form className="space-y-6">
                      {/* Tab Content */}
                      {activeTab === 'general' && (
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Nom du programme</label>
                            <Field
                              name="name"
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                            <ErrorMessage name="name" component="div" className="mt-1 text-sm text-error-600" />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <Field
                              as="textarea"
                              name="description"
                              rows={3}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                            <ErrorMessage name="description" component="div" className="mt-1 text-sm text-error-600" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Partenaire</label>
                              <Field
                                as="select"
                                name="partnerId"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              >
                                <option value="">Sélectionnez un partenaire</option>
                                {partners.map(partner => (
                                  <option key={partner.id} value={partner.id}>
                                    {partner.name}
                                  </option>
                                ))}
                              </Field>
                              <ErrorMessage name="partnerId" component="div" className="mt-1 text-sm text-error-600" />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Modèle de formulaire</label>
                              <Field
                                as="select"
                                name="formTemplateId"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              >
                                <option value="">Aucun modèle</option>
                                {templates.map(template => (
                                  <option key={template.id} value={template.id}>
                                    {template.name}
                                  </option>
                                ))}
                              </Field>
                              <ErrorMessage name="formTemplateId" component="div" className="mt-1 text-sm text-error-600" />
                            </div>
                          </div>


                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Date de début</label>
                              <Field
                                name="startDate"
                                type="date"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              />
                              <ErrorMessage name="startDate" component="div" className="mt-1 text-sm text-error-600" />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Date de fin</label>
                              <Field
                                name="endDate"
                                type="date"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              />
                              <ErrorMessage name="endDate" component="div" className="mt-1 text-sm text-error-600" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Manager responsable</label>
                            <Field
                              as="select"
                              name="managerId"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            >
                              <option value="">Aucun manager assigné</option>
                              {managers.map(manager => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.name}
                                </option>
                              ))}
                            </Field>
                            <ErrorMessage name="managerId" component="div" className="mt-1 text-sm text-error-600" />
                          </div>

                          {/* Lien de soumission publique */}
                          {editingProgram && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                Lien de Soumission Publique
                              </h4>
                              <p className="text-sm text-blue-700 mb-3">
                                Partagez ce lien pour permettre aux candidats de soumettre directement leur projet à ce programme. Ils pourront remplir le formulaire et créer un compte après la soumission.
                              </p>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={getPublicSubmissionUrl(editingProgram.id)}
                                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-md text-sm font-mono text-blue-900 select-all"
                                    onClick={(e) => e.currentTarget.select()}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      const link = getPublicSubmissionUrl(editingProgram.id);
                                      navigator.clipboard.writeText(link);
                                      alert('Lien copié dans le presse-papier!');
                                    }}
                                    className="shrink-0"
                                  >
                                    Copier
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      const link = getPublicSubmissionUrl(editingProgram.id);
                                      window.open(link, '_blank');
                                    }}
                                    className="shrink-0"
                                  >
                                    Tester
                                  </Button>
                                </div>
                                <p className="text-xs text-blue-600">
                                  💡 Cliquez sur "Tester" pour ouvrir le formulaire dans un nouvel onglet
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Critères d'éligibilité */}
                      {activeTab === 'eligibility' && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <CheckCircle className="h-5 w-5 text-primary-600 mr-2" />
                            Critères d'éligibilité basés sur le formulaire
                          </h4>
                          <p className="text-sm text-gray-600 mb-6">
                            Configurez les conditions d'éligibilité directement à partir des champs du formulaire associé à ce programme.
                            Sélectionnez d'abord un formulaire dans l'onglet "Général" pour voir les champs disponibles.
                          </p>

                          {!values.formTemplateId ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                              <p className="text-sm text-yellow-800">
                                Veuillez sélectionner un formulaire dans l'onglet "Général" pour configurer les critères d'éligibilité.
                              </p>
                            </div>
                          ) : (() => {
                            const selectedTemplate = templates.find(t => t.id === values.formTemplateId);
                            if (!selectedTemplate) {
                              return (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                  <p className="text-sm text-yellow-800">
                                    Formulaire non trouvé. Veuillez sélectionner un formulaire valide.
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                  <p className="text-sm text-blue-800">
                                    <strong>Formulaire sélectionné :</strong> {selectedTemplate.name}
                                    <br />
                                    <strong>Nombre de champs :</strong> {selectedTemplate.fields.length}
                                  </p>
                                </div>

                                {selectedTemplate.fields.map((field, index) => {
                                  const criteriaIndex = values.fieldEligibilityCriteria?.findIndex(
                                    c => c.fieldId === field.id
                                  ) ?? -1;

                                  const criteria = criteriaIndex >= 0
                                    ? values.fieldEligibilityCriteria[criteriaIndex]
                                    : {
                                        fieldId: field.id,
                                        fieldName: field.name,
                                        fieldLabel: field.label,
                                        fieldType: field.type,
                                        isEligibilityCriteria: false,
                                        conditions: { operator: '==', value: '', value2: '', errorMessage: '' }
                                      };

                                  const isEligibility = criteria.isEligibilityCriteria;

                                  return (
                                    <div
                                      key={field.id}
                                      className={`border rounded-lg p-4 ${isEligibility ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h5 className="text-sm font-medium text-gray-900">{field.label}</h5>
                                            <Badge variant="info" size="sm">{field.type}</Badge>
                                            {field.required && <Badge variant="error" size="sm">Requis</Badge>}
                                          </div>
                                          <p className="text-xs text-gray-500">Nom: {field.name}</p>
                                        </div>
                                        <label className="flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isEligibility}
                                            onChange={(e) => {
                                              const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                              if (criteriaIndex >= 0) {
                                                newCriteria[criteriaIndex] = {
                                                  ...newCriteria[criteriaIndex],
                                                  isEligibilityCriteria: e.target.checked
                                                };
                                              } else {
                                                newCriteria.push({
                                                  fieldId: field.id,
                                                  fieldName: field.name,
                                                  fieldLabel: field.label,
                                                  fieldType: field.type,
                                                  isEligibilityCriteria: e.target.checked,
                                                  conditions: {
                                                    operator: '==',
                                                    value: '',
                                                    value2: '',
                                                    errorMessage: `Le champ "${field.label}" ne respecte pas les critères d'éligibilité`
                                                  }
                                                });
                                              }
                                              setFieldValue('fieldEligibilityCriteria', newCriteria);
                                            }}
                                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                          />
                                          <span className="ml-2 text-sm font-medium text-gray-700">
                                            Critère d'éligibilité
                                          </span>
                                        </label>
                                      </div>

                                      {isEligibility && (
                                        <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary-300">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Opérateur de condition
                                              </label>
                                              <select
                                                value={criteria.conditions?.operator || '=='}
                                                onChange={(e) => {
                                                  const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                  if (criteriaIndex >= 0) {
                                                    newCriteria[criteriaIndex].conditions.operator = e.target.value;
                                                    setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                  }
                                                }}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                              >
                                                {['number', 'date', 'currency'].includes(field.type) && (
                                                  <>
                                                    <option value="==">Égal à (==)</option>
                                                    <option value="!=">Différent de (!=)</option>
                                                    <option value=">">Supérieur à (&gt;)</option>
                                                    <option value="<">Inférieur à (&lt;)</option>
                                                    <option value=">=">Supérieur ou égal (≥)</option>
                                                    <option value="<=">Inférieur ou égal (≤)</option>
                                                    <option value="between">Entre (between)</option>
                                                  </>
                                                )}
                                                {['text', 'textarea'].includes(field.type) && (
                                                  <>
                                                    <option value="==">Égal à (==)</option>
                                                    <option value="!=">Différent de (!=)</option>
                                                    <option value="contains">Contient</option>
                                                    <option value="not_contains">Ne contient pas</option>
                                                  </>
                                                )}
                                                {['select', 'radio', 'multiple_select'].includes(field.type) && (
                                                  <>
                                                    <option value="==">Égal à (==)</option>
                                                    <option value="!=">Différent de (!=)</option>
                                                    <option value="in">Dans la liste (in)</option>
                                                    <option value="not_in">Pas dans la liste</option>
                                                  </>
                                                )}
                                                {field.type === 'checkbox' && (
                                                  <>
                                                    <option value="==">Égal à (==)</option>
                                                    <option value="checked">Coché</option>
                                                    <option value="unchecked">Non coché</option>
                                                  </>
                                                )}
                                              </select>
                                            </div>

                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                {['in', 'not_in'].includes(criteria.conditions?.operator || '')
                                                  ? 'Valeurs éligibles (plusieurs possibles)'
                                                  : 'Valeur attendue'}
                                              </label>
                                              {(field.type === 'select' || field.type === 'radio' || field.type === 'multiple_select') && ['in', 'not_in'].includes(criteria.conditions?.operator || '') ? (
                                                <div className="space-y-2">
                                                  {field.options?.map(opt => {
                                                    const selectedValues = criteria.conditions?.value
                                                      ? (typeof criteria.conditions.value === 'string'
                                                          ? criteria.conditions.value.split(',')
                                                          : [criteria.conditions.value])
                                                      : [];
                                                    const isSelected = selectedValues.includes(opt);

                                                    return (
                                                      <label key={opt} className="flex items-center">
                                                        <input
                                                          type="checkbox"
                                                          checked={isSelected}
                                                          onChange={(e) => {
                                                            const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                            if (criteriaIndex >= 0) {
                                                              let updatedValues = [...selectedValues];
                                                              if (e.target.checked) {
                                                                updatedValues.push(opt);
                                                              } else {
                                                                updatedValues = updatedValues.filter(v => v !== opt);
                                                              }
                                                              newCriteria[criteriaIndex].conditions.value = updatedValues.join(',');
                                                              setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                            }
                                                          }}
                                                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{opt}</span>
                                                      </label>
                                                    );
                                                  })}
                                                  {(!field.options || field.options.length === 0) && (
                                                    <p className="text-xs text-gray-500 italic">Aucune option définie pour ce champ</p>
                                                  )}
                                                </div>
                                              ) : field.type === 'select' || field.type === 'radio' ? (
                                                <select
                                                  value={criteria.conditions?.value || ''}
                                                  onChange={(e) => {
                                                    const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                    if (criteriaIndex >= 0) {
                                                      newCriteria[criteriaIndex].conditions.value = e.target.value;
                                                      setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                    }
                                                  }}
                                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                                >
                                                  <option value="">Sélectionner...</option>
                                                  {field.options?.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                  ))}
                                                </select>
                                              ) : field.type === 'checkbox' ? (
                                                <select
                                                  value={criteria.conditions?.value || 'true'}
                                                  onChange={(e) => {
                                                    const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                    if (criteriaIndex >= 0) {
                                                      newCriteria[criteriaIndex].conditions.value = e.target.value;
                                                      setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                    }
                                                  }}
                                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                                >
                                                  <option value="true">Oui (coché)</option>
                                                  <option value="false">Non (décoché)</option>
                                                </select>
                                              ) : field.type === 'currency' ? (
                                                <div className="relative">
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={criteria.conditions?.value || ''}
                                                    onChange={(e) => {
                                                      const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                      if (criteriaIndex >= 0) {
                                                        newCriteria[criteriaIndex].conditions.value = e.target.value;
                                                        setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                      }
                                                    }}
                                                    className="block w-full pl-12 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                                    placeholder="0.00"
                                                  />
                                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 text-xs">
                                                      {field.currencyCode === 'EUR' ? '€' :
                                                       field.currencyCode === 'USD' ? '$' :
                                                       field.currencyCode === 'GBP' ? '£' :
                                                       field.currencyCode === 'CHF' ? 'CHF' :
                                                       field.currencyCode === 'CAD' ? 'C$' :
                                                       field.currencyCode === 'JPY' ? '¥' :
                                                       field.currencyCode === 'CNY' ? '¥' :
                                                       'FCFA'}
                                                    </span>
                                                  </div>
                                                </div>
                                              ) : (
                                                <input
                                                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                  value={criteria.conditions?.value || ''}
                                                  onChange={(e) => {
                                                    const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                    if (criteriaIndex >= 0) {
                                                      newCriteria[criteriaIndex].conditions.value = e.target.value;
                                                      setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                    }
                                                  }}
                                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                                  placeholder="Valeur"
                                                />
                                              )}
                                            </div>
                                          </div>

                                          {criteria.conditions?.operator === 'between' && (
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Valeur maximum (pour "entre")
                                              </label>
                                              {field.type === 'currency' ? (
                                                <div className="relative">
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={criteria.conditions?.value2 || ''}
                                                    onChange={(e) => {
                                                      const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                      if (criteriaIndex >= 0) {
                                                        newCriteria[criteriaIndex].conditions.value2 = e.target.value;
                                                        setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                      }
                                                    }}
                                                    className="block w-full pl-12 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                                    placeholder="0.00"
                                                  />
                                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 text-xs">
                                                      {field.currencyCode === 'EUR' ? '€' :
                                                       field.currencyCode === 'USD' ? '$' :
                                                       field.currencyCode === 'GBP' ? '£' :
                                                       field.currencyCode === 'CHF' ? 'CHF' :
                                                       field.currencyCode === 'CAD' ? 'C$' :
                                                       field.currencyCode === 'JPY' ? '¥' :
                                                       field.currencyCode === 'CNY' ? '¥' :
                                                       'FCFA'}
                                                    </span>
                                                  </div>
                                                </div>
                                              ) : (
                                                <input
                                                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                  value={criteria.conditions?.value2 || ''}
                                                  onChange={(e) => {
                                                    const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                    if (criteriaIndex >= 0) {
                                                      newCriteria[criteriaIndex].conditions.value2 = e.target.value;
                                                      setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                    }
                                                  }}
                                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                                  placeholder="Valeur maximum"
                                                />
                                              )}
                                            </div>
                                          )}

                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Message d'erreur personnalisé
                                            </label>
                                            <textarea
                                              value={criteria.conditions?.errorMessage || ''}
                                              onChange={(e) => {
                                                const newCriteria = [...(values.fieldEligibilityCriteria || [])];
                                                if (criteriaIndex >= 0) {
                                                  newCriteria[criteriaIndex].conditions.errorMessage = e.target.value;
                                                  setFieldValue('fieldEligibilityCriteria', newCriteria);
                                                }
                                              }}
                                              rows={2}
                                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                              placeholder="Message affiché lorsque la condition n'est pas respectée"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Critères d'évaluation */}
                      {activeTab === 'evaluation' && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <ListChecks className="h-5 w-5 text-secondary-600 mr-2" />
                            Critères d'évaluation
                          </h4>
                          <p className="text-sm text-gray-600 mb-6">
                            Définissez les critères et leur pondération pour l'évaluation des projets éligibles.
                          </p>
                          <FieldArray name="evaluationCriteria">
                            {({ push, remove }) => (
                              <div className="space-y-4">
                                {values.evaluationCriteria.map((criterion, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center">
                                        <GripVertical className="h-5 w-5 text-gray-400 mr-2" />
                                        <span className="text-sm font-medium text-gray-900">Critère #{index + 1}</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => remove(index)}
                                        leftIcon={<Trash2 className="h-4 w-4" />}
                                      >
                                        Supprimer
                                      </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700">Nom du critère*</label>
                                        <Field
                                          name={`evaluationCriteria.${index}.name`}
                                          type="text"
                                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700">Poids (%)*</label>
                                        <Field
                                          name={`evaluationCriteria.${index}.weight`}
                                          type="number"
                                          min="0"
                                          max="100"
                                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700">Score max*</label>
                                        <Field
                                          name={`evaluationCriteria.${index}.maxScore`}
                                          type="number"
                                          min="1"
                                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="mt-4">
                                      <label className="block text-sm font-medium text-gray-700">Description</label>
                                      <Field
                                        as="textarea"
                                        name={`evaluationCriteria.${index}.description`}
                                        rows={2}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                      />
                                    </div>
                                  </div>
                                ))}
                                
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => push({
                                    id: `eval-${Date.now()}`,
                                    name: '',
                                    description: '',
                                    weight: 0,
                                    maxScore: 20
                                  })}
                                  leftIcon={<Plus className="h-4 w-4" />}
                                >
                                  Ajouter un critère
                                </Button>
                              </div>
                            )}
                          </FieldArray>
                        </div>
                      )}

                      {/* Prompt IA personnalisé */}
                      {activeTab === 'ai' && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <Bot className="h-5 w-5 text-accent-600 mr-2" />
                            Configuration du prompt IA
                          </h4>
                          <p className="text-sm text-gray-600 mb-6">
                            Personnalisez les instructions pour l'évaluation automatique des projets par l'intelligence artificielle.
                          </p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h5 className="text-sm font-medium text-blue-900 mb-2">Variables disponibles :</h5>
                            <div className="text-xs text-blue-700 space-y-1">
                              <div><code className="bg-blue-100 px-1 rounded">{'{{program_name}}'}</code> - Nom du programme</div>
                              <div><code className="bg-blue-100 px-1 rounded">{'{{program_description}}'}</code> - Description du programme</div>
                              <div><code className="bg-blue-100 px-1 rounded">{'{{partner_name}}'}</code> - Nom du partenaire</div>
                              <div><code className="bg-blue-100 px-1 rounded">{'{{budget_range}}'}</code> - Budget du programme</div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions personnalisées</label>
                            <Field
                              as="textarea"
                              name="customAiPrompt"
                              rows={8}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              placeholder="Exemple : Évaluez ce projet en tenant compte de son potentiel d'innovation dans le secteur {{partner_name}}. Le programme {{program_name}} privilégie les projets ayant un impact social fort et une faisabilité technique démontrée..."
                            />
                            <p className="mt-2 text-xs text-gray-500">
                              Ces instructions seront utilisées par l'IA pour évaluer automatiquement les projets soumis à ce programme. 
                              Soyez spécifique sur les aspects à privilégier selon les objectifs du programme.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingProgram(null);
                            setShowCreateModal(false);
                            setActiveTab('general');
                            setLastInitializedFormId(null);
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
                          {editingProgram ? 'Mettre à jour' : 'Créer le programme'}
                        </Button>
                      </div>
                    </Form>
                    );
                  }}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal des doublons */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Programmes en double détectés</h2>
                  <p className="text-gray-600 mt-1">
                    {duplicateGroups.length} groupe(s) de programmes avec des noms similaires ont été trouvés
                  </p>
                </div>
                <button
                  onClick={() => setShowDuplicatesModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fermer</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {duplicateGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Copy className="h-5 w-5 text-amber-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Groupe {groupIndex + 1}: "{group[0].name}" ({group.length} occurrences)
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {group.map((program) => {
                      const partner = partners.find(p => p.id === program.partnerId);
                      const manager = managers.find(m => m.id === program.managerId);

                      return (
                        <div key={program.id} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{program.name}</h4>
                                {program.isLocked && (
                                  <Badge variant="warning" className="flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    Verrouillé
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{program.description}</p>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Partenaire:</span>{' '}
                                  <span className="font-medium">{partner?.name || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Budget:</span>{' '}
                                  <span className="font-medium">
                                    {formatCurrency(program.budget, program.currency || 'XOF')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Gestionnaire:</span>{' '}
                                  <span className="font-medium">{manager?.name || 'Non assigné'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Période:</span>{' '}
                                  <span className="font-medium">
                                    {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Créé le:</span>{' '}
                                  <span className="font-medium">
                                    {new Date(program.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">ID:</span>{' '}
                                  <span className="font-mono text-xs">{program.id.substring(0, 8)}...</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowDuplicatesModal(false);
                                  handleEditProgram(program);
                                }}
                                leftIcon={<Edit className="h-3 w-3" />}
                              >
                                Modifier
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${program.name}" ?`)) {
                                    handleDeleteProgram(program.id);
                                  }
                                }}
                                leftIcon={<Trash2 className="h-3 w-3" />}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Conseil:</strong> Comparez les dates de création, les budgets et les partenaires pour identifier
                      les vrais doublons. Conservez le plus récent ou celui avec le plus d'informations.
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Total: {duplicateGroups.reduce((sum, group) => sum + group.length, 0)} programmes dans {duplicateGroups.length} groupe(s)
                </p>
                <Button variant="outline" onClick={() => setShowDuplicatesModal(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramManagementPage;