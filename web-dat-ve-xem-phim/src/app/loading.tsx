export default function Loading() {
  return (
    <main
      className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6 lg:px-8"
      aria-label="Đang tải"
    >
      <div className="mx-auto max-w-7xl animate-pulse space-y-8">
        <div className="h-8 w-48 rounded-full bg-white/10" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-56 rounded-[28px] bg-white/5 lg:col-span-2" />
          <div className="h-56 rounded-[28px] bg-white/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 rounded-[24px] bg-white/5" />
          ))}
        </div>
      </div>
    </main>
  );
}