// koblop-wordmark. Altid med småt, Excon brand-font.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      style={{ fontFamily: "var(--font-excon)" }}
      className={`font-black lowercase tracking-tight ${className}`}
    >
      koblop
    </span>
  );
}
