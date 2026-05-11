import { trafficSeries } from "@/lib/admin-data";

export function LabeledBarChart({
  title,
  description,
  kind = "requests",
}: {
  title: string;
  description: string;
  kind?: "requests" | "errors" | "latency";
}) {
  const max = Math.max(...trafficSeries.map((item) => item[kind]));
  const label = kind === "requests" ? "request/phút" : kind === "errors" ? "lỗi" : "ms";
  const color = kind === "errors" ? "bg-rose-500" : kind === "latency" ? "bg-amber-500" : "bg-slate-950";

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-light text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
        </div>
      </div>
      <div className="grid grid-cols-[3rem_1fr] gap-4">
        <div className="flex flex-col justify-between pb-8 text-right text-xs text-slate-400">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div>
          <div className="flex h-64 items-end gap-4 border-b border-l border-slate-200 pl-4">
            {trafficSeries.map((item) => (
              <div key={item.time} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-56 w-full items-end justify-center">
                  <div
                    className={`w-full max-w-12 rounded-t-2xl ${color}`}
                    style={{ height: `${Math.max(8, (item[kind] / max) * 100)}%` }}
                    title={`${item.time}: ${item[kind]} ${label}`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400">{item.time}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Thời điểm trong ngày</div>
        </div>
      </div>
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === "Healthy" || status === "normal" || status === "success"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Degraded" || status === "warning" || status === "WARN"
      ? "bg-amber-50 text-amber-700"
      : status === "ERROR" || status === "high"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}
