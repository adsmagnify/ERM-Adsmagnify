import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const fieldInputClass =
  "h-12 w-full rounded-2xl border border-input bg-transparent px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export const fieldButtonClass =
  "inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-primary px-6 text-base font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldInputClass, className)} {...props} />;
}

export function SubmitButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="submit"
      className={cn(fieldButtonClass, className)}
      {...props}
    />
  );
}
