import { LockKeyhole } from "lucide-react";
import spudSpider from "@/assets/icons/spud.svg";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { ComplaintCounter } from "./ComplaintCounter";
import { ComplaintControls } from "./ComplaintControls";
import { SpudJar } from "./SpudJar";
import { SpudJarEmptyState } from "./SpudJarEmptyState";
import { useSpudJarData } from "../hooks/useSpudJarData";
import { useSpudJarPhysics } from "../hooks/useSpudJarPhysics";

export function SpudJarPage() {
  const auth = useAdminAuth();
  const updatedBy = auth.session?.discordUserId ?? "local-spud-tester";
  const canManage = auth.authed && auth.session?.isMember === true;
  const canReset = auth.authed && auth.session?.isAdmin === true;
  const jar = useSpudJarData(auth.sessionToken, updatedBy, canManage);
  const physics = useSpudJarPhysics(jar.displayJarTotal, jar.displayCycle);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-serif text-3xl font-bold">
            <img
              src={spudSpider}
              alt=""
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rotate-6 drop-shadow-sm"
            />
            Spud Jar
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Axos ledger of spudplaints
          </p>
        </div>
      </section>

      {jar.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {jar.error}
        </div>
      )}

      <section
        aria-hidden={jar.displayTotal === null ? true : undefined}
        className={`grid items-center gap-6 lg:grid-cols-[minmax(24rem,1.4fr)_minmax(18rem,0.8fr)] lg:gap-10 ${
          jar.displayTotal === null ? "invisible" : ""
        }`}
      >
        <div className="min-w-0">
          <SpudJar
            coins={physics.coins}
            jarRef={physics.jarRef}
            jarVisualRef={physics.jarVisualRef}
            bindCoinElement={physics.bindCoinElement}
            breaking={physics.breaking}
          />
          {jar.displayJarTotal === 0 && (
            <SpudJarEmptyState reducedMotion={physics.reducedMotion} />
          )}
        </div>

        <div className="mx-auto w-full max-w-[30rem] space-y-3 lg:mx-0">
          <ComplaintCounter
            total={jar.displayTotal}
            reducedMotion={physics.reducedMotion}
          />
          {canManage && jar.displayTotal !== null ? (
            <ComplaintControls
              total={jar.displayTotal}
              activeAction={jar.activeAction}
              submitting={jar.submitting}
              canReset={canReset}
              reducedMotion={physics.reducedMotion}
              breaking={physics.breaking}
              runAction={jar.runAction}
            />
          ) : (
            !auth.checking && (
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  FC members can log in to update the official ledger. Visitors
                  may inspect the evidence.
                </p>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
