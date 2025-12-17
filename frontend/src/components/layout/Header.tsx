// src/components/layout/Header.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials } from '@/store/authSlice';
import { logoutUser } from '@/services/authWrapper';
import type { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import ThemeToggle from '../common/ThemeToggle';
import Button from '../common/Button';

const Header: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('logout error', e);
    } finally {
      dispatch(logout());
      router.push('/');
    }
  };

  return (
    <header className="bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-lg sm:text-2xl font-bold text-light-primary dark:text-dark-primary hover:text-light-primary-hover dark:hover:text-dark-primary-hover transition-colors"
          >
            HonestReviews
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2 sm:gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Guest Navigation */}
            {!user && (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                    Register
                  </Button>
                </Link>
              </>
            )}

            {/* Authenticated Navigation */}
            {user && (
              <>
                <span className="hidden sm:inline text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary font-medium">
                  Hi, {user.username}
                </span>
                <Link href="/profile">
                  <Button variant="ghost" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                    Profile
                  </Button>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-4 py-1 sm:py-2 border-2 border-light-border dark:border-dark-border rounded-lg text-xs sm:text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border transition-all"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;