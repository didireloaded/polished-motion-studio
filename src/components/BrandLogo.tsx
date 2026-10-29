export function BrandLogo({
  className = "h-7",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <img
      src={dark ? "/brand/mutal-horizontal-dark.png" : "/brand/mutal-horizontal.png"}
      alt="Mutal"
      className={`w-auto object-contain ${className}`}
    />
  );
}
