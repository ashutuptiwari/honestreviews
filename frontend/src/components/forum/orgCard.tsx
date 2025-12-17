import React from 'react';
import Link from 'next/link';
import { OrgWithMembership } from '@/types/orgs';
import Button from '@/components/common/Button';

interface OrgCardProps {
  org: OrgWithMembership;
  onJoin?: (slug: string) => void;
  isJoining?: boolean;
}

const OrganizationCard: React.FC<OrgCardProps> = ({ org, onJoin, isJoining }) => {
  const handleJoin = () => {
    if (!org.is_member && onJoin) {
      onJoin(org.slug);
    }
  };

  const isJoined = org.is_member;

  return (
    <div className={`card hover:shadow-card-hover dark:hover:shadow-card-dark-hover transition-all duration-200 ${isJoined ? 'opacity-80' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-2 sm:mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/orgs/${org.slug}`}>
            <h3 className="text-lg sm:text-2xl font-semibold text-light-text-secondary dark:text-dark-text-secondary hover:text-light-primary dark:hover:text-dark-primary cursor-pointer transition-colors truncate">
              {org.name}
            </h3>
          </Link>
          {org.description && (
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary line-clamp-2 leading-relaxed">
              {org.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-light-surface dark:bg-dark-surface px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-light-primary dark:text-dark-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="font-semibold text-light-text-secondary dark:text-dark-text-secondary">{org.members_count}</span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-1.5 bg-light-surface dark:bg-dark-surface px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-light-primary dark:text-dark-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-semibold text-light-text-secondary dark:text-dark-text-secondary">{org.personalities_count}</span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-1.5 bg-light-surface dark:bg-dark-surface px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-light-primary dark:text-dark-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="font-semibold text-light-text-secondary dark:text-dark-text-secondary">{org.reviews_count}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-3 border-t border-light-border dark:border-dark-border">
        <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
          <span>{new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>

        {onJoin && (
          <Button
            variant={isJoined ? 'outline' : 'primary'}
            onClick={handleJoin}
            disabled={isJoining || isJoined}
            className="text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5 font-medium w-full sm:w-auto"
          >
            {isJoined ? (
              <span className="flex items-center justify-center gap-1 sm:gap-1.5">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Joined
              </span>
            ) : isJoining ? (
              'Joining...'
            ) : (
              'Join'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrganizationCard;