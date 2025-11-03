'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is authenticated
    const user = localStorage.getItem('user');

    // If not authenticated and not on login page, redirect to login
    if (!user && pathname !== '/login') {
      router.replace('/login');
    }

    // If authenticated and on login page, redirect to dashboard
    if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [pathname, router]);

  // Prevent browser back button after logout
  useEffect(() => {
    const handlePopState = () => {
      const user = localStorage.getItem('user');
      if (!user && pathname !== '/login') {
        // User is not authenticated, force redirect to login
        window.location.href = '/login';
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Add history state to prevent back button
    if (pathname !== '/login') {
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  return <>{children}</>;
}
