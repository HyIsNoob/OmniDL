export function BrutalPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-4 border-[#111] bg-[#fffef8] shadow-[8px_8px_0_0_#111] transition-shadow hover:shadow-[10px_10px_0_0_#111] ${className}`}
    >
      {children}
    </div>
  );
}
