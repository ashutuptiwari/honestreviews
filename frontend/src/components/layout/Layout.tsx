// src/components/layout/Layout.tsx
import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors">
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 lg:px-8 py-4 sm:py-6 md:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;