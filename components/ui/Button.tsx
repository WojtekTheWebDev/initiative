"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { Icon, type IconName } from "./icons";

export type Tone = "default" | "primary" | "danger";

const BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-medium select-none motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const TONES: Record<Tone, string> = {
  default: "border-hud-line bg-white/5 text-hud-fg hover:border-hud-gold/60 hover:bg-white/10",
  primary: "border-hud-gold bg-hud-gold text-[#1b1408] hover:bg-[#e6c477]",
  danger: "border-hud-danger/60 bg-hud-danger/10 text-[#ff9a9d] hover:bg-hud-danger/20",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  /** An icon before the label. */
  icon?: IconName;
  ref?: Ref<HTMLButtonElement>;
};

/** A HUD button with a text label. `type` defaults to "button". */
export function Button({ tone = "default", icon, className = "", children, ...props }: ButtonProps) {
  const IconSvg = icon && Icon[icon];
  return (
    <button
      type="button"
      className={`${BASE} h-9 rounded-[10px] px-3.5 text-sm ${TONES[tone]} ${className}`}
      {...props}
    >
      {IconSvg && <IconSvg className="size-4" />}
      {children}
    </button>
  );
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** The accessible name, also shown as the tooltip. */
  label: string;
  icon: IconName;
  tone?: Tone;
  ref?: Ref<HTMLButtonElement>;
};

/** A square button with only an icon. `label` names it for screen readers and as its tooltip. */
export function IconButton({ label, icon, tone = "default", className = "", title, ...props }: IconButtonProps) {
  const IconSvg = Icon[icon];
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={`${BASE} size-9 rounded-[10px] ${TONES[tone]} ${className}`}
      {...props}
    >
      <IconSvg className="size-[18px]" />
    </button>
  );
}

/** How long the "click again" state lasts before it disarms itself. */
const CONFIRM_MS = 4000;

/**
 * A destructive button that needs two clicks. The first arms it and swaps in
 * `confirmLabel`, which must say clearly that the action can't be undone; the
 * second runs `onConfirm`. It disarms itself after a few seconds or on blur.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  icon,
  disabled,
  className = "",
}: {
  children: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void;
  icon?: IconName;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      tone="danger"
      icon={icon}
      disabled={disabled}
      aria-live="polite"
      className={`${armed ? "border-hud-danger! bg-hud-danger! text-white!" : ""} ${className}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
