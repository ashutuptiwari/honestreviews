import React from 'react';
import Link from 'next/link';
import { OrgMember } from '@/types/orgs';

interface MemberCardProps {
  member: OrgMember;
  currentUserId?: string;
  canPromote?: boolean;
  onPromote?: (profileId: string) => void;
  isPromoting?: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  currentUserId,
  canPromote,
  onPromote,
  isPromoting = false,
}) => {
  const getRoleBadge = (role: string) => {
    const styles = {
      creator: 'bg-light-primary/20 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary border border-light-primary/30 dark:border-dark-primary/30',
      moderator: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      member: 'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text border border-light-border dark:border-dark-border',
    };
    return styles[role as keyof typeof styles] || styles.member;
  };

  const showPromoteButton = 
    canPromote && 
    member.role === 'member' && 
    member.member_id !== currentUserId && 
    onPromote;

  return (
    <Link
      href={`/profiles/${member.username}`}
      className="block group"
    >
      <div className="card transition-all hover:shadow-card-hover dark:hover:shadow-card-dark-hover">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-light-primary to-light-primary-hover dark:from-dark-primary dark:to-dark-primary-hover flex items-center justify-center text-white text-xl font-semibold ring-2 ring-light-border dark:ring-dark-border">
              {member.username?.[0]?.toUpperCase() || '?'}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors truncate">
                  {member.username || 'Unknown'}
                </h3>
                
                {/* Role Badge */}
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(member.role)}`}>
                    {member.role}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              {showPromoteButton && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPromote?.(member.member_id);
                  }}
                  disabled={isPromoting}
                  className="text-sm text-light-primary dark:text-dark-primary hover:text-light-primary-hover dark:hover:text-dark-primary-hover font-medium disabled:opacity-50 transition-colors"
                >
                  {isPromoting ? 'Promoting...' : 'Promote'}
                </button>
              )}
            </div>

            {/* Joined Date */}
            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
              Joined {new Date(member.joined_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MemberCard;
