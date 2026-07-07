"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, Plus } from "lucide-react";

import { AvatarWithLoader } from "@/components/ui/avatar-with-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { eidAuthEndpoint } from "@/lib/eid-api";

const GET_ACCOUNTS_ENDPOINT = eidAuthEndpoint("getAccounts");
const SWITCH_ACCOUNT_ENDPOINT = eidAuthEndpoint("switchAccount");
const AFTER_LOGIN_REDIRECT_KEY = "eidAfterLoginRedirect";
const AUTH_RETURN_TO_KEY = "eidAuthReturnTo";

const normalizeNavigatePath = (value: string) => {
  if (!value) return "/my";
  if (/^[a-z]+:\/\//i.test(value)) return value;

  try {
    const url = new URL(value, window.location.origin);
    const fullPath = `${url.pathname}${url.search}${url.hash}`;
    if (fullPath.startsWith("/oauth")) {
      return fullPath.slice("/oauth".length) || "/";
    }
    return fullPath || "/";
  } catch {
    if (value.startsWith("/oauth")) {
      return value.slice("/oauth".length) || "/";
    }
    return value;
  }
};

const isAbsoluteUrl = (value: string) => /^[a-z]+:\/\//i.test(value);

type Account = {
  token_id: number;
  user_id: number;
  is_default?: boolean;
  auth_type?: number;
  expires_at?: string | null;
  is_active?: boolean;
  user?: {
    id?: number;
    login?: string;
    nickname?: string;
    img_url?: string | null;
    pwd_hash_ver?: string | null;
  };
};

export default function SwitchAccountPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [returnTo, setReturnTo] = useState("/my");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextReturn =
      params.get("return_to") ||
      params.get("rto") ||
      params.get("next") ||
      sessionStorage.getItem(AUTH_RETURN_TO_KEY) ||
      "/my";
    setReturnTo(nextReturn);
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, nextReturn);
  }, []);

  const loadAccounts = async () => {
    setLoading(true);

    try {
      const res = await axios.post(GET_ACCOUNTS_ENDPOINT, new URLSearchParams());
      if (!res.data?.status) {
        navigate("/", { replace: true });
        return;
      }

      const nextAccounts = (res.data.accounts || []) as Account[];
      setAccounts(nextAccounts);
    } catch {
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const handleSwitch = async (tokenId: number) => {
    setSwitchingId(tokenId);

    try {
      const body = new URLSearchParams();
      body.set("token_id", String(tokenId));

      const res = await axios.post(SWITCH_ACCOUNT_ENDPOINT, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.data?.status) {
        throw new Error(res.data?.error || "Не удалось переключить аккаунт");
      }

      setAccounts((res.data.accounts || []) as Account[]);
      if (returnTo !== "/swich-accoutn") {
        sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
        if (isAbsoluteUrl(returnTo)) {
          window.location.href = returnTo;
          return;
        }

        navigate(normalizeNavigatePath(returnTo), { replace: true });
      }
    } catch {
      await loadAccounts();
    } finally {
      setSwitchingId(null);
    }
  };

  const handleAddAccount = () => {
    sessionStorage.setItem(AFTER_LOGIN_REDIRECT_KEY, "/swich-accoutn");
    setAddingAccount(true);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    navigate(`/?return_to=${encodeURIComponent(currentPath)}`);
  };

  const primaryTokenId = accounts.find((account) => account.is_default)?.token_id;

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
            <div className="space-y-3 text-center">
              <div>
                <p className="text-lg font-semibold">Смена аккаунта</p>
                <p className="text-sm text-muted-foreground">Выберите активный аккаунт или добавьте новый</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : accounts.length > 0 ? (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const isCurrent = account.token_id === primaryTokenId;
                  const user = account.user;

                  return (
                    <button
                      key={account.token_id}
                      type="button"
                      onClick={() => void handleSwitch(account.token_id)}
                      disabled={switchingId === account.token_id}
                      className={[
                        "w-full rounded-xl border p-3 text-left transition-all",
                        isCurrent
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/70 bg-background hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <AvatarWithLoader
                          src={user?.img_url || undefined}
                          alt={user?.nickname || user?.login || "account"}
                          size="lg"
                          fallback={
                            <span className="text-lg font-semibold text-muted-foreground">
                              {(user?.nickname || user?.login || "A")[0]?.toUpperCase()}
                            </span>
                          }
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">
                              {user?.nickname || user?.login || "Аккаунт"}
                            </p>
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                <Check className="h-3 w-3" />
                                Сейчас выбран
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {user?.login || user?.nickname || "Без логина"}
                          </p>
                        </div>

                        {switchingId === account.token_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                Аккаунты не найдены. Добавьте первый аккаунт.
              </div>
            )}

            <Button variant="outline" className="h-10 w-full gap-2" onClick={handleAddAccount} disabled={addingAccount}>
              <Plus className="h-4 w-4" />
              Добавить аккаунт
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
