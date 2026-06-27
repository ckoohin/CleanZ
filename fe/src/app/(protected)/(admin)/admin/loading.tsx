// Route-level loading skeleton for the admin dashboard — renders inside the
// AdminShell <main>, so cz tokens are available.
function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[var(--c-card-2)] ${className ?? ""}`} />;
}

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-2">
        <Block className="h-7 w-64 !rounded-lg" />
        <Block className="h-4 w-40 !rounded-md" />
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <Block className="h-20" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <Block className="h-28" />
          </div>
        ))}
        <div className="col-span-12 lg:col-span-8">
          <Block className="h-80" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Block className="h-80" />
        </div>
      </div>
    </div>
  );
}
