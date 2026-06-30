"use client";
export default function Loader({ size = 8 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className={`h-${size} w-${size} animate-spin rounded-full border-4 border-t-cyan-400 border-slate-700`} />
    </div>
  );
}
