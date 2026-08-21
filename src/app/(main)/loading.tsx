export default function Loading() {
  return (
    <div className="px-4 pt-6 space-y-6 max-w-md mx-auto animate-pulse">
      {/* Top row skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-36" />
        <div className="w-10 h-10 bg-gray-100 rounded-full" />
      </div>

      {/* Main card skeleton */}
      <div className="h-44 bg-gray-200/70 rounded-2xl" />

      {/* List skeleton */}
      <div className="space-y-3">
        <div className="h-5 bg-gray-200 rounded w-28" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl border border-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
