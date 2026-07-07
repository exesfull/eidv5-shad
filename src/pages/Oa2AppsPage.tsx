"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Eye, EyeOff, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { eidAuthEndpoint, eidOa2Endpoint } from "@/lib/eid-api";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");
const LIST_APPS_ENDPOINT = eidOa2Endpoint("listMyApps");
const GET_APP_ENDPOINT = eidOa2Endpoint("getMyApp");
const CREATE_APP_ENDPOINT = eidOa2Endpoint("createMyApp");
const UPDATE_APP_ENDPOINT = eidOa2Endpoint("updateMyApp");
const DELETE_APP_ENDPOINT = eidOa2Endpoint("deleteMyApp");

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

type FormState = {
  slug: string;
  name: string;
  description: string;
  main_site_url: string;
  policy_url: string;
  redirect_uris: string;
};

const initialForm: FormState = {
  slug: "",
  name: "",
  description: "",
  main_site_url: "",
  policy_url: "",
  redirect_uris: "",
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

const appUrl = (slug?: string) => (slug ? `/my/dev/apps/oa2/${slug}` : "/my/dev/apps/oa2");

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
  const [showSecret, setShowSecret] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"client_id" | "client_secret" | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const isDetailPage = Boolean(slug);

  const load = async () => {
    setLoading(true);

    try {
      const currentUserRes = await axios.post(CURRENT_USER_ENDPOINT, new URLSearchParams());
      if (!currentUserRes.data?.authorized || !currentUserRes.data?.user) {
        navigate("/", { replace: true });
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
        const found = nextApps.find((item) => item.slug === slug);
        if (found) {
          nextApp = found;
        } else {
          try {
            const appRes = await axios.post(GET_APP_ENDPOINT, new URLSearchParams({ slug }));
            if (appRes.data?.status && appRes.data?.app) {
              nextApp = appRes.data.app as Oa2App;
            }
          } catch {
            nextApp = null;
          }
        }
      }

      setApp(nextApp);
      setForm(
        nextApp
          ? {
              slug: nextApp.slug,
              name: normalizeText(nextApp.name),
              description: normalizeText(nextApp.description),
              main_site_url: normalizeText(nextApp.main_site_url),
              policy_url: normalizeText(nextApp.policy_url),
              redirect_uris: normalizeRedirectUris(nextApp.redirect_uris),
            }
          : {
              ...initialForm,
              slug: slug || "",
            }
      );
      setShowSecret(false);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Не удалось загрузить приложения"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [slug]);

  const hasChanges = useMemo(() => {
    if (!app) {
      return (
        normalizeText(form.slug) !== "" ||
        normalizeText(form.name) !== "" ||
        normalizeText(form.description) !== "" ||
        normalizeText(form.main_site_url) !== "" ||
        normalizeText(form.policy_url) !== "" ||
        normalizeText(form.redirect_uris) !== ""
      );
    }

    return (
      normalizeText(form.name) !== normalizeText(app.name) ||
      normalizeText(form.description) !== normalizeText(app.description) ||
      normalizeText(form.main_site_url) !== normalizeText(app.main_site_url) ||
      normalizeText(form.policy_url) !== normalizeText(app.policy_url) ||
      normalizeText(form.redirect_uris) !== normalizeRedirectUris(app.redirect_uris)
    );
  }, [app, form.description, form.main_site_url, form.name, form.policy_url, form.redirect_uris, form.slug]);

  const canSave = useMemo(() => {
    if (!form.slug || !form.name) return false;
    return hasChanges || !app;
  }, [app, form.name, form.slug, hasChanges]);

  const copyValue = async (field: "client_id" | "client_secret") => {
    const value = field === "client_id" ? app?.client_id : app?.client_secret;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 900);
    } catch {
      setCopiedField(null);
    }
  };

  const saveApp = async () => {
    if (!canSave) return;

    setSaving(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.set("slug", normalizeText(form.slug));
      formData.set("name", normalizeText(form.name));
      formData.set("description", normalizeText(form.description));
      formData.set("main_site_url", normalizeText(form.main_site_url));
      formData.set("policy_url", normalizeText(form.policy_url));
      formData.set("redirect_uris", normalizeText(form.redirect_uris));

      const endpoint = app ? UPDATE_APP_ENDPOINT : CREATE_APP_ENDPOINT;
      const res = await axios.post(endpoint, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status || !res.data?.app) {
        throw new Error(res.data?.error || "Не удалось сохранить приложение");
      }

      const nextApp = res.data.app as Oa2App;
      setApp(nextApp);
      setForm({
        slug: nextApp.slug,
        name: normalizeText(nextApp.name),
        description: normalizeText(nextApp.description),
        main_site_url: normalizeText(nextApp.main_site_url),
        policy_url: normalizeText(nextApp.policy_url),
        redirect_uris: normalizeRedirectUris(nextApp.redirect_uris),
      });
      setApps((prev) => {
        const filtered = prev.filter((item) => item.slug !== nextApp.slug);
        return [nextApp, ...filtered];
      });
      if (!app) {
        navigate(appUrl(nextApp.slug), { replace: true });
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Не удалось сохранить приложение"));
    } finally {
      setSaving(false);
    }
  };

  const deleteApp = async () => {
    if (!app) return;

    setDeleting(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.set("slug", app.slug);
      const res = await axios.post(DELETE_APP_ENDPOINT, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось удалить приложение");
      }

      setDeleteOpen(false);
      navigate("/my/dev/apps/oa2", { replace: true });
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

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center font-semibold text-xl">
            <img className="mr-1 h-8 w-8" src="https://exesfull.com/img/10.svg" alt="" />
            Exesfull-ID
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" className="h-9 gap-2 px-2" onClick={() => navigate("/my")}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              {isDetailPage && app ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {app.slug}
                </span>
              ) : null}
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="mx-auto h-20 w-20 rounded-full" />
                <Skeleton className="h-5 w-40 mx-auto" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <>
                {error ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col items-center gap-3 text-center">
                  <AvatarWithLoader
                    src={app?.image_url || undefined}
                    alt={app?.name || "OAuth2 app"}
                    size="xl"
                    fallback={
                      <span className="text-2xl font-semibold text-muted-foreground">
                        {(app?.name || form.name || form.slug || "A")[0]?.toUpperCase() || "A"}
                      </span>
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {isDetailPage && app ? "OAuth2 приложение" : "Создание приложения"}
                    </p>
                    <h1 className="text-2xl font-semibold leading-tight">
                      {app?.name || form.name || "Новый клиент"}
                    </h1>
                  </div>
                </div>

                {!isDetailPage ? (
                  <div className="space-y-3">
                    <Input
                      value={form.slug}
                      onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                      placeholder="slug"
                    />
                    <Input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Название"
                    />
                    <Input
                      value={form.main_site_url}
                      onChange={(event) => setForm((prev) => ({ ...prev, main_site_url: event.target.value }))}
                      placeholder="Сайт"
                    />
                    <Input
                      value={form.policy_url}
                      onChange={(event) => setForm((prev) => ({ ...prev, policy_url: event.target.value }))}
                      placeholder="Политика"
                    />
                    <textarea
                      value={form.redirect_uris}
                      onChange={(event) => setForm((prev) => ({ ...prev, redirect_uris: event.target.value }))}
                      placeholder="Redirect URI, по одному на строку"
                      rows={4}
                      className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Input value={form.slug} readOnly className="opacity-80" />
                      <Input
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Название"
                      />
                      <Input
                        value={form.main_site_url}
                        onChange={(event) => setForm((prev) => ({ ...prev, main_site_url: event.target.value }))}
                        placeholder="Сайт"
                      />
                      <Input
                        value={form.policy_url}
                        onChange={(event) => setForm((prev) => ({ ...prev, policy_url: event.target.value }))}
                        placeholder="Политика"
                      />
                      <textarea
                        value={form.redirect_uris}
                        onChange={(event) => setForm((prev) => ({ ...prev, redirect_uris: event.target.value }))}
                        placeholder="Redirect URI, по одному на строку"
                        rows={4}
                        className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
                      />
                    </div>
                  </div>
                )}

                {isDetailPage && app ? (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">Client ID</span>
                          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => void copyValue("client_id")}>
                            <Copy className="h-3.5 w-3.5" />
                            {copiedField === "client_id" ? "Скопировано" : "Копировать"}
                          </Button>
                        </div>
                        <Input value={app.client_id} readOnly className="font-mono text-xs opacity-80" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">Client Secret</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-2 px-2"
                              onClick={() => setShowSecret((value) => !value)}
                            >
                              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              {showSecret ? "Скрыть" : "Посмотреть"}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => void copyValue("client_secret")}>
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
                  </>
                ) : null}

                {isDetailPage ? (
                  <div className="space-y-3">
                    <Button className="h-11 w-full gap-2" onClick={() => void saveApp()} disabled={!canSave || saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Сохранить
                    </Button>
                    <Button variant="outline" className="h-11 w-full gap-2" onClick={() => setDeleteOpen(true)} disabled={saving}>
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                ) : (
                  <Button className="h-11 w-full gap-2" onClick={() => void saveApp()} disabled={!canSave || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Создать
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {!loading && !isDetailPage && apps.length > 0 ? (
          <Card className="overflow-hidden border-border/60 bg-background/80 backdrop-blur">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Ваши приложения</p>
              <div className="space-y-2">
                {apps.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(appUrl(item.slug))}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/70 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <AvatarWithLoader
                      src={item.image_url || undefined}
                      alt={item.name}
                      size="md"
                      fallback={<span className="text-sm font-semibold text-muted-foreground">{item.name?.[0]?.toUpperCase() || "A"}</span>}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.slug}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить приложение?</DialogTitle>
            <DialogDescription>
              {app ? `Мы удалим ${app.name} и все связанные ключи доступа.` : "Мы удалим приложение."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setDeleteOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" className="h-11" onClick={() => void deleteApp()} disabled={deleting}>
              {deleting ? "Удаляем..." : "Да, удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
