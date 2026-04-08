/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import DoctorSidebar from "@/components/DoctorSidebar";
import PatientFloatButton from "@/components/PatientFloatButton";
import DoctorTopNav from "@/components/DoctorTopNav";

const ACTION_ITEMS = [
  {
    title: "Yangi tekshiruv ochish",
    text: "Rasm yuklash, metadata kiritish va model tanlash orqali tezkor tahlil boshlang.",
    startHref: "/",
    viewHref: "/doctor/history",
  },
  {
    title: "Natijani bemorga tushuntirish",
    text: "Tashxis ehtimoli va tavsiyalar asosida keyingi klinik qadamlarni belgilang.",
    startHref: "/doctor/patients",
    viewHref: "/doctor/history",
  },
  {
    title: "Dinamik kuzatuv",
    text: "Oldingi va joriy natijalarni taqqoslab holatdagi o'zgarishni nazorat qiling.",
    startHref: "/doctor/history",
    viewHref: "/doctor/patients",
  },
  {
    title: "Model bo'yicha qaror",
    text: "Klinik vaziyatga qarab asosiy, new skin yoki eczema modelini faollashtiring.",
    startHref: "/doctor/models",
    viewHref: "/doctor/models",
  },
];

export default function DoctorActionsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex">
      <DoctorSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden pb-24">
        <div className="max-w-[1400px] mx-auto space-y-5">
          <DoctorTopNav />

          <header>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Doctor / Doktor amallari</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Ish jarayoni</h2>
          </header>

          <section className="medical-card p-4 md:p-7 border-primary/35 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {ACTION_ITEMS.map((item) => (
              <div key={item.title} className="surface-panel p-4">
                <p className="font-black text-base">{item.title}</p>
                <p className="text-xs font-semibold opacity-80 mt-2">{item.text}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Link href={item.startHref} className="btn-press text-center py-2.5 rounded-xl premium-gradient text-white text-xs font-black">
                    Boshlash
                  </Link>
                  <Link href={item.viewHref} className="btn-press text-center py-2.5 rounded-xl border border-border hover:border-primary/40 text-xs font-black">
                    Ko'rish
                  </Link>
                </div>
              </div>
            ))}
          </section>
        </div>

        <PatientFloatButton />
      </main>
    </div>
  );
}
