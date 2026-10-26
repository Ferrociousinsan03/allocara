import logo from "@/assets/allocara-logo.png.asset.json";

export function BrandLogo({ size = 34, alt = "Allocara logo" }: { size?: number; alt?: string }) {
  return (
    <img
      src={logo.url}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-md"
      loading="eager"
    />
  );
}
