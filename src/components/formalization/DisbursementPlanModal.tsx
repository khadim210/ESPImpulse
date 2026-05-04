import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import Button from '../ui/Button';
import CurrencyInput from '../ui/CurrencyInput';
import { X, DollarSign, Plus, Trash2 } from 'lucide-react';

interface DisbursementPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  projectId: string;
  projectBudget: number;
  existingPlan?: any;
}

const trancheStatuses = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En traitement' },
  { value: 'disbursed', label: 'Décaissé' },
  { value: 'cancelled', label: 'Annulé' }
];

const validationSchema = Yup.object().shape({
  total_amount: Yup.number()
    .required('Montant total requis')
    .min(1, 'Montant doit être positif'),
  currency: Yup.string()
    .required('Devise requise'),
  tranches: Yup.array()
    .of(
      Yup.object().shape({
        amount: Yup.number()
          .required('Montant requis')
          .min(1, 'Montant doit être positif'),
        percentage: Yup.number()
          .min(0, 'Minimum 0%')
          .max(100, 'Maximum 100%'),
        scheduled_date: Yup.date()
          .nullable(),
        conditions: Yup.string()
      })
    )
    .min(1, 'Au moins une tranche requise')
});

const DisbursementPlanModal: React.FC<DisbursementPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  projectBudget,
  existingPlan
}) => {
  if (!isOpen) return null;

  const initialValues = {
    project_id: projectId,
    total_amount: existingPlan?.total_amount || projectBudget,
    currency: existingPlan?.currency || 'FCFA',
    tranches: existingPlan?.tranches || [
      {
        tranche_number: 1,
        amount: projectBudget * 0.3,
        percentage: 30,
        scheduled_date: '',
        conditions: 'Signature du contrat',
        status: 'pending'
      },
      {
        tranche_number: 2,
        amount: projectBudget * 0.7,
        percentage: 70,
        scheduled_date: '',
        conditions: 'Réalisation des objectifs',
        status: 'pending'
      }
    ]
  };

  const calculatePercentage = (amount: number, total: number) => {
    return total > 0 ? ((amount / total) * 100).toFixed(2) : 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold">Plan de décaissement</h2>
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
              console.error('Error submitting disbursement plan:', error);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant total *
                  </label>
                  <Field name="total_amount">
                    {({ field, form }: any) => (
                      <CurrencyInput
                        id="total_amount"
                        name="total_amount"
                        value={field.value}
                        onChange={(val) => form.setFieldValue('total_amount', val)}
                        currencySymbol={form.values.currency || 'FCFA'}
                        placeholder="0"
                      />
                    )}
                  </Field>
                  <ErrorMessage
                    name="total_amount"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise *
                  </label>
                  <Field
                    type="text"
                    name="currency"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <ErrorMessage
                    name="currency"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Tranches de décaissement</h3>
                </div>

                <FieldArray name="tranches">
                  {({ push, remove }) => (
                    <div className="space-y-4">
                      {values.tranches.map((tranche, index) => {
                        const percentage = calculatePercentage(tranche.amount, values.total_amount);

                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium">Tranche {index + 1}</h4>
                              {values.tranches.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Montant *
                                </label>
                                <Field name={`tranches.${index}.amount`}>
                                  {({ field, form }: any) => (
                                    <CurrencyInput
                                      id={`tranches.${index}.amount`}
                                      name={`tranches.${index}.amount`}
                                      value={field.value}
                                      onChange={(val) => {
                                        form.setFieldValue(`tranches.${index}.amount`, val);
                                        form.setFieldValue(`tranches.${index}.percentage`, calculatePercentage(val, values.total_amount));
                                      }}
                                      currencySymbol={values.currency || 'FCFA'}
                                      placeholder="0"
                                    />
                                  )}
                                </Field>
                                <ErrorMessage
                                  name={`tranches.${index}.amount`}
                                  component="div"
                                  className="text-red-500 text-xs mt-1"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Pourcentage
                                </label>
                                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                                  {percentage}%
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Date prévue
                                </label>
                                <Field
                                  type="date"
                                  name={`tranches.${index}.scheduled_date`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Statut
                                </label>
                                <Field
                                  as="select"
                                  name={`tranches.${index}.status`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                  {trancheStatuses.map(status => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </Field>
                              </div>

                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Conditions
                                </label>
                                <Field
                                  as="textarea"
                                  name={`tranches.${index}.conditions`}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  placeholder="Conditions de déblocage..."
                                />
                              </div>

                              {tranche.status === 'disbursed' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Date effective
                                    </label>
                                    <Field
                                      type="date"
                                      name={`tranches.${index}.actual_disbursement_date`}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Référence
                                    </label>
                                    <Field
                                      type="text"
                                      name={`tranches.${index}.disbursement_reference`}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                      placeholder="Numéro de transaction"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => push({
                          tranche_number: values.tranches.length + 1,
                          amount: 0,
                          percentage: 0,
                          scheduled_date: '',
                          conditions: '',
                          status: 'pending'
                        })}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une tranche
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer le plan'}
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

export default DisbursementPlanModal;
