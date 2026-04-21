import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useTheme() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => axios.get('/api/v1/settings').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (settings?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    }
  }, [settings]);
}
