"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

// 🟡 DUMMY FUNCTION - Check if phone number exists
const checkPhoneNumberExists = async (phone: string): Promise<{ exists: boolean }> => {
  // TODO: Implement real API call later
  // Mock logic: if phone starts with +79... it's valid, if +7[0-8]... it exists
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  const match = phone.match(/^\+7(\d)/);
  if (match) {
    const firstDigit = match[1];
    if (firstDigit === "9") {
      return { exists: false }; // Valid, doesn't exist
    } else if (firstDigit >= "0" && firstDigit <= "8") {
      return { exists: true }; // Exists in system
    }
  }
  return { exists: false };
};

// 🟡 DUMMY FUNCTION - Check if email exists
const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  // TODO: Implement real API call later
  // Mock logic: if email starts with a letter it's valid, if with digit it exists
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  const firstChar = email.charAt(0);
  const exists = firstChar >= "0" && firstChar <= "9";
  return { exists };
};

export default function CreateAccountPage() {
  const navigate = useNavigate();

  // Step state: 'country' | 'phone' | 'personal' | 'email' | 'password' | 'consent'
  const [step, setStep] = useState<"country" | "phone" | "personal" | "email" | "password" | "consent">("country");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Country & Language
  const [country, setCountry] = useState("Russia");
  const [language, setLanguage] = useState("Russian");
  
  // Phone
  const [phone, setPhone] = useState("+7");
  const [phoneCheckStatus, setPhoneCheckStatus] = useState<"idle" | "checking" | "exists" | "valid">("idle");
  const [callCode, setCallCode] = useState(["", "", "", ""]);
  const [callMade, setCallMade] = useState(false);

  // Personal Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

  // Email
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "exists" | "valid">("idle");

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Consent
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notificationsAccepted, setNotificationsAccepted] = useState(false);

  const [logoLoaded, setLogoLoaded] = useState(false);
  const [birthDateOpen, setBirthDateOpen] = useState(false);

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError("");
    setPhoneCheckStatus("idle");
    setCallMade(false);
  };

  const handleCountryNext = () => {
    if (country === "Russia") {
      setStep("phone");
    } else {
      setStep("personal");
    }
  };

  const handleCountryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCountryNext();
    }
  };

  const handlePhoneSubmit = async () => {
    if (phone.length < 16) {
      setError("Введите полный номер телефона");
      return;
    }

    setLoading(true);
    setPhoneCheckStatus("checking");

    try {
      const result = await checkPhoneNumberExists(phone);
      
      if (result.exists) {
        setPhoneCheckStatus("exists");
        setError("Этот номер уже зарегистрирован. Хотите войти?");
      } else {
        setPhoneCheckStatus("valid");
        setError("");
      }
    } catch (e) {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  const handleMakeCall = () => {
    setCallMade(true);
    console.log("Making call to:", phone);
  };

  const handleCallCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...callCode];
    newCode[index] = value;
    setCallCode(newCode);

    if (value && index < 3) {
      const nextInput = document.getElementById(`call-code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCallCodeSubmit = () => {
    const enteredCode = callCode.join("");
    console.log("Verifying call code:", enteredCode);
    setStep("personal");
  };

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailStatus("idle");
    setError("");

    if (value.length > 0) {
      setEmailStatus("checking");
      const result = await checkEmailExists(value);
      
      if (result.exists) {
        setEmailStatus("exists");
        setError("Этот email уже зарегистрирован");
      } else {
        setEmailStatus("valid");
      }
    }
  };

  const isEmailValid = email.length > 0 && emailStatus === "valid";
  const isPasswordValid = password.length >= 8 && password === confirmPassword;
  const isPersonalValid = firstName && lastName && birthDate;

  const handlePersonalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isPersonalValid) {
      setStep("email");
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isEmailValid) {
      setStep("password");
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isPasswordValid) {
      setStep("consent");
    }
  };

  const handleConsentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && termsAccepted && notificationsAccepted) {
      console.log("Creating account...");
    }
  };

  const handleBack = () => {
    setError("");
    if (step === "phone") {
      setStep("country");
    } else if (step === "personal") {
      if (country === "Russia") {
        setStep("phone");
      } else {
        setStep("country");
      }
    } else if (step === "email") {
      setStep("personal");
    } else if (step === "password") {
      setStep("email");
    } else if (step === "consent") {
      setStep("password");
    }
  };

  const getStepNumber = () => {
    if (step === "country") return 1;
    if (step === "phone") return country === "Russia" ? 2 : 1;
    if (step === "personal") return country === "Russia" ? 3 : 2;
    if (step === "email") return country === "Russia" ? 4 : 3;
    if (step === "password") return country === "Russia" ? 5 : 4;
    if (step === "consent") return country === "Russia" ? 6 : 5;
    return 1;
  };

  const getTotalSteps = () => {
    return country === "Russia" ? 6 : 5;
  };

  const renderStepIndicator = () => {
    const currentStepNum = getStepNumber();
    const totalSteps = getTotalSteps();
    
    return (
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i + 1 === currentStepNum
                ? "w-8 bg-primary"
                : i + 1 < currentStepNum
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
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
            <CardTitle>Создание аккаунта</CardTitle>
            <p className="text-sm text-muted-foreground">
              Шаг {getStepNumber()} из {getTotalSteps()}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {renderStepIndicator()}

            {/* ===================== */}
            {/* STEP: Country & Language */}
            {/* ===================== */}
            {step === "country" && (
              <div className="space-y-4" onKeyDown={handleCountryKeyDown}>
                <div className="space-y-2">
                  <Label>
                    Страна <span className="text-red-500">*</span>
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Russia">Россия</SelectItem>
                      <SelectItem value="Kazakhstan">Казахстан</SelectItem>
                      <SelectItem value="Belarus">Беларусь</SelectItem>
                      <SelectItem value="Other">Другая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Язык <span className="text-red-500">*</span>
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Russian">Русский</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Kazakh">Қазақша</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCountryNext}
                  className="w-full h-11 mt-4"
                >
                  Продолжить →
                </Button>

                <Button
                  variant="ghost"
                  className="w-full h-10"
                  onClick={() => navigate("/")}
                >
                  ← Назад
                </Button>
              </div>
            )}

            {/* ===================== */}
            {/* STEP: Phone (Russia only) */}
            {/* ===================== */}
            {step === "phone" && (
              <div className="space-y-4">
                {!callMade && phoneCheckStatus !== "valid" && (
                  <>
                    <div className="space-y-2">
                      <Label>
                        Номер телефона <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="h-10"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="+7 (___) ___-__-__"
                      />
                    </div>

                    {error && phoneCheckStatus === "exists" ? (
                      <div className="text-center space-y-3">
                        <div className="text-red-500 text-sm">
                          {error}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 h-10"
                            onClick={() => navigate("/")}
                          >
                            Войти
                          </Button>
                          <Button
                            className="flex-1 h-10"
                            onClick={() => setPhoneCheckStatus("valid")}
                          >
                            Создать новый
                          </Button>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="text-red-500 text-sm text-center">
                        {error}
                      </div>
                    ) : (
                      <Button
                        disabled={phone.length < 16 || loading}
                        onClick={handlePhoneSubmit}
                        className="w-full h-11"
                      >
                        {loading ? "Проверка..." : "Продолжить →"}
                      </Button>
                    )}
                  </>
                )}

                {/* Call Code Verification */}
                {callMade && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Мы позвонили на {phone}
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
                  </div>
                )}

                {/* Make Call Button */}
                {phoneCheckStatus === "valid" && !callMade && (
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <p className="text-2xl font-bold">{phone}</p>
                      <p className="text-sm text-muted-foreground">
                        Сейчас мы позвоним на этот номер
                      </p>
                    </div>
                    <Button onClick={handleMakeCall} className="w-full h-11">
                      📞 Позвонить
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full h-10"
                      onClick={() => {
                        setPhoneCheckStatus("idle");
                        setPhone("+7");
                      }}
                    >
                      Изменить номер
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  className="w-full h-10"
                  onClick={handleBack}
                >
                  ← Назад
                </Button>
              </div>
            )}

            {/* ===================== */}
            {/* STEP: Personal Info */}
            {/* ===================== */}
            {step === "personal" && (
              <div className="space-y-4" onKeyDown={handlePersonalKeyDown}>
                <div className="space-y-2">
                  <Label>
                    Имя <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-10"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Иван"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isPersonalValid) {
                        setStep("email");
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Фамилия <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-10"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Иванов"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Отчество (при наличии)</Label>
                  <Input
                    className="h-10"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Иванович"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={birthDateOpen} onOpenChange={setBirthDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start font-normal",
                          !birthDate && "text-muted-foreground"
                        )}
                      >
                        {birthDate ? birthDate.toLocaleDateString() : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={(date) => {
                          setBirthDate(date);
                          setBirthDateOpen(false);
                        }}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="ghost" className="flex-1 h-10" onClick={handleBack}>
                    ← Назад
                  </Button>
                  <Button
                    className="flex-1 h-10"
                    onClick={() => setStep("email")}
                    disabled={!isPersonalValid}
                  >
                    Продолжить →
                  </Button>
                </div>
              </div>
            )}

            {/* ===================== */}
            {/* STEP: Email */}
            {/* ===================== */}
            {step === "email" && (
              <div className="space-y-4" onKeyDown={handleEmailKeyDown}>
                <div className="space-y-2">
                  <Label>
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    className={cn(
                      "h-10",
                      emailStatus === "exists" && "border-red-500 focus-visible:ring-red-500"
                    )}
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="example@email.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isEmailValid) {
                        setStep("password");
                      }
                    }}
                  />
                </div>

                {emailStatus === "exists" && (
                  <div className="text-red-500 text-sm text-center">
                    Этот email уже зарегистрирован
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="ghost" className="flex-1 h-10" onClick={handleBack}>
                    ← Назад
                  </Button>
                  <Button
                    className="flex-1 h-10"
                    onClick={() => setStep("password")}
                    disabled={!isEmailValid}
                  >
                    Продолжить →
                  </Button>
                </div>
              </div>
            )}

            {/* ===================== */}
            {/* STEP: Password */}
            {/* ===================== */}
            {step === "password" && (
              <div className="space-y-4" onKeyDown={handlePasswordKeyDown}>
                <div className="space-y-2">
                  <Label>
                    Пароль <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    className="h-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isPasswordValid) {
                        setStep("consent");
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Подтверждение пароля <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    className={cn(
                      "h-10",
                      password && confirmPassword && password !== confirmPassword && "border-red-500 focus-visible:ring-red-500"
                    )}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isPasswordValid) {
                        setStep("consent");
                      }
                    }}
                  />
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <div className="text-red-500 text-sm text-center">
                    Пароли не совпадают
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="ghost" className="flex-1 h-10" onClick={handleBack}>
                    ← Назад
                  </Button>
                  <Button
                    className="flex-1 h-10"
                    onClick={() => setStep("consent")}
                    disabled={!isPasswordValid}
                  >
                    Продолжить →
                  </Button>
                </div>
              </div>
            )}

            {/* ===================== */}
            {/* STEP: Consent */}
            {/* ===================== */}
            {step === "consent" && (
              <div className="space-y-6" onKeyDown={handleConsentKeyDown}>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm leading-tight cursor-pointer"
                    >
                      Я принимаю{" "}
                      <a href="#" className="text-primary underline">
                        Условия использования и Политику конфиденциальности
                      </a>{" "}
                      <span className="text-red-500">*</span>
                    </label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="notifications"
                      checked={notificationsAccepted}
                      onCheckedChange={(checked) => setNotificationsAccepted(checked as boolean)}
                    />
                    <label
                      htmlFor="notifications"
                      className="text-sm leading-tight cursor-pointer"
                    >
                      Я согласен получать уведомления о безопасности, новости и событиях{" "}
                      <span className="text-red-500">*</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="ghost" className="flex-1 h-10" onClick={handleBack}>
                    ← Назад
                  </Button>
                  <Button
                    className="flex-1 h-10"
                    disabled={!termsAccepted || !notificationsAccepted}
                    onClick={() => {
                      console.log("Creating account...", {
                        country,
                        language,
                        phone,
                        firstName,
                        lastName,
                        middleName,
                        birthDate,
                        email,
                        password,
                      });
                      // TODO: Implement account creation
                    }}
                  >
                    Создать аккаунт →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FOOTER */}
        <p className="text-xs text-center text-muted-foreground">
          Создавая аккаунт, вы принимаете Условия использования и Политику конфиденциальности
        </p>
      </div>
    </div>
  );
}
