import { Personality } from '@/types/personalities';

interface PersonalityDetailProps {
  personality: Personality;
}

export default function PersonalityDetail({ personality }: PersonalityDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="card">
      {/* Header Section */}
      <div className="pb-4 sm:pb-6 border-b border-light-border dark:border-dark-border">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {personality.avatar_url ? (
              <img
                src={personality.avatar_url}
                alt={personality.name}
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover ring-3 sm:ring-4 ring-light-border dark:ring-dark-border"
              />
            ) : (
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-light-primary to-light-primary-hover dark:from-dark-primary dark:to-dark-primary-hover flex items-center justify-center text-white text-2xl sm:text-3xl font-bold ring-3 sm:ring-4 ring-light-border dark:ring-dark-border">
                {personality.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name and Rating */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text mb-2 sm:mb-3 break-words">
              {personality.name}
            </h1>
            
            {/* Average Rating */}
            {personality.average_review !== null && personality.average_review !== undefined && (
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 sm:w-6 sm:h-6 ${
                        star <= personality.average_review!
                          ? 'text-star-gold fill-current'
                          : 'text-light-border dark:text-dark-border'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  ))}
                </div>
                <span className="text-base sm:text-lg font-semibold text-light-text dark:text-dark-text">
                  {personality.average_review.toFixed(1)}
                </span>
                <span className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  average rating
                </span>
              </div>
            )}

            {/* Created Date */}
            <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Created on {formatDate(personality.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Description Section */}
      {personality.description && (
        <div className="pt-4 sm:pt-6">
          <h2 className="text-base sm:text-lg font-semibold text-light-text dark:text-dark-text mb-2 sm:mb-3">About</h2>
          <p className="text-xs sm:text-sm text-light-text dark:text-dark-text leading-relaxed whitespace-pre-wrap">
            {personality.description}
          </p>
        </div>
      )}

      {/* Metadata Section */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Last updated {formatDate(personality.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}