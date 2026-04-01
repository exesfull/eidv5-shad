"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"login" | "password" | "call">("login");
  const [isQROpen, setIsQROpen] = useState(false);

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [user, setUser] = useState<any>(null);

  const [logoLoaded, setLogoLoaded] = useState(false);
  const [socialImagesLoaded, setSocialImagesLoaded] = useState({
    ya: false,
    vk: false,
    google: false,
    telegram: false,
  });
  const [qrLoaded, setQrLoaded] = useState(false);

  // Call code state
  const [callCode, setCallCode] = useState(["", "", "", ""]);
  const [callMade, setCallMade] = useState(false);

  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "login") loginRef.current?.focus();
    if (step === "password") passwordRef.current?.focus();
  }, [step]);

  // Phone mask formatting
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");

    if (digits.startsWith("7")) {
      const rest = digits.slice(1);
      if (rest.length === 0) return "+7";
      if (rest.length <= 3) return `+7(${rest}`;
      if (rest.length <= 6) return `+7(${rest.slice(0, 3)}) ${rest.slice(3)}`;
      if (rest.length <= 8) return `+7(${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
      return `+7(${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
    }
    return "+7";
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === "phone") {
      const formatted = formatPhone(e.target.value);
      setLogin(formatted);
    } else {
      setLogin(e.target.value);
    }
    setError("");
  };

  const handleModeChange = (newMode: "email" | "phone") => {
    setMode(newMode);
    setLogin("");
    setError("");
    setTimeout(() => loginRef.current?.focus(), 0);
  };

  const isLoginValid = mode === "phone" ? login.length >= 16 : login.length > 0;
  const isPasswordValid = password.length > 0;

  // 🔥 API CALL - Check user by email/login or phone
  const handleCheckUser = async () => {
    if (!isLoginValid) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("login", login);

      // Use different endpoints based on mode
      const endpoint = mode === "phone"
        ? "https://id.exesfull.com/oauth/api/esm/v5/eid/auth/checkPhone"
        : "https://id.exesfull.com/oauth/api/esm/v5/eid/auth/checkEmailOrLogin";

      const res = await axios.post(endpoint, formData);

      if (res.data.status) {
        setUser(res.data.user);
        // If phone mode, go to call step; if email mode, go to password step
        if (mode === "phone") {
          setStep("call");
        } else {
          setStep("password");
        }
      } else {
        setError("Мы не нашли такого пользователя");
      }
    } catch (e) {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  const handleMakeCall = () => {
    setCallMade(true);
    // TODO: Implement real call logic later
    console.log("Making call to:", login);
  };

  const handleCallCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = [...callCode];
    newCode[index] = value;
    setCallCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`call-code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCallCodeSubmit = () => {
    const enteredCode = callCode.join("");
    // TODO: Verify call code with backend
    console.log("Verifying call code:", enteredCode);
    // TODO: On success, navigate or set logged in state
  };

  const handleBackToPassword = () => {
    setStep("password");
    setCallMade(false);
    setCallCode(["", "", "", ""]);
  };

  const handleBackToLogin = () => {
    setStep("login");
    setCallMade(false);
    setCallCode(["", "", "", ""]);
    setPassword("");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted p-6">

      {/* THEME */}
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">

        {/* LOGO */}
        <div className="flex flex-col items-center gap-6">

            <div className="flex items-center font-semibold text-xl">
                {!logoLoaded && (
                  <Skeleton className="h-8 w-8 mr-1 rounded" />
                )}
                <img
                    className="mr-1 h-8 w-8"
                    src="https://exesfull.com/img/10.svg"
                    alt=""
                    onLoad={() => setLogoLoaded(true)}
                    style={{ display: logoLoaded ? 'block' : 'none' }}
                />
                Exesfull-ID
            </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Вход</CardTitle>
            <p className="text-sm text-muted-foreground">
                Чтобы продолжить, вам нужно войти
                в аккаунт или создать новый.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* ===================== */}
            {/* STEP 1: Login */}
            {/* ===================== */}

            {step === "login" && (
                <div className="space-y-5">

                    {/* TOGGLE */}
                    <div className="mx-20 flex rounded-lg border border-input overflow-hidden">
                        <button
                            onClick={() => handleModeChange("email")}
                            className={`flex-1 h-8 text-sm font-medium transition-colors ${
                            mode === "email"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Email
                        </button>

                        <button
                            onClick={() => handleModeChange("phone")}
                            className={`flex-1 h-8 text-sm font-medium transition-colors border-l border-input ${
                            mode === "phone"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Телефон
                        </button>
                    </div>

                    {/* INPUT */}
                    <div className={cn(mode === "phone" && "flex justify-center")}>
                      <Input
                        className={cn(
                          "h-12 text-base",
                          mode === "phone" && "max-w-[280px] font-mono"
                        )}
                        ref={loginRef}
                        placeholder={mode === "phone" ? "+7 (___) ___-__-__" : "Email or login"}
                        value={login}
                        onChange={handleLoginChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleCheckUser();
                        }}
                      />
                    </div>

                    {/* BUTTON */}
                    {error ? (
                    <div className="text-red-500 text-sm text-center">
                        {error}
                    </div>
                    ) : (
                    <Button
                        disabled={!isLoginValid || loading}
                        onClick={handleCheckUser}
                        className="w-full h-11"
                    >
                        {loading ? "Уже ищем вас..." : "Продолжить →"}
                    </Button>
                    )}

                    {/* DIVIDER */}
                    <div className="relative">
                    <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">
                        или войдите с помощью
                    </span>
                    <Separator className="flex-1" />
                    </div>
                    </div>

                    {/* 🔥 ДВЕ КОЛОНКИ */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* LEFT: Кнопки */}
        <div className="md:col-span-8 col-span-12 space-y-2">

          <Button
            variant="outline"
            className="w-full h-10 mt-1"
            onClick={() => navigate('/webauthn')}
          >
            Войти по лицу или отпечатку
          </Button>

          {/* SOCIAL */}
          <div className="flex justify-between px-0 mt-0">
            <Button variant="outline" className="h-12">
              {!socialImagesLoaded.ya && (
                <Skeleton className="h-[30px] w-[30px] rounded" />
              )}
              <img
                height="30"
                width="30"
                src="https://system.exesfull.com/img/connect/fav_icons/eid/ya.svg"
                alt="im"
                onLoad={() => setSocialImagesLoaded(prev => ({ ...prev, ya: true }))}
                style={{ display: socialImagesLoaded.ya ? 'block' : 'none' }}
              />
            </Button>
            <Button variant="outline" className="h-12">
              {!socialImagesLoaded.vk && (
                <Skeleton className="h-[30px] w-[30px] rounded" />
              )}
              <img
                height="30"
                width="30"
                src="https://system.exesfull.com/img/connect/fav_icons/eid/vk.svg"
                alt="im"
                onLoad={() => setSocialImagesLoaded(prev => ({ ...prev, vk: true }))}
                style={{ display: socialImagesLoaded.vk ? 'block' : 'none' }}
              />
            </Button>
            <Button variant="outline" className="h-12">
              {!socialImagesLoaded.google && (
                <Skeleton className="h-[30px] w-[30px] rounded" />
              )}
              <img
                height="30"
                width="30"
                src="https://system.exesfull.com/img/connect/fav_icons/eid/google.svg"
                alt="im"
                onLoad={() => setSocialImagesLoaded(prev => ({ ...prev, google: true }))}
                style={{ display: socialImagesLoaded.google ? 'block' : 'none' }}
              />
            </Button>
            <Button variant="outline" className="h-12">
              {!socialImagesLoaded.telegram && (
                <Skeleton className="h-[30px] w-[30px] rounded" />
              )}
              <img
                height="30"
                width="30"
                src="https://www.svgrepo.com/show/343522/telegram-communication-chat-interaction-network-connection.svg"
                alt="im"
                onLoad={() => setSocialImagesLoaded(prev => ({ ...prev, telegram: true }))}
                style={{ display: socialImagesLoaded.telegram ? 'block' : 'none' }}
              />
            </Button>
          </div>

          {/* Кнопка "Показать QR-code" — только на мобильных */}
          <div className="md:hidden mt-2">
            <Dialog open={isQROpen} onOpenChange={setIsQROpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-10 mt-1">
                  Показать QR-code
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[280px] p-4">
                <div className="bg-white p-1 rounded-xl flex justify-center">
                  {!qrLoaded && (
                    <Skeleton className="h-[120px] w-[120px] rounded-md" />
                  )}
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://ui.shadcn.com/docs/components/radix/button-group"
                    className="rounded-md"
                    alt="QR"
                    onLoad={() => setQrLoaded(true)}
                    style={{ display: qrLoaded ? 'block' : 'none' }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

        </div>

        {/* RIGHT: QR — только на десктопе */}
        <div className="md:col-span-4 col-span-12 hidden md:flex flex-col items-center justify-between">
          <div className="bg-white p-1 rounded-xl">
            {!qrLoaded && (
              <Skeleton className="h-[120px] w-[120px] rounded-md" />
            )}
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://ui.shadcn.com/docs/components/radix/button-group"
              className="rounded-md"
              alt="QR"
              onLoad={() => setQrLoaded(true)}
              style={{ display: qrLoaded ? 'block' : 'none' }}
            />
          </div>
        </div>

      </div>


                    {/* REGISTER */}
                    <div className="text-center">
                        <button
                            className="font-bold text-primary"
                            onClick={() => navigate('/create')}
                        >
                            Создать аккаунт
                        </button>
                    </div>

                </div>
                )}

            {/* ===================== */}
            {/* STEP 2: Password (Email mode) */}
            {/* ===================== */}
            {step === "password" && (
              <>
                {/* AVATAR */}
                <div className="flex justify-center">
                    <AvatarWithLoader
                        src={user?.imgUrl}
                        alt={user?.name}
                        size="xl"
                        fallback={
                        <span className="text-lg font-medium text-muted-foreground">
                            {user?.name?.[0]?.toUpperCase()}
                        </span>
                        }
                    />
                </div>

                {/* NAME */}
                <div className="text-center font-medium">
                  {user?.name}
                </div>

                {/* PASSWORD */}
                <Input
                  ref={passwordRef}
                  type="password"
                  placeholder="Пароль"
                  className="h-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isPasswordValid) {
                      console.log("LOGIN");
                    }
                  }}
                />

                {/* BUTTON */}
                <Button
                  disabled={!isPasswordValid}
                  className="w-full h-10"
                >
                  Продолжить →
                </Button>

                {/* EXTRA */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-10">
                    PUSH
                  </Button>
                  <Button variant="outline" className="flex-1 h-10">
                    Другие способы
                  </Button>
                </div>

                {/* BACK */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 h-10"
                    onClick={handleBackToLogin}
                  >
                    ← Назад
                  </Button>

                    <Button
                        onClick={() => navigate('/forgotPassword')}
                        variant="ghost"
                        className="flex-1 h-10"
                    >
                    Забыли пароль?
                  </Button>
                </div>
              </>
            )}

            {/* ===================== */}
            {/* STEP 2: Call Code (Phone mode) */}
            {/* ===================== */}
            {step === "call" && (
              <>
                {/* AVATAR */}
                <div className="flex justify-center">
                    <AvatarWithLoader
                        src={user?.imgUrl}
                        alt={user?.name}
                        size="xl"
                        fallback={
                        <span className="text-lg font-medium text-muted-foreground">
                            {user?.name?.[0]?.toUpperCase()}
                        </span>
                        }
                    />
                </div>

                {/* NAME */}
                <div className="text-center font-medium">
                  {user?.name}
                </div>

                {!callMade ? (
                  <>
                    {/* CALL INSTRUCTION */}
                    <div className="text-center space-y-2">
                      <p className="text-2xl font-bold">{login}</p>
                      <p className="text-sm text-muted-foreground">
                        Сейчас мы позвоним на этот номер
                      </p>
                    </div>

                    {/* CALL BUTTON */}
                    <Button onClick={handleMakeCall} className="w-full h-11">
                      📞 Позвонить
                    </Button>

                    {/* EXTRA */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-10"
                        onClick={handleBackToPassword}
                      >
                        Пароль
                      </Button>
                      <Button variant="outline" className="flex-1 h-10">
                        Другие способы
                      </Button>
                    </div>

                    {/* BACK */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="flex-1 h-10"
                        onClick={handleBackToLogin}
                      >
                        ← Назад
                      </Button>

                      <Button
                        onClick={() => navigate('/forgotPassword')}
                        variant="ghost"
                        className="flex-1 h-10"
                      >
                        Забыли пароль?
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* CALL CODE INPUT */}
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Мы позвонили на {login}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Введите последние 4 цифры номера
                        </p>
                      </div>

                      <div className="flex justify-center gap-2">
                        {callCode.map((digit, index) => (
                          <Input
                            key={index}
                            id={`call-code-${index}`}
                            type="text"
                            maxLength={1}
                            className="w-12 h-12 text-center text-lg"
                            value={digit}
                            onChange={(e) => handleCallCodeChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !digit && index > 0) {
                                const prevInput = document.getElementById(`call-code-${index - 1}`);
                                prevInput?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>

                      <Button
                        onClick={handleCallCodeSubmit}
                        className="w-full h-11"
                        disabled={callCode.some(d => d === "")}
                      >
                        Подтвердить →
                      </Button>

                      {/* EXTRA */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-10"
                          onClick={handleBackToPassword}
                        >
                          Пароль
                        </Button>
                        <Button variant="outline" className="flex-1 h-10">
                          Другие способы
                        </Button>
                      </div>

                      {/* BACK */}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          className="flex-1 h-10"
                          onClick={handleBackToLogin}
                        >
                          ← Назад
                        </Button>

                        <Button
                          onClick={() => navigate('/forgotPassword')}
                          variant="ghost"
                          className="flex-1 h-10"
                        >
                          Забыли пароль?
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

          </CardContent>
        </Card>

        {/* FOOTER */}
        <p className="text-xs text-center text-muted-foreground">
          By clicking continue, you agree to Terms & Privacy Policy
        </p>

      </div>
    </div>
  );
}
