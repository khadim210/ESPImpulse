import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Button from '../ui/Button';
import { X, GraduationCap } from 'lucide-react';

interface TechnicalSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  projectId: string;
  support?: any;
}

const supportTypes = [
  { value: 'formation', label: 'Formation' },
  { value: 'conseil', label: 'Conseil' },
  { value: 'mentoring', label: 'Mentoring' },
  { value: 'autre', label: 'Autre' }
];

const supportStatuses = [
  { value: 'planned', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' }
];

const validationSchema = Yup.object().shape({
  title: Yup.string()
    .required('Titre requis')
    .min(3, 'Minimum 3 caractères'),
  support_type: Yup.string()
    .required('Type requis'),
  description: Yup.string()
    .required('Description requise'),
  scheduled_date: Yup.date()
    .nullable(),
  duration_hours: Yup.number()
    .min(0, 'Durée minimum 0')
    .max(1000, 'Durée maximum 1000 heures'),
  provider: Yup.string(),
  status: Yup.string()
    .required('Statut requis')
});

const TechnicalSupportModal: React.FC<TechnicalSupportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  support
}) => {
  if (!isOpen) return null;

  const initialValues = {
    project_id: projectId,
    support_type: support?.support_type || 'formation',
    title: support?.title || '',
    description: support?.description || '',
    scheduled_date: support?.scheduled_date ? new Date(support.scheduled_date).toISOString().split('T')[0] : '',
    duration_hours: support?.duration_hours || 0,
    provider: support?.provider || '',
    participants: support?.participants || '',
    status: support?.status || 'planned',
    completion_notes: support?.completion_notes || ''
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold">
              {support ? 'Modifier' : 'Nouvel'} accompagnement technique
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              await onSubmit(values);
              onClose();
            } catch (error) {
              console.error('Error submitting technical support:', error);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'accompagnement *
                  </label>
                  <Field
                    as="select"
                    name="support_type"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {supportTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage
                    name="support_type"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut *
                  </label>
                  <Field
                    as="select"
                    name="status"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {supportStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage
                    name="status"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <Field
                  type="text"
                  name="title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Formation en gestion financière"
                />
                <ErrorMessage
                  name="title"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <Field
                  as="textarea"
                  name="description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Décrivez l'accompagnement..."
                />
                <ErrorMessage
                  name="description"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date prévue
                  </label>
                  <Field
                    type="date"
                    name="scheduled_date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <ErrorMessage
                    name="scheduled_date"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée (heures)
                  </label>
                  <Field
                    type="number"
                    name="duration_hours"
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <ErrorMessage
                    name="duration_hours"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prestataire
                </label>
                <Field
                  type="text"
                  name="provider"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nom du formateur ou organisme"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participants
                </label>
                <Field
                  type="text"
                  name="participants"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Noms ou nombre de participants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes de réalisation
                </label>
                <Field
                  as="textarea"
                  name="completion_notes"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Résultats, remarques, retours d'expérience..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Enregistrement...' : support ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default TechnicalSupportModal;
