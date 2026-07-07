"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";

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

type Oa2App = {
  id: number;
  slug: string;
  client_id: string;
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
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [detailForm, setDetailForm] = useState<DetailForm>(emptyDetailForm);

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

        if (!nextApp) {
          const appRes = await axios.post(GET_APP_ENDPOINT, new URLSearchParams({ slug }));
          if (appRes.data?.status && appRes.data?.app) {
            nextApp = appRes.data.app as Oa2App;
          }
        }
      }

      setApp(nextApp);
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
          <CardContent className="space-y-5 p-6">
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
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <AvatarWithLoader
                    src={app?.image_url || undefined}
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
                    <p className="text-sm text-muted-foreground">Slug: {app?.slug}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    value={detailForm.name}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Название"
                  />
                  <textarea
                    value={detailForm.description}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Описание"
                    rows={4}
                    className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
                  />
                  <Input
                    value={detailForm.main_site_url}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, main_site_url: event.target.value }))}
                    placeholder="URL основного сайта"
                  />
                  <Input
                    value={detailForm.policy_url}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, policy_url: event.target.value }))}
                    placeholder="URL политики конфиденциальности"
                  />
                  <textarea
                    value={detailForm.redirect_uris}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, redirect_uris: event.target.value }))}
                    placeholder="Redirect URI, по одному на строку"
                    rows={4}
                    className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
                  />
                </div>

                <div className="space-y-3">
                  <Button className="h-11 w-full gap-2" onClick={() => void saveDetail()} disabled={!canSave || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Сохранить
                  </Button>
                  <Button variant="outline" className="h-11 w-full gap-2" onClick={() => setDeleteOpen(true)} disabled={saving}>
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
                          src={item.image_url || undefined}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать приложение</DialogTitle>
            <DialogDescription>Заполните название и адреса. Redirect URL можно добавить позже.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Название"
            />
            <div className="space-y-1">
              <Input
                value={createForm.main_site_url}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, main_site_url: event.target.value }))}
                placeholder="URL основного сайта"
              />
              <p className="text-xs text-muted-foreground">Ссылка на сам сайт приложения, куда пользователь попадает вне авторизации.</p>
            </div>
            <div className="space-y-1">
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

