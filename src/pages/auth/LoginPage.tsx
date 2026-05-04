import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Button from '../../components/ui/Button';

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email invalide')
    .required('Email requis'),
  password: Yup.string()
    .required('Mot de passe requis'),
});

const LoginPage: React.FC = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState('');
  
  const handleSubmit = async (values: { email: string; password: string }, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    setLoginError('');
    
    try {
      const success = await login(values.email, values.password);
      
      if (success) {
        navigate('/dashboard');
      } else {
        setLoginError('Échec de la connexion. Veuillez vérifier vos identifiants.');
      }
    } catch (error) {
      setLoginError('Une erreur est survenue. Veuillez réessayer.');
      console.error('Login error:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Connexion</h2>
      
      {loginError && (
        <div className="mb-4 p-3 bg-error-100 text-error-700 rounded-md">
          {loginError}
        </div>
      )}
      
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={loginSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-6">
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
                  autoComplete="current-password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <ErrorMessage name="password" component="div" className="mt-1 text-sm text-error-600" />
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
              >
                Se connecter
              </Button>
            </div>
          </Form>
        )}
      </Formik>
      
      <div className="mt-6">
        <p className="text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;