'use client';

import { Loader2 } from 'lucide-react';

interface LoadingSkeletonProps {
  text?: string;
}

export function LoadingSkeleton({ text = 'Yükleniyor...' }: LoadingSkeletonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-slate-700 rounded"></div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-slate-700 rounded"></div>
          <div className="h-10 w-32 bg-slate-700 rounded"></div>
        </div>
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-4 space-y-3">
            <div className="h-4 w-24 bg-slate-700 rounded"></div>
            <div className="h-8 w-16 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 h-64">
          <div className="h-4 w-32 bg-slate-700 rounded mb-4"></div>
          <div className="h-48 bg-slate-700 rounded"></div>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 h-64">
          <div className="h-4 w-32 bg-slate-700 rounded mb-4"></div>
          <div className="h-48 bg-slate-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Table header */}
      <div className="flex gap-4 p-3 bg-slate-800 rounded">
        <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
        <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
        <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
        <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 bg-slate-800/50 rounded">
          <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
          <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
          <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
          <div className="h-4 w-1/4 bg-slate-700 rounded"></div>
        </div>
      ))}
    </div>
  );
}
