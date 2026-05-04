import React, { memo } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Button from '../ui/Button';
import { X, FileText } from 'lucide-react';

interface DocumentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  projectId: string;
}

const documentTypes = [
  { value: 'legal', label: 'Document légal' },
  { value: 'financial', label: 'Document financier' },
  { value: 'technical', label: 'Document technique' },
  { value: 'administrative', label: 'Document administratif' },
  { value: 'other', label: 'Autre' }
];

const validationSchema = Yup.object().shape({
  document_name: Yup.string()
    .required('Nom du document requis')
    .min(3, 'Minimum 3 caractères'),
  document_type: Yup.string()
    .required('Type de document requis'),
  description: Yup.string()
    .required('Description requise')
    .min(10, 'Minimum 10 caractères'),
  due_date: Yup.date()
    .nullable()
    .min(new Date(), 'La date doit être dans le futur')
});

const DocumentRequestModal: React.FC<DocumentRequestModalProps> = memo(({
  isOpen,
  onClose,
  onSubmit,
  projectId
}) => {
  if (!isOpen) return null;

  const initialValues = {
    project_id: projectId,
    document_name: '',
    document_type: 'other',
    description: '',
    due_date: '',
    notes: ''
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Nouvelle demande de document</h2>
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
              console.error('Error submitting document request:', error);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du document *
                </label>
                <Field
                  type="text"
                  name="document_name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Statuts de l'entreprise"
                />
                <ErrorMessage
                  name="document_name"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de document *
                </label>
                <Field
                  as="select"
                  name="document_type"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Field>
                <ErrorMessage
                  name="document_type"
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
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez le document demandé et son utilité..."
                />
                <ErrorMessage
                  name="description"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date limite de soumission
                </label>
                <Field
                  type="date"
                  name="due_date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <ErrorMessage
                  name="due_date"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes additionnelles
                </label>
                <Field
                  as="textarea"
                  name="notes"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Informations supplémentaires..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Création...' : 'Créer la demande'}
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
});

DocumentRequestModal.displayName = 'DocumentRequestModal';

export default DocumentRequestModal;
