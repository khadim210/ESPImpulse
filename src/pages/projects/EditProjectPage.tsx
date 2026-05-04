import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { useProgramStore } from '../../stores/programStore';
import { useFormTemplateStore } from '../../stores/formTemplateStore';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, Trash2, ArrowLeft, Upload, X, FileText } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency';
import { uploadFile, formatFileSize, UploadedFile } from '../../utils/fileUpload';
import CurrencyInput from '../../components/ui/CurrencyInput';

const projectSchema = Yup.object().shape({
  title: Yup.string()
    .required('Titre requis')
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: Yup.string()
    .required('Description requise')
    .min(20, 'La description doit contenir au moins 20 caractères'),
  hasBudget: Yup.boolean(),
  budget: Yup.number()
    .when('hasBudget', {
      is: true,
      then: () => Yup.number().required('Budget requis').positive('Le budget doit être positif'),
      otherwise: () => Yup.number().notRequired(),
    }),
  timeline: Yup.string()
    .required('Durée requise'),
  programId: Yup.string()
    .required('Programme requis'),
  tags: Yup.array()
    .of(Yup.string().required('Tag requis'))
    .min(1, 'Au moins un tag est requis'),
});

interface ProjectFormValues {
  title: string;
  description: string;
  hasBudget: boolean;
  budget: number;
  timeline: string;
  programId: string;
  tags: string[];
  formData: Record<string, any>;
}

const EditProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { getProject, updateProject } = useProjectStore();
  const { programs, partners, fetchPrograms, fetchPartners } = useProgramStore();
  const { templates, fetchTemplates } = useFormTemplateStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState(id ? getProject(id) : undefined);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});

  useEffect(() => {
    fetchPrograms();
    fetchPartners();
    fetchTemplates();

    if (id) {
      const projectData = getProject(id);
      setProject(projectData);

      if (!projectData) {
        navigate('/dashboard/projects');
      } else if (projectData.status !== 'draft') {
        setError('Seuls les projets en brouillon peuvent être modifiés');
      } else if (user?.id !== projectData.submitterId && user?.role !== 'admin') {
        setError('Vous n\'êtes pas autorisé à modifier ce projet');
      }

      // Initialize uploaded files from formData
      if (projectData?.formData) {
        const files: Record<string, UploadedFile[]> = {};
        Object.entries(projectData.formData).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0 && value[0]?.path) {
            files[key] = value as UploadedFile[];
          }
        });
        setUploadedFiles(files);
      }
    }
  }, [id, getProject, navigate, fetchPrograms, fetchPartners, fetchTemplates, user]);

  const getAccessiblePrograms = () => {
    if (!user) return [];

    if (user.role === 'admin') {
      return programs;
    } else if (user.role === 'manager') {
      const managerPartners = partners.filter(p => p.assignedManagerId === user.id);
      const partnerIds = managerPartners.map(p => p.id);
      return programs.filter(p => partnerIds.includes(p.partnerId));
    } else if (user.role === 'partner') {
      const userPartner = partners.find(p => p.contactEmail === user.email);
      return userPartner ? programs.filter(p => p.partnerId === userPartner.id) : [];
    }

    return programs;
  };

  const accessiblePrograms = getAccessiblePrograms();

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Chargement du projet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 p-4 bg-error-100 text-error-700 rounded-md">
          {error}
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard/projects')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Retour aux projets
        </Button>
      </div>
    );
  }

  const handleFileUpload = async (fieldName: string, file: File) => {
    if (!id) return;
    setUploadingFiles(prev => ({ ...prev, [fieldName]: true }));
    try {
      const uploadedFile = await uploadFile(id, file);
      setUploadedFiles(prev => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), uploadedFile]
      }));
      return uploadedFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Erreur lors de l'upload du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      throw error;
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleFileRemove = (fieldName: string, fileIndex: number) => {
    setUploadedFiles(prev => ({
      ...prev,
      [fieldName]: prev[fieldName]?.filter((_, idx) => idx !== fileIndex) || []
    }));
  };

  const initialValues: ProjectFormValues = {
    title: project.title,
    description: project.description,
    hasBudget: project.budget > 0,
    budget: project.budget,
    timeline: project.timeline,
    programId: project.programId,
    tags: project.tags.length > 0 ? project.tags : [''],
    formData: project.formData || {},
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    if (!id) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Include uploaded files in formData
      const formDataWithFiles = {
        ...values.formData,
        ...Object.entries(uploadedFiles).reduce((acc, [fieldName, files]) => {
          acc[fieldName] = files;
          return acc;
        }, {} as Record<string, any>)
      };

      const updatedProject = await updateProject(id, {
        title: values.title,
        description: values.description,
        budget: values.hasBudget ? values.budget : 0,
        timeline: values.timeline,
        programId: values.programId,
        tags: values.tags.filter(tag => tag.trim() !== ''),
        formData: formDataWithFiles,
      });

      if (updatedProject) {
        navigate(`/dashboard/projects/${id}`);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Une erreur est survenue lors de la modification du projet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
          onClick={() => navigate(`/dashboard/projects/${id}`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour au projet
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le projet</h1>
        <p className="mt-1 text-gray-600">
          Modifiez les informations de votre projet. N'oubliez pas de sauvegarder vos modifications.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-100 text-error-700 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations du projet</CardTitle>
        </CardHeader>

        <Formik
          initialValues={initialValues}
          validationSchema={projectSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, isValid }) => {
            const selectedProgram = accessiblePrograms.find(p => p.id === values.programId);
            const currencySymbol = selectedProgram ? getCurrencySymbol(selectedProgram.currency) : 'FCFA';

            return (
            <Form>
              <CardContent className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Titre du projet*
                  </label>
                  <div className="mt-1">
                    <Field
                      id="title"
                      name="title"
                      type="text"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Entrez le titre de votre projet"
                    />
                    <ErrorMessage name="title" component="div" className="mt-1 text-sm text-error-600" />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description du projet*
                  </label>
                  <div className="mt-1">
                    <Field
                      as="textarea"
                      id="description"
                      name="description"
                      rows={5}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Détaillez votre projet, ses objectifs, et son impact potentiel"
                    />
                    <ErrorMessage name="description" component="div" className="mt-1 text-sm text-error-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                      Budget estimé*
                    </label>
                    <div className="mt-1">
                      <Field name="budget">
                        {({ field, form }: any) => (
                          <CurrencyInput
                            id="budget"
                            name="budget"
                            value={field.value}
                            onChange={(val) => form.setFieldValue('budget', val)}
                            currencySymbol={currencySymbol}
                            placeholder="0"
                          />
                        )}
                      </Field>
                      <ErrorMessage name="budget" component="div" className="mt-1 text-sm text-error-600" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {values.hasBudget && (
                    <div>
                      <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                        Budget estimé ({currencySymbol})*
                      </label>
                      <div className="mt-1">
                        <Field
                          id="budget"
                          name="budget"
                          type="number"
                          min="0"
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                        <ErrorMessage name="budget" component="div" className="mt-1 text-sm text-error-600" />
                      </div>
                    </div>
                  )}

                  <div className={values.hasBudget ? '' : 'md:col-span-2'}>
                    <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">
                      Durée du projet*
                    </label>
                    <div className="mt-1">
                      <Field
                        id="timeline"
                        name="timeline"
                        type="text"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="ex: 12 mois, 2 ans..."
                      />
                      <ErrorMessage name="timeline" component="div" className="mt-1 text-sm text-error-600" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="programId" className="block text-sm font-medium text-gray-700">
                    Programme*
                  </label>
                  <div className="mt-1">
                    <Field
                      as="select"
                      id="programId"
                      name="programId"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Sélectionnez un programme</option>
                      {accessiblePrograms.map(program => {
                        const partner = partners.find(p => p.id === program.partnerId);
                        return (
                          <option key={program.id} value={program.id}>
                            {program.name} {partner && `(${partner.name})`}
                          </option>
                        );
                      })}
                    </Field>
                    <ErrorMessage name="programId" component="div" className="mt-1 text-sm text-error-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags*
                  </label>
                  <FieldArray name="tags">
                    {({ push, remove }) => (
                      <div className="space-y-2">
                        {values.tags.map((tag, index) => (
                          <div key={index} className="flex items-center">
                            <Field
                              name={`tags.${index}`}
                              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                              placeholder="Ajoutez un mot-clé"
                            />
                            {index > 0 && (
                              <button
                                type="button"
                                className="ml-2 p-2 text-gray-400 hover:text-error-500"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<Plus className="h-4 w-4" />}
                          onClick={() => push('')}
                        >
                          Ajouter un tag
                        </Button>
                        {errors.tags && touched.tags && (
                          <div className="mt-1 text-sm text-error-600">
                            {typeof errors.tags === 'string' ? errors.tags : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </FieldArray>
                </div>

                {/* Formulaire du programme */}
                {selectedProgram && selectedProgram.formTemplateId && (() => {
                  const programTemplate = templates.find(t => t.id === selectedProgram.formTemplateId);

                  if (!programTemplate || !programTemplate.fields || programTemplate.fields.length === 0) {
                    return null;
                  }

                  return (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Formulaire du programme: {programTemplate.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        {programTemplate.description || 'Veuillez remplir les champs suivants pour compléter votre soumission.'}
                      </p>

                      <div className="space-y-6">
                        {programTemplate.fields.map((field: any) => (
                          <div key={field.id}>
                            <label htmlFor={`formData.${field.name}`} className="block text-sm font-medium text-gray-700">
                              {field.label}
                              {field.required && <span className="text-error-600 ml-1">*</span>}
                            </label>
                            {field.description && (
                              <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                            )}
                            <div className="mt-1">
                              {field.type === 'text' && (
                                <Field
                                  id={`formData.${field.name}`}
                                  name={`formData.${field.name}`}
                                  type="text"
                                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                  placeholder={field.placeholder}
                                />
                              )}
                              {field.type === 'textarea' && (
                                <Field
                                  as="textarea"
                                  id={`formData.${field.name}`}
                                  name={`formData.${field.name}`}
                                  rows={4}
                                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                  placeholder={field.placeholder}
                                />
                              )}
                              {field.type === 'number' && (
                                <Field
                                  id={`formData.${field.name}`}
                                  name={`formData.${field.name}`}
                                  type="number"
                                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                  placeholder={field.placeholder}
                                />
                              )}
                              {field.type === 'currency' && (
                                <Field name={`formData.${field.name}`}>
                                  {({ field: formikField, form }: any) => (
                                    <CurrencyInput
                                      id={`formData.${field.name}`}
                                      name={`formData.${field.name}`}
                                      value={formikField.value || 0}
                                      onChange={(val) => form.setFieldValue(`formData.${field.name}`, val)}
                                      currencySymbol={
                                        field.currencyCode === 'EUR' ? '€' :
                                        field.currencyCode === 'USD' ? '$' :
                                        field.currencyCode === 'GBP' ? '£' :
                                        field.currencyCode === 'CHF' ? 'CHF' :
                                        field.currencyCode === 'CAD' ? 'C$' :
                                        field.currencyCode === 'JPY' ? '¥' :
                                        field.currencyCode === 'CNY' ? '¥' :
                                        'FCFA'
                                      }
                                      placeholder={field.placeholder || "0"}
                                    />
                                  )}
                                </Field>
                              )}
                              {field.type === 'email' && (
                                <Field
                                  id={`formData.${field.name}`}
                                  name={`formData.${field.name}`}
                                  type="email"
                                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                  placeholder={field.placeholder}
                                />
                              )}
                              {field.type === 'date' && (
                                <Field
                                  id={`formData.${field.name}`}
                                  name={`formData.${field.name}`}
                                  type="date"
                                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                />
                              )}
                              {field.type === 'select' && (
                                <Field
                                  as="select"
                                  id={`formData.${field.name}`}
                                  name={`formData.${field.name}`}
                                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                >
                                  <option value="">Sélectionnez une option</option>
                                  {field.options?.map((option: any, idx: number) => (
                                    <option key={idx} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </Field>
                              )}
                              {field.type === 'checkbox' && (
                                <div className="flex items-center">
                                  <Field
                                    id={`formData.${field.name}`}
                                    name={`formData.${field.name}`}
                                    type="checkbox"
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                  />
                                  <label htmlFor={`formData.${field.name}`} className="ml-2 block text-sm text-gray-700">
                                    {field.description}
                                  </label>
                                </div>
                              )}
                              {field.type === 'radio' && (
                                <div className="space-y-2">
                                  {field.options?.map((option: any, idx: number) => (
                                    <div key={idx} className="flex items-center">
                                      <Field
                                        id={`formData.${field.name}.${idx}`}
                                        name={`formData.${field.name}`}
                                        type="radio"
                                        value={option.value}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                      />
                                      <label htmlFor={`formData.${field.name}.${idx}`} className="ml-2 block text-sm text-gray-700">
                                        {option.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {field.type === 'multiple_select' && (
                                <Field
                                  as="select"
                                  id={`formData.${field.name}`}
                                  name={`formData.${field.name}`}
                                  multiple
                                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                  size={Math.min(field.options?.length || 3, 5)}
                                >
                                  {field.options?.map((option: any, idx: number) => (
                                    <option key={idx} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </Field>
                              )}
                              {field.type === 'file' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-center w-full">
                                    <label
                                      htmlFor={`file-upload-${field.name}`}
                                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                                    >
                                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-500">
                                          <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max. 50MB)
                                        </p>
                                      </div>
                                      <input
                                        id={`file-upload-${field.name}`}
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                                        multiple={field.multiple}
                                        onChange={async (e) => {
                                          const files = Array.from(e.target.files || []);
                                          for (const file of files) {
                                            try {
                                              await handleFileUpload(field.name, file);
                                            } catch (error) {
                                              console.error('Upload failed:', error);
                                            }
                                          }
                                          e.target.value = '';
                                        }}
                                        disabled={uploadingFiles[field.name]}
                                      />
                                    </label>
                                  </div>
                                  {uploadingFiles[field.name] && (
                                    <div className="text-sm text-gray-500 text-center">
                                      Téléchargement en cours...
                                    </div>
                                  )}
                                  {uploadedFiles[field.name] && uploadedFiles[field.name].length > 0 && (
                                    <div className="space-y-2">
                                      {uploadedFiles[field.name].map((file, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <FileText className="h-5 w-5 text-gray-400" />
                                            <div>
                                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleFileRemove(field.name, idx)}
                                            className="text-gray-400 hover:text-error-500"
                                          >
                                            <X className="h-5 w-5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>

              <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/projects/${id}`)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!isValid}
                >
                  Sauvegarder les modifications
                </Button>
              </CardFooter>
            </Form>
            );
          }}
        </Formik>
      </Card>
    </div>
  );
};

export default EditProjectPage;
