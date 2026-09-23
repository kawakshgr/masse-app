"use client";

import { addFood } from "@/app/(coach)/aliments/actions";

/** A blank row, created and selected in one press. Naming it comes after. */
export function AddFoodButton({ label }: { label: string }) {
  return (
    <form action={addFood}>
      <input type="hidden" name="name" value="Nouvel aliment" />
      <input type="hidden" name="serving_label" value="100 g" />
      <input type="hidden" name="serving_g" value="100" />
      <button
        type="submit"
        className="cta h-10 w-full rounded-r2 text-[13px] font-semibold text-[var(--onA)]"
      >
        {label}
      </button>
    </form>
  );
}
