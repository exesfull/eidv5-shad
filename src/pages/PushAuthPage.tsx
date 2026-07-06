"use client";

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const PENDING_AUTH_STORAGE_KEY = "eidPendingAuthUser";

type PendingAuthUser = {
  id?: number;
  login?: string;
  nickname?: string;
  email?: string;
};

export default function PushAuthPage() {
  const navigate = useNavigate();

  const pendingUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_AUTH_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PendingAuthUser) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!pendingUser?.id && !pendingUser?.login && !pendingUser?.email) {
      navigate("/", { replace: true });
    }
  }, [navigate, pendingUser]);

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
          <CardHeader className="text-center">
            <CardTitle>Вход в аккаунт через push уведомление</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button className="h-11 w-full justify-between gap-2" onClick={() => navigate("/push-auth/email")}>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-sm text-muted-foreground">
              Мы отправим код на почту, привязанную к вашему аккаунту.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
