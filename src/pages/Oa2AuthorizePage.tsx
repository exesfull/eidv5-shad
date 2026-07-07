"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, X } from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { eidAuthEndpoint, eidOa2Endpoint } from "@/lib/eid-api";

const CURRENT_USER_ENDPOINT = eidAuthEndpoint("getCurrentUser");
const REMEMBER_RETURN_TO_ENDPOINT = eidAuthEndpoint("rememberReturnTo");
const AUTHORIZE_DATA_ENDPOINT = eidOa2Endpoint("getAuthorizeRequestData");
const APPROVE_ENDPOINT = eidOa2Endpoint("approveAuthorizeRequest");
const DENY_ENDPOINT = eidOa2Endpoint("denyAuthorizeRequest");

type CurrentUser = {
  id: number;
  login: string;
  nickname: string;
  img_url?: string | null;
  light_mode?: "system" | "light" | "dark";
};

type Oa2RequestedScope = {
  name: string;
  title: string;
};

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
};

type Oa2AuthorizeRequest = {
  client_id: string;
  slug: string;
  response_type: string;
  redirect_uri: string;
  scope: string;
  scopes: string[];
  state?: string | null;
  return_to?: string | null;
};

type Oa2AuthorizeData = {
  app: Oa2App;
  request: Oa2AuthorizeRequest;
  requested: Oa2RequestedScope[];
};

const getCurrentAppUrl = () => `${window.location.pathname}${window.location.search}`;

const getInitialQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    client_id: params.get("client_id") || "",
    slug: params.get("slug") || "",
    redirect_uri: params.get("redirect_uri") || "",
    scope: params.get("scope") || "openid profile email",
    state: params.get("state") || "",
    response_type: params.get("response_type") || "code",
  };
};

const getReadableError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseError = error.response?.data?.error;
    if (responseError) return responseError;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export default function Oa2AuthorizePage() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const query = useMemo(getInitialQuery, []);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<Oa2AuthorizeData | null>(null);

  const currentUrl = getCurrentAppUrl();
  const redirectToAuth = () => {
    window.location.href = `${REMEMBER_RETURN_TO_ENDPOINT}?return_to=${encodeURIComponent(currentUrl)}`;
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const currentRes = await axios.post(CURRENT_USER_ENDPOINT, new URLSearchParams());
        if (!mounted) return;

        if (!currentRes.data?.authorized || !currentRes.data?.user) {
          redirectToAuth();
          return;
        }

        const nextUser: CurrentUser = currentRes.data.user;
        setUser(nextUser);
        if (nextUser.light_mode) {
          setTheme(nextUser.light_mode);
        }

        const form = new URLSearchParams();
        if (query.client_id) form.set("client_id", query.client_id);
        if (query.slug) form.set("slug", query.slug);
        if (query.redirect_uri) form.set("redirect_uri", query.redirect_uri);
        form.set("scope", query.scope);
        form.set("state", query.state);
        form.set("response_type", query.response_type);
        form.set("return_to", currentUrl);

        const authorizeRes = await axios.post(AUTHORIZE_DATA_ENDPOINT, form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (!authorizeRes.data?.status) {
          throw new Error(authorizeRes.data?.error || "Не удалось загрузить запрос");
        }

        setData(authorizeRes.data as Oa2AuthorizeData);
      } catch (nextError) {
        if (axios.isAxiosError(nextError) && nextError.response?.status === 401) {
          redirectToAuth();
          return;
        }

        setError(getReadableError(nextError, "Не удалось открыть страницу подтверждения"));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [currentUrl, navigate, query.client_id, query.redirect_uri, query.response_type, query.scope, query.slug, query.state, setTheme]);

  const buildRequestForm = () => {
    const form = new URLSearchParams();
    if (query.client_id) form.set("client_id", query.client_id);
    if (query.slug) form.set("slug", query.slug);
    if (query.redirect_uri) form.set("redirect_uri", query.redirect_uri);
    form.set("scope", query.scope);
    form.set("state", query.state);
    form.set("response_type", query.response_type);
    form.set("return_to", currentUrl);
    return form;
  };

  const handleAllow = async () => {
    setProcessing(true);
    setError("");

    try {
      const res = await axios.post(APPROVE_ENDPOINT, buildRequestForm(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status || !res.data?.redirect_url) {
        throw new Error(res.data?.error || "Не удалось подтвердить доступ");
      }

      window.location.href = res.data.redirect_url;
    } catch (nextError) {
      if (axios.isAxiosError(nextError) && nextError.response?.status === 401) {
        redirectToAuth();
        return;
      }

      setError(getReadableError(nextError, "Не удалось подтвердить доступ"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    setProcessing(true);
    setError("");

    try {
      const res = await axios.post(DENY_ENDPOINT, buildRequestForm(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status || !res.data?.redirect_url) {
        throw new Error(res.data?.error || "Не удалось отклонить доступ");
      }

      window.location.href = res.data.redirect_url;
    } catch (nextError) {
      if (axios.isAxiosError(nextError) && nextError.response?.status === 401) {
        redirectToAuth();
        return;
      }

      setError(getReadableError(nextError, "Не удалось отклонить доступ"));
    } finally {
      setProcessing(false);
    }
  };

  const handleSwitchAccount = () => {
    navigate(`/swich-accoutn?return_to=${encodeURIComponent(currentUrl)}`);
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
            {loading ? (
              <>
                <Skeleton className="mx-auto h-20 w-20 rounded-full" />
                <Skeleton className="h-6 w-40 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </>
            ) : error && !data ? (
              <div className="space-y-4 text-center">
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
                <Button className="h-11 w-full" onClick={() => navigate("/my")}>
                  Назад
                </Button>
              </div>
            ) : data ? (
              <>
                <div className="flex flex-col items-center gap-3 text-center">
                  <AvatarWithLoader
                    src={data.app.image_url || undefined}
                    alt={data.app.name}
                    size="xl"
                    fallback={
                      <span className="text-2xl font-semibold text-muted-foreground">
                        {data.app.name?.[0]?.toUpperCase() || "A"}
                      </span>
                    }
                  />

                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Приложение запрашивает</p>
                    <h1 className="text-2xl font-semibold leading-tight">{data.app.name}</h1>
                    {data.app.description ? (
                      <p className="text-sm text-muted-foreground">{data.app.description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Запрашиваемый доступ</span>
                  </div>

                  <div className="space-y-2">
                    {data.requested.map((item) => (
                      <div key={item.name} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">{item.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-3 text-sm">
                    {data.app.main_site_url ? (
                      <a
                        href={data.app.main_site_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Сайт приложения
                      </a>
                    ) : null}
                    {data.app.policy_url ? (
                      <a
                        href={data.app.policy_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Политика
                      </a>
                    ) : null}
                  </div>
                </div>

                {user ? (
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="w-full rounded-2xl border border-border/60 p-4 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarWithLoader
                        src={user.img_url || undefined}
                        alt={user.nickname || user.login}
                        size="md"
                        fallback={
                          <span className="text-sm font-semibold text-muted-foreground">
                            {user.nickname?.[0]?.toUpperCase() || user.login?.[0]?.toUpperCase() || "U"}
                          </span>
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">Выполняется вход как</p>
                        <p className="truncate font-medium">{user.nickname || user.login}</p>
                      </div>
                    </div>
                  </button>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <Separator />

                <div className="space-y-3">
                  <Button className="h-11 w-full gap-2" onClick={() => void handleAllow()} disabled={processing}>
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Разрешить
                  </Button>

                  <Button variant="outline" className="h-11 w-full gap-2" onClick={() => void handleDeny()} disabled={processing}>
                    <X className="h-4 w-4" />
                    Отклонить
                  </Button>

                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">или</span>
                    <Separator className="flex-1" />
                  </div>

                  <Button variant="outline" className="h-11 w-full gap-2" onClick={handleSwitchAccount} disabled={processing}>
                    <ArrowRight className="h-4 w-4" />
                    Сменить аккаунт
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
