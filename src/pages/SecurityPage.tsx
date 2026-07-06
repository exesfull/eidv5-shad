"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Smartphone,
  Tablet,
  Laptop,
} from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { eidAuthEndpoint } from "@/lib/eid-api";
import {
  normalizeCreateOptions,
  serializeCreateCredential,
} from "@/lib/webauthn";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");
const SECURITY_ENDPOINT = eidAuthEndpoint("getSecurityData");
const SAVE_PIN_ENDPOINT = eidAuthEndpoint("savePin");
const START_WEBAUTHN_REG_ENDPOINT = eidAuthEndpoint("startWebauthnRegistration");
const FINISH_WEBAUTHN_REG_ENDPOINT = eidAuthEndpoint("finishWebauthnRegistration");
const DELETE_WEBAUTHN_ENDPOINT = eidAuthEndpoint("deleteWebauthnCredential");

type ProfileUser = {
  id: number;
  login: string;
  nickname: string;
  img_url?: string | null;
};

type SecurityCredential = {
  id: number;
  credential_id: string;
  device_name: string;
  authenticator_type?: string | null;
  aaguid?: string | null;
  transports?: string[] | null;
  sign_count?: number | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_used_at?: string | null;
};

type SecurityData = {
  password_set_at?: string | null;
  pin_set_at?: string | null;
  pin_deleted_at?: string | null;
  pin_active?: boolean;
  credentials?: SecurityCredential[];
};

function formatDateTime(value?: string | null) {
  if (!value) return "Не указано";
  return new Date(value).toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PinCodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const cells = Array.from({ length: 4 }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (!disabled) {
      const focusIndex = Math.min(value.length, 3);
      refs.current[focusIndex]?.focus();
    }
  }, [disabled, value.length]);

  const setCell = (index: number, nextValue: string) => {
    const digit = nextValue.replace(/\D/g, "").slice(-1);
    const next = cells.map((cell, cellIndex) => (cellIndex === index ? digit : cell)).join("").slice(0, 4);
    onChange(next);
    if (digit && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {cells.map((cell, index) => (
        <Input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          id={`call-code-${index}`}
          type="text"
          maxLength={1}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          className="w-12 h-12 text-center text-lg"
          value={cell}
          disabled={disabled}
          onFocus={() => refs.current[index]?.select()}
          onChange={(event) => setCell(index, event.target.value)}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Backspace") {
              event.preventDefault();
              if (cell) {
                setCell(index, "");
              } else if (index > 0) {
                refs.current[index - 1]?.focus();
                onChange(value.slice(0, -1));
              }
            }
          }}
          onPaste={(event) => {
            if (disabled) return;
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
            if (!pasted) return;
            onChange(pasted);
            window.setTimeout(() => {
              refs.current[Math.min(pasted.length, 3)]?.focus();
            }, 0);
          }}
        />
      ))}
    </div>
  );
}

export default function SecurityPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingPin, setSavingPin] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [security, setSecurity] = useState<SecurityData | null>(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"set" | "delete">("set");
  const [pinFirst, setPinFirst] = useState("");
  const [pinSecond, setPinSecond] = useState("");
  const [pinStep, setPinStep] = useState<"first" | "second" | "saving">("first");
  const [pinStatusMessage, setPinStatusMessage] = useState("");
  const [pinDeleteCode, setPinDeleteCode] = useState("");
  const [pinDeleteMessage, setPinDeleteMessage] = useState("");
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SecurityCredential | null>(null);

  const loadSecurity = async () => {
    const [currentUserRes, securityRes] = await Promise.all([
      axios.post(CURRENT_USER_ENDPOINT, new URLSearchParams()),
      axios.post(SECURITY_ENDPOINT, new URLSearchParams()),
    ]);

    if (!currentUserRes.data?.authorized || !currentUserRes.data?.user) {
      navigate("/", { replace: true });
      return;
    }

    setUser({
      id: currentUserRes.data.user.id,
      login: currentUserRes.data.user.login,
      nickname: currentUserRes.data.user.nickname,
      img_url: currentUserRes.data.user.img_url,
    });
    setSecurity(securityRes.data?.security ?? { credentials: [] });
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        await loadSecurity();
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

  useEffect(() => {
    if (!pinOpen) {
      setPinMode("set");
      setPinFirst("");
      setPinSecond("");
      setPinDeleteCode("");
      setPinStep("first");
      setPinStatusMessage("");
      setPinDeleteMessage("");
      setError("");
    }
  }, [pinOpen]);

  const submitPin = async (pinValue: string, pinConfirmValue: string) => {
    if (pinValue.length !== 4 || pinConfirmValue.length !== 4 || pinValue !== pinConfirmValue) {
      return;
    }

    setSavingPin(true);
    setPinStep("saving");
    setError("");

    try {
      const form = new URLSearchParams();
      form.set("pin", pinValue);
      form.set("pin_confirm", pinConfirmValue);
      const res = await axios.post(SAVE_PIN_ENDPOINT, form);
      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось сохранить PIN");
      }
      setSecurity(res.data.security ?? null);
      setPinStatusMessage("PIN сохранён");
      setPinStep("first");
      window.setTimeout(() => {
        setPinOpen(false);
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить PIN");
      setPinStep("second");
    } finally {
      setSavingPin(false);
    }
  };

  const deletePin = async (currentPin: string) => {
    if (currentPin.length !== 4) return;

    setSavingPin(true);
    setPinStep("saving");
    setError("");

    try {
      const form = new URLSearchParams();
      form.set("pin", currentPin);
      const res = await axios.post(eidAuthEndpoint("deletePin"), form);
      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось удалить PIN");
      }
      setSecurity(res.data.security ?? null);
      setPinDeleteMessage("PIN удалён");
      window.setTimeout(() => {
        setPinOpen(false);
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить PIN");
      setPinStep("first");
    } finally {
      setSavingPin(false);
    }
  };

  const handlePinFirstChange = (value: string) => {
    const next = value.replace(/\D/g, "").slice(0, 4);
    setPinFirst(next);
    setError("");
    setPinStep(next.length === 4 ? "second" : "first");
  };

  const handlePinSecondChange = (value: string) => {
    const next = value.replace(/\D/g, "").slice(0, 4);
    setPinSecond(next);
    setError("");
    if (next.length === 4 && pinFirst.length === 4 && next === pinFirst) {
      void submitPin(pinFirst, next);
    }
  };

  const handlePinDeleteChange = (value: string) => {
    const next = value.replace(/\D/g, "").slice(0, 4);
    setPinDeleteCode(next);
    setError("");
    if (next.length === 4) {
      void deletePin(next);
    }
  };

  const startWebauthnRegistration = async () => {
    if (!deviceName.trim()) {
      setError("Укажите название устройства");
      return;
    }

    setRegistering(true);
    setError("");

    try {
      const startRes = await axios.post(
        START_WEBAUTHN_REG_ENDPOINT,
        new URLSearchParams({ device_name: deviceName.trim() })
      );

      const options = normalizeCreateOptions(startRes.data?.publicKey);
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn не поддерживается в этом браузере");
      }

      const credential = (await navigator.credentials.create({
        publicKey: options,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("Не удалось создать ключ");
      }

      const finishPayload = serializeCreateCredential(credential as any);
      const finishForm = new URLSearchParams();
      finishForm.set("device_name", deviceName.trim());
      finishForm.set("credential", JSON.stringify(finishPayload));

      const finishRes = await axios.post(FINISH_WEBAUTHN_REG_ENDPOINT, finishForm);
      if (!finishRes.data?.status) {
        throw new Error(finishRes.data?.error || "Не удалось сохранить ключ");
      }

      setDeviceOpen(false);
      setDeviceName("");
      await loadSecurity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить устройство");
    } finally {
      setRegistering(false);
    }
  };

  const removeCredential = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setError("");

    try {
      const form = new URLSearchParams();
      form.set("credential_id", deleteTarget.credential_id);
      const res = await axios.post(DELETE_WEBAUTHN_ENDPOINT, form);
      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось удалить ключ");
      }
      setDeleteTarget(null);
      await loadSecurity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить ключ");
    } finally {
      setDeleting(false);
    }
  };

  const shell = (
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

        {loading ? (
          <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
            <CardContent className="space-y-4 p-4">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <Skeleton className="mx-auto h-5 w-32" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                  Безопасность
                </p>
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
                  <h1 className="text-2xl font-semibold leading-tight">
                    {user?.nickname || user?.login}
                  </h1>
                </div>
              </div>

              <Separator />

              <section className="space-y-3">
                <div className="space-y-1">
                  <Label>Дата смены/установки пароля</Label>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(security?.password_set_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>
                    {security?.pin_active ? "Дата установки PIN" : "Дата удаления PIN"}
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(security?.pin_active ? security?.pin_set_at : security?.pin_deleted_at)}
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">PIN</h2>
                    <p className="text-xs text-muted-foreground">4 цифры, без password-поля</p>
                  </div>
                  {security?.pin_active ? (
                    <Button
                      className="h-11 shrink-0"
                      variant="outline"
                      onClick={() => {
                        setPinMode("delete");
                        setPinOpen(true);
                      }}
                    >
                      Удалить PIN
                    </Button>
                  ) : (
                    <Button
                      className="h-11 shrink-0"
                      onClick={() => {
                        setPinMode("set");
                        setPinOpen(true);
                      }}
                    >
                      Установить PIN
                    </Button>
                  )}
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Биометрия</h2>
                    <p className="text-xs text-muted-foreground">Ваши сохранённые WebAuthn-ключи</p>
                  </div>
                  <Button className="h-11 shrink-0 gap-2" onClick={() => setDeviceOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Добавить
                  </Button>
                </div>

                <div className="space-y-2">
                  {(security?.credentials ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      Пока нет привязанных устройств
                    </div>
                  ) : (
                    (security?.credentials ?? []).map((credential) => (
                      <div
                        key={credential.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{credential.device_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {credential.authenticator_type || "platform"} · {formatDateTime(credential.last_used_at || credential.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setDeleteTarget(credential)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <Button className="h-11 w-full gap-2" variant="outline" onClick={() => navigate("/security/sessions")}>
                  <Shield className="h-4 w-4" />
                  Активные сессии
                </Button>
              </section>

              <Separator />

              <Button className="h-11 w-full gap-2" variant="outline" onClick={() => navigate("/my/profile")}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-50/80 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-200">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pinMode === "set" ? "Установить PIN" : "Удалить PIN"}</DialogTitle>
            <DialogDescription>
              {pinMode === "set"
                ? "Введите 4 цифры два раза. После второго ввода PIN сохранится автоматически."
                : "Введите текущий PIN код, чтобы удалить его."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pinMode === "set" ? (
              <>
                <div className="space-y-2">
                  <Label>PIN</Label>
                  <PinCodeInput value={pinFirst} onChange={handlePinFirstChange} disabled={pinStep === "saving" || savingPin} />
                </div>

                {pinFirst.length === 4 && (
                  <div className="space-y-2">
                    <Label>Повторите PIN</Label>
                    <PinCodeInput value={pinSecond} onChange={handlePinSecondChange} disabled={pinStep === "saving" || savingPin} />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label>Текущий PIN</Label>
                <PinCodeInput value={pinDeleteCode} onChange={handlePinDeleteChange} disabled={pinStep === "saving" || savingPin} />
              </div>
            )}

            {(pinStep === "saving" || savingPin) && (
              <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {pinMode === "set" ? "Секундочку, сохраняем PIN..." : "Секундочку, удаляем PIN..."}
              </div>
            )}

            {pinStatusMessage && pinStep !== "saving" && pinMode === "set" && (
              <div className="flex items-center gap-3 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                {pinStatusMessage}
              </div>
            )}

            {pinDeleteMessage && pinStep !== "saving" && pinMode === "delete" && (
              <div className="flex items-center gap-3 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                {pinDeleteMessage}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setPinOpen(false)} disabled={pinStep === "saving"}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deviceOpen} onOpenChange={setDeviceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить устройство</DialogTitle>
            <DialogDescription>
              Укажите имя устройства и продолжите регистрацию WebAuthn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device_name">Название устройства</Label>
              <Input
                id="device_name"
                className="h-11 text-base"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Телефон, планшет или ноутбук"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="h-11 gap-2" onClick={() => setDeviceName("Телефон")}>
                <Smartphone className="h-4 w-4" />
                Телефон
              </Button>
              <Button variant="outline" className="h-11 gap-2" onClick={() => setDeviceName("Планшет")}>
                <Tablet className="h-4 w-4" />
                Планшет
              </Button>
              <Button variant="outline" className="h-11 gap-2" onClick={() => setDeviceName("Ноутбук")}>
                <Laptop className="h-4 w-4" />
                Ноутбук
              </Button>
            </div>

            {registering && (
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Подтверждайте регистрацию на устройстве...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setDeviceOpen(false)} disabled={registering}>
              Отмена
            </Button>
            <Button className="h-11 gap-2" onClick={() => void startWebauthnRegistration()} disabled={registering}>
              {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Продолжить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить {deleteTarget?.device_name}?</DialogTitle>
            <DialogDescription>
              Это удалит сохранённый ключ биометрии для этого устройства.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="destructive" className="h-11 gap-2" onClick={() => void removeCredential()} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return shell;
}
