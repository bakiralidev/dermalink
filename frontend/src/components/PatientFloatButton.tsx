import Link from "next/link";

export default function PatientFloatButton() {
  return (
    <Link
      href="/patient"
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 px-4 py-3 rounded-xl premium-gradient text-white text-xs md:text-sm font-black text-center shadow-xl btn-press"
    >
      Bemor panel
    </Link>
  );
}
