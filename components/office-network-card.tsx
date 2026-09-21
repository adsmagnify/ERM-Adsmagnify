"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  registerOfficeIp,
  removeOfficeIp,
  setStaticOfficeIp,
} from "@/app/actions/office";
import { Field, fieldButtonClass, fieldInputClass } from "@/components/form-field";
import { getCurrentFix } from "@/lib/geolocation";
import { officeIps, type OfficeSettings } from "@/lib/office";

export function OfficeNetworkCard({
  office,
  currentIp,
}: {
  office: OfficeSettings | null;
  currentIp: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [staticIp, setStaticIp] = useState(office?.static_ip ?? "");
  const saved = office ? officeIps(office) : [];

  function onSaveNetwork() {
    startTransition(async () => {
      try {
        const fix = await getCurrentFix();
        const result = await registerOfficeIp(fix);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result.success ?? "Saved office IP.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save the network."
        );
      }
    });
  }

  function onSaveStatic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await setStaticOfficeIp(staticIp);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? "Saved static office IP.");
    });
  }

  function onRemove(ip: string) {
    startTransition(async () => {
      const result = await removeOfficeIp(ip);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? "Removed.");
    });
  }

  return (
    <section className="rounded-[20px] border border-border bg-white p-6 sm:p-8">
      <h2 className="font-heading text-xl font-medium">Office IP</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Clock in still needs GPS at Churchgate. Set a static office IP here. If
        the ISP changes it, the next clock-in at the office updates this
        setting automatically.
      </p>
      {office ? (
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          {office.address}
        </p>
      ) : (
        <p className="mt-4 text-sm text-[#b5432f]">
          Run the office SQL in Supabase before saving a network.
        </p>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        This network right now: {currentIp ?? "unknown"}
      </p>
      {office?.static_ip ? (
        <p className="mt-2 text-sm text-foreground">
          Static office IP: {office.static_ip}
        </p>
      ) : null}

      <form onSubmit={onSaveStatic} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field label="Static office IP" htmlFor="static_ip">
            <input
              id="static_ip"
              name="static_ip"
              value={staticIp}
              onChange={(event) => setStaticIp(event.target.value)}
              placeholder="103.x.x.x"
              autoComplete="off"
              className={fieldInputClass}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={pending || !office}
          className={`${fieldButtonClass} sm:w-auto`}
        >
          {pending ? "Saving…" : "Save IP"}
        </button>
      </form>

      {saved.length ? (
        <ul className="mt-4 flex flex-col gap-2">
          {saved.map((ip) => (
            <li
              key={ip}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
            >
              <span>
                {ip}
                {ip === office?.static_ip ? " · static" : ""}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(ip)}
                className="h-10 cursor-pointer rounded-2xl px-3 text-[#b5432f] hover:bg-[#f8ece9] disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No office IP saved yet. Type the static IP, or save this network
          while you are at the office.
        </p>
      )}
      <button
        type="button"
        onClick={onSaveNetwork}
        disabled={pending || !office}
        className={`${fieldButtonClass} mt-5 w-full bg-transparent text-foreground ring-1 ring-border hover:bg-muted sm:w-auto`}
      >
        {pending ? "Saving…" : "Use this network as office IP"}
      </button>
    </section>
  );
}
