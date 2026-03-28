import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={cn("animate-pulse bg-zinc-800/50 rounded-lg", className)} />
  );
};

export const SignalSkeleton = () => (
  <div className="bg-zinc-900/40 border-r-2 border-y border-l border-zinc-800 p-3 rounded-l-lg flex flex-col gap-2">
    <div className="flex items-start gap-3">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-12 h-3" />
        </div>
        <Skeleton className="w-full h-4" />
      </div>
    </div>
  </div>
);

export const IndicatorSkeleton = () => (
  <div className="bg-zinc-800/30 border border-zinc-700/50 p-4 rounded-2xl space-y-3">
    <div className="flex justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8" />
        <Skeleton className="w-32 h-4" />
      </div>
      <Skeleton className="w-16 h-4 rounded-full" />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <Skeleton className="w-12 h-2" />
        <Skeleton className="w-8 h-2" />
      </div>
      <Skeleton className="w-full h-1.5" />
    </div>
    <Skeleton className="w-full h-12 rounded-xl" />
  </div>
);
