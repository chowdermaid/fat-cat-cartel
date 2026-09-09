import { useEffect, useState } from "react";
import { getHomeGreeting } from "../utils/greeting";

export function useHomeGreeting(name?: string | null, birthday?: string | null) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    const interval = window.setInterval(updateTime, 60_000);
    document.addEventListener("visibilitychange", updateTime);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateTime);
    };
  }, []);

  return getHomeGreeting(now, name, birthday);
}
