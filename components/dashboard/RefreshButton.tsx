'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/lib/store';

export default function RefreshButton() {
  const { loading, fetchSprints } = useDashboardStore();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => fetchSprints()}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Yenile
    </Button>
  );
}

