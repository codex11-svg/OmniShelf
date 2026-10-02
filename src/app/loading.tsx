import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading workspace" aria-busy="true" className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}
      </div>
      <div className="flex gap-2 overflow-hidden border-b border-slate-200 pb-3">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-28 shrink-0" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40" />)}
      </div>
      <span className="sr-only">Loading content</span>
    </div>
  );
}