"use client";

/* eslint-disable react/no-unescaped-entities */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleUser,
  CreditCard,
  History,
  ImagePlus,
  Info,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  MapPin,
  Moon,
  Phone,
  Save,
  Settings,
  Shield,
  Sparkles,
  Stethoscope,
  Sun,
  UserPlus,
} from "lucide-react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type ModelVariant = "default" | "new_skin" | "eczema";
type PatientTab = "home" | "history" | "doctor" | "profile";
type AuthMode = "login" | "register";
type ThemeMode = "light" | "dark";
type UploadStep = 1 | 2;

interface PredictionResponse {
  model_variant: string;
  label: string;
  confidence: number;
  top_3: [string, number][];
  warning?: string | null;
  comparison?: string | null;
  recommendation?: {
    risk_level: string;
    title: string;
    text: string;
    confidence_pct: number;
  } | null;
}

interface PatientCase {
  timestamp: string;
  full_name: string;
  father_name: string;
  age: number;
  sex: string;
  body_part: string;
  model_variant: string;
  prediction: Record<string, number>;
  recommendation?: {
    risk_level: string;
    title: string;
    text: string;
    confidence_pct: number;
  } | null;
  comparison?: string | null;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

function daysSince(timestamp: string | null): string {
  if (!timestamp) return "Tekshiruvlar hali mavjud emas";
  const target = new Date(timestamp).getTime();
  if (Number.isNaN(target)) return "Sana aniqlanmadi";
  const now = Date.now();
  const diff = Math.max(0, now - target);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Bugun tekshirilgan";
  return `${days} kun oldin`;
}

function getRiskTone(confidence: number): "safe" | "medium" | "danger" {
  if (confidence >= 0.75) return "danger";
  if (confidence >= 0.45) return "medium";
  return "safe";
}

export default function PatientPage() {
  const [showImageModal, setShowImageModal] = useState(false);
  const [historyPreview, setHistoryPreview] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [patientTab, setPatientTab] = useState<PatientTab>("home");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  const [loggedPhone, setLoggedPhone] = useState("");

  const [patientFile, setPatientFile] = useState<File | null>(null);
  const [patientPreview, setPatientPreview] = useState<string | null>(null);
  const [patientResult, setPatientResult] = useState<PredictionResponse | null>(null);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>(1);
  const [analysisStage, setAnalysisStage] = useState(0);

  const [age, setAge] = useState("30");
  const [sex, setSex] = useState("male");
  const [bodyPart, setBodyPart] = useState("face");
  const [model, setModel] = useState<ModelVariant>("eczema");

  const [historyItems, setHistoryItems] = useState<PatientCase[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");
  const [language, setLanguage] = useState("uz");
  const [profileOpen, setProfileOpen] = useState<"none" | "phone" | "password" | "language" | "appearance">("none");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  const patientFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedPhone = localStorage.getItem("patientPhone");
    if (storedPhone) {
      setLoggedPhone(storedPhone);
      setPhone(storedPhone);
    }

    const storedTheme = localStorage.getItem("patientTheme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeMode(storedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(themeMode);
    localStorage.setItem("patientTheme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (loggedPhone && patientTab === "history") {
      void loadHistory(loggedPhone);
    }
  }, [loggedPhone, patientTab]);

  useEffect(() => {
    if (!loading || patientResult) {
      setAnalysisStage(0);
      return;
    }

    const timer = setInterval(() => {
      setAnalysisStage((prev) => (prev >= 3 ? 3 : prev + 1));
    }, 900);

    return () => clearInterval(timer);
  }, [loading, patientResult]);

  const topPrediction = useMemo(() => {
    if (!patientResult) return null;
    return patientResult.top_3[0];
  }, [patientResult]);

  const latestHistory = useMemo(() => {
    if (historyItems.length === 0) return null;
    return historyItems[0];
  }, [historyItems]);

  const reminderText = useMemo(() => daysSince(latestHistory?.timestamp ?? null), [latestHistory]);

  const handleAuth = async () => {
    setLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    const normalizedPhone = phone.trim().replace(/\s+/g, "");

    try {
      if (authMode === "register") {
        const response = await axios.post(`${API_BASE}/api/patient/register`, {
          phone: normalizedPhone,
          password,
          confirm_password: confirmPassword,
        });
        // Ro'yxatdan o'tgandan so'ng avtomatik login va home pagega o'tkazish
        await axios.post(`${API_BASE}/api/patient/login`, { phone: normalizedPhone, password });
        localStorage.setItem("patientPhone", normalizedPhone);
        setLoggedPhone(normalizedPhone);
        setPatientTab("home");
        setPassword("");
        setConfirmPassword("");
        setAuthInfo("Ro'yxatdan o'tdingiz va tizimga kirdingiz.");
      } else {
        await axios.post(`${API_BASE}/api/patient/login`, { phone: normalizedPhone, password });
        localStorage.setItem("patientPhone", normalizedPhone);
        setLoggedPhone(normalizedPhone);
        setPatientTab("home");
        setPassword("");
        await loadHistory(normalizedPhone);
      }
    } catch (err: unknown) {
      setAuthError(getErrorMessage(err, "Autentifikatsiyada xatolik."));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("patientPhone");
    setLoggedPhone("");
    setPatientResult(null);
    setPatientPreview(null);
    setPatientFile(null);
    setAuthError(null);
    setAuthInfo(null);
    setPatientError(null);
  };

  const submitCase = async () => {
    if (!patientFile) {
      setPatientError("Avval teri rasmini tanlang.");
      return;
    }

    setPatientError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", patientFile);
      formData.append("phone", loggedPhone);
      formData.append("full_name", loggedPhone);
      formData.append("father_name", "-");
      formData.append("age", age);
      formData.append("sex", sex);
      formData.append("body_part", bodyPart);
      formData.append("model_variant", model);

      const response = await axios.post<PredictionResponse>(`${API_BASE}/api/patient/submit`, formData);
      setPatientResult(response.data);
      await loadHistory(loggedPhone);
    } catch (err: unknown) {
      setPatientError(getErrorMessage(err, "Tahlil yuborishda xatolik."));
    } finally {
      setLoading(false);
    }
  };

  const resetHomeToInitial = () => {
    setPatientResult(null);
    setPatientError(null);
    setPatientFile(null);
    setPatientPreview(null);
    setAge("30");
    setSex("male");
    setBodyPart("face");
    setModel("eczema");
    setUploadStep(1);
  };

  const loadHistory = async (targetPhone: string) => {
    setHistoryLoading(true);
    try {
      const response = await axios.get<PatientCase[]>(`${API_BASE}/api/patient/history/${encodeURIComponent(targetPhone)}`);
      setHistoryItems(response.data);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setPatientError(null);

    try {
      const response = await axios.post(`${API_BASE}/api/patient/change-password`, {
        phone: loggedPhone,
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: newConfirmPassword,
      });
      setAuthInfo(response.data.message || "Parol yangilandi.");
      setOldPassword("");
      setNewPassword("");
      setNewConfirmPassword("");
    } catch (err: unknown) {
      setPatientError(getErrorMessage(err, "Parolni yangilashda xatolik."));
    } finally {
      setLoading(false);
    }
  };

  if (!loggedPhone) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-6 md:px-6">
        <div className="max-w-md mx-auto space-y-4">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white ring-1 ring-primary/20 mx-auto shadow-lg">
              <img src="/brand-logo.png" alt="DermaLink logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black leading-tight tracking-tight">DermaLinkga xush kelibsiz</h1>
            <p className="text-sm font-semibold opacity-70 max-w-[280px] mx-auto">AI orqali teri holatini tezkor tekshirish uchun tizimga kiring yoki ro'yxatdan o'ting.</p>
          </div>

          <div className="medical-card p-5 border-primary/35">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setAuthMode("login")} className={`btn-press py-2.5 rounded-xl text-sm font-black border ${authMode === "login" ? "premium-gradient text-white border-transparent" : "border-border"}`}>
                <LogIn className="inline w-4 h-4 mr-1" /> Kirish
              </button>
              <button onClick={() => setAuthMode("register")} className={`btn-press py-2.5 rounded-xl text-sm font-black border ${authMode === "register" ? "bg-success text-white border-transparent" : "border-border"}`}>
                <UserPlus className="inline w-4 h-4 mr-1" /> Ro'yxatdan
              </button>
            </div>

            <div className="space-y-3">
              <Input label="Telefon raqam" value={phone} onChange={setPhone} placeholder="998901234567" icon={<Phone className="w-3.5 h-3.5" />} />
              <Input label="Parol" type="password" value={password} onChange={setPassword} icon={<Lock className="w-3.5 h-3.5" />} />
              {authMode === "register" && <Input label="Parolni takrorlang" type="password" value={confirmPassword} onChange={setConfirmPassword} icon={<Lock className="w-3.5 h-3.5" />} />}

              {authError && <ErrorBox message={authError} />}
              {authInfo && <InfoBox message={authInfo} />}

              <button onClick={handleAuth} disabled={loading} className="btn-press w-full py-2.5 rounded-xl premium-gradient text-white text-sm font-black disabled:opacity-60">
                {loading ? "Kutilmoqda..." : authMode === "register" ? "Ro'yxatdan o'tish" : "Kirish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-5 pb-24 md:pb-6 md:px-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="surface-panel p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white ring-1 ring-primary/20 shadow-lg">
                <img src="/brand-logo.png" alt="DermaLink logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black leading-tight flex items-center gap-2">DermaLink <Shield className="w-5 h-5 text-primary" /></h2>
                <p className="text-xs opacity-75 font-semibold">AI-based skin assistant</p>
              </div>
            </div>
            <button
              onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
              className="btn-press w-10 h-10 rounded-xl border border-border flex items-center justify-center text-primary hover:bg-primary/10"
              title={themeMode === "dark" ? "Kunduzgi rejim" : "Tungi rejim"}
            >
              {themeMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="hidden md:grid md:grid-cols-4 gap-3">
          <PatientNavButton active={patientTab === "home"} onClick={() => setPatientTab("home")} icon={<LayoutDashboard size={14} />} label="Home" />
          <PatientNavButton active={patientTab === "history"} onClick={() => setPatientTab("history")} icon={<History size={14} />} label="Tarix" />
          <PatientNavButton active={patientTab === "doctor"} onClick={() => setPatientTab("doctor")} icon={<CreditCard size={14} />} label="Shifokor" />
          <PatientNavButton active={patientTab === "profile"} onClick={() => setPatientTab("profile")} icon={<Settings size={14} />} label="Profil" />
        </div>

        {patientTab === "home" && (

          <div className="space-y-4">
            <div className="pt-2 pb-4">
              <p className="text-[11px] uppercase tracking-[0.18em] font-black text-primary mb-1">AI Skin Check</p>
              <h3 className="text-2xl md:text-3xl font-black mb-1">AI orqali teri holatini aniqlang</h3>
              <p className="text-sm md:text-base font-semibold opacity-80 mb-3 max-w-xl">Rasm yuklang, asosiy ma'lumotlarni kiriting va bir necha soniyada natija hamda tavsiyalarni oling.</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <button onClick={() => setPatientTab('history')} className="btn-press px-3 py-2 rounded-lg border border-border text-sm font-bold hover:border-primary/45 flex items-center gap-2"><History className="w-4 h-4" /> Tarix</button>
                <button onClick={() => setPatientTab('doctor')} className="btn-press px-3 py-2 rounded-lg border border-border text-sm font-bold hover:border-primary/45 flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Shifokor</button>
                <button onClick={() => { setPatientResult(null); setUploadStep(1); }} className="btn-press px-3 py-2 rounded-lg border border-primary/35 text-primary hover:bg-primary/10 text-sm font-bold flex items-center gap-2"><Sparkles className="w-4 h-4" /> Tahlilni boshlash</button>
              </div>
              <p className="text-xs uppercase tracking-[0.14em] font-black text-primary mt-2">Reminder</p>
              <p className="text-sm md:text-base font-semibold mt-1">Oxirgi tekshiruv: {reminderText}</p>
            </div>

            {loading && !patientResult && <AiLoadingStage stage={analysisStage} />}

            {!loading && !patientResult && (
              <section className="medical-card p-4 md:p-6 border-primary/35 space-y-4">
                <form onSubmit={e => { e.preventDefault(); submitCase(); }} className="space-y-4">
                  <input
                    ref={patientFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPatientFile(file);
                      setPatientPreview(URL.createObjectURL(file));
                      setPatientError(null);
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => patientFileInputRef.current?.click()} className="btn-press border border-dashed border-primary/40 rounded-2xl p-4 hover:bg-primary/5 flex flex-col items-center justify-center">
                      <ImagePlus className="w-7 h-7 text-primary mb-1" />
                      <span className="font-black text-base">Rasm yuklash</span>
                      <span className="text-xs opacity-70 font-semibold">Kamera yoki galereyadan tanlang</span>
                    </button>
                    {patientPreview && (
                      <div className="relative group cursor-pointer" style={{ width: 80, height: 80 }}>
                        <img src={patientPreview} alt="Patient preview" className="w-20 h-20 object-cover border border-border rounded-xl" onClick={() => setShowImageModal(true)} />
                        <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs rounded-xl transition">Katta ko'rish</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Yosh" type="number" value={age} onChange={setAge} icon={<Calendar className="w-3.5 h-3.5" />} />
                    <Select label="Jins" value={sex} onChange={setSex} options={["male", "female"]} />
                    <Select label="Teri qismi" value={bodyPart} onChange={setBodyPart} options={["face", "arm", "leg", "back", "chest", "neck", "hand"]} icon={<MapPin className="w-3.5 h-3.5" />} />
                    <Select label="Model" value={model} onChange={(v) => setModel(v as ModelVariant)} options={["eczema", "new_skin", "default"]} icon={<Shield className="w-3.5 h-3.5" />} />
                  </div>
                  <button type="submit" disabled={loading || !patientFile} className="btn-press w-full sm:w-auto px-6 py-2.5 rounded-xl premium-gradient text-white text-sm font-black disabled:opacity-60">Diagnostika boshlash</button>
                  {patientError && <ErrorBox message={patientError} />}
                </form>
                {/* Modal for large image preview */}
                {showImageModal && patientPreview && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImageModal(false)}>
                    <img src={patientPreview} alt="Katta ko'rinish" className="max-w-full max-h-[80vh] rounded-2xl border-4 border-white shadow-2xl" />
                  </div>
                )}
              </section>
            )}

            {!loading && patientResult && (
              <ResultPanel
                result={patientResult}
                preview={patientPreview}
                topPrediction={topPrediction}
                onRetry={resetHomeToInitial}
                onDoctor={() => setPatientTab("doctor")}
              />
            )}
          </div>
        )}

        {patientTab === "history" && (
          <div className="pt-2 pb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-black text-xl">Teri kasallik tarixi</h3>
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-bold">{historyItems.length} ta</span>
            </div>
            {historyLoading && (
              <div className="space-y-2">
                <div className="skeleton h-10 rounded" />
                <div className="skeleton h-10 rounded" />
                <div className="skeleton h-10 rounded" />
              </div>
            )}
            {!historyLoading && historyItems.length === 0 && (
              <div className="text-center py-8 opacity-70">
                <div className="mb-2">Tarix mavjud emas</div>
                <button onClick={() => setPatientTab("home")}
                  className="btn-press px-4 py-2 rounded border border-primary text-primary font-bold text-sm mt-2">
                  Tahlilni boshlash
                </button>
              </div>
            )}
            {!historyLoading && historyItems.length > 0 && (
              <div className="space-y-2">
                {historyItems.map((item, idx) => {
                  const top = Object.entries(item.prediction || {}).sort((a, b) => b[1] - a[1])[0];
                  const riskTone = getRiskTone(top?.[1] ?? 0);
                  return (
                    <div key={`${item.timestamp}-${idx}`} className="flex gap-3 items-center py-2 border-b border-border cursor-pointer group" onClick={() => { setHistoryPreview(patientPreview); setShowImageModal(true); }}>
                      {patientPreview && (
                        <img src={patientPreview} alt="Tarix preview" className="w-12 h-12 object-cover border border-border rounded group-hover:ring-2 group-hover:ring-primary transition" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-base">{top ? top[0] : "Noma'lum"}</span>
                          <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded ${riskTone === "danger" ? "risk-danger" : riskTone === "medium" ? "risk-medium" : "risk-safe"}`}>
                            {riskTone === "danger" ? "Yuqori" : riskTone === "medium" ? "O'rta" : "Past"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs mt-1 opacity-80">
                          <span>Qism: {item.body_part}</span>
                          <span>Yosh: {String(item.age)}</span>
                          <span>Jins: {item.sex}</span>
                          <span>Model: {item.model_variant}</span>
                        </div>
                        <div className="text-xs opacity-60 mt-1">{item.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
                {/* Modal for large image preview from history */}
                {showImageModal && historyPreview && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImageModal(false)}>
                    <img src={historyPreview} alt="Katta ko'rinish" className="max-w-full max-h-[80vh] rounded-2xl border-4 border-white shadow-2xl" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {patientTab === "doctor" && (
          <section className="medical-card p-5 md:p-6 border-success/35 bg-success/[0.06]">
            <h3 className="font-black text-xl">Mening shifokorim</h3>
            <p className="mt-1 font-semibold opacity-85 text-sm">Premium konsultatsiya orqali dermatolog bilan tez bog'laning.</p>
            <div className="mt-4 surface-panel p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] font-black text-success">Pullik obuna</p>
              <p className="text-3xl font-black mt-1">37 000 so'm / oy</p>
              <p className="text-sm font-semibold opacity-75 mt-2">Prioritet javob, shifokor chat va kengaytirilgan AI izohlarni oling.</p>
              <button className="btn-press mt-4 px-5 py-2.5 rounded-xl bg-success hover:brightness-95 text-white text-sm font-black">Obuna bo'lish</button>
            </div>
          </section>
        )}

        {patientTab === "profile" && (
          <section className="medical-card p-4 md:p-5 border-primary/35 space-y-4">
            <div className="surface-panel p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl premium-gradient text-white flex items-center justify-center">
                  <CircleUser className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-base">{loggedPhone}</p>
                  <p className="text-xs opacity-75 font-semibold">Faol foydalanuvchi</p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-black">Basic</span>
            </div>

            <ProfileListButton label="Telefon" onClick={() => setProfileOpen(profileOpen === "phone" ? "none" : "phone")} />
            {profileOpen === "phone" && <div className="surface-panel p-3 text-sm font-semibold">{loggedPhone}</div>}

            <ProfileListButton label="Parolni o'zgartirish" onClick={() => setProfileOpen(profileOpen === "password" ? "none" : "password")} />
            {profileOpen === "password" && (
              <div className="surface-panel p-4 space-y-3">
                <Input label="Eski parol" type="password" value={oldPassword} onChange={setOldPassword} icon={<Lock className="w-3.5 h-3.5" />} />
                <Input label="Yangi parol" type="password" value={newPassword} onChange={setNewPassword} icon={<Lock className="w-3.5 h-3.5" />} />
                <Input label="Yangi parolni takrorlang" type="password" value={newConfirmPassword} onChange={setNewConfirmPassword} icon={<Lock className="w-3.5 h-3.5" />} />
                <button onClick={handleChangePassword} disabled={loading} className="btn-press px-5 py-2.5 rounded-xl premium-gradient text-white text-sm font-black disabled:opacity-60">Parolni saqlash</button>
              </div>
            )}

            <ProfileListButton label="Tilni sozlash" onClick={() => setProfileOpen(profileOpen === "language" ? "none" : "language")} />
            {profileOpen === "language" && (
              <div className="surface-panel p-3">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-semibold bg-background outline-none focus:border-primary">
                  <option value="uz">O'zbekcha</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            )}

            <ProfileListButton label="Ko'rinish" onClick={() => setProfileOpen(profileOpen === "appearance" ? "none" : "appearance")} />
            {profileOpen === "appearance" && (
              <div className="surface-panel p-3 grid grid-cols-2 gap-3">
                <button onClick={() => setThemeMode("light")} className={`btn-press py-2.5 rounded-xl text-sm font-black border ${themeMode === "light" ? "premium-gradient text-white border-transparent" : "border-border"}`}>Kunduzgi</button>
                <button onClick={() => setThemeMode("dark")} className={`btn-press py-2.5 rounded-xl text-sm font-black border ${themeMode === "dark" ? "premium-gradient text-white border-transparent" : "border-border"}`}>Dark</button>
              </div>
            )}

            <button onClick={() => setShowLogoutConfirm(true)} className="btn-press w-full px-5 py-2.5 rounded-xl bg-danger hover:brightness-95 text-white text-sm font-black">Chiqish</button>

            {authInfo && <InfoBox message={authInfo} />}
            {patientError && <ErrorBox message={patientError} />}
          </section>
        )}

        <div className="fixed md:hidden left-0 right-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-3 py-2">
          <div className="grid grid-cols-4 gap-2 max-w-5xl mx-auto">
            <MobileNavButton active={patientTab === "home"} onClick={() => setPatientTab("home")} icon={<LayoutDashboard size={15} />} label="Home" />
            <MobileNavButton active={patientTab === "history"} onClick={() => setPatientTab("history")} icon={<History size={15} />} label="Tarix" />
            <MobileNavButton active={patientTab === "doctor"} onClick={() => setPatientTab("doctor")} icon={<CreditCard size={15} />} label="Shifokor" />
            <MobileNavButton active={patientTab === "profile"} onClick={() => setPatientTab("profile")} icon={<Settings size={15} />} label="Profil" />
          </div>
        </div>

        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-danger">Tasdiqlash</p>
              <h4 className="text-lg font-black mt-2">Rostdan ham chiqasizmi?</h4>
              <p className="text-sm font-semibold opacity-75 mt-1">Agar chiqib ketsangiz, qayta kirishingiz kerak bo'ladi.</p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button onClick={() => setShowLogoutConfirm(false)} className="btn-press py-2.5 rounded-xl border border-border text-sm font-black">Yo'q</button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="btn-press py-2.5 rounded-xl bg-danger hover:brightness-95 text-white text-sm font-black"
                >
                  Ha, chiqish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AiLoadingStage({ stage }: { stage: number }) {
  const steps = ["Rang tahlili", "Shakl aniqlash", "Pattern detection", "Model inference"];

  return (
    <section className="surface-panel p-5 md:p-6">
      <div className="flex items-center gap-2 text-primary">
        <Loader2 className="w-5 h-5 animate-spin" />
        <h4 className="font-black text-lg">Tahlil qilinmoqda...</h4>
      </div>
      <div className="mt-4 space-y-2.5">
        {steps.map((step, idx) => {
          const done = stage > idx;
          const active = stage === idx;
          return (
            <div key={step} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold flex items-center gap-2 ${done ? "border-success/40 bg-success/10" : active ? "border-primary/45 bg-primary/10 animate-pulse" : "border-border bg-muted/30"}`}>
              {done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <span className="w-4 h-4 rounded-full border border-border" />}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full premium-gradient transition-all duration-500" style={{ width: `${Math.min(100, (stage + 1) * 25)}%` }} />
      </div>
    </section>
  );
}

function ResultPanel({
  result,
  preview,
  topPrediction,
  onRetry,
  onDoctor,
}: {
  result: PredictionResponse;
  preview: string | null;
  topPrediction: [string, number] | null;
  onRetry: () => void;
  onDoctor: () => void;
}) {
  const confidence = topPrediction ? topPrediction[1] : result.confidence;
  const label = topPrediction ? topPrediction[0] : result.label;
  const risk = getRiskTone(confidence);

  return (
    <section className="medical-card p-4 md:p-6 border-primary/40 space-y-4">
      {preview && (
        <div className="border border-border rounded-2xl overflow-hidden aspect-video bg-black/[0.04]">
          <img src={preview} alt="Result preview" className="w-full h-full object-contain" />
        </div>
      )}

      <div className="surface-panel p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] font-black text-primary">Diagnosis</p>
        <div className="flex items-start justify-between gap-3 mt-1">
          <h3 className="text-2xl md:text-3xl font-black">{label}</h3>
          <span className={`text-xs px-3 py-1 rounded-full font-black ${risk === "danger" ? "risk-danger" : risk === "medium" ? "risk-medium" : "risk-safe"}`}>
            {risk === "danger" ? "Danger" : risk === "medium" ? "Medium" : "Safe"}
          </span>
        </div>
      </div>

      <div className="surface-panel p-4">
        <div className="flex items-center justify-between text-sm font-black">
          <span>Confidence</span>
          <span>{(confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-muted overflow-hidden">
          <div className={`h-full transition-all duration-700 ${risk === "danger" ? "bg-danger" : risk === "medium" ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.max(5, confidence * 100)}%` }} />
        </div>
      </div>

      <div className="surface-panel p-4 space-y-2">
        <p className="text-sm uppercase tracking-[0.14em] font-black text-primary">AI Explanation</p>
        <ul className="text-sm font-semibold opacity-85 space-y-1 list-disc pl-5">
          <li>Rang va tekstura bo'yicha model mos keluvchi patternlarni topdi.</li>
          <li>Shakl va chegaralar klassifikatsiya mezonlari bilan solishtirildi.</li>
          <li>Ehtimolliklar ichida eng yuqori natija tashxis sifatida tanlandi.</li>
        </ul>
      </div>

      <div className="surface-panel p-4">
        <p className="text-sm uppercase tracking-[0.14em] font-black text-primary">Recommendation</p>
        <p className="text-sm font-semibold mt-1 opacity-85">{result.recommendation?.text || "Aniq tashxis uchun dermatolog bilan maslahatlashish tavsiya etiladi."}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={onRetry} className="btn-press px-4 py-2.5 rounded-xl premium-gradient text-white text-sm font-black">Qayta tekshirish</button>
        <button onClick={onDoctor} className="btn-press px-4 py-2.5 rounded-xl border border-primary/35 text-primary hover:bg-primary/10 text-sm font-black">Shifokor bilan bog'lanish</button>
        <button className="btn-press px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 text-sm font-black inline-flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Saqlash</button>
      </div>
    </section>
  );
}

function QuickActionCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="btn-press surface-panel p-4 text-left hover:border-primary/40">
      <div className="w-8 h-8 rounded-xl bg-primary/12 text-primary flex items-center justify-center">{icon}</div>
      <p className="font-black text-base mt-3">{title}</p>
      <p className="text-xs font-semibold opacity-70 mt-1">{subtitle}</p>
    </button>
  );
}

function EmptyState({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="surface-panel p-6 text-center">
      <p className="font-black text-lg">{title}</p>
      <p className="text-sm font-semibold opacity-70 mt-1">{text}</p>
      <button onClick={onAction} className="btn-press mt-4 px-4 py-2.5 rounded-xl premium-gradient text-white text-sm font-black">{actionLabel}</button>
    </div>
  );
}

function StepChip({ active, done, number, label }: { active: boolean; done: boolean; number: number; label: string }) {
  return (
    <div className={`px-3 py-2 rounded-xl text-xs font-black border ${done ? "border-success/40 bg-success/10" : active ? "border-primary/45 bg-primary/10 text-primary" : "border-border"}`}>
      {done ? "Bajarildi" : `Step ${number}`}: {label}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] font-black opacity-60">{label}</p>
      <p className="text-xs font-semibold mt-1">{value}</p>
    </div>
  );
}

function ProfileListButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="btn-press w-full text-left border border-border rounded-xl p-3 font-black text-sm hover:border-primary/40">{label}</button>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-[0.14em] font-black opacity-60">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-3 opacity-50">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full border border-border rounded-xl py-2.5 text-sm font-semibold bg-background outline-none focus:border-primary transition-colors ${icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-[0.14em] font-black opacity-60">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-3 opacity-50">{icon}</span>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full border border-border rounded-xl py-2.5 text-sm font-semibold bg-background outline-none focus:border-primary transition-colors ${icon ? "pl-9 pr-3" : "px-3"}`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PatientNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`btn-press px-3 py-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 ${active ? "premium-gradient text-white border-transparent" : "border-border hover:border-primary/45"}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`btn-press px-2 py-2 rounded-xl border text-[10px] font-black flex flex-col items-center justify-center gap-1 transition-all ${active ? "premium-gradient text-white border-transparent" : "border-border text-foreground/70"}`}
    >
      {icon}
      <span className="leading-none">{label}</span>
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="p-2.5 rounded-xl border border-danger/35 bg-danger/10 text-danger text-xs font-semibold flex items-start gap-2">
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function InfoBox({ message }: { message: string }) {
  return (
    <div className="p-2.5 rounded-xl border border-primary/35 bg-primary/10 text-primary text-xs font-semibold flex items-start gap-2">
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
