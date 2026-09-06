const DARK_TILE = `${process.env.PUBLIC_URL}/logo-mark-dark.svg`;
const LIGHT_TILE = `${process.env.PUBLIC_URL}/logo-mark-light.svg`;

type LogoMarkProps = {
  className?: string;
};

/**
 * Fyndr aperture-smile mark. Dark tile on light UI, light tile on dark UI,
 * swapped purely with the existing `dark:` variant — no JS theme reads.
 */
export function LogoMark({ className = "h-[32px] w-[32px]" }: LogoMarkProps) {
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 ${className}`}>
      <img src={DARK_TILE} alt="" draggable={false} className="h-full w-full dark:hidden" />
      <img src={LIGHT_TILE} alt="" draggable={false} className="hidden h-full w-full dark:block" />
    </span>
  );
}
