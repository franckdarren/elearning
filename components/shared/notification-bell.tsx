"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function timeAgo(iso: Date | string | null) {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - date.getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listMyNotifications().then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const r = payload.new as {
            id: string;
            type: string;
            title: string;
            body: string | null;
            link: string | null;
            is_read: boolean;
            created_at: string;
          };
          setItems((prev) => [
            {
              id: r.id,
              type: r.type,
              title: r.title,
              body: r.body,
              link: r.link,
              isRead: r.is_read,
              createdAt: new Date(r.created_at),
            },
            ...prev,
          ]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((i) => !i.isRead).length;

  function onItemClick(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)),
    );
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  function onMarkAll() {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    startTransition(() => {
      markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <Badge
              variant="default"
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full p-0 text-[10px]"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 ? (
            <button
              onClick={onMarkAll}
              className="text-xs font-normal text-zinc-500 hover:underline"
            >
              Tout marquer lu
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">Aucune notification.</p>
        ) : (
          <ul className="max-h-80 overflow-auto">
            {items.map((n) => {
              const body = (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    {!n.isRead ? (
                      <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    ) : null}
                  </div>
                  {n.body ? (
                    <p className="line-clamp-2 text-xs text-zinc-500">
                      {n.body}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-zinc-400">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              );
              const className =
                "block w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900";
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => onItemClick(n.id)}
                      className={className}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onItemClick(n.id)}
                      className={className}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
