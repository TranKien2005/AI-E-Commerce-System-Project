"use client";

import { useMemo, useState } from "react";
import { trafficSeries } from "@/lib/admin-data";

type Range = "1h" | "24h" | "7d" | "30d";
type Metric = "requests" | "errors" | "latency";

const rangeLabels: Record<Range, string> = {
  "1h": "1 giờ",
  "24h": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày",
};

const metricLabels: Record<Metric, string> = {
  requests: "Thông lượng",
  errors: "Lỗi",
  latency: "Độ trễ P95",
};

const metricUnits: Record<Metric, string> = {
  requests: "req/phút",
  errors: "lỗi",
  latency: "ms",
};

const metricColors: Record<Metric, string> = {
  requests: "bg-slate-950",
  errors: "bg-rose-500",
  latency: "bg-amber-500",
};

function makeSeries(range: Range) {
  const multiplier = range === "1h" ? 0.32 : range === "24h" ? 1 : range === "7d" ? 5.4 : 19.2;
  return trafficSeries.map((item, index) => ({
    label: range === "1h" ? `${index * 10}m` : range === "7d" ? `D${index + 1}` : range === "30d" ? `W${index + 1}` : item.time,
    requests: Math.round(item.requests * multiplier),
    errors: Math.max(1, Math.round(item.errors * multiplier)),
    latency: Math.round(item.latency * (range === "1h" ? 0.92 : range === "30d" ? 1.08 : 1)),
  }));
}

export default function AdminInteractiveCharts({ title = "Biểu đồ vận hành" }: { title?: string }) {
  const [range, setRange] = useState<Range>("24h");
  const [metric, setMetric] = useState<Metric>("requests");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const data = useMemo(() => makeSeries(range), [range]);
  const max = Math.max(...data.map((item) => item[metric]));
  const selected = selectedIndex === null ? null : data[selectedIndex];

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-light text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Đổi phạm vi thời gian, chọn chỉ số và bấm vào từng cột để xem giá trị chi tiết.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(rangeLabels) as Range[]).map((item) => <button key={item} onClick={() => { setRange(item); setSelectedIndex(null); }} className={range === item ? "premium-button px-4 py-2" : "premium-button-light px-4 py-2"}>{rangeLabels[item]}</button>)}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(metricLabels) as Metric[]).map((item) => <button key={item} onClick={() => { setMetric(item); setSelectedIndex(null); }} className={metric === item ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" : "rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"}>{metricLabels[item]}</button>)}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${metricColors[metric]}`} /> {metricLabels[metric]} · {metricUnits[metric]}</div>
      </div>

      <div className="grid grid-cols-[3.5rem_1fr] gap-4">
        <div className="flex flex-col justify-between pb-10 text-right text-xs text-slate-400"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div>
        <div>
          <div className="flex h-72 items-end gap-3 overflow-x-auto border-b border-l border-slate-200 pl-4">
            {data.map((item, index) => {
              const isSelected = selectedIndex === index;
              return (
                <button key={item.label} onClick={() => setSelectedIndex(index)} className="group flex min-w-16 flex-1 flex-col items-center gap-2 outline-none">
                  <div className="flex h-60 w-full items-end justify-center">
                    <div className={`w-full max-w-12 rounded-t-2xl transition ${metricColors[metric]} ${isSelected ? "ring-4 ring-slate-300" : "opacity-80 group-hover:opacity-100"}`} style={{ height: `${Math.max(8, (item[metric] / max) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-400">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mốc thời gian · {rangeLabels[range]}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Cao nhất</p><p className="mt-2 text-xl font-semibold text-slate-950">{max} {metricUnits[metric]}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Trung bình</p><p className="mt-2 text-xl font-semibold text-slate-950">{Math.round(data.reduce((sum, item) => sum + item[metric], 0) / data.length)} {metricUnits[metric]}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Đang chọn</p><p className="mt-2 text-xl font-semibold text-slate-950">{selected ? `${selected.label}: ${selected[metric]} ${metricUnits[metric]}` : "Chọn một cột"}</p></div>
      </div>
    </section>
  );
}
