import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../stores/authStore';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Button from '../../components/ui/Button';

const registerSchema = Yup.object().shape({
  name: Yup.string()
    .required('Nom requis'),
  email: Yup.string()
    .email('Email invalide')
    .required('Email requis'),
  password: Yup.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .required('Mot de passe requis'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Les mots de passe ne correspondent pas')
    .required('Confirmation du mot de passe requise'),
  organization: Yup.string()
    .required('Organisation requise'),
});

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization: string;
}

const RegisterPage: React.FC = () => {
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const [registerError, setRegisterError] = useState('');
  
  const handleSubmit = async (values: RegisterFormValues, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    setRegisterError('');

    try {
      const success = await register(
        values.name,
        values.email,
        values.password,
        'submitter',
        values.organization
      );
      
      if (success) {
        navigate('/dashboard');
      } else {
        setRegisterError("Échec de l'inscription. Veuillez réessayer.");
      }
    } catch (error) {
      setRegisterError('Une erreur est survenue. Veuillez réessayer.');
      console.error('Register error:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Inscription</h2>
      
      {registerError && (
        <div className="mb-4 p-3 bg-error-100 text-error-700 rounded-md">
          {registerError}
        </div>
      )}
      
      <Formik
        initialValues={{
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          organization: '',
        }}
        validationSchema={registerSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom complet
              </label>
              <div className="mt-1">
                <Field
                  id="name"
                  name="name"
                  type="text"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <ErrorMessage name="name" component="div" className="mt-1 text-sm text-error-600" />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <Field
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <ErrorMessage name="email" component="div" className="mt-1 text-sm text-error-600" />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1">
                <Field
                  id="password"
                  name="password"
                  type="password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <ErrorMessage name="password" component="div" className="mt-1 text-sm text-error-600" />
              </div>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <div className="mt-1">
                <Field
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <ErrorMessage name="confirmPassword" component="div" className="mt-1 text-sm text-error-600" />
              </div>
            </div>
            
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                Organisation
              </label>
              <div className="mt-1">
                <Field
                  id="organization"
                  name="organization"
                  type="text"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Nom de votre organisation"
                />
                <ErrorMessage name="organization" component="div" className="mt-1 text-sm text-error-600" />
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
              >
                S'inscrire
              </Button>
            </div>
          </Form>
        )}
      </Formik>
      
      <div className="mt-6">
        <p className="text-center text-sm text-gray-600">
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;