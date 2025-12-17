// src/pages/orgs/[slug]/index.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSelector } from 'react-redux';

import Layout from '@/components/layout/Layout';
import Button from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import PersonalitiesList from '@/components/forum/personalitiesList';
import MemberList from '@/components/forum/MemberList';
import { ReviewFeed } from '@/components/forum/ReviewFeed';
import {
  useOrg,
  useOrgMembers,
  useJoinOrg,
  useDeleteOrg,
  usePromoteMember,
} from '@/hooks/useOrgs';
import { useDialog } from '@/hooks/useDialog';

import { selectAuthUser } from '@/store/authSlice';

export default function OrganizationPage() {
  const router = useRouter();
  const { slug } = router.query;

  const user = useSelector(selectAuthUser);

  /* -------------------------------------------------------------------------- */
  /*                               Data Fetching                                */
  /* -------------------------------------------------------------------------- */

  const {
    org,
    loading: orgLoading,
    error: orgError,
    refetch: refetchOrg,
  } = useOrg(slug as string);

  const {
    members,
    loading: membersLoading,
    refetch: refetchMembers,
  } = useOrgMembers(slug as string);

  const { joinOrg } = useJoinOrg();
  const { deleteOrg } = useDeleteOrg();
  const { promoteMember } = usePromoteMember();
  const { dialog, alert, confirm, close } = useDialog();

  /* -------------------------------------------------------------------------- */
  /*                                 UI State                                   */
  /* -------------------------------------------------------------------------- */

  const [activeTab, setActiveTab] = useState<'personalities' | 'members' | 'reviews'>(
    'personalities'
  );
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  /* -------------------------------------------------------------------------- */
  /*                              Derived State                                  */
  /* -------------------------------------------------------------------------- */

  const currentMember = members.find(
    (m) => m.member_id === user?.id
  );

  const isCreator = org && user && org.created_by === user.id;
  const canEdit =
    currentMember &&
    (currentMember.role === 'creator' ||
      currentMember.role === 'moderator');

  /* -------------------------------------------------------------------------- */
  /*                               Handlers                                     */
  /* -------------------------------------------------------------------------- */

  const handleJoin = async () => {
    if (!slug || typeof slug !== 'string') return;
    setIsJoining(true);
    try {
      await joinOrg(slug);
      refetchOrg();
      refetchMembers();
    } catch (err: any) {
      await alert('Error', err.message || 'Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDelete = async () => {
    if (!slug || typeof slug !== 'string') return;

    const confirmed = await confirm(
      'Delete Organization',
      'Are you sure you want to delete this organization? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOrg(slug);
      router.push('/orgs');
    } catch (err: any) {
      await alert('Error', err.message || 'Failed to delete organization');
      setIsDeleting(false);
    }
  };

  const handlePromote = async (profileId: string) => {
    if (!slug || typeof slug !== 'string') return;
    setPromotingId(profileId);
    try {
      await promoteMember(slug, profileId);
      refetchMembers();
    } catch (err: any) {
      await alert('Error', err.message || 'Failed to promote member');
    } finally {
      setPromotingId(null);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                               Loading / Error                               */
  /* -------------------------------------------------------------------------- */

  if (typeof slug !== 'string') {
    return null;
  }

  if (orgLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-light-surface dark:bg-dark-surface rounded w-1/3" />
          <div className="h-4 bg-light-surface dark:bg-dark-surface rounded w-2/3" />
        </div>
      </Layout>
    );
  }

  if (orgError || !org) {
    return (
      <Layout>
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">
            {orgError || 'Organization not found'}
          </p>
          <Link href="/orgs">
            <Button variant="outline" className="mt-4">
              Back to Organizations
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Render                                    */
  /* -------------------------------------------------------------------------- */

  return (
    <Layout>
      {/* ------------------------------ Header ------------------------------ */}
      <div className="card mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
              {org.name}
            </h1>
            {org.description && (
              <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
                {org.description}
              </p>
            )}
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-4">
              Created {new Date(org.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex space-x-3">
            {!currentMember && user && (
              <Button
                variant="primary"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ? 'Joining...' : 'Join Organization'}
              </Button>
            )}

            {canEdit && (
              <Link href={`/orgs/${slug}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
            )}

            {isCreator && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="!text-red-600 dark:!text-red-400 !border-red-300 dark:!border-red-700 hover:!bg-red-50 dark:hover:!bg-red-900/20"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------- Tabs ------------------------------- */}
      <div className="border-b border-light-border dark:border-dark-border mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('personalities')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'personalities'
                ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'
            }`}
          >
            Personalities
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reviews'
                ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text hover:border-light-border dark:hover:border-dark-border'
            }`}
          >
            Reviews
          </button>
        </nav>
      </div>

      {/* ---------------------------- Tab Content ---------------------------- */}
      <div>
        {activeTab === 'personalities' && (
          <PersonalitiesList orgSlug={slug} canModerateOrg={!!canEdit} />
        )}

        {activeTab === 'members' && (
          <div>
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">
              Members ({members.length})
            </h2>
            <MemberList
              members={members}
              currentUserId={user?.id}
              canPromote={isCreator ?? false}
              onPromote={handlePromote}
              isPromoting={promotingId}
            />
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewFeed />
        )}
      </div>

      <Dialog
        dialog={dialog}
        onConfirm={() => {
          dialog.onConfirm?.();
        }}
        onCancel={() => {
          dialog.onCancel?.();
        }}
      />
    </Layout>
  );
}
