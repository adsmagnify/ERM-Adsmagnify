"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { registerOfficeIp, removeOfficeIp } from "@/app/actions/office";
import { fieldButtonClass } from "@/components/form-field";
import { getCurrentFix } from "@/lib/geolocation";
import type { OfficeSettings } from "@/lib/office";

export function OfficeNetworkCard({
  office,
  currentIp,
}: {
  office: OfficeSettings | null;
  currentIp: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      try {
        const fix = await getCurrentFix();
        const result = await registerOfficeIp(fix);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result.success ?? "Saved office network.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save the network."
        );
      }
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
      <h2 className="font-heading text-xl font-medium">Office</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        People can clock in only from this place, on office Wi-Fi or ethernet.
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
        This network: {currentIp ?? "unknown"}
      </p>
      {office?.allowed_ips.length ? (
        <ul className="mt-4 flex flex-col gap-2">
          {office.allowed_ips.map((ip) => (
            <li
              key={ip}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
            >
              <span>{ip}</span>
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
          No office network saved yet. At the office, save ethernet, then save
          Wi-Fi too if it shows a different address.
        </p>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={pending || !office}
        className={`${fieldButtonClass} mt-5 w-full sm:w-auto`}
      >
        {pending ? "Saving…" : "Save this network as office"}
      </button>
    </section>
  );
}
