import type { JSX, ReactNode, SVGProps } from "react";

export type IconName =
  | "swords"
  | "trophy"
  | "plus"
  | "warn"
  | "close"
  | "dots"
  | "pen"
  | "crown"
  | "shears"
  | "zoomIn"
  | "zoomOut"
  | "fit"
  | "help"
  | "chevronLeft"
  | "chevronRight"
  | "undo"
  | "search"
  | "chevronDown"
  | "check"
  | "save"
  | "load"
  | "newGame"
  | "file";

type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element;

/**
 * One line icon on a 24-unit grid, drawn with `currentColor` and sized to the
 * text (1em) unless `width` and `height` say otherwise. Decorative by default:
 * give the control around it the accessible name.
 */
function icon(name: IconName, paths: ReactNode): IconComponent {
  function IconSvg(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        data-icon={name}
        {...props}
      >
        {paths}
      </svg>
    );
  }
  return IconSvg;
}

/** The HUD's icon set. Use as `<Icon.swords className="size-5" />`. */
export const Icon: Record<IconName, IconComponent> = {
  swords: icon(
    "swords",
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
      <path d="M14.5 6.5 18 3h3v3l-3.5 3.5" />
      <path d="m5 14 4 4M7 17l-3 3M3 19l2 2" />
    </>,
  ),
  trophy: icon(
    "trophy",
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5.5h2.5V7a3.5 3.5 0 0 1-3.2 3.5M7 5.5H4.5V7a3.5 3.5 0 0 0 3.2 3.5" />
      <path d="M12 14v3.5M8.5 21h7M9.5 17.5h5V21h-5z" />
    </>,
  ),
  plus: icon("plus", <path d="M12 5v14M5 12h14" />),
  warn: icon(
    "warn",
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>,
  ),
  close: icon("close", <path d="M6 6l12 12M18 6 6 18" />),
  dots: icon(
    "dots",
    <g fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </g>,
  ),
  pen: icon(
    "pen",
    <>
      <path d="M16.9 3.6a2.6 2.6 0 0 1 3.6 3.6L7.6 20.1 3 21l.9-4.6L16.9 3.6Z" />
      <path d="m14.5 6 3.5 3.5" />
    </>,
  ),
  crown: icon(
    "crown",
    <>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8Z" />
      <path d="M5 21h14" />
    </>,
  ),
  shears: icon(
    "shears",
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
    </>,
  ),
  zoomIn: icon(
    "zoomIn",
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4M11 8v6M8 11h6" />
    </>,
  ),
  zoomOut: icon(
    "zoomOut",
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4M8 11h6" />
    </>,
  ),
  fit: icon("fit", <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />),
  help: icon(
    "help",
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 2.6M12 17h.01" />
    </>,
  ),
  chevronLeft: icon("chevronLeft", <path d="m15 18-6-6 6-6" />),
  chevronRight: icon("chevronRight", <path d="m9 18 6-6-6-6" />),
  undo: icon(
    "undo",
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>,
  ),
  search: icon(
    "search",
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>,
  ),
  chevronDown: icon("chevronDown", <path d="m6 9 6 6 6-6" />),
  check: icon("check", <path d="m5 12 5 5 9-10" />),
  save: icon("save", <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />),
  load: icon("load", <path d="M12 15V3M7 8l5-5 5 5M4 20h16" />),
  newGame: icon("newGame", <path d="M12 3l2.2 5.6 5.8.7-4.5 3.9 1.4 5.8L12 16l-4.9 3 1.4-5.8L4 9.3l5.8-.7L12 3Z" />),
  file: icon(
    "file",
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v4h4M9 13h6M9 17h6" />
    </>,
  ),
};
