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

export function AssignmentDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse p-4 md:p-0">
      <Skeleton className="h-8 w-48 rounded-xl bg-white/[0.03] border border-white/5" />
      
      {/* Header Skeleton */}
      <div className="bg-white/[0.02] border border-white/[0.03] rounded-[2.5rem] p-8 md:p-10 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex gap-4">
              <Skeleton className="h-6 w-32 rounded-lg bg-white/5" />
              <Skeleton className="h-6 w-24 rounded-lg bg-white/5" />
            </div>
            <Skeleton className="h-12 md:h-16 w-3/4 rounded-2xl bg-white/5" />
            <div className="flex gap-4">
              <Skeleton className="h-8 w-40 rounded-xl bg-white/5" />
              <Skeleton className="h-8 w-32 rounded-xl bg-white/5" />
              <Skeleton className="h-8 w-32 rounded-xl bg-white/5" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-[90%] bg-white/5" />
              <Skeleton className="h-3 w-2/3 bg-white/5" />
            </div>
          </div>
          <div className="w-full lg:w-72 space-y-4">
            <Skeleton className="h-8 w-48 rounded-xl bg-white/5" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24 bg-white/5" />
                    <Skeleton className="h-3 w-12 bg-white/5" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.03] rounded-[2rem] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-48 rounded-xl bg-white/5" />
              <Skeleton className="h-10 w-24 rounded-xl bg-white/5" />
            </div>
            <Skeleton className="h-80 w-full rounded-2xl bg-white/5" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-48 bg-white/5" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-12 rounded-xl bg-white/5" />
                <Skeleton className="h-12 rounded-xl bg-white/5" />
              </div>
            </div>
            <Skeleton className="h-14 w-full rounded-2xl bg-brand-gold/10" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.03] rounded-[2rem] p-8 space-y-8">
            <div className="flex gap-4 items-center">
              <Skeleton className="h-12 w-12 rounded-2xl bg-white/5" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 bg-white/5" />
                <Skeleton className="h-4 w-32 bg-white/5" />
              </div>
            </div>
            <Skeleton className="h-48 w-full rounded-[2.5rem] bg-black/20" />
            <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 gap-4">
               <div className="flex gap-4">
                 <Skeleton className="h-8 w-16 rounded-xl bg-white/5" />
                 <Skeleton className="h-8 w-16 rounded-xl bg-white/5" />
               </div>
               <Skeleton className="h-10 w-32 rounded-xl bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
