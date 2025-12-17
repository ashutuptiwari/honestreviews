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
      <div className="space-y-10">
        {/* Hero Section */}
        <div className="card p-8">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-light-text dark:text-dark-text">
              Welcome to HonestReviews
            </h1>

            <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary">
              Share your thoughts, read reviews, and connect with the community.
            </p>

            {user ? (
              <div className="space-y-4">
                <p className="text-xl text-light-text-secondary dark:text-dark-text-secondary">
                  Hello,{' '}
                  <span className="font-semibold text-light-text dark:text-dark-text">
                    {user.username}
                  </span>
                  ! Ready to explore?
                </p>

                <div>
                  <Link href="/orgs">
                    <Button variant="primary">
                      Explore Organizations
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <Link href="/auth/login">
                  <Button variant="primary">Get Started</Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="outline">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
        {user && (
          <div className="card text-center">
            <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text mb-2">
              Your Personalized Feed
            </h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Personalized reviews from organizations you follow are coming soon.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Home;