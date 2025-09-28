import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useAdminReady = () => {
  const { user, loading, isAdmin } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [loading, user, isAdmin]);

  return {
    isReady,
    user,
    isAdmin,
    loading
  };
};