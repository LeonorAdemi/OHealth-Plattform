"use client";

import { Plus } from "lucide-react";
import { useActionState, useId, useRef, useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/result";
import { cn } from "@/lib/utils";

import { removeAvatar, updateProfile, uploadAvatar } from "../actions";
import { MAX_BIO, MAX_SPORTS, normalizeSports, SPORT_SUGGESTIONS, uniqueSports } from "../logic";

const AVATAR_PX = 512;

/**
 * Schneidet ein Foto mittig quadratisch zu und verkleinert es auf höchstens 512 × 512 Pixel.
 * WebP, wo der Browser es erzeugen kann, sonst JPEG. So wird nie das Originalfoto hochgeladen.
 */
async function squareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(AVATAR_PX, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Kein Canvas");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Bild nicht erzeugt");
  return jpeg;
}

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm">
        {state.message}
      </p>
    );
  }
  return null;
}

/** Profilbild ansehen, ändern oder entfernen. Speichert sofort nach der Auswahl. */
export function AvatarPicker({ path, name }: { path: string | null; name: string }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await squareImage(file);
      } catch {
        setState({ error: "Dieses Bild lässt sich nicht öffnen. Wähle ein Foto im Format JPEG, PNG oder WebP." });
        return;
      }
      const data = new FormData();
      data.set(
        "avatar",
        new File([blob], blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg", { type: blob.type }),
      );
      setState(await uploadAvatar(data));
    });
  }

  function onRemove() {
    startTransition(async () => setState(await removeAvatar()));
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar path={path} name={name} size="lg" className={cn(pending && "opacity-50")} />
      <div className="space-y-1">
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onPick}
          disabled={pending}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
            {path ? "Bild ändern" : "Bild auswählen"}
          </Button>
          {path && (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRemove}>
              Entfernen
            </Button>
          )}
        </div>
        <div aria-live="polite">
          {pending ? <p className="text-muted-foreground text-sm">Wird gespeichert</p> : <Feedback state={state} />}
        </div>
      </div>
    </div>
  );
}

/** Name, Kurztext, Stadt und Sportarten. */
export function ProfileForm({
  profile,
}: {
  profile: { display_name: string; bio: string | null; city: string | null; sports: string[]; is_private: boolean };
}) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const [bio, setBio] = useState(profile.bio ?? "");
  const [sports, setSports] = useState<string[]>(profile.sports);
  const [custom, setCustom] = useState("");

  const options = uniqueSports([...SPORT_SUGGESTIONS, ...profile.sports, ...sports]);
  const full = sports.length >= MAX_SPORTS;
  const isSelected = (sport: string) =>
    sports.some((s) => s.toLocaleLowerCase("de-DE") === sport.toLocaleLowerCase("de-DE"));

  function toggle(sport: string) {
    setSports((current) =>
      isSelected(sport)
        ? current.filter((s) => s.toLocaleLowerCase("de-DE") !== sport.toLocaleLowerCase("de-DE"))
        : normalizeSports([...current, sport]),
    );
  }

  function addCustom() {
    if (!custom.trim() || full) return;
    setSports((current) => normalizeSports([...current, custom]));
    setCustom("");
  }

  return (
    <form action={action} className="max-w-xl space-y-8">
      <div className="space-y-2">
        <Label htmlFor="displayName">Name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name}
          maxLength={40}
          required
          autoComplete="nickname"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Über dich (optional)</Label>
        <Textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={MAX_BIO}
          rows={3}
          aria-describedby="bio-count"
        />
        <p id="bio-count" className="text-muted-foreground num text-right text-sm">
          {bio.length} / {MAX_BIO}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">Stadt (optional)</Label>
        <Input
          id="city"
          name="city"
          defaultValue={profile.city ?? ""}
          maxLength={60}
          autoComplete="address-level2"
          placeholder="München"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Sportarten (bis zu {MAX_SPORTS})</legend>
        <ul className="flex flex-wrap gap-2">
          {options.map((sport) => {
            const selected = isSelected(sport);
            return (
              <li key={sport}>
                <Chip selected={selected} disabled={!selected && full} onClick={() => toggle(sport)}>
                  {sport}
                </Chip>
              </li>
            );
          })}
        </ul>
        <div className="flex max-w-sm gap-2">
          <Label htmlFor="custom-sport" className="sr-only">
            Andere Sportart
          </Label>
          <Input
            id="custom-sport"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            maxLength={40}
            placeholder="Andere Sportart"
            disabled={full}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addCustom}
            disabled={full || !custom.trim()}
            aria-label="Sportart hinzufügen"
          >
            <Plus strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
        {sports.map((sport) => (
          <input key={sport} type="hidden" name="sports" value={sport} />
        ))}
      </fieldset>

      <div className="space-y-2">
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            name="isPrivate"
            defaultChecked={profile.is_private}
            className="accent-primary mt-1 size-5 shrink-0"
          />
          <span>
            <span className="block font-medium">Privates Konto</span>
            <span className="text-muted-foreground block text-sm">
              Privat: Wer dir folgen will, braucht deine Bestätigung, und nur Follower sehen deine Trainingstage,
              Bestwerte und Events. Schreiben können dir nur Follower. Öffentlich: Alle können dich finden, dir
              folgen und dir eine Nachricht als Anfrage schicken.
            </span>
          </span>
        </label>
      </div>

      <Feedback state={state} />
      <Button type="submit" className="w-full md:w-auto" disabled={pending}>
        Profil speichern
      </Button>
    </form>
  );
}
