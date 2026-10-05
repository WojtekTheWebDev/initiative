import type { ComponentProps, ElementType } from "react";

type GlassProps<T extends ElementType> = { as?: T; className?: string } & Omit<ComponentProps<T>, "as" | "className">;

/**
 * A HUD surface: translucent dark glass with a backdrop blur, a gold hairline
 * edge and the HUD radius (the `hud-glass` utility in app/globals.css, opaque
 * where backdrop blur isn't supported). Renders a `div` unless `as` says otherwise.
 */
export function Glass<T extends ElementType = "div">({ as, className = "", ...props }: GlassProps<T>) {
  const Tag: ElementType = as ?? "div";
  return <Tag className={`hud-glass ${className}`} {...props} />;
}
