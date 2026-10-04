"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { removePushSubscription, savePushSubscription } from "../actions";

type Status = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Hängt der Push-Dienst des Browsers, nicht ewig warten
function withTimeout<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
}

/** Push-Mitteilungen für dieses Gerät ein- oder ausschalten. */
export function PushToggle({ publicKey }: { publicKey: string | undefined }) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check(): Promise<Status> {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported || !publicKey) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
      if (Notification.permission === "denied") return "denied";
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      return subscription ? "on" : "off";
    }
    check().then(
      (s) => !cancelled && setStatus(s),
      () => !cancelled && setStatus("unsupported"),
    );
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setPending(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await withTimeout(navigator.serviceWorker.ready);
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }),
        ));
      const result = await savePushSubscription(subscription.toJSON());
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus("on");
    } catch {
      setError("Mitteilungen konnten nicht eingeschaltet werden. Prüf deine Verbindung und versuch es erneut.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Ausschalten hat nicht geklappt. Versuch es erneut.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {status === "checking" && <p className="text-muted-foreground text-sm">Wird geprüft</p>}
      {status === "unsupported" && (
        <p className="text-muted-foreground text-sm">Dieser Browser kann keine Mitteilungen empfangen.</p>
      )}
      {status === "ios-install" && (
        <p className="text-sm">
          Auf dem iPhone kommen Mitteilungen nur, wenn OHealth auf dem Homescreen liegt: In Safari auf „Teilen“ tippen,
          dann „Zum Home-Bildschirm“. Danach die App von dort öffnen und hier einschalten.
        </p>
      )}
      {status === "denied" && (
        <p className="text-sm">
          Mitteilungen sind für OHealth in den Einstellungen deines Geräts oder Browsers blockiert. Erlaube sie dort, dann
          kannst du sie hier einschalten.
        </p>
      )}
      {status === "on" && (
        <>
          <p className="text-sm">Auf diesem Gerät eingeschaltet.</p>
          <Button variant="outline" onClick={disable} disabled={pending}>
            Auf diesem Gerät ausschalten
          </Button>
        </>
      )}
      {status === "off" && (
        <Button variant="outline" onClick={enable} disabled={pending}>
          {pending ? "Wird eingeschaltet" : "Auf diesem Gerät einschalten"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
