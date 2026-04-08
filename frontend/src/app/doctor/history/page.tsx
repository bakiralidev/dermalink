"use client";

/* eslint-disable react/no-unescaped-entities */

import { useEffect, useState } from "react";
import DoctorSidebar from "@/components/DoctorSidebar";
import PatientFloatButton from "@/components/PatientFloatButton";
import DoctorTopNav from "@/components/DoctorTopNav";
import { DoctorDashboardResponse, fetchDoctorDashboard } from "@/lib/doctorDashboard";

export default function DoctorHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DoctorDashboardResponse>({
    patients: [],
    recent_cases: [],
    stats: { registered_patients: 0, total_cases: 0 },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const dashboard = await fetchDoctorDashboard();
        setData(dashboard);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex">
      <DoctorSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden pb-24">
        <div className="max-w-[1400px] mx-auto space-y-5">
          <DoctorTopNav />

          <header>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Doctor / Kasalliklar tarixi</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">So'nggi tashxislar</h2>
          </header>

          <section className="medical-card p-4 md:p-7 border-primary/35 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold opacity-75">Tahlil tarixini 3 soniyada ko'rish uchun karta ko'rinishida</p>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary">{data.recent_cases.length} ta</span>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="skeleton h-20 rounded-2xl" />
                <div className="skeleton h-20 rounded-2xl" />
                <div className="skeleton h-20 rounded-2xl" />
              </div>
            )}

            {!loading && data.recent_cases.length === 0 && (
              <div className="surface-panel p-6 text-center">
                <p className="font-black text-lg">Kasalliklar tarixi hozircha bo'sh</p>
                <p className="text-sm font-semibold opacity-70 mt-1">Yangi tashxislar shu yerda chiqadi.</p>
              </div>
            )}

            {!loading && data.recent_cases.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {data.recent_cases.map((entry) => {
                  const risk = entry.top_confidence >= 0.75 ? "risk-danger" : entry.top_confidence >= 0.45 ? "risk-medium" : "risk-safe";
                  return (
                    <div key={`${entry.phone}-${entry.timestamp}-${entry.model_variant}`} className="surface-panel p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-base">{entry.top_label}</p>
                          <p className="text-xs font-semibold opacity-75">{entry.full_name || "Noma'lum"} • {entry.phone}</p>
                        </div>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-black ${risk}`}>{(entry.top_confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold mt-3">
                        <div className="rounded-xl border border-border px-2.5 py-2">Qism: {entry.body_part}</div>
                        <div className="rounded-xl border border-border px-2.5 py-2">Model: {entry.model_variant}</div>
                      </div>
                      <p className="text-xs font-semibold opacity-70 mt-3">{entry.timestamp}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <PatientFloatButton />
      </main>
    </div>
  );
}
