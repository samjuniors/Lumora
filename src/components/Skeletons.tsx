import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border-main/40 dark:bg-border-main/20", className)}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 p-0">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden rounded-[40px] p-8 md:p-14 bg-bg-surface border border-border-main/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="w-full">
          <Skeleton className="h-6 w-32 mb-6 rounded-full" />
          <Skeleton className="h-10 md:h-16 w-[85%] mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-14 w-full md:w-72 rounded-2xl" />
        </div>
        <Skeleton className="w-full md:w-80 h-40 md:h-56 rounded-[32px] shrink-0" />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Skeleton className="h-10 w-56 mb-8" />
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 rounded-[32px]" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 space-y-6">
           <Skeleton className="h-10 w-56 mb-8" />
           <Skeleton className="h-[450px] rounded-[32px]" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-12">
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-xl shrink-0" />)}
      </div>
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-navy-900/50 border border-navy-700/50 p-6 md:p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(j => <Skeleton key={j} className="w-8 h-8 rounded-xl" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
