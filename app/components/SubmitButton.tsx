"use client";

import { useFormStatus } from "react-dom";

const VARIANTS = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-60 disabled:hover:bg-accent",
  danger: "border border-border text-danger hover:bg-danger-soft disabled:opacity-60",
};

const SIZES = {
  md: "px-4 py-3 text-[15px]",
  sm: "px-4 py-2.5 text-sm",
};

/**
 * Drop-in replacement for a plain <button type="submit"> inside a
 * <form action={serverAction}>. useFormStatus only reports pending state
 * for its nearest enclosing <form>, so this must render as a descendant
 * of that form (not the form itself) — that's what makes it reusable
 * across both server- and client-component forms alike.
 */
export default function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:active:scale-100 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {pending && (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
      )}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
