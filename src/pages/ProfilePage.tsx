"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Save } from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { eidAuthEndpoint } from "@/lib/eid-api";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");
const CHECK_LOGIN_ENDPOINT = eidAuthEndpoint("checkLoginAvailability");
const UPDATE_PROFILE_ENDPOINT = eidAuthEndpoint("updateProfile");
const LOGOUT_ENDPOINT = eidAuthEndpoint("logout");

type SexValue = "1" | "2" | "3";
type CountryValue = "RU" | "BY" | "KZ" | "-" | "";

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
};

type LoginCheckState = {
  loading: boolean;
  valid: boolean;
  available: boolean;
  rules: string[];
};

const allowedCountries: CountryValue[] = ["RU", "BY", "KZ", "-"];

function normalizeText(value?: string | null) {
  return (value ?? "").trim();
}

function toSelectCountry(value?: string | null): CountryValue {
  const normalized = normalizeText(value).toUpperCase();
  if (allowedCountries.includes(normalized as CountryValue)) {
    return normalized as CountryValue;
  }
  return "";
}

function toSelectSex(value?: string | null): SexValue {
  if (value === "2" || value === "3") {
    return value;
  }
  return "1";
}

function formatDate(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  return normalized.slice(0, 10);
}

function isValidName(value: string) {
  if (!value.trim()) return true;
  return value.trim().length <= 60 && /^[\p{L} -]+$/u.test(value.trim());
}

function isValidNickname(value: string) {
  if (!value.trim()) return true;
  return value.trim().length <= 50;
}

function compareNullableText(a?: string | null, b?: string | null) {
  return normalizeText(a) === normalizeText(b);
}

function comparePromo(a?: boolean | number | null, b?: boolean) {
  return Boolean(a) === Boolean(b);
}

function compareCountry(a?: string | null, b?: string) {
  return toSelectCountry(a) === (b || "");
}

function compareSex(a?: string | null, b?: string) {
  return toSelectSex(a) === (b || "1");
}

function compareDate(a?: string | null, b?: string) {
  return formatDate(a) === (b || "");
}

export default function ProfilePage() {
  const navigate = useNavigate();
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
    rules: [],
  });

  const [birthday, setBirthday] = useState("");
  const [country, setCountry] = useState<CountryValue>("");
  const [sex, setSex] = useState<SexValue>("1");
  const [promoSendStatus, setPromoSendStatus] = useState(false);

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
        setLoginCheck({
          loading: false,
          valid: true,
          available: true,
          rules: [],
        });
      } catch {
        if (mounted) {
          navigate("/", { replace: true });
        }
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
        rules: ["Логин обязателен", "Логин должен быть не короче 4 символов"],
      });
      return;
    }

    if (currentLogin === originalLogin) {
      setLoginCheck({
        loading: false,
        valid: true,
        available: true,
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
          rules: Array.isArray(res.data?.rules) ? res.data.rules : [],
        });
      } catch {
        setLoginCheck({
          loading: false,
          valid: false,
          available: false,
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

  const canSaveNames = nameDirty &&
    [firstName, lastName, otherName].every((value) => isValidName(value));

  const canSaveCredentials =
    credentialsDirty &&
    isValidNickname(nickname) &&
    !loginCheck.loading &&
    loginCheck.valid &&
    loginCheck.available;

  const canSaveDemographics = demographicsDirty;
  const canSavePromo = promoDirty;

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
        form.set("country", country);
        form.set("sex", sex);
      }

      if (section === "promo") {
        form.set("promo_send_status", promoSendStatus ? "1" : "0");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <Card className="overflow-hidden border-border/60 bg-white/80 backdrop-blur">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-24 w-24 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-72 animate-pulse rounded bg-muted/80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Card className="overflow-hidden border-border/60 bg-white/80 backdrop-blur">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <div className="mx-auto sm:mx-0">
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
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                Exesfull-ID
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                {user?.nickname || user?.login}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Управляйте данными профиля, логином и настройками уведомлений.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/60 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>ФИО</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Имя</Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    aria-invalid={!isValidName(firstName)}
                    placeholder="Имя"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Фамилия</Label>
                  <Input
                    id="last_name"
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
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    aria-invalid={!isValidName(otherName)}
                    placeholder="Отчество"
                  />
                </div>
              </div>

              {nameDirty && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection("names")}
                    disabled={!canSaveNames || savingSection === "names"}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingSection === "names" ? "Сохраняем..." : "Сохранить"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Никнейм и login</CardTitle>
              <p className="text-sm text-muted-foreground">
                Здесь вы можете указать, как вы хотели бы, чтобы мы вас называли: псевдоним,
                сокращение от имени или иное.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nickname">Никнейм</Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    aria-invalid={!isValidNickname(nickname)}
                    placeholder="Никнейм"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login">Login</Label>
                  <Input
                    id="login"
                    value={login}
                    onChange={(e) => {
                      setLogin(e.target.value);
                      setLoginCheck((state) => ({ ...state, loading: true }));
                    }}
                    aria-invalid={!loginCheck.valid}
                    className={cn(
                      loginCheck.loading && "border-sky-400 focus-visible:ring-sky-400/30",
                      loginCheck.valid && loginCheck.available && "border-emerald-500 focus-visible:ring-emerald-500/30",
                      !loginCheck.valid && "border-red-500 focus-visible:ring-red-500/30"
                    )}
                    placeholder="Логин"
                  />
                  <div className="text-xs">
                    {loginCheck.loading ? (
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
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection("credentials")}
                    disabled={!canSaveCredentials || savingSection === "credentials"}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingSection === "credentials" ? "Сохраняем..." : "Сохранить"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Контакты</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={user?.phone || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Почта</Label>
                <Input value={user?.email || ""} disabled />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Дата рождения, страна и пол</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Дата рождения</Label>
                  <Input
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
                    <SelectTrigger>
                      <SelectValue placeholder="Не указано" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectTrigger>
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
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection("demographics")}
                    disabled={!canSaveDemographics || savingSection === "demographics"}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingSection === "demographics" ? "Сохраняем..." : "Сохранить"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Промо уведомления</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
                <Checkbox
                  checked={promoSendStatus}
                  onCheckedChange={(checked) => setPromoSendStatus(checked === true)}
                  id="promo_send_status"
                />
                <div className="space-y-1">
                  <Label htmlFor="promo_send_status">Разрешить промо уведомления</Label>
                  <p className="text-sm text-muted-foreground">
                    Мы будем отправлять только те сообщения, которые вы разрешите в настройках.
                  </p>
                </div>
              </div>

              {promoDirty && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSection("promo")}
                    disabled={!canSavePromo || savingSection === "promo"}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingSection === "promo" ? "Сохраняем..." : "Сохранить"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-red-500/20 bg-red-50/80 text-red-700">
            <CardContent className="p-4 text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="gap-2" disabled>
            <ArrowRight className="h-4 w-4" />
            Сменить аккаунт
          </Button>

          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
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
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleLogout} disabled={logoutLoading}>
              {logoutLoading ? "Выходим..." : "Да, выйти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
