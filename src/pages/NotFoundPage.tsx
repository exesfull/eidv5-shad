"use client";

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [logoLoaded, setLogoLoaded] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted p-6">
      {/* THEME */}
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6 text-center">
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

        {/* 404 ILLUSTRATION */}
        <div className="relative">
          <div className="w-48 h-48 mx-auto rounded-full  from-primary/20 to-primary/5 flex items-center justify-center">
            <div className="text-8xl font-bold text-primary">
              404
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full blur-sm" />
          <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-primary/10 rounded-full blur-sm" />
        </div>

        {/* TEXT */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            Страница не найдена
          </h1>
          <p className="text-muted-foreground">
            Похоже, вы заблудились. Страница, которую вы ищете, не существует или была перемещена.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => navigate("/")}
            className="w-full h-11"
          >
            Вернуться на главную
          </Button>
          
        </div>

        {/* FOOTER */}
        <p className="text-xs text-muted-foreground pt-6">
          Если вы считаете, что это ошибка, обратитесь в поддержку
        </p>
      </div>
    </div>
  );
}
