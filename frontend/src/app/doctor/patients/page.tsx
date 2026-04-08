"use client";

/* eslint-disable react/no-unescaped-entities */

import { useEffect, useState } from "react";
import DoctorSidebar from "@/components/DoctorSidebar";
import PatientFloatButton from "@/components/PatientFloatButton";
import DoctorTopNav from "@/components/DoctorTopNav";
import { DoctorDashboardResponse, fetchDoctorDashboard } from "@/lib/doctorDashboard";

export default function DoctorPatientsPage() {
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
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Doctor / Ayni bemorlar</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Bemorlar ro'yxati</h2>
          </header>

          <section className="medical-card p-4 md:p-7 border-primary/35 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="surface-panel px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.12em] font-black opacity-60">Ro'yxatdan o'tgan bemorlar</p>
                <p className="text-2xl font-black">{data.stats.registered_patients}</p>
              </div>
              <div className="surface-panel px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.12em] font-black opacity-60">Jami ko'riklar</p>
                <p className="text-2xl font-black">{data.stats.total_cases}</p>
              </div>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="skeleton h-24 rounded-2xl" />
                <div className="skeleton h-24 rounded-2xl" />
                <div className="skeleton h-24 rounded-2xl" />
              </div>
            )}

            {!loading && data.patients.length === 0 && (
              <div className="surface-panel p-6 text-center">
                <p className="font-black text-lg">Hozircha bemorlar yo'q</p>
                <p className="text-sm font-semibold opacity-70 mt-1">Yangi ro'yxatdan o'tgan bemorlar shu yerda ko'rinadi.</p>
              </div>
            )}

            {!loading && data.patients.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {data.patients.map((item) => (
                  <div key={`${item.phone}-${item.last_timestamp}`} className="surface-panel p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-base">{item.full_name || "Ism kiritilmagan"}</p>
                        <p className="text-xs font-semibold opacity-75">{item.phone}</p>
                      </div>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-black ${item.top_confidence >= 0.75 ? "risk-danger" : item.top_confidence >= 0.45 ? "risk-medium" : "risk-safe"}`}>
                        {(item.top_confidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-semibold">
                      <div className="rounded-xl border border-border px-2.5 py-2">Kasallik: {item.top_label}</div>
                      <div className="rounded-xl border border-border px-2.5 py-2">Qism: {item.body_part}</div>
                      <div className="rounded-xl border border-border px-2.5 py-2">Yosh/Jins: {item.age} / {item.sex}</div>
                      <div className="rounded-xl border border-border px-2.5 py-2">Ko'rik: {item.total_cases}</div>
                    </div>

                    <p className="text-xs font-semibold opacity-70 mt-3">Oxirgi ko'rik: {item.last_timestamp}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <PatientFloatButton />
      </main>
    </div>
  );
}
