import React, { useMemo, useState } from 'react';
import { OrgMember } from '@/types/orgs';
import Button from '@/components/common/Button';
import { SearchInput } from '@/components/common/SearchInput';
import { SortDropdown } from '@/components/common/SortDropdown';

interface MemberListProps {
  members: OrgMember[];
  currentUserId?: string;
  canPromote?: boolean;
  onPromote?: (profileId: string) => void;
  isPromoting?: string | null;
}

const SORT_OPTIONS = [
  { label: 'Newest Joined', value: 'joined_at', order: 'desc' as const },
  { label: 'Oldest Joined', value: 'joined_at', order: 'asc' as const },
  { label: 'Name (A-Z)', value: 'username', order: 'asc' as const },
  { label: 'Name (Z-A)', value: 'username', order: 'desc' as const },
];

const MemberList: React.FC<MemberListProps> = ({
  members,
  currentUserId,
  canPromote,
  onPromote,
  isPromoting,
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('joined_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleSortChange = (newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort);
    setOrder(newOrder);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = members.slice();

    if (q) {
      result = result.filter(m => (m.username || '').toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sort === 'joined_at') {
        const ta = new Date(a.joined_at).getTime();
        const tb = new Date(b.joined_at).getTime();
        return order === 'asc' ? ta - tb : tb - ta;
      }

      if (sort === 'username') {
        const sa = (a.username || '').toLowerCase();
        const sb = (b.username || '').toLowerCase();
        return order === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }

      return 0;
    });

    return result;
  }, [members, search, sort, order]);

  const getRoleBadge = (role: string) => {
    const styles = {
      creator: 'bg-light-primary/20 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary border border-light-primary/30 dark:border-dark-primary/30',
      moderator: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      member: 'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text border border-light-border dark:border-dark-border',
    };
    return styles[role as keyof typeof styles] || styles.member;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search members..." />
        </div>
        <SortDropdown options={SORT_OPTIONS} currentSort={sort} currentOrder={order} onChange={handleSortChange} />
      </div>

      <div className="space-y-3">
        {filtered.map(member => (
          <div 
            key={member.id} 
            className="flex items-center justify-between p-4 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-light-primary to-light-primary-hover dark:from-dark-primary dark:to-dark-primary-hover rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {member.username?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium text-light-text dark:text-dark-text">
                  {member.username || 'Unknown'}
                </p>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(member.role)}`}>
                {member.role}
              </span>
              
              {canPromote && 
               member.role === 'member' && 
               member.member_id !== currentUserId && 
               onPromote && (
                <Button
                  variant="outline"
                  onClick={() => onPromote(member.member_id)}
                  disabled={isPromoting === member.member_id}
                  className="text-sm px-4 py-2"
                >
                  {isPromoting === member.member_id ? 'Promoting...' : 'Promote'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberList;

