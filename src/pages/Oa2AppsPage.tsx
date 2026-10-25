"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Copy, Eye, EyeOff, FileText, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { buildLoginUrlWithReturnTo, currentLocationReturnTo } from "@/lib/auth-return";
import { eidAuthEndpoint, eidOa2Endpoint } from "@/lib/eid-api";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");
const LIST_APPS_ENDPOINT = eidOa2Endpoint("listMyApps");
const GET_APP_ENDPOINT = eidOa2Endpoint("getMyApp");
const CREATE_APP_ENDPOINT = eidOa2Endpoint("createMyApp");
const UPDATE_APP_ENDPOINT = eidOa2Endpoint("updateMyApp");
const DELETE_APP_ENDPOINT = eidOa2Endpoint("deleteMyApp");
const DEFAULT_APP_IMAGE_URL = "https://img.icons8.com/?size=256&id=102562&format=png";

type Oa2App = {
  id: number;
  slug: string;
  client_id: string;
  client_secret?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  main_site_url?: string | null;
  policy_url?: string | null;
  redirect_uris?: string[];
  is_active?: boolean;
};

type DetailForm = {
  name: string;
  description: string;
  main_site_url: string;
  policy_url: string;
  redirect_uris: string;
};

type CreateForm = {
  name: string;
  main_site_url: string;
  policy_url: string;
};

const emptyDetailForm: DetailForm = {
  name: "",
  description: "",
  main_site_url: "",
  policy_url: "",
  redirect_uris: "",
};

const emptyCreateForm: CreateForm = {
  name: "",
  main_site_url: "",
  policy_url: "",
};

const normalizeText = (value?: string | null) => (value ?? "").trim();

const normalizeRedirectUris = (value?: string[] | string | null) => {
  if (Array.isArray(value)) return value.join("\n");
  return normalizeText(value);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

const openDetailPath = (slug: string) => `/my/dev/apps/oa2/${slug}`;

export default function Oa2AppsPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [apps, setApps] = useState<Oa2App[]>([]);
  const [app, setApp] = useState<Oa2App | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [detailForm, setDetailForm] = useState<DetailForm>(emptyDetailForm);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<"client_id" | "client_secret" | null>(null);

  const isDetailPage = Boolean(slug);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const currentUserRes = await axios.post(CURRENT_USER_ENDPOINT, new URLSearchParams());
      if (!currentUserRes.data?.authorized || !currentUserRes.data?.user) {
        navigate(buildLoginUrlWithReturnTo(currentLocationReturnTo()), { replace: true });
        return;
      }

      if (currentUserRes.data.user.light_mode) {
        setTheme(currentUserRes.data.user.light_mode);
      }

      const appsRes = await axios.post(LIST_APPS_ENDPOINT, new URLSearchParams());
      if (!appsRes.data?.status) {
        throw new Error(appsRes.data?.error || "Не удалось загрузить приложения");
      }

      const nextApps = (appsRes.data.apps || []) as Oa2App[];
      setApps(nextApps);

      let nextApp: Oa2App | null = null;
      if (slug) {
        nextApp = nextApps.find((item) => item.slug === slug) || null;
        const appRes = await axios.post(GET_APP_ENDPOINT, new URLSearchParams({ slug }));
        if (appRes.data?.status && appRes.data?.app) {
          nextApp = appRes.data.app as Oa2App;
        }
      }

      setApp(nextApp);
      setShowSecret(false);
      setCopiedField(null);
      setDetailForm(
        nextApp
          ? {
              name: normalizeText(nextApp.name),
              description: normalizeText(nextApp.description),
              main_site_url: normalizeText(nextApp.main_site_url),
              policy_url: normalizeText(nextApp.policy_url),
              redirect_uris: normalizeRedirectUris(nextApp.redirect_uris),
            }
          : emptyDetailForm
      );
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Не удалось загрузить приложения"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [slug]);

  const detailChanged = useMemo(() => {
    if (!app) return false;

    return (
      normalizeText(detailForm.name) !== normalizeText(app.name) ||
      normalizeText(detailForm.description) !== normalizeText(app.description) ||
      normalizeText(detailForm.main_site_url) !== normalizeText(app.main_site_url) ||
      normalizeText(detailForm.policy_url) !== normalizeText(app.policy_url) ||
      normalizeText(detailForm.redirect_uris) !== normalizeRedirectUris(app.redirect_uris)
    );
  }, [app, detailForm.description, detailForm.main_site_url, detailForm.name, detailForm.policy_url, detailForm.redirect_uris]);

  const canCreate = normalizeText(createForm.name) !== "";
  const canSave = Boolean(app && detailChanged);

  const agentPrompt = useMemo(() => {
    if (!app) return "";
    const config = {
      name: detailForm.name,
      description: detailForm.description,
      main_site_url: detailForm.main_site_url,
      policy_url: detailForm.policy_url,
      redirect_uris: detailForm.redirect_uris.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      client_id: app.client_id,
      ...(includeSecrets ? { secret_token: app.client_secret || "" } : {}),
    };
    return `Подключи вход через Exesfull-ID к этому приложению. Реализуй рабочую серверную интеграцию по приведённым ниже требованиям и адаптируй её к существующему стеку проекта. Не выдавай секреты в браузер, клиентский JavaScript, логи или репозиторий. Если секрет не указан, используй переменную окружения EID_SECRET_TOKEN и попроси владельца задать её.\n\nНастройки приложения (JSON):\n${JSON.stringify(config, null, 2)}\n\nПротокол Exesfull-ID SSO (это SSO flow, не OAuth2 authorization-code/token flow):\n1. Создай на сервере случайный криптографически стойкий state для каждой попытки входа, сохрани его в пользовательской сессии и перенаправь браузер на https://id.exesfull.com/oauth/esm/sso?response_type=code&client_id=<URL-encoded client_id>&state=<URL-encoded state>.\n2. Добавь callback на один из настроенных redirect_uris. При возврате проверь state точным сравнением с сохранённым значением, удали его после использования и отклоняй отсутствующий/несовпадающий state. Не принимай произвольный callback URL из запроса.\n3. Получи одноразовый code из callback и обменяй его только с серверной стороны запросом GET или POST на https://id.exesfull.com/oauth/api/esm/v5/eid/esm/sso/getUser с параметрами client_id, code и hash. Вычисляй hash как lowercase hex SHA-256 от конкатенации secret_token + code (без разделителя).\n4. Проверь успешный JSON-ответ status=true и наличие user. Создай локальную сессию приложения на основе user; не используй code как access token и не используй cookie eidTD для этого SSO. Не сохраняй секрет или hash в браузере и не логируй их.\n5. Обработай ошибки сети, неверные ответы и повторное использование/просроченный code безопасно; после входа перенаправь пользователя на заранее сохранённый внутренний адрес, защищаясь от open redirect.\n\nОтвет getUser содержит user с полями id, login, nickname, first_name, last_name, other_name, email, phone, gui, auth_status, sex, birthday, country, promo_send_status, img_url, is_dual_user и token с refresh_token, token_expires_at, last_synced_at, is_revoked. Храни чувствительные данные только на сервере и используй минимально необходимые поля.\n\nСначала изучи текущую структуру, фреймворк, маршрутизацию, сессии и стиль проекта. Затем реализуй кнопку входа, серверный start/callback, безопасное хранение конфигурации, обработку ошибок и кратко опиши изменённые файлы и необходимые переменные окружения. Если детали контракта API в коде расходятся с этой инструкцией, явно укажи расхождение и не придумывай поддержку OAuth2-токенов. Не меняй существующие механизмы авторизации без необходимости.`;
  }, [app, detailForm.description, detailForm.main_site_url, detailForm.name, detailForm.policy_url, detailForm.redirect_uris, includeSecrets]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt);
      setPromptOpen(false);
    } catch {
      setError("Не удалось скопировать промпт. Выделите текст и скопируйте вручную.");
    }
  };

  const copyValue = async (field: "client_id" | "client_secret") => {
    const value = field === "client_id" ? app?.client_id : app?.client_secret;
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1000);
    } catch {
      setCopiedField(null);
    }
  };

  const submitCreate = async () => {
    if (!canCreate) return;

    setSaving(true);
    setError("");

    try {
      const body = new URLSearchParams();
      body.set("name", normalizeText(createForm.name));
      body.set("main_site_url", normalizeText(createForm.main_site_url));
      body.set("policy_url", normalizeText(createForm.policy_url));

      const res = await axios.post(CREATE_APP_ENDPOINT, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status || !res.data?.app?.slug) {
        throw new Error(res.data?.error || "Не удалось создать приложение");
      }

      const nextApp = res.data.app as Oa2App;
      setApps((prev) => [nextApp, ...prev.filter((item) => item.slug !== nextApp.slug)]);
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      setShowSecret(false);
      navigate(openDetailPath(nextApp.slug), { replace: true });
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Не удалось создать приложение"));
    } finally {
      setSaving(false);
    }
  };

  const saveDetail = async () => {
    if (!app || !canSave) return;

    setSaving(true);
    setError("");

    try {
      const body = new URLSearchParams();
      body.set("slug", app.slug);
      body.set("name", normalizeText(detailForm.name));
      body.set("description", normalizeText(detailForm.description));
      body.set("main_site_url", normalizeText(detailForm.main_site_url));
      body.set("policy_url", normalizeText(detailForm.policy_url));
      body.set("redirect_uris", normalizeText(detailForm.redirect_uris));

      const res = await axios.post(UPDATE_APP_ENDPOINT, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status || !res.data?.app) {
        throw new Error(res.data?.error || "Не удалось сохранить приложение");
      }

      const nextApp = res.data.app as Oa2App;
      setApp(nextApp);
      setShowSecret(false);
      setDetailForm({
        name: normalizeText(nextApp.name),
        description: normalizeText(nextApp.description),
        main_site_url: normalizeText(nextApp.main_site_url),
        policy_url: normalizeText(nextApp.policy_url),
        redirect_uris: normalizeRedirectUris(nextApp.redirect_uris),
      });
      setApps((prev) => [nextApp, ...prev.filter((item) => item.slug !== nextApp.slug)]);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Не удалось сохранить приложение"));
    } finally {
      setSaving(false);
    }
  };

  const deleteDetail = async () => {
    if (!app) return;

    setDeleting(true);
    setError("");

    try {
      const body = new URLSearchParams();
      body.set("slug", app.slug);
      const res = await axios.post(DELETE_APP_ENDPOINT, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось удалить приложение");
      }

      setDeleteOpen(false);
      navigate("/my/dev/apps/oa2/", { replace: true });
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Не удалось удалить приложение"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted p-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-3xl space-y-6">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center font-semibold text-xl">
            <img className="mr-1 h-8 w-8" src="https://exesfull.com/img/10.svg" alt="" />
            Exesfull-ID
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
          <CardContent className="space-y-6 p-7 sm:p-9">
            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" className="h-9 gap-2 px-2" onClick={() => navigate("/my/dev/apps/oa2/", { replace: true })}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : isDetailPage ? (
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted/45 px-5 py-7 text-center sm:flex-row sm:text-left">
                    <AvatarWithLoader
                    src={app?.image_url || DEFAULT_APP_IMAGE_URL}
                    alt={app?.name || "OAuth2 app"}
                    size="xl"
                    fallback={
                      <span className="text-2xl font-semibold text-muted-foreground">
                        {(app?.name || "A")[0]?.toUpperCase() || "A"}
                      </span>
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">OAuth2 приложение</p>
                    <h1 className="text-2xl font-semibold leading-tight">{app?.name || "Приложение"}</h1>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium">
                      Название <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={detailForm.name}
                      maxLength={50}
                      onChange={(event) => setDetailForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Название"
                    />
                    <p className="text-xs text-muted-foreground">Обязательное поле, не более 50 символов.</p>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium">
                      URL основного сайта <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={detailForm.main_site_url}
                      onChange={(event) => setDetailForm((prev) => ({ ...prev, main_site_url: event.target.value }))}
                      placeholder="URL основного сайта"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      URL политики конфиденциальности <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={detailForm.policy_url}
                      onChange={(event) => setDetailForm((prev) => ({ ...prev, policy_url: event.target.value }))}
                      placeholder="URL политики конфиденциальности"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Описание</label>
                    <textarea
                      value={detailForm.description}
                      onChange={(event) => setDetailForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Описание"
                      rows={4}
                      className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Redirect URI</label>
                    <textarea
                      value={detailForm.redirect_uris}
                      onChange={(event) => setDetailForm((prev) => ({ ...prev, redirect_uris: event.target.value }))}
                      placeholder="Redirect URI, по одному на строку"
                      rows={4}
                      className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
                    />
                    <p className="text-xs text-muted-foreground">Адрес callback приложения, по одному адресу на строку.</p>
                  </div>
                </div>

                {app ? (
                  <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Client ID</span>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => void copyValue("client_id")}>
                          <Copy className="h-3.5 w-3.5" />
                          {copiedField === "client_id" ? "Скопировано" : "Копировать"}
                        </Button>
                      </div>
                      <Input value={app.client_id} readOnly className="font-mono text-xs opacity-80" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Client Secret</span>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => setShowSecret((value) => !value)}>
                            {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {showSecret ? "Скрыть" : "Показать"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2 px-2"
                            onClick={() => void copyValue("client_secret")}
                            disabled={!showSecret}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedField === "client_secret" ? "Скопировано" : "Копировать"}
                          </Button>
                        </div>
                      </div>
                      <Input
                        value={showSecret ? (app.client_secret || "") : "••••••••••••••••••••••••••••••••"}
                        readOnly
                        className="font-mono text-xs opacity-80"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button className="h-11 gap-2 sm:min-w-36" onClick={() => void saveDetail()} disabled={!canSave || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Сохранить
                  </Button>
                  <Button variant="outline" className="h-10 gap-2 rounded-full px-4" onClick={() => setDocsOpen(true)}>
                    <BookOpen className="h-4 w-4" /> Документация
                  </Button>
                  <Button variant="outline" className="h-10 gap-2 rounded-full px-4" onClick={() => setPromptOpen(true)}>
                    <FileText className="h-4 w-4" /> Промпт для нейроагента
                  </Button>
                  <Button variant="ghost" className="h-10 gap-2 sm:ml-auto" onClick={() => setDeleteOpen(true)} disabled={saving}>
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">Приложения</p>
                    <p className="text-sm text-muted-foreground">Список OAuth2-клиентов</p>
                  </div>
                  <Button className="h-10 gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Создать
                  </Button>
                </div>

                {apps.length > 0 ? (
                  <div className="space-y-2">
                    {apps.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(openDetailPath(item.slug))}
                        className="flex w-full items-center gap-3 rounded-2xl border border-border/70 p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <AvatarWithLoader
                          src={item.image_url || DEFAULT_APP_IMAGE_URL}
                          alt={item.name}
                          size="lg"
                          fallback={
                            <span className="text-lg font-semibold text-muted-foreground">
                              {item.name?.[0]?.toUpperCase() || "A"}
                            </span>
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{item.slug}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    Пока нет приложений. Создайте первое через кнопку выше.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Интеграция Exesfull-ID</DialogTitle>
            <DialogDescription>Это SSO-вход через Exesfull-ID с обменом одноразового кода на сервере.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 text-sm leading-6">
            <section className="space-y-2"><h3 className="font-semibold">1. Перенаправление на вход</h3><p>Создайте случайный state, сохраните его в сессии и перенаправьте пользователя на <code className="rounded bg-muted px-1.5 py-0.5">https://id.exesfull.com/oauth/esm/sso</code> с параметрами <code>response_type=code</code>, <code>client_id</code> и <code>state</code>.</p></section>
            <section className="space-y-2"><h3 className="font-semibold">2. Callback</h3><p>Exesfull-ID возвращает пользователя на настроенный адрес сайта с <code>code</code> и <code>state</code>. Сверьте state с сохранённым значением и отклоните callback, если он отсутствует или не совпадает.</p></section>
            <section className="space-y-2"><h3 className="font-semibold">3. Обмен кода</h3><p>С сервера отправьте <code>client_id</code>, <code>code</code> и <code>hash</code> в <code>https://id.exesfull.com/oauth/api/esm/v5/eid/esm/sso/getUser</code>. Подпись: <code>sha256(secret_token + code)</code> в hex. Секрет хранится только на сервере.</p></section>
            <section className="space-y-2"><h3 className="font-semibold">4. Локальная сессия</h3><p>При <code>status: true</code> используйте объект <code>user</code> для создания локальной сессии. Код одноразовый; не используйте его как API-токен. Проверяйте ошибки и не доверяйте произвольным redirect URL.</p></section>
            <p className="rounded-xl border border-border/70 bg-muted/40 p-4 text-muted-foreground">Полная инструкция для интеграции находится в <code>docs/sso-agent-guide.md</code> в репозитории проекта.</p>
          </div>
          <DialogFooter><Button onClick={() => setDocsOpen(false)}>Понятно</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Промпт для нейроагента</DialogTitle>
            <DialogDescription>Готовые инструкции и текущие настройки приложения для передачи агенту.</DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-4 text-sm">
            <input type="checkbox" className="mt-1 accent-primary" checked={includeSecrets} onChange={(event) => setIncludeSecrets(event.target.checked)} />
            <span><span className="font-medium">Включить секрет в промпт</span><span className="mt-1 block text-muted-foreground">По умолчанию выключено. При включении секрет попадёт в буфер обмена и будет виден в тексте ниже.</span></span>
          </label>
          <textarea readOnly value={agentPrompt} rows={16} className="w-full rounded-xl border border-input bg-muted/30 px-4 py-3 font-mono text-xs leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <DialogFooter><Button variant="outline" onClick={() => setPromptOpen(false)}>Закрыть</Button><Button className="gap-2" onClick={() => void copyPrompt()}><Copy className="h-4 w-4" />Скопировать промпт</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать приложение</DialogTitle>
            <DialogDescription>Заполните название и адреса. Redirect URL можно добавить позже.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Название <span className="text-destructive">*</span>
              </label>
              <Input
                value={createForm.name}
                maxLength={50}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Название"
              />
              <p className="text-xs text-muted-foreground">Обязательное поле, не более 50 символов.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                URL основного сайта <span className="text-destructive">*</span>
              </label>
              <Input
                value={createForm.main_site_url}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, main_site_url: event.target.value }))}
                placeholder="URL основного сайта"
              />
              <p className="text-xs text-muted-foreground">Ссылка на сам сайт приложения, куда пользователь попадает вне авторизации.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                URL политики конфиденциальности <span className="text-destructive">*</span>
              </label>
              <Input
                value={createForm.policy_url}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, policy_url: event.target.value }))}
                placeholder="URL политики конфиденциальности"
              />
              <p className="text-xs text-muted-foreground">Ссылка на правила обработки данных и политику конфиденциальности.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button className="h-11" onClick={() => void submitCreate()} disabled={!canCreate || saving}>
              {saving ? "Создаём..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить приложение?</DialogTitle>
            <DialogDescription>
              {app ? `Мы удалим ${app.name} и все связанные с ним данные.` : "Мы удалим приложение."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setDeleteOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" className="h-11" onClick={() => void deleteDetail()} disabled={deleting}>
              {deleting ? "Удаляем..." : "Да, удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
