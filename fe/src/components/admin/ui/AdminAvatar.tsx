import * as React from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";

/** Brand amber gradient used for avatars / primary chips. */
export const AMBER_GRADIENT = "linear-gradient(135deg, #FFB951 0%, #FF9800 100%)";

const SIZE_MAP: Record<string, { box: string; text: string; px: number }> = {
  xs: { box: "size-6", text: "text-[10px]", px: 24 },
  sm: { box: "size-8", text: "text-[11px]", px: 32 },
  md: { box: "size-9", text: "text-[13px]", px: 36 },
  lg: { box: "size-11", text: "text-[15px]", px: 44 },
  xl: { box: "size-14", text: "text-[18px]", px: 56 },
};

export interface AdminAvatarProps {
  /** Pre-computed initials, or derive from `name`. */
  initials?: string;
  name?: string;
  src?: string | null;
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

/** Round avatar — amber gradient with white initials, or an image when `src` is given. */
export function AdminAvatar({
  initials,
  name,
  src,
  size = "sm",
  className,
}: AdminAvatarProps) {
  const s = SIZE_MAP[size] ?? SIZE_MAP.sm;
  const text = initials ?? getInitials(name);

  if (src) {
    return (
      // Plain <img>: avatars come from arbitrary OAuth hosts (Google, Cloudinary…),
      // so next/image's host allowlist isn't a good fit here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        width={s.px}
        height={s.px}
        referrerPolicy="no-referrer"
        className={cn(s.box, "shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        s.box,
        s.text,
        "grid shrink-0 place-items-center rounded-full font-bold text-white",
        className
      )}
      style={{ background: AMBER_GRADIENT }}
    >
      {text}
    </span>
  );
}
