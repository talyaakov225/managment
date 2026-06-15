interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function SkeletonTaskCard() {
  return (
    <div className="card-hover p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
        <Skeleton className="h-4 flex-1" />
      </div>
      <Skeleton className="h-3 w-3/4 ms-4" />
      <div className="flex items-center justify-between ms-4">
        <Skeleton className="h-3 w-16" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-12 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div className="flex gap-5 h-full min-w-max lg:min-w-0">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="flex flex-col min-w-[300px] w-[300px] lg:flex-1 lg:min-w-0">
          <div className="flex items-center gap-2 px-2 mb-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex-1 space-y-2.5 p-2 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 min-h-[200px]">
            {Array.from({ length: col === 0 ? 3 : col === 1 ? 2 : 1 }).map((_, i) => (
              <SkeletonTaskCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="card p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="w-4 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
