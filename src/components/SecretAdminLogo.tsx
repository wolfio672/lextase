"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

const CLICK_THRESHOLD = 3;
const CLICK_WINDOW_MS = 1500;
const IDLE_NAVIGATE_MS = 450;

/**
 * Acts like a normal logo link to /feed on a single click. 3 clicks within
 * 1.5s, only honored for admin/founder accounts, jumps to /admin instead —
 * the admin area has no visible nav entry on purpose.
 */
export function SecretAdminLogo({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const router = useRouter();
  const clickTimestamps = useRef<number[]>([]);
  const idleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (idleTimeout.current) clearTimeout(idleTimeout.current);

    const now = Date.now();
    clickTimestamps.current = [...clickTimestamps.current.filter((t) => now - t < CLICK_WINDOW_MS), now];

    if (canAccessAdmin && clickTimestamps.current.length >= CLICK_THRESHOLD) {
      clickTimestamps.current = [];
      router.push("/admin");
      return;
    }

    idleTimeout.current = setTimeout(() => {
      clickTimestamps.current = [];
      router.push("/feed");
    }, IDLE_NAVIGATE_MS);
  }

  return (
    <a
      href="/feed"
      onClick={handleClick}
      className="font-[family-name:var(--font-display)] text-xl italic select-none"
    >
      L&rsquo;extase
    </a>
  );
}
