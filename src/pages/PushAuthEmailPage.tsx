"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Mail, RefreshCw, ArrowLeft, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { eidAuthEndpoint } from "@/lib/eid-api";
import { cn } from "@/lib/utils";

const START_PUSH_EMAIL_ENDPOINT = eidAuthEndpoint("startPushEmailAuth");
const GET_PUSH_EMAIL_STATE_ENDPOINT = eidAuthEndpoint("getPushEmailAuthState");
const RESEND_PUSH_EMAIL_ENDPOINT = eidAuthEndpoint("resendPushEmailAuth");
const VERIFY_PUSH_EMAIL_ENDPOINT = eidAuthEndpoint("verifyPushEmailAuth");

const PENDING_AUTH_STORAGE_KEY = "eidPendingAuthUser";
const PUSH_EMAIL_STATE_KEY = "eidPushEmailAuthState";
const PUSH_EMAIL_CODE_KEY = "eidPushEmailCode";
const REDIRECT_URL = "https://id.exesfull.com/oauth/api/esm/v5/eid/auth/redirect";

type PendingAuthUser = {
  id?: number;
  login?: string;
  nickname?: string;
  email?: string;
  light_mode?: "system" | "light" | "dark";
  imgUrl?: string;
};

type PushEmailDelivery = {
  id: number;
  user_id: number;
  channel: string;
  purpose: string;
  recipient?: string | null;
  status?: string;
  attempts?: number;
  max_attempts?: number;
  resend_count?: number;
  code_length?: number;
  expires_at?: string | null;
  resend_available_at?: string | null;
  last_sent_at?: string | null;
  used_at?: string | null;
  invalidated_at?: string | null;
  attempts_remaining?: number;
  last_error?: string | null;
};

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown, persistent = false) {
  const storage = persistent ? localStorage : sessionStorage;
  storage.setItem(key, JSON.stringify(value));
}

function formatCountdown(seconds: number) {
  if (seconds <= 0) {
    return "00:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function PushAuthEmailPage() {
  const navigate = useNavigate();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const redirectTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [user, setUser] = useState<PendingAuthUser | null>(null);
  const [delivery, setDelivery] = useState<PushEmailDelivery | null>(null);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const [codeExpired, setCodeExpired] = useState(false);

  const codeValue = useMemo(() => code.join(""), [code]);

  const persistState = (nextDelivery: PushEmailDelivery | null, nextUser: PendingAuthUser | null) => {
    if (nextUser) {
      writeJson(PENDING_AUTH_STORAGE_KEY, nextUser, true);
    }
    if (nextDelivery) {
      writeJson(PUSH_EMAIL_STATE_KEY, nextDelivery, true);
    }
  };

  const hydrateCountdown = (value?: string | null) => {
    if (countdownTimer.current) {
      window.clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }

    if (!value) {
      setResendIn(0);
      return;
    }

    const target = new Date(value).getTime();
    const tick = () => setResendIn(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    tick();
    countdownTimer.current = window.setInterval(tick, 1000);
  };

  const loadState = async () => {
    const storedUser = readJson<PendingAuthUser>(PENDING_AUTH_STORAGE_KEY);
    const storedDelivery = readJson<PushEmailDelivery>(PUSH_EMAIL_STATE_KEY);
    const storedCode = readJson<string[]>(PUSH_EMAIL_CODE_KEY);

    if (!storedUser?.id && !storedUser?.login && !storedUser?.email) {
      navigate("/", { replace: true });
      return;
    }

    setUser(storedUser);
    if (storedCode?.length === 6) {
      setCode(storedCode.map((value) => (/\d/.test(value) ? value : "")));
    }

    try {
      if (storedDelivery?.id) {
        const form = new URLSearchParams();
        form.set("delivery_id", String(storedDelivery.id));
        if (storedUser?.id) {
          form.set("user_id", String(storedUser.id));
        }

        const res = await axios.post(GET_PUSH_EMAIL_STATE_ENDPOINT, form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (res.data?.status && res.data?.delivery) {
          setDelivery(res.data.delivery);
          setUser((prev) => ({ ...prev, ...(res.data.user || {}) }));
          persistState(res.data.delivery, { ...storedUser, ...(res.data.user || {}) });
          hydrateCountdown(res.data.delivery?.resend_available_at);
          setCodeExpired(Boolean(res.data?.expired));
          setInfo(res.data?.email_sent ? "Код уже отправлен на email" : "Состояние кода восстановлено");
          setLoading(false);
          return;
        }
      }

      const form = new URLSearchParams();
      if (storedUser?.id) {
        form.set("user_id", String(storedUser.id));
      } else if (storedUser?.login) {
        form.set("login", storedUser.login);
      } else if (storedUser?.email) {
        form.set("login", storedUser.email);
      }

      const res = await axios.post(START_PUSH_EMAIL_ENDPOINT, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status || !res.data?.delivery) {
        throw new Error(res.data?.error || "Не удалось отправить email");
      }

      setDelivery(res.data.delivery);
      setUser((prev) => ({ ...prev, ...(res.data.user || {}) }));
      persistState(res.data.delivery, { ...storedUser, ...(res.data.user || {}) });
      hydrateCountdown(res.data.delivery?.resend_available_at);
      setInfo("Мы отправили email для входа");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Не удалось отправить email");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Не удалось отправить email");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadState();

    return () => {
      if (countdownTimer.current) {
        window.clearInterval(countdownTimer.current);
      }
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (success) {
      redirectTimer.current = window.setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 1500);
    }
  }, [success]);

  const updateDigit = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = nextValue;
      writeJson(PUSH_EMAIL_CODE_KEY, next, false);
      return next;
    });

    if (nextValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "Enter") {
      void verifyCode();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) {
      return;
    }

    event.preventDefault();
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setCode(next);
    writeJson(PUSH_EMAIL_CODE_KEY, next, false);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const verifyCode = async () => {
    if (!delivery?.id || codeValue.length !== 6 || code.includes("")) {
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const form = new URLSearchParams();
      form.set("delivery_id", String(delivery.id));
      if (user?.id) {
        form.set("user_id", String(user.id));
      }
      form.set("code", codeValue);

      const res = await axios.post(VERIFY_PUSH_EMAIL_ENDPOINT, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status) {
        throw new Error(res.data?.error || "Код не подошёл");
      }

      setSuccess(true);
      setCodeExpired(false);
      setInfo("Email-код принят, выполняем вход...");
      sessionStorage.removeItem(PUSH_EMAIL_CODE_KEY);
      localStorage.removeItem(PUSH_EMAIL_STATE_KEY);
    } catch (err) {
      setSuccess(false);
      if (axios.isAxiosError(err)) {
        const nextError = err.response?.data?.error || "Код не подошёл";
        setError(nextError);
        if (err.response?.status === 401 || err.response?.status === 410 || err.response?.status === 429) {
          setDelivery(err.response?.data?.delivery || delivery);
        }
        if (err.response?.status === 410 || err.response?.status === 401 && err.response?.data?.delivery?.status === "failed") {
          setCodeExpired(true);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Код не подошёл");
      }
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    if (!delivery?.id || resendIn > 0) {
      return;
    }

    setSending(true);
    setError("");
    setInfo("");

    try {
      const form = new URLSearchParams();
      form.set("delivery_id", String(delivery.id));
      const res = await axios.post(RESEND_PUSH_EMAIL_ENDPOINT, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status || !res.data?.delivery) {
        throw new Error(res.data?.error || "Не удалось отправить новый код");
      }

      setDelivery(res.data.delivery);
      persistState(res.data.delivery, user);
      hydrateCountdown(res.data.delivery?.resend_available_at);
      setCode(["", "", "", "", "", ""]);
      sessionStorage.removeItem(PUSH_EMAIL_CODE_KEY);
      setCodeExpired(false);
      setInfo("Новый код отправлен");
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const retryAfter = err.response?.data?.retry_after_seconds;
        if (typeof retryAfter === "number") {
          setResendIn(retryAfter);
        }
        setError(err.response?.data?.error || "Не удалось отправить новый код");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Не удалось отправить новый код");
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
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
            <CardContent className="flex items-center gap-3 p-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Отправляем email для входа</p>
                <p className="text-sm text-muted-foreground">Пожалуйста, подождите секундочку</p>
              </div>
            </CardContent>
          </Card>
        </div>
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
            <img className="mr-1 h-8 w-8" src="https://exesfull.com/img/10.svg" alt="" />
            Exesfull-ID
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle>Проверка email-кода</CardTitle>
            <p className="text-sm text-muted-foreground">
              Мы отправили код на {user?.email || delivery?.recipient || "вашу почту"}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {info ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                {info}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <div key={index} className="relative">
                    <Input
                      ref={(node) => {
                        inputRefs.current[index] = node;
                      }}
                      value={digit}
                      onChange={(event) => updateDigit(index, event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      onPaste={handlePaste}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      className={cn(
                        "h-12 w-12 rounded-lg text-center text-lg",
                        "text-transparent caret-transparent",
                        "selection:bg-transparent selection:text-transparent"
                      )}
                      aria-invalid={!!error}
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold text-foreground">
                      {digit ? "*" : ""}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {delivery?.expires_at ? (
                  <span>Код действует до {new Date(delivery.expires_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                ) : (
                  <span>Введите 6-значный код из письма</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                className="h-11 gap-2"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>

              <Button
                variant="outline"
                className="h-11 gap-2"
                onClick={() => void resendCode()}
                disabled={sending || resendIn > 0}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {resendIn > 0 ? `Повторно через ${formatCountdown(resendIn)}` : "Отправить снова"}
              </Button>
            </div>

            <Button
              className="h-11 w-full"
              onClick={() => void verifyCode()}
              disabled={verifying || codeValue.length !== 6 || code.includes("") || success || codeExpired}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверяем код...
                </>
              ) : success ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Готово
                </>
              ) : (
                "Подтвердить вход"
              )}
            </Button>

            {codeExpired ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-300">
                <AlertCircle className="h-4 w-4" />
                Код устарел, отправьте новый
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
