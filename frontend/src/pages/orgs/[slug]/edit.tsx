// src/pages/orgs/[slug]/edit.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import Layout from '@/components/layout/Layout';
import OrgForm from '@/components/forum/orgForm';
import { useOrg, useOrgMembers, useUpdateOrg } from '@/hooks/useOrgs';
import { selectAuthUser } from '@/store/authSlice';

const EditOrgPage: React.FC = () => {
  const router = useRouter();
  const { slug } = router.query;
  const user = useSelector(selectAuthUser);
  
  const { org, loading: orgLoading } = useOrg(typeof slug === 'string' ? slug : null);
  const { members } = useOrgMembers(typeof slug === 'string' ? slug : null);
  const { updateOrg } = useUpdateOrg();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const currentMember = members.find(m => m.member_id === user?.id);
  const canEdit = currentMember && (currentMember.role === 'creator' || currentMember.role === 'moderator');

  useEffect(() => {
    if (!orgLoading && (!user || !canEdit)) {
      router.push(`/orgs/${slug}`);
    }
  }, [orgLoading, user, canEdit, router, slug]);

  const handleSubmit = async (data: { name: string; description?: string }) => {
    if (!slug || typeof slug !== 'string') return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await updateOrg(slug, data);
      router.push(`/orgs/${slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orgLoading || !org) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-light-surface dark:bg-dark-surface rounded w-1/3"></div>
          <div className="h-64 bg-light-surface dark:bg-dark-surface rounded"></div>
        </div>
      </Layout>
    );
  }

  if (!canEdit) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
            Edit Organization
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
            Update {org.name}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="card">
          <OrgForm
            initialData={{
              name: org.name,
              description: org.description || undefined,
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Update Organization"
          />
        </div>
      </div>
    </Layout>
  );
};

export default EditOrgPage;
