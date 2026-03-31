"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // 🔥 импорт навигации
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PasswordForgotPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"input" | "send">("input");

  const [login, setLogin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "input") loginRef.current?.focus();
  }, [step]);

  const isLoginValid = login.length > 0;

  // 🔥 API CALL
  const handleCheckUser = async () => {
    if (!isLoginValid) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("login", login);

      const res = await axios.post(
        "https://id.exesfull.com/oauth/api/esm/v5/eid/auth/checkEmailOrLogin",
        formData
      );

      if (res.data.status) {
        setStep("send");
      } else {
        setError("Мы не нашли такого пользователя");
      }
    } catch (e) {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
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
                <img
                    className="mr-1 h-8 w-8"
                    src="https://exesfull.com/img/10.svg"
                    alt=""
                />
                Exesfull-ID
            </div>
        </div>

        <Card>
          <CardHeader className="text-center mt-3">
            <CardTitle>Востановление пароля</CardTitle>
            <p className="text-sm text-muted-foreground">
                Введите Email, который был привязан к вашему аккаунту 
            </p>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* ===================== */}
            {/* STEP 1 */}
            {/* ===================== */}
            
            {step === "input" && (
                <div className="space-y-5">


                    {/* INPUT */}
                    <Input
                    className="h-10"
                    ref={loginRef}
                    placeholder="Email"
                    value={login}
                    onChange={(e) => {
                        setLogin(e.target.value);
                        setError("");
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleCheckUser();
                    }}
                    />

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
                        {loading ? "Уже ищем вас..." : "Отправить письмо"}
                    </Button>
                    )}

                   
                   

                    {/* ROW 2 */}
                    {/* <div className="grid grid-cols-12 gap-4">

                    <Button className="col-span-8 h-11" variant="outline">
                        Вход в корпоративную сеть / SSO
                    </Button>

                    <Button className="col-span-4 h-11" variant="outline">
                        Еще
                    </Button>
                    </div> */}
                    

                    {/* BACK */}
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            className="flex-1 h-10"
                            onClick={() => navigate("/")}
                        >
                        ← Назад
                        </Button>
                    </div>

                </div>
                )}

            {/* ===================== */}
            {/* STEP 2 */}
            {/* ===================== */}
            {step === "send" && (
              <div className="space-y-5">
                {/* ICON */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>

                {/* TITLE */}
                <div className="text-center space-y-2">
                  <p className="font-medium text-lg">
                    Письмо отправлено
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Проверьте почту {login} и следуйте инструкциям
                  </p>
                </div>

                {/* INFO */}
                <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
                  <p>Если письмо не пришло, проверьте папку «Спам»</p>
                </div>

                {/* BUTTON */}
                <Button
                  onClick={() => navigate("/")}
                  className="w-full h-11"
                >
                  Хорошо
                </Button>
              </div>
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