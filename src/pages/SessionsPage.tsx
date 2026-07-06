"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleHelp, Loader2, LogOut, Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { eidAuthEndpoint } from "@/lib/eid-api";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");
const ACTIVE_SESSIONS_ENDPOINT = eidAuthEndpoint("getActiveSessions");
const LOGOUT_SESSION_ENDPOINT = eidAuthEndpoint("logoutSession");
const LOGOUT_OTHERS_ENDPOINT = eidAuthEndpoint("logoutOtherSessions");

type SessionItem = {
  token_id: number;
  user_id: number;
  auth_type?: number;
  device_type?: "computer" | "phone" | "other";
  device_title?: string;
  is_current?: boolean;
  login_at?: string;
  expires_at?: string;
  user?: {
    id?: number;
    login?: string;
    nickname?: string;
    img_url?: string;
  };
};

function formatHumanDate(value?: string) {
  if (!value) return "Не указано";
  return new Date(value).toLocaleString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionIcon({ type }: { type?: SessionItem["device_type"] }) {
  if (type === "computer") return <Monitor className="h-4 w-4" />;
  if (type === "phone") return <Smartphone className="h-4 w-4" />;
  return <CircleHelp className="h-4 w-4" />;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentTokenId, setCurrentTokenId] = useState<number | null>(null);
  const [userLabel, setUserLabel] = useState("");
  const [error, setError] = useState("");
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [busyTokenId, setBusyTokenId] = useState<number | null>(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const loadSessions = async () => {
    const [currentUserRes, sessionsRes] = await Promise.all([
      axios.post(CURRENT_USER_ENDPOINT, new URLSearchParams()),
      axios.post(ACTIVE_SESSIONS_ENDPOINT, new URLSearchParams()),
    ]);

    if (!currentUserRes.data?.authorized || !currentUserRes.data?.user) {
      navigate("/", { replace: true });
      return;
    }

    setUserLabel(currentUserRes.data.user.nickname || currentUserRes.data.user.login || "");
    if (currentUserRes.data.user.light_mode) {
      setTheme(currentUserRes.data.user.light_mode);
    }
    setSessions(Array.isArray(sessionsRes.data?.sessions) ? sessionsRes.data.sessions : []);
    setCurrentTokenId(Number(sessionsRes.data?.current_token_id || currentUserRes.data?.token?.id || 0));
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        await loadSessions();
      } catch {
        if (mounted) navigate("/", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const revokeSession = async (tokenId: number) => {
    setBusyTokenId(tokenId);
    setError("");

    try {
      const form = new URLSearchParams();
      form.set("token_id", String(tokenId));
      const res = await axios.post(LOGOUT_SESSION_ENDPOINT, form);
      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось отозвать сессию");
      }

      if (tokenId === currentTokenId) {
        navigate("/", { replace: true });
        return;
      }

      await loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отозвать сессию");
    } finally {
      setBusyTokenId(null);
    }
  };

  const revokeOtherSessions = async () => {
    setLogoutAllLoading(true);
    setError("");

    try {
      const res = await axios.post(LOGOUT_OTHERS_ENDPOINT, new URLSearchParams());
      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось отозвать другие сессии");
      }
      await loadSessions();
      setLogoutAllOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отозвать другие сессии");
    } finally {
      setLogoutAllLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted p-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center font-semibold text-xl">
            <img className="mr-1 h-8 w-8" src="https://exesfull.com/img/10.svg" alt="" />
            Exesfull-ID
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
          <CardContent className="space-y-5 p-5">
            <Button variant="ghost" className="h-10 w-fit gap-2 px-2" onClick={() => navigate("/my")}>
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                  Сессии
                </p>
                <h1 className="text-2xl font-semibold leading-tight">Активные сессии</h1>
                {userLabel && (
                  <p className="text-sm text-muted-foreground">
                    {userLabel}
                  </p>
                )}
              </div>
              <Button className="h-11 shrink-0 gap-2" variant="outline" onClick={() => setLogoutAllOpen(true)}>
                <LogOut className="h-4 w-4" />
                Выйти везде кроме этой
              </Button>
            </div>

            <Separator />

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                Активные сессии не найдены
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.token_id}
                    className="rounded-2xl border border-border/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 rounded-full border border-border/70 p-2 text-muted-foreground">
                          <SessionIcon type={session.device_type} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">
                              {session.device_title || "Иное"}
                            </p>
                            {session.is_current && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                Это вы
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Вход: {formatHumanDate(session.login_at)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Истекает: {formatHumanDate(session.expires_at)}
                          </p>
                        </div>
                      </div>

                      <Button
                        className="shrink-0 gap-2"
                        variant="destructive"
                        size="sm"
                        onClick={() => void revokeSession(session.token_id)}
                        disabled={busyTokenId === session.token_id}
                      >
                        {busyTokenId === session.token_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        Выйти
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-50/80 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-200">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={logoutAllOpen} onOpenChange={setLogoutAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выйти из всех сессий кроме текущей?</DialogTitle>
            <DialogDescription>
              Мы отзовём все активные сессии, кроме той, с которой вы сейчас открыли страницу.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setLogoutAllOpen(false)} disabled={logoutAllLoading}>
              Отмена
            </Button>
            <Button variant="destructive" className="h-11 gap-2" onClick={() => void revokeOtherSessions()} disabled={logoutAllLoading}>
              {logoutAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Выйти везде кроме этой
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
