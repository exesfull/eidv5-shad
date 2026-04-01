"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function WebAuthnPage() {
  const navigate = useNavigate();
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [status, setStatus] = useState<"checking" | "loading" | "success" | "error">("checking");
  const [error, setError] = useState("");
  const [showFallback, setShowFallback] = useState(false);

  // WebAuthn API call
  const handleWebAuthn = async () => {
    setStatus("loading");
    setError("");

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn не поддерживается в этом браузере");
      }

      // Check for platform authenticator (Touch ID, Face ID, Windows Hello)
      const isPlatformSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!isPlatformSupported) {
        throw new Error("Биометрическая аутентификация не доступна на этом устройстве");
      }

      // 🟡 DUMMY REQUEST - Replace with real API call
      // Step 1: Get challenge from server
      // const response = await axios.post("/api/auth/webauthn/challenge", { ... });
      // const publicKeyOptions = response.data;

      // Mock challenge for demo - configured for platform authenticator (Touch ID / Face ID)
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32), // Random challenge
        allowCredentials: [], // Empty for demo - in real app would contain registered credentials
        timeout: 60000,
        userVerification: "required", // Requires biometric or PIN
        extensions: {
          appid: "https://exesfull.com", // For FIDO2 compatibility
        },
      };

      // Step 2: Request biometric authentication (Touch ID / Face ID / Windows Hello)
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });

      if (credential) {
        // 🟡 Send credential back to server for verification
        // await axios.post("/api/auth/webauthn/verify", {
        //   id: credential.id,
        //   rawId: Array.from(new Uint8Array(credential.rawId)),
        //   response: {
        //     clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
        //     signature: Array.from(new Uint8Array(credential.response.signature)),
        //   },
        // });

        setStatus("success");
        console.log("WebAuthn success:", credential);
        
        // Redirect after success
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err) {
      console.error("WebAuthn error:", err);
      setStatus("error");
      
      // Show fallback UI after a short delay
      setTimeout(() => setShowFallback(true), 500);
      
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Аутентификация отменена пользователем");
        } else if (err.name === "NotSupportedError") {
          setError("WebAuthn не поддерживается этим устройством");
        } else if (err.name === "SecurityError") {
          setError("Ошибка безопасности. Проверьте HTTPS соединение");
        } else {
          setError(err.message || "Ошибка аутентификации");
        }
      } else {
        setError("Произошла неизвестная ошибка");
      }
    }
  };

  // Auto-trigger WebAuthn on page load
  useEffect(() => {
    handleWebAuthn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't render anything while checking
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
          <CardHeader className="text-center mt-3">
            <CardTitle>Вход по биометрии</CardTitle>
            <p className="text-sm text-muted-foreground">
              Используйте отпечаток пальца или Face ID для входа
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* ICON */}
            <div className="flex justify-center">
              {status === "loading" && (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <svg
                    className="w-10 h-10 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.571-4.183"
                    />
                  </svg>
                </div>
              )}

              {status === "success" && (
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {status === "error" && !showFallback && (
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* STATUS MESSAGE */}
            {status === "loading" && (
              <div className="text-center space-y-2">
                <p className="font-medium text-lg">
                  Проверка биометрии...
                </p>
                <p className="text-sm text-muted-foreground">
                  Подтвердите вход с помощью Touch ID, Face ID или Windows Hello
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center space-y-2">
                <p className="font-medium text-lg text-green-600 dark:text-green-400">
                  Успешно!
                </p>
                <p className="text-sm text-muted-foreground">
                  Перенаправление...
                </p>
              </div>
            )}

            {/* FALLBACK UI - Show after WebAuthn fails */}
            {showFallback && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <Separator />
                
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Биометрия не доступна
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {error || "Используйте другой способ входа"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => navigate("/")}
                    variant="outline"
                    className="w-full h-11 bg-primary text-white"
                  >
                    Войти с паролем
                  </Button>
                  
                  <Button
                    onClick={handleWebAuthn}
                    variant="ghost"
                    className="w-full h-11"
                  >
                    Повторить попытку
                  </Button>
                </div>
              </div>
            )}

            {/* BACK BUTTON */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full h-10"
            >
              ← Назад
            </Button>
          </CardContent>
        </Card>

        {/* FOOTER */}
        <p className="text-xs text-center text-muted-foreground">
          WebAuthn обеспечивает безопасный вход без пароля
        </p>
      </div>
    </div>
  );
}
