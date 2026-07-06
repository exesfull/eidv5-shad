"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Monitor, Shield, User } from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { eidAuthEndpoint } from "@/lib/eid-api";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");

type MyUser = {
  id: number;
  login: string;
  nickname: string;
  img_url?: string | null;
  light_mode?: "system" | "light" | "dark";
};

export default function MyPage() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MyUser | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);

    try {
      await axios.post(eidAuthEndpoint("logout"), new URLSearchParams());
      setLogoutOpen(false);
      navigate("/", { replace: true });
    } catch {
      setLogoutLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await axios.post(CURRENT_USER_ENDPOINT, new URLSearchParams());
        if (!mounted) return;

        if (!res.data?.authorized || !res.data?.user) {
          navigate("/", { replace: true });
          return;
        }

        setUser({
          id: res.data.user.id,
          login: res.data.user.login,
          nickname: res.data.user.nickname,
          img_url: res.data.user.img_url,
          light_mode: res.data.user.light_mode,
        });
        if (res.data.user.light_mode) {
          setTheme(res.data.user.light_mode);
        }
      } catch {
        if (mounted) navigate("/", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [navigate]);

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
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col items-center gap-4">
              {loading ? (
                <>
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-6 w-36" />
                </>
              ) : (
                <>
                  <AvatarWithLoader
                    src={user?.img_url || undefined}
                    alt={user?.nickname || user?.login || "profile"}
                    size="xl"
                    fallback={
                      <span className="text-2xl font-semibold text-muted-foreground">
                        {user?.nickname?.[0]?.toUpperCase() || user?.login?.[0]?.toUpperCase() || "U"}
                      </span>
                    }
                  />
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                      Профиль
                    </p>
                    <h1 className="text-2xl font-semibold leading-tight">
                      {user?.nickname || user?.login}
                    </h1>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <Button variant="outline" className="h-11 w-full gap-2" disabled>
                <ArrowRight className="h-4 w-4" />
                Сменить аккаунт
              </Button>

              <Button className="h-11 w-full gap-2" onClick={() => navigate("/my/profile")}>
                <User className="h-4 w-4" />
                Профиль
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button className="h-11 gap-2" variant="outline" onClick={() => navigate("/my/security")}>
                  <Shield className="h-4 w-4" />
                  Безопасность
                </Button>

                <Button className="h-11 gap-2" variant="outline" onClick={() => navigate("/security/sessions")}>
                  <Monitor className="h-4 w-4" />
                  Сеансы
                </Button>
              </div>

              <Button variant="destructive" className="h-11 w-full gap-2" onClick={() => setLogoutOpen(true)}>
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выйти из аккаунта?</DialogTitle>
            <DialogDescription>
              Мы отзовём текущий eidTD токен и вернём вас на страницу авторизации.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setLogoutOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" className="h-11" onClick={() => void handleLogout()} disabled={logoutLoading}>
              {logoutLoading ? "Выходим..." : "Да, выйти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
