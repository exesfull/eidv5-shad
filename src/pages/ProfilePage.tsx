"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Save } from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { eidAuthEndpoint } from "@/lib/eid-api";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");
const CHECK_LOGIN_ENDPOINT = eidAuthEndpoint("checkLoginAvailability");
const UPDATE_PROFILE_ENDPOINT = eidAuthEndpoint("updateProfile");
const LOGOUT_ENDPOINT = eidAuthEndpoint("logout");

type SexValue = "1" | "2" | "3";
type CountryValue = "RU" | "BY" | "KZ" | "-" | "__NONE__";

type ProfileUser = {
  id: number;
  login: string;
  nickname: string;
  first_name?: string | null;
  last_name?: string | null;
  other_name?: string | null;
  email?: string | null;
  phone?: string | null;
  sex?: string | null;
  birthday?: string | null;
  country?: string | null;
  promo_send_status?: boolean | number | null;
  img_url?: string | null;
  light_mode?: "system" | "light" | "dark";
};

type LoginCheckState = {
  loading: boolean;
  valid: boolean;
  available: boolean;
  same: boolean;
  rules: string[];
};

const allowedCountries: Array<Exclude<CountryValue, "__NONE__">> = [
  "RU",
  "BY",
  "KZ",
  "-",
];

function normalizeText(value?: string | null) {
  return (value ?? "").trim();
}

function toSelectCountry(value?: string | null): CountryValue {
  const normalized = normalizeText(value).toUpperCase();
  const candidate = normalized as Exclude<CountryValue, "__NONE__">;
  return allowedCountries.includes(candidate) ? candidate : "__NONE__";
}

function toSelectSex(value?: string | null): SexValue {
  if (value === "2" || value === "3") return value;
  return "1";
}

function formatDate(value?: string | null) {
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, 10) : "";
}

function isValidName(value: string) {
  if (!value.trim()) return true;
  return value.trim().length <= 60 && /^[\p{L} -]+$/u.test(value.trim());
}

function isValidNickname(value: string) {
  if (!value.trim()) return true;
  return value.trim().length <= 50;
}

function isValidLogin(value: string) {
  if (!value.trim()) return false;
  return /^[a-z._-]+$/.test(value.trim()) && value.trim().length >= 4;
}

function isLoginRuleCompliant(value: string) {
  return /^[a-z._-]+$/.test(value.trim());
}

function compareNullableText(a?: string | null, b?: string | null) {
  return normalizeText(a) === normalizeText(b);
}

function comparePromo(a?: boolean | number | null, b?: boolean) {
  return Boolean(a) === Boolean(b);
}

function compareCountry(a?: string | null, b?: string) {
  return toSelectCountry(a) === (b || "__NONE__");
}

function compareSex(a?: string | null, b?: string) {
  return toSelectSex(a) === (b || "1");
}

function compareDate(a?: string | null, b?: string) {
  return formatDate(a) === (b || "");
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const originalUser = useRef<ProfileUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [user, setUser] = useState<ProfileUser | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otherName, setOtherName] = useState("");
  const [nickname, setNickname] = useState("");
  const [login, setLogin] = useState("");
  const [loginCheck, setLoginCheck] = useState<LoginCheckState>({
    loading: false,
    valid: true,
    available: true,
    same: true,
    rules: [],
  });
  const [birthday, setBirthday] = useState("");
  const [country, setCountry] = useState<CountryValue>("__NONE__");
  const [sex, setSex] = useState<SexValue>("1");
  const [promoSendStatus, setPromoSendStatus] = useState(false);
  const [lightMode, setLightMode] = useState<"system" | "light" | "dark">("system");

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

        const nextUser: ProfileUser = res.data.user;
        originalUser.current = nextUser;
        setUser(nextUser);
        setFirstName(normalizeText(nextUser.first_name));
        setLastName(normalizeText(nextUser.last_name));
        setOtherName(normalizeText(nextUser.other_name));
        setNickname(normalizeText(nextUser.nickname));
        setLogin(normalizeText(nextUser.login));
        setBirthday(formatDate(nextUser.birthday));
        setCountry(toSelectCountry(nextUser.country));
        setSex(toSelectSex(nextUser.sex));
        setPromoSendStatus(Boolean(nextUser.promo_send_status));
        setLightMode(nextUser.light_mode || "system");
        if (nextUser.light_mode) {
          setTheme(nextUser.light_mode);
        }
        setLoginCheck({
          loading: false,
          valid: true,
          available: true,
          same: true,
          rules: [],
        });
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

  useEffect(() => {
    if (!user) return;

    const originalLogin = normalizeText(originalUser.current?.login);
    const currentLogin = normalizeText(login);

    if (!currentLogin) {
      setLoginCheck({
        loading: false,
        valid: false,
        available: false,
        same: false,
        rules: ["Логин обязателен", "Логин должен быть не короче 4 символов"],
      });
      return;
    }

    if (currentLogin === originalLogin) {
      setLoginCheck({
        loading: false,
        valid: true,
        available: true,
        same: true,
        rules: [],
      });
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoginCheck((state) => ({ ...state, loading: true }));

      try {
        const form = new URLSearchParams();
        form.set("login", currentLogin);
        form.set("user_id", String(user.id));

        const res = await axios.post(CHECK_LOGIN_ENDPOINT, form);
        setLoginCheck({
          loading: false,
          valid: Boolean(res.data?.valid),
          available: Boolean(res.data?.available),
          same: false,
          rules: Array.isArray(res.data?.rules) ? res.data.rules : [],
        });
      } catch {
        setLoginCheck({
          loading: false,
          valid: false,
          available: false,
          same: false,
          rules: ["Не удалось проверить логин"],
        });
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [login, user]);

  const nameDirty =
    !compareNullableText(firstName, originalUser.current?.first_name) ||
    !compareNullableText(lastName, originalUser.current?.last_name) ||
    !compareNullableText(otherName, originalUser.current?.other_name);

  const credentialsDirty =
    !compareNullableText(nickname, originalUser.current?.nickname) ||
    !compareNullableText(login, originalUser.current?.login);

  const demographicsDirty =
    !compareDate(originalUser.current?.birthday, birthday) ||
    !compareCountry(originalUser.current?.country, country) ||
    !compareSex(originalUser.current?.sex, sex);

  const promoDirty = !comparePromo(originalUser.current?.promo_send_status, promoSendStatus);
  const themeDirty = lightMode !== (originalUser.current?.light_mode || "system");

  const canSaveNames =
    nameDirty && [firstName, lastName, otherName].every((value) => isValidName(value));

  const canSaveCredentials =
    credentialsDirty &&
    isValidNickname(nickname) &&
    isValidLogin(login) &&
    !loginCheck.loading &&
    loginCheck.valid &&
    loginCheck.available;

  const canSaveDemographics = demographicsDirty;
  const canSavePromo = promoDirty;
  const loginFormatValid = isLoginRuleCompliant(login);

  const saveSection = async (section: string) => {
    if (!user) return;

    setSavingSection(section);
    setError("");

    try {
      const form = new URLSearchParams();
      form.set("section", section);

      if (section === "names") {
        form.set("first_name", firstName);
        form.set("last_name", lastName);
        form.set("other_name", otherName);
      }

      if (section === "credentials") {
        form.set("nickname", nickname);
        form.set("login", login);
      }

      if (section === "demographics") {
        form.set("birthday", birthday);
        form.set("country", country === "__NONE__" ? "" : country);
        form.set("sex", sex);
      }

      if (section === "promo") {
        form.set("promo_send_status", promoSendStatus ? "1" : "0");
      }

      if (section === "theme") {
        form.set("light_mode", lightMode);
      }

      const res = await axios.post(UPDATE_PROFILE_ENDPOINT, form);
      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось сохранить");
      }

      if (res.data?.user) {
        const nextUser: ProfileUser = res.data.user;
        originalUser.current = nextUser;
        setUser(nextUser);

        if (section === "names") {
          setFirstName(normalizeText(nextUser.first_name));
          setLastName(normalizeText(nextUser.last_name));
          setOtherName(normalizeText(nextUser.other_name));
        }

        if (section === "credentials") {
          setNickname(normalizeText(nextUser.nickname));
          setLogin(normalizeText(nextUser.login));
        }

        if (section === "demographics") {
          setBirthday(formatDate(nextUser.birthday));
          setCountry(toSelectCountry(nextUser.country));
          setSex(toSelectSex(nextUser.sex));
        }

        if (section === "promo") {
          setPromoSendStatus(Boolean(nextUser.promo_send_status));
        }

        if (section === "theme") {
          const resolvedTheme = nextUser.light_mode || "system";
          setLightMode(resolvedTheme);
          setTheme(resolvedTheme);
        }
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const fieldErrors = e.response?.data?.fields;
        if (fieldErrors) {
          const firstMessage = Object.values(fieldErrors).flat().filter(Boolean)[0];
          setError(typeof firstMessage === "string" ? firstMessage : "Ошибка валидации");
        } else {
          setError(e.response?.data?.error || "Не удалось сохранить");
        }
      } else {
        setError(e instanceof Error ? e.message : "Не удалось сохранить");
      }
    } finally {
      setSavingSection(null);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setError("");

    try {
      await axios.post(LOGOUT_ENDPOINT, new URLSearchParams());
      setLogoutOpen(false);
      navigate("/", { replace: true });
    } catch {
      setError("Не удалось выйти из аккаунта");
    } finally {
      setLogoutLoading(false);
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

        <Card className="overflow-hidden" data-loading={loading}>
          <CardContent className="space-y-6 p-6">
            <Button variant="ghost" className="h-10 w-fit gap-2 px-2" onClick={() => navigate("/my")}>
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>

            <div className="flex flex-col items-center gap-4">
              <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                Профиль
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

            <section className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    Имя <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    className="h-12 text-base"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    aria-invalid={!isValidName(firstName)}
                    placeholder="Имя"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    Фамилия <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    className="h-12 text-base"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    aria-invalid={!isValidName(lastName)}
                    placeholder="Фамилия"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_name">Отчество</Label>
                  <Input
                    id="other_name"
                    className="h-12 text-base"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    aria-invalid={!isValidName(otherName)}
                    placeholder="Отчество"
                  />
                </div>
              </div>

              {nameDirty && (
                <Button
                  onClick={() => saveSection("names")}
                  disabled={!canSaveNames || savingSection === "names"}
                  className="h-11 w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingSection === "names" ? "Сохраняем..." : "Сохранить"}
                </Button>
              )}
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nickname">
                    Никнейм <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nickname"
                    className="h-12 text-base"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    aria-invalid={!isValidNickname(nickname)}
                    placeholder="Никнейм"
                  />
                  <p className="text-xs text-muted-foreground">
                    Никнейм - это имя, которое мы можем показывать вместо логина. Это может быть
                    псевдоним, сокращение от имени или другое удобное обращение.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login">
                    Login <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="login"
                    className={cn(
                      "h-12 text-base",
                      !loginCheck.same &&
                        !loginFormatValid &&
                        "border-red-500 focus-visible:ring-red-500/30",
                      loginCheck.loading &&
                        !loginCheck.same &&
                        loginFormatValid &&
                        "border-sky-400 focus-visible:ring-sky-400/30",
                      loginCheck.valid &&
                        loginCheck.available &&
                        !loginCheck.same &&
                        loginFormatValid &&
                        "border-emerald-500 focus-visible:ring-emerald-500/30",
                      !loginCheck.valid &&
                        !loginCheck.same &&
                        loginFormatValid &&
                        "border-red-500 focus-visible:ring-red-500/30"
                    )}
                    value={login}
                    onChange={(e) => {
                      setLogin(e.target.value);
                      setLoginCheck((state) => ({ ...state, loading: true, same: false }));
                    }}
                    aria-invalid={!loginCheck.same && (!loginCheck.valid || !loginFormatValid)}
                    placeholder="Логин"
                  />
                  <div className="text-xs">
                    {loginCheck.same ? (
                      <p className="text-muted-foreground">Текущий логин</p>
                    ) : !loginFormatValid ? (
                      <div className="space-y-1 text-red-600">
                        <p>Логин может содержать только символы a-z, точку, подчёркивание и дефис</p>
                        <p>Заглавные буквы, пробелы и неанглийские символы запрещены</p>
                      </div>
                    ) : loginCheck.loading ? (
                      <p className="text-muted-foreground">Проверяем доступность логина...</p>
                    ) : loginCheck.valid && loginCheck.available ? (
                      <p className="text-emerald-600">Логин доступен</p>
                    ) : (
                      <div className="space-y-1 text-red-600">
                        {loginCheck.rules.length > 0 ? (
                          loginCheck.rules.map((rule) => <p key={rule}>{rule}</p>)
                        ) : (
                          <p>Логин недоступен</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {credentialsDirty && (
                <Button
                  onClick={() => saveSection("credentials")}
                  disabled={!canSaveCredentials || savingSection === "credentials"}
                  className="h-11 w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingSection === "credentials" ? "Сохраняем..." : "Сохранить"}
                </Button>
              )}
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input className="h-12 text-base" value={user?.phone || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Почта</Label>
                  <Input className="h-12 text-base" value={user?.email || ""} disabled />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Дата рождения</Label>
                  <Input
                    className="h-12 text-base"
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    min="1900-01-01"
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Страна</Label>
                  <Select value={country} onValueChange={(value) => setCountry(value as CountryValue)}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Не указано" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">Не указано</SelectItem>
                      <SelectItem value="RU">Россия</SelectItem>
                      <SelectItem value="BY">Беларусь</SelectItem>
                      <SelectItem value="KZ">Казахстан</SelectItem>
                      <SelectItem value="-">Иная страна</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Пол</Label>
                  <Select value={sex} onValueChange={(value) => setSex(value as SexValue)}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Не указано" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Не указывать</SelectItem>
                      <SelectItem value="2">Мужской</SelectItem>
                      <SelectItem value="3">Женский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {demographicsDirty && (
                <Button
                  onClick={() => saveSection("demographics")}
                  disabled={!canSaveDemographics || savingSection === "demographics"}
                  className="h-11 w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingSection === "demographics" ? "Сохраняем..." : "Сохранить"}
                </Button>
              )}
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 p-4">
                <Checkbox
                  checked={promoSendStatus}
                  onCheckedChange={(checked) => setPromoSendStatus(checked === true)}
                  id="promo_send_status"
                />
                <div className="space-y-1">
                  <Label htmlFor="promo_send_status">
                    Разрешить промо уведомления
                  </Label>
                </div>
              </div>

              {promoDirty && (
                <Button
                  onClick={() => saveSection("promo")}
                  disabled={!canSavePromo || savingSection === "promo"}
                  className="h-11 w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingSection === "promo" ? "Сохраняем..." : "Сохранить"}
                </Button>
              )}
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="light_mode">Тема</Label>
                  <Select
                    value={lightMode}
                    onValueChange={(value) => {
                      if (value !== "system" && value !== "light" && value !== "dark") return;
                      setLightMode(value);
                      setTheme(value);
                    }}
                  >
                  <SelectTrigger id="light_mode" className="h-12 text-base">
                    <SelectValue placeholder="Системная" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Системная</SelectItem>
                    <SelectItem value="light">Светлая</SelectItem>
                    <SelectItem value="dark">Тёмная</SelectItem>
                  </SelectContent>
                  </Select>
                </div>

                {themeDirty && (
                  <Button
                    onClick={() => saveSection("theme")}
                    disabled={savingSection === "theme"}
                    className="h-11 w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingSection === "theme" ? "Сохраняем..." : "Сохранить"}
                  </Button>
                )}
            </section>

            <Separator />

            <div className="space-y-3">
              <Button variant="destructive" className="h-11 w-full gap-2" onClick={() => setLogoutOpen(true)}>
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500/20 bg-red-50/80 text-red-700 dark:bg-red-950/20 dark:text-red-200">
            <CardContent className="p-4 text-sm">{error}</CardContent>
          </Card>
        )}
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
            <Button variant="destructive" className="h-11" onClick={handleLogout} disabled={logoutLoading}>
              {logoutLoading ? "Выходим..." : "Да, выйти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  return shell;
}
