import Image from "next/image";
import { AlertTriangle, ArrowRight, Brain, CheckCircle2, HeartPulse, Sparkles, Stethoscope, Upload } from "lucide-react";

const teamMembers = [
  {
    image: "/Zokirov Bakirali loyiha asoschisi.jpg",
    firstName: "Zokirov",
    lastName: "Bakirali",
    role: "Loyiha asoschisi",
  },
  {
    image: "/Isroilov Samandar AI model ishlab chiquvchi.jpg",
    firstName: "Isroilov",
    lastName: "Samandar",
    role: "AI model ishlab chiquvchi",
  },
  {
    image: "/Yoqubjonov Ulug'bek backend dasturchi.jpg",
    firstName: "Yoqubjonov",
    lastName: "Ulug'bek",
    role: "Backend dasturchi",
  },
  {
    image: "/Abdumuratov Abdumannop frontend dasturchi.jpg",
    firstName: "Abdumuratov",
    lastName: "Abdumannop",
    role: "Frontend dasturchi",
  },
];

export default function PitchPage() {
  return (
    <main className="min-h-screen bg-[#F6FAFC] px-3 py-3 text-slate-900 lg:px-6">
      <section className="mx-auto w-full max-w-[1380px] overflow-hidden bg-white">
        <header className="flex items-center gap-2 border-b border-[#D8EDF5]/70 px-5 py-4">
          <div className="relative h-8 w-8">
            <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-[#8BD6E8]" />
            <span className="absolute left-3 top-0 h-3 w-3 rounded-full bg-[#6FC9DF]" />
            <span className="absolute left-5 top-3 h-3 w-3 rounded-full bg-[#48B6D3]" />
            <span className="absolute left-2 top-5 h-3 w-3 rounded-full bg-[#9DDFEC]" />
          </div>
          <h1 className="text-[2.2rem] font-black leading-none tracking-[-0.03em] text-[#0F2646]">DermaLink</h1>
        </header>

        <div className="relative bg-[radial-gradient(circle_at_78%_18%,rgba(84,192,220,0.18),transparent_44%),linear-gradient(180deg,#FFFFFF,#F8FCFE)] px-4 pb-3 pt-4 lg:px-6">
          <div className="grid gap-4 md:grid-cols-12 md:grid-rows-[auto_auto] md:items-start">
            <div className="p-3 md:col-span-8">
              <div className="grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-[#D8EDF5]/70">
                <div>
                  <p className="text-[1.42rem] font-black leading-tight text-[#122D52] md:text-[1.55rem]">
                    AI yordamida teri kasalliklarini tez va dastlabki baholash dasturi.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-[0.9rem] font-semibold text-[#35506F]">
                    <li>30 soniyada dastlabki AI tahlil</li>
                    <li>Risk darajasi bo&apos;yicha saralash</li>
                    <li>Doktorga tez yo&apos;naltirish</li>
                  </ul>
                </div>

                <div className="sm:pl-4">
                  <p className="text-[2rem] font-black tracking-[-0.03em] text-[#2D3446]">muammo</p>
                  <ul className="mt-2 space-y-2.5 text-[1rem] font-medium text-[#3B4252]">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-[#EF4444]" />
                      <span>Kech aniqlanish</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-[#EF4444]" />
                      <span>Skrining vositasi yetishmasligi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-[#EF4444]" />
                      <span>Vaqt va xarajat muammosi</span>
                    </li>
                  </ul>
                </div>

                <div className="sm:pl-4">
                  <p className="text-[2rem] font-black tracking-[-0.03em] text-[#2D3446]">yechim</p>
                  <ul className="mt-2 space-y-2.5 text-[1rem] font-medium text-[#3B4252]">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#10B981]" />
                      <span>AI qisqa muddatda tahlil qiladi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#10B981]" />
                      <span>Kasallik xavfini baholaydi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#10B981]" />
                      <span>Tez va qulay yo&apos;naltirish beradi</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-center md:col-span-4 md:row-span-2">
              <PhoneMockup />
            </div>

            <div className="border-t border-[#D8EDF5]/70 p-2 md:col-span-8">
              <p className="text-[0.82rem] font-black uppercase tracking-[0.18em] text-[#0D6C86]">Nega DermaLink</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3 sm:divide-x sm:divide-[#D8EDF5]/70">
                <div className="px-2 py-1">
                  <p className="text-[1.02rem] font-black leading-tight text-[#1E314C]">Bir necha soniyada natija chiqadi.</p>
                  <p className="mt-1 text-[0.9rem] font-semibold leading-snug text-[#426079]">Foydalanuvchi rasm yuklab, tezda risk darajasini ko&apos;ra oladi.</p>
                </div>
                <div className="px-2 py-1 sm:pl-4">
                  <p className="text-[1.02rem] font-black leading-tight text-[#1E314C]">Istalgan joyda tez foydalanish mumkin.</p>
                  <p className="mt-1 text-[0.9rem] font-semibold leading-snug text-[#426079]">Dermatologga borishdan oldin dastlabki tekshiruvni masofadan bajaradi.</p>
                </div>
                <div className="px-2 py-1 sm:pl-4">
                  <p className="text-[1.02rem] font-black leading-tight text-[#1E314C]">Arzon va ommabop yechim.</p>
                  <p className="mt-1 text-[0.9rem] font-semibold leading-snug text-[#426079]">Vaqt va xarajatni kamaytirib, tibbiy xizmatga kirishni yengillashtiradi.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-[#BFE1EE]/80 bg-[linear-gradient(158deg,#F8FCFE_20%,#E7F6FC_58%,#D7F0F8_100%)] px-4 pb-4 pt-3 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="flex w-full flex-nowrap items-center justify-between gap-2 border-b border-[#CFE7F1]/80 px-4 py-2 sm:px-8 md:px-10">
                <FlowNode icon={<Upload className="h-7 w-7" />} title="Upload" tone="blue" />
                <ArrowRight className="h-9 w-9 text-[#8A9AA8]" />
                <FlowNode icon={<Brain className="h-7 w-7" />} title="AI" tone="blue" />
                <ArrowRight className="h-9 w-9 text-[#8A9AA8]" />
                <FlowNode icon={<HeartPulse className="h-7 w-7" />} title="Risk" tone="amber" />
                <ArrowRight className="h-9 w-9 text-[#8A9AA8]" />
                <FlowNode icon={<Stethoscope className="h-7 w-7" />} title="Doctor" tone="green" />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3 md:divide-x md:divide-[#D8EDF5]/70">
                <div className="p-2">
                  <p className="text-[1.6rem] font-black text-[#2A3850]">MVP</p>
                  <ul className="mt-1.5 space-y-1.5 text-[1.05rem] font-semibold text-[#3C4B62]">
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[#18A86D]" /> Rasm yuklash va AI tahlil ishlaydi</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[#18A86D]" /> Risk darajasi va tavsiya chiqaradi</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[#18A86D]" /> Doktor konsultatsiyasiga yo&apos;naltiradi</li>
                  </ul>
                </div>

                <div className="p-2 md:pl-4">
                  <p className="text-[1.6rem] font-black text-[#2A3850]">Biznes model</p>
                  <ul className="mt-1.5 space-y-1.5 text-[1.05rem] font-semibold text-[#3C4B62]">
                    <li>B2C premium obuna (oylik va yillik)</li>
                    <li>Doktor konsultatsiyasidan komissiya</li>
                    <li>Klinikalar uchun SaaS litsenziya</li>
                  </ul>
                </div>

                <div className="p-2 md:pl-4">
                  <p className="text-[1.6rem] font-black text-[#2A3850]">Kelajak rejalari</p>
                  <ul className="mt-1.5 space-y-1.5 text-[1.05rem] font-semibold text-[#3C4B62]">
                    <li>15+ teri kasalligi sinfini qamrab olish</li>
                    <li>Model aniqligini multimodal yondashuv bilan oshirish</li>
                    <li>Pilot klinikalar orqali bozorga chiqish</li>
                  </ul>
                </div>
              </div>
            </div>

            <aside className="border-t border-[#D8EDF5]/70 pt-3 lg:col-span-4 lg:border-l lg:border-t-0 lg:border-[#D8EDF5]/70 lg:pl-4 lg:pt-0">
              <p className="text-center text-[0.9rem] font-black uppercase tracking-[0.25em] text-[#0D6C86]">Jamoa</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-4">
                {teamMembers.map((member) => (
                  <div key={member.image} className="text-center">
                    <div className="mx-auto h-[112px] w-[112px] overflow-hidden rounded-full border-2 border-white shadow-[0_10px_20px_-10px_rgba(2,6,23,0.8)]">
                      <Image src={member.image} alt={`${member.firstName} ${member.lastName}`} width={112} height={112} className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-1 text-[0.9rem] font-black leading-tight text-[#142844]">{member.firstName}</p>
                    <p className="text-[0.9rem] font-black leading-tight text-[#142844]">{member.lastName}</p>
                    <p className="text-[0.68rem] font-semibold text-[#1D7A8B]">{member.role}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="mt-3 border-t border-[#D8EDF5]/70 px-4 py-2 text-center text-[1.35rem] font-black text-[#172A46]">
            DermaLink - teri salomatligini AI yordamida erta, tez va ishonchli boshqarish yechimi.
          </div>
        </div>
      </section>
    </main>
  );
}

function FlowNode({
  icon,
  title,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "blue" | "amber" | "green";
}) {
  const toneClass =
    tone === "blue"
      ? "border-[#93D7E8] text-[#2E9AB6]"
      : tone === "amber"
        ? "border-[#F5C27A] text-[#E0872A]"
        : "border-[#9BDCCB] text-[#2FA386]";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full border-[3px] bg-white ${toneClass}`}>{icon}</div>
      <p className="text-[1.55rem] font-black leading-none text-[#2E3A50]">{title}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[272px] rounded-[34px] border-[5px] border-[#1D2C43] bg-[#F7FBFD] p-2 shadow-[0_25px_45px_-20px_rgba(2,6,23,0.45)]">
      <div className="absolute left-1/2 top-0.5 h-4 w-24 -translate-x-1/2 rounded-b-2xl bg-[#1D2C43]" />
      <div className="relative overflow-hidden rounded-[24px] border border-[#BFDCE8] bg-[#F2FAFD] px-4 pb-3 pt-4 text-[#0F2B4D]">
        <h3 className="text-[1.55rem] font-black leading-[0.95] text-[#0C2A4A]">AI orqali teri holatini aniqlang</h3>
        <p className="mt-2 text-[0.9rem] font-semibold leading-snug text-[#465D73]">
          Rasmni yuklang, asosiy ma&apos;lumotlarni kiriting va tavsiyalarni oling.
        </p>

        <button className="mt-3 rounded-[14px] bg-gradient-to-r from-[#1FAFC2] to-[#1ED0A9] px-4 py-2 text-[1.05rem] font-black text-white">
          Tahlilni boshlash
        </button>

        <div className="mt-3 border-t border-[#CBE6F0] pt-2.5">
          <div className="flex items-start gap-2 border-b border-[#D8EDF5] pb-2.5">
            <Sparkles className="mt-0.5 h-5 w-5 text-[#14A9C5]" />
            <div>
              <p className="text-[1.02rem] font-black leading-none text-[#0F2B4D]">Oxirgi natija</p>
              <p className="mt-1 text-[0.82rem] font-semibold text-[#5A6F83]">Profilaktik kuzatuv tavsiya etiladi</p>
            </div>
          </div>

          <div className="flex items-start gap-2 border-b border-[#D8EDF5] py-2.5">
            <Brain className="mt-0.5 h-5 w-5 text-[#14A9C5]" />
            <div>
              <p className="text-[1.02rem] font-black leading-none text-[#0F2B4D]">Tarix</p>
              <p className="mt-1 text-[0.82rem] font-semibold text-[#5A6F83]">Oldingi tekshiruvlar</p>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2.5">
            <Stethoscope className="mt-0.5 h-5 w-5 text-[#14A9C5]" />
            <div>
              <p className="text-[1.02rem] font-black leading-none text-[#0F2B4D]">Shifokor</p>
              <p className="mt-1 text-[0.82rem] font-semibold text-[#5A6F83]">Mutaxassisga yo&apos;naltirish</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 border-t border-[#CBE6F0] pt-2 text-center">
          <p className="text-[0.82rem] font-black text-[#1DBFAF]">Home</p>
          <p className="text-[0.82rem] font-black text-[#607486]">Tarix</p>
          <p className="text-[0.82rem] font-black text-[#607486]">Shifokor</p>
          <p className="text-[0.82rem] font-black text-[#607486]">Profil</p>
        </div>
      </div>
    </div>
  );
}
