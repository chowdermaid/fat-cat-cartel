import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLUBHOUSE } from "../constants";
import type { ClubhouseLayout, ClubhouseProps, ClubhouseProtection } from "../types";
import { createClubhouseController } from "./clubhouseController";

export function useClubhouse(members: ClubhouseProps["members"]) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof createClubhouseController> | null>(null);
  const elements = useRef(new Map<string, HTMLDivElement>());
  const ids = useMemo(() => Object.keys(members), [members]);
  const [visible, setVisible] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [layout, setLayout] = useState<ClubhouseLayout>({
    narrow: true, size: CLUBHOUSE.narrowPortraitSize, limit: CLUBHOUSE.narrowVisible, height: CLUBHOUSE.narrowSceneHeight,
  });

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const controller = createClubhouseController(setVisible, (next) => {
      setLayout((previous) => previous.narrow === next.narrow && previous.height === next.height ? previous : next);
    });
    controllerRef.current = controller;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      setReducedMotion(media.matches);
      controller.setEnvironment({ reducedMotion: media.matches });
    };
    const onVisibilityChange = () => controller.setEnvironment({ hidden: document.hidden });
    controller.setEnvironment({ hidden: document.hidden, reducedMotion: media.matches });
    let lastWidth = 0;
    let lastHeight = 0;
    const resize = () => {
      const width = scene.clientWidth;
      const height = scene.clientHeight;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      controller.resize(width, height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(scene);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      controller.setEnvironment({ offscreen: !entry.isIntersecting });
    });
    intersectionObserver.observe(scene);
    document.addEventListener("visibilitychange", onVisibilityChange);
    media.addEventListener("change", onMotionChange);
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      media.removeEventListener("change", onMotionChange);
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = controllerRef.current;
    controller?.setRoster(ids);
    for (const [id, element] of elements.current) controller?.register(id, element);
  }, [ids]);

  const register = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) elements.current.set(id, element);
    else elements.current.delete(id);
    controllerRef.current?.register(id, element);
  }, []);
  const protect = useCallback((id: string, reason: ClubhouseProtection, active: boolean) => {
    controllerRef.current?.protect(id, reason, active);
  }, []);
  const showOtherMembers = () => controllerRef.current?.showOtherMembers();

  return { sceneRef, visible, layout, reducedMotion, register, protect, showOtherMembers };
}
