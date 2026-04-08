"use client";

/* eslint-disable react/no-unescaped-entities */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Loader2,
  PieChart,
  Upload,
} from "lucide-react";
import axios from "axios";
import DoctorSidebar from "@/components/DoctorSidebar";
import PatientFloatButton from "@/components/PatientFloatButton";
import DoctorTopNav from "@/components/DoctorTopNav";
import { API_BASE, DoctorDashboardResponse, fetchDoctorDashboard } from "@/lib/doctorDashboard";

type ModelVariant = "default" | "new_skin" | "eczema";

interface PredictionResponse {
  model_variant: string;
  label: string;
  confidence: number;
  top_3: [string, number][];
  recommendation?: {
    title: string;
    text: string;
  } | null;
}

interface DoctorMetadata {
  lesionId: string;
  age: string;
  sex: string;
  localization: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export default function DoctorPage() {
  const [activeModel, setActiveModel] = useState<ModelVariant>("default");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DoctorDashboardResponse>({
    patients: [],
    recent_cases: [],
    stats: { registered_patients: 0, total_cases: 0 },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [metadata, setMetadata] = useState<DoctorMetadata>({
    lesionId: "",
    age: "50",
    sex: "male",
    localization: "back",
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await fetchDoctorDashboard();
        setDashboard(data);
      } finally {
        setDashboardLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const runAnalysis = async (model: ModelVariant) => {
    if (!selectedFile) {
      setError("Avval rasm yuklang.");
      return;
    }

    setActiveModel(model);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("lesion_id", metadata.lesionId || `anon_${Date.now()}`);
    formData.append("age", metadata.age);
    formData.append("sex", metadata.sex);
    formData.append("localization", metadata.localization);

    try {
      const endpoint = model === "new_skin" ? "/api/predict-new-skin" : model === "eczema" ? "/api/predict-eczema" : "/api/predict";
      const response = await axios.post<PredictionResponse>(`${API_BASE}${endpoint}`, formData);
      setResult(response.data);
      const refreshed = await fetchDoctorDashboard();
      setDashboard(refreshed);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Tahlilda xatolik yuz berdi."));
    } finally {
      setLoading(false);
    }
  };

  const distribution = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const item of dashboard.recent_cases) {
      const prev = bucket.get(item.top_label) ?? 0;
      bucket.set(item.top_label, prev + 1);
    }
    return [...bucket.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [dashboard.recent_cases]);

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex">
      <DoctorSidebar activeModel={activeModel} />

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden pb-24">
        <div className="max-w-[1500px] mx-auto space-y-5">
          <DoctorTopNav />

          <header className="flex items-center gap-3">
            <img src="/brand-logo.png" alt="DermaLink logo" className="h-10 w-[150px] object-contain lg:hidden" />
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard title="Bugungi ko'riklar" value={String(dashboard.recent_cases.length)} icon={<Activity className="w-4 h-4" />} loading={dashboardLoading} />
            <StatCard title="Ro'yxatdan o'tgan" value={String(dashboard.stats.registered_patients)} icon={<CheckCircle2 className="w-4 h-4" />} loading={dashboardLoading} />
            <StatCard title="Jami holatlar" value={String(dashboard.stats.total_cases)} icon={<BarChart3 className="w-4 h-4" />} loading={dashboardLoading} />
            <StatCard title="Faol model" value={activeModel.toUpperCase()} icon={<PieChart className="w-4 h-4" />} loading={false} />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="medical-card p-4 md:p-6 border-primary/35 xl:col-span-8 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-black">Diagnostika</h3>
                <p className="text-xs font-semibold opacity-75">Tasvir + metadata + model tanlash</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-6 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                      setResult(null);
                      setError(null);
                    }}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-press w-full border border-dashed border-primary/35 rounded-2xl p-10 text-center hover:bg-primary/5"
                  >
                    <Upload className="w-8 h-8 mx-auto text-primary mb-2" />
                    <p className="font-black text-2xl md:text-3xl">Teri tasvirini yuklang</p>
                    <p className="text-xs opacity-70 font-semibold mt-2">Diagnostika boshlash uchun rasm kerak</p>
                  </button>

                  {previewUrl && (
                    <div className="border border-border rounded-2xl overflow-hidden aspect-video bg-black/[0.03]">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                <div className="xl:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Bemor ID" value={metadata.lesionId} onChange={(v) => setMetadata({ ...metadata, lesionId: v })} />
                  <Field label="Yosh" value={metadata.age} onChange={(v) => setMetadata({ ...metadata, age: v })} type="number" />
                  <SelectField label="Jins" value={metadata.sex} onChange={(v) => setMetadata({ ...metadata, sex: v })} options={["male", "female", "unknown"]} />
                  <Field label="Joylashuv" value={metadata.localization} onChange={(v) => setMetadata({ ...metadata, localization: v })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ModelCard
                  title="Asosiy model"
                  subtitle="Ko'p sinfli diagnostika"
                  active={activeModel === "default"}
                  onClick={() => setActiveModel("default")}
                />
                <ModelCard
                  title="New Skin"
                  subtitle="Kengaytirilgan tasniflash"
                  active={activeModel === "new_skin"}
                  onClick={() => setActiveModel("new_skin")}
                />
                <ModelCard
                  title="Eczema"
                  subtitle="Tezkor skrining"
                  active={activeModel === "eczema"}
                  onClick={() => setActiveModel("eczema")}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => runAnalysis(activeModel)} disabled={loading} className="btn-press px-6 py-2.5 rounded-xl premium-gradient text-white text-sm font-black disabled:opacity-60">
                  Diagnostika boshlash
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="btn-press px-5 py-2.5 rounded-xl border border-border text-sm font-black hover:border-primary/45">
                  Rasmni almashtirish
                </button>
                {loading && (
                  <p className="text-sm font-black text-primary flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Tahlil qilinmoqda...
                  </p>
                )}
              </div>

              {error && <ErrorBox message={error} />}

              {result && (
                <div className="surface-panel p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-black">Natija</p>
                      <p className="text-2xl font-black text-medical">{result.label}</p>
                    </div>
                    <div className="premium-gradient text-white rounded-xl px-4 py-2 font-black">{(result.confidence * 100).toFixed(1)}%</div>
                  </div>

                  <div className="space-y-2">
                    {result.top_3.map(([name, prob], i) => (
                      <div key={`${name}-${i}`}>
                        <div className="flex justify-between text-xs font-black"><span>{name}</span><span>{(prob * 100).toFixed(1)}%</span></div>
                        <div className="h-2 rounded-full bg-primary/10 overflow-hidden"><div className="h-full premium-gradient" style={{ width: `${prob * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>

                  {result.recommendation && (
                    <div className="rounded-xl border border-warning/40 bg-warning/15 p-3">
                      <p className="font-black text-sm">{result.recommendation.title}</p>
                      <p className="text-sm font-semibold opacity-80 mt-1">{result.recommendation.text}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="xl:col-span-4 space-y-4">
              <section className="medical-card p-4 border-primary/35">
                <h3 className="text-base font-black mb-3">Kasallik taqsimoti</h3>
                {dashboardLoading ? (
                  <div className="space-y-2">
                    <div className="skeleton h-8 rounded-xl" />
                    <div className="skeleton h-8 rounded-xl" />
                    <div className="skeleton h-8 rounded-xl" />
                  </div>
                ) : distribution.length === 0 ? (
                  <p className="text-sm font-semibold opacity-70">Hozircha ma'lumot yo'q.</p>
                ) : (
                  <div className="space-y-2">
                    {distribution.map(([name, count]) => {
                      const pct = Math.max(8, Math.round((count / dashboard.recent_cases.length) * 100));
                      return (
                        <div key={name} className="surface-panel p-3">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="truncate pr-2">{name}</span>
                            <span>{count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full premium-gradient" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="medical-card p-4 border-primary/35">
                <h3 className="text-base font-black mb-3">So'nggi holatlar</h3>
                {dashboardLoading ? (
                  <div className="space-y-2">
                    <div className="skeleton h-16 rounded-xl" />
                    <div className="skeleton h-16 rounded-xl" />
                  </div>
                ) : dashboard.recent_cases.length === 0 ? (
                  <p className="text-sm font-semibold opacity-70">Holatlar hali mavjud emas.</p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.recent_cases.slice(0, 4).map((entry) => (
                      <div key={`${entry.phone}-${entry.timestamp}`} className="surface-panel p-3">
                        <p className="font-black text-sm">{entry.top_label}</p>
                        <p className="text-xs font-semibold opacity-75">{entry.full_name || "Noma'lum"} • {entry.body_part}</p>
                        <p className="text-xs font-semibold opacity-70 mt-1">{entry.timestamp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>

        <PatientFloatButton />
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="surface-panel p-4">
      <div className="w-8 h-8 rounded-xl bg-primary/12 text-primary flex items-center justify-center">{icon}</div>
      <p className="text-[11px] uppercase tracking-[0.12em] font-black opacity-60 mt-3">{title}</p>
      {loading ? <div className="skeleton h-8 mt-2 rounded-lg" /> : <p className="text-3xl font-black mt-2">{value}</p>}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="space-y-1 block">
      <span className="text-[10px] uppercase tracking-[0.15em] font-black opacity-60">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-semibold bg-background outline-none focus:border-primary transition-colors"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="space-y-1 block">
      <span className="text-[10px] uppercase tracking-[0.15em] font-black opacity-60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-semibold bg-background outline-none focus:border-primary transition-colors"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function ModelCard({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`btn-press text-left rounded-2xl border p-4 transition-all ${active ? "border-primary/40 bg-primary/10" : "border-border hover:border-primary/40"}`}>
      <p className="font-black text-base">{title}</p>
      <p className="text-xs font-semibold opacity-75 mt-1">{subtitle}</p>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] mt-3 text-primary">{active ? "Tanlangan" : "Tanlash"}</p>
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-4 p-3 rounded-xl border border-danger/35 bg-danger/10 text-danger text-sm font-semibold flex items-start gap-2">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
