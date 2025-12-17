// frontend/src/pages/orgs/index.tsx
import React from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import {OrgList} from '@/components/forum/orgList';
import Button from '@/components/common/Button';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@/store/authSlice';

const OrgsPage: React.FC = () => {
  const user = useSelector(selectAuthUser);

  return (
    <Layout>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-light-text dark:text-dark-text">Organizations</h1>
          <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Discover and join communities
          </p>
        </div>
        {user && (
          <Link href="/orgs/new">
            <Button variant="primary" className="w-full sm:w-auto">Create Organization</Button>
          </Link>
        )}
      </div>

      <OrgList />
    </Layout>
  );
};

export default OrgsPage;
