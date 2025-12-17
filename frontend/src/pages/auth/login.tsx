import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import Layout from '@/components/layout/Layout';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { loginUser } from '@/services/authWrapper';
import { setCredentials } from '@/store/authSlice';
import type { AppDispatch } from '@/store';

const Login: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;
    setIsLoading(true);

    try {
      const { user, token } = await loginUser({
        username: formData.username,
        password: formData.password,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
      }

      dispatch(setCredentials({ user, token }));
      router.push('/');
    } catch (error: any) {
      setServerError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto card p-8">
        <h1 className="text-2xl font-bold text-light-text dark:text-dark-text mb-6">Login</h1>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            error={errors.username}
            disabled={isLoading}
            required
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            disabled={isLoading}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Don’t have an account?{' '}
          <a href="/auth/register" className="text-light-primary dark:text-dark-primary hover:underline">
            Register here
          </a>
        </p>
      </div>
    </Layout>
  );
};

export default Login;
