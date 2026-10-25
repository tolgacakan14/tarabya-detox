"use client";
import { useEffect } from "react";

/** Registers the service worker (needed for push reminders). */
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
