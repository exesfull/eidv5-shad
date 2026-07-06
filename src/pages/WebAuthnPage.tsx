"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { eidAuthEndpoint } from "@/lib/eid-api";
import {
  normalizeGetOptions,
  serializeGetCredential,
} from "@/lib/webauthn";

const START_WEBAUTHN_LOGIN_ENDPOINT = eidAuthEndpoint("startWebauthnLogin");
const FINISH_WEBAUTHN_LOGIN_ENDPOINT = eidAuthEndpoint("finishWebauthnLogin");

export default function WebAuthnPage() {
  const navigate = useNavigate();
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [status, setStatus] = useState<"checking" | "loading" | "success" | "error">("checking");
  const [error, setError] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [hint, setHint] = useState("Подтвердите вход с помощью Face ID, Touch ID, отпечатка или ключа безопасности");

  const handleWebAuthn = async () => {
    setStatus("loading");
    setError("");
    setShowFallback(false);
    setHint("Подтвердите вход с помощью Face ID, Touch ID, отпечатка или ключа безопасности");

    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn не поддерживается в этом браузере");
      }

      const startRes = await axios.post(START_WEBAUTHN_LOGIN_ENDPOINT, new URLSearchParams());
      if (!startRes.data?.status) {
        throw new Error(startRes.data?.error || "Не удалось начать вход по биометрии");
      }

      const options = normalizeGetOptions(startRes.data?.publicKey);
      const credential = (await navigator.credentials.get({
        publicKey: options,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("Вход по биометрии был отменён");
      }

      const finishPayload = serializeGetCredential(credential as any);
      const finishForm = new URLSearchParams();
      finishForm.set("credential", JSON.stringify(finishPayload));

      const finishRes = await axios.post(FINISH_WEBAUTHN_LOGIN_ENDPOINT, finishForm);
      if (!finishRes.data?.status) {
        throw new Error(finishRes.data?.error || "Не удалось завершить вход");
      }

      setStatus("success");
      setHint("Вход выполнен успешно");
      setTimeout(() => {
        window.location.href = "https://id.exesfull.com/oauth/api/esm/v5/eid/auth/redirect";
      }, 1200);
    } catch (err) {
      setStatus("error");
      setShowFallback(true);

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Вход отменён или подтверждение не прошло");
        } else if (err.name === "NotSupportedError") {
          setError("WebAuthn не поддерживается этим устройством");
        } else if (err.name === "SecurityError") {
          setError("Проверьте HTTPS и домен страницы");
        } else {
          setError(err.message || "Ошибка аутентификации");
        }
      } else {
        setError("Произошла неизвестная ошибка");
      }
    }
  };

  useEffect(() => {
    void handleWebAuthn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted p-6">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted p-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center font-semibold text-xl">
            {!logoLoaded && <Skeleton className="mr-1 h-8 w-8 rounded" />}
            <img
              className="mr-1 h-8 w-8"
              src="https://exesfull.com/img/10.svg"
              alt=""
              onLoad={() => setLogoLoaded(true)}
              style={{ display: logoLoaded ? "block" : "none" }}
            />
            Exesfull-ID
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle>Вход по биометрии</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex justify-center">
              {status === "loading" && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}

              {status === "success" && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                  <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}

              {status === "error" && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <X className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {status === "loading" ? "Ожидаем подтверждение..." : status === "success" ? "Успешно!" : "Биометрия"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hint}
              </p>
            </div>

            <Separator />

            {status === "loading" && (
              <Button className="h-11 w-full" variant="outline" onClick={() => setError("Подтверждение уже запущено")}>
                Ожидаем ответ ключа
              </Button>
            )}

            {showFallback && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-red-500/20 bg-red-50/80 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-200">
                  {error || "Используйте другой способ входа"}
                </div>

                <Button className="h-11 w-full" onClick={() => navigate("/")}>
                  Войти с паролем
                </Button>

                <Button variant="outline" className="h-11 w-full" onClick={() => void handleWebAuthn()}>
                  Повторить попытку
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
