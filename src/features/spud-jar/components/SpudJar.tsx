import type { RefObject } from "react";
import type { ComplaintCoinView } from "../types";
import { ComplaintCoin } from "./ComplaintCoin";

type SpudJarProps = {
  coins: ComplaintCoinView[];
  jarRef: RefObject<HTMLDivElement | null>;
  jarVisualRef: RefObject<HTMLDivElement | null>;
  bindCoinElement: (id: number, element: HTMLDivElement | null) => void;
  loading: boolean;
  breaking: boolean;
};

export function SpudJar({
  coins,
  jarRef,
  jarVisualRef,
  bindCoinElement,
  loading,
  breaking,
}: SpudJarProps) {
  return (
    <div className="relative mx-auto w-full max-w-[32rem] px-2" aria-hidden="true">
      <div className="absolute bottom-3 left-1/2 h-5 w-2/3 -translate-x-1/2 rounded-[50%] bg-[#4A2B1F]/20 dark:bg-black/40" />
      <div
        ref={jarVisualRef}
        className="relative origin-[50%_90%]"
      >
        <div ref={jarRef} className="relative aspect-[4/5] w-full overflow-visible">
          <svg
            viewBox="0 0 360 450"
            className="absolute inset-0 z-0 h-full w-full"
          >
            <path
              d="M94 67h172c0 25 4 48 12 72l25 211c5 42-28 76-70 76H127c-42 0-75-34-70-76l25-211c8-24 12-47 12-72Z"
              fill="#F8E6C8"
              fillOpacity="0.3"
              stroke="#7A5948"
              strokeWidth="9"
            />
            <path d="M94 67h172v27H94Z" fill="#B98A5F" fillOpacity="0.3" />
          </svg>

          <div
            className="absolute inset-0 z-10 overflow-hidden [clip-path:polygon(25%_14%,75%_14%,85%_88%,78%_95%,22%_95%,15%_88%)]"
          >
            {coins.map((coin) => (
              <ComplaintCoin
                key={coin.id}
                coin={coin}
                bindElement={bindCoinElement}
              />
            ))}
          </div>

          <svg
            viewBox="0 0 360 450"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          >
            <path
              d="M94 67h172c0 25 4 48 12 72l25 211c5 42-28 76-70 76H127c-42 0-75-34-70-76l25-211c8-24 12-47 12-72Z"
              fill="#FFFFFF"
              fillOpacity="0.12"
              stroke="#4A2B1F"
              strokeOpacity="0.75"
              strokeWidth="8"
            />
            <path
              d="M105 112c-7 32-11 72-15 111l-13 122c-3 30 14 51 35 60"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.7"
              strokeLinecap="round"
              strokeWidth="10"
            />
            <path
              d="M94 67c0-13 10-23 23-23h126c13 0 23 10 23 23v13H94V67Z"
              fill="#D5B28A"
              stroke="#4A2B1F"
              strokeWidth="8"
            />
            <path d="M111 60h138" stroke="#F8E6C8" strokeLinecap="round" strokeWidth="6" />
            <path d="M119 420h122" stroke="#4A2B1F" strokeLinecap="round" strokeOpacity="0.35" strokeWidth="7" />
          </svg>

          <svg
            viewBox="0 0 360 450"
            className={`pointer-events-none absolute inset-0 z-30 h-full w-full transition-opacity duration-100 ${
              breaking ? "opacity-100" : "opacity-0"
            }`}
          >
            <g fill="none" stroke="#4A2B1F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7">
              <path d="m183 77-19 64 28 34-39 54 24 38-52 76" />
              <path d="m164 141-48 24-21 48" />
              <path d="m192 175 55 21 24 52" />
              <path d="m177 267 47 35 20 70" />
              <path d="m125 343 29 20-12 48" />
            </g>
          </svg>

          {loading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center">
              <div className="rounded-lg border bg-background/90 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm animate-pulse">
                Consulting ledger…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
