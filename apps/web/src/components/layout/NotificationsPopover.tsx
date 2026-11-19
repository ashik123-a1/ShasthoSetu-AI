import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuth } from "../../lib/authContext";
import { useI18n } from "../../lib/i18n";

interface NotificationRow {
  id: string;
  topic: string;
  title_bn: string;
  title_en: string;
  read_at_utc: string | null;
  created_at_utc: string;
}

export function NotificationsPopover({
  darkOverlay = false,
  variant = "standalone",
}: {
  darkOverlay?: boolean;
  variant?: "standalone" | "capsule";
}) {
  const { authenticated } = useAuth();
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);

  const loadNotifications = async () => {
    if (!authenticated) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const res = await apiGet<{ notifications: NotificationRow[]; unread_count: number }>("/v1/notifications");
      setItems(res.notifications || []);
      setUnread(res.unread_count || 0);
    } catch {
      // Ignore quietly if logged out mid-flight
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [authenticated]);

  const markRead = async (id: string) => {
    try {
      await apiPost(`/v1/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at_utc: new Date().toISOString() } : n)));
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  };

  const btnClasses =
    variant === "capsule"
      ? `relative min-h-11 min-w-11 px-2.5 rounded-full flex items-center justify-center transition cursor-pointer ${
          darkOverlay
            ? "bg-white/5 hover:bg-white/15 border border-white/15 text-slate-100"
            : "bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)]"
        }`
      : `relative min-h-11 min-w-11 px-2.5 rounded-full flex items-center justify-center border transition cursor-pointer ${
          darkOverlay
            ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
        }`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void loadNotifications();
        }}
        aria-label={t("portal.notifications")}
        data-testid="notifications-bell-btn"
        className={btnClasses}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xl p-3 z-50"
          role="region"
          aria-label={t("portal.notifications")}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)]">
            <span className="font-semibold text-sm">{t("portal.notifications")}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{unread} unread</span>
          </div>

          {!authenticated ? (
            <p className="text-xs text-[var(--color-text-muted)] py-3">
              {locale === "bn"
                ? "ব্যক্তিগত অ্যাপয়েন্টমেন্ট ও রিমাইন্ডার বিজ্ঞপ্তি দেখতে লগইন করুন।"
                : "Sign in to receive appointment, prescription & support notifications."}
            </p>
          ) : items.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-3">{t("portal.noNotifications")}</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {items.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className={`p-2.5 rounded-xl border text-xs ${
                    n.read_at_utc
                      ? "border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 opacity-80"
                      : "border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]"
                  }`}
                >
                  <p className="font-medium text-[var(--color-text)]">
                    {locale === "bn" ? n.title_bn : n.title_en}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-[var(--color-text-muted)]">
                    <span>{n.topic}</span>
                    {!n.read_at_utc && (
                      <button
                        type="button"
                        onClick={() => void markRead(n.id)}
                        className="inline-flex items-center gap-1 text-[var(--color-primary)] font-semibold hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
