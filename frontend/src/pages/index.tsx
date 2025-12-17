import React from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import Button from '@/components/common/Button';
import { selectAuthUser } from '@/store/authSlice';

const Home: React.FC = () => {
  const user = useSelector(selectAuthUser);
  return (
    <Layout>
      <div className="space-y-6 sm:space-y-10">
        {/* Hero Section */}
        <div className="card p-4 sm:p-6 md:p-8">
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-light-text dark:text-dark-text">
              Welcome to HonestReviews
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-light-text-secondary dark:text-dark-text-secondary">
              Share your thoughts, read reviews, and connect with the community.
            </p>

            {user ? (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-base sm:text-lg md:text-xl text-light-text-secondary dark:text-dark-text-secondary">
                  Hello,{' '}
                  <span className="font-semibold text-light-text dark:text-dark-text">
                    {user.username}
                  </span>
                  ! Ready to explore?
                </p>

                <div>
                  <Link href="/orgs">
                    <Button variant="primary" className="w-full sm:w-auto">
                      Explore Organizations
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Link href="/auth/login" className="flex-1 sm:flex-none">
                  <Button variant="primary" className="w-full">Get Started</Button>
                </Link>
                <Link href="/auth/register" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
        {user && (
          <div className="card text-center p-6 sm:p-8">
            <h2 className="text-lg sm:text-2xl font-semibold text-light-text dark:text-dark-text mb-2">
              Your Personalized Feed
            </h2>
            <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Personalized reviews from organizations you follow are coming soon.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Home;