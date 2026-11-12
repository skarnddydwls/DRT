import Image from "next/image";

export default function Footer() {
  return (
    <footer className="min-h-[88px] border-t border-slate-200 bg-white px-4 py-2 flex justify-center items-center shrink-0">
      <Image src="/kict-logo.png" alt="KICT 한국건설기술연구원" width={216} height={80}
        className="h-auto w-[216px] max-w-full object-contain" />
    </footer>
  );
}
