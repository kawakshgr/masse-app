import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

async function createCoach(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const name = String(formData.get("name") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const pronoun = formData.get("pronoun") === "he" ? "he" : "she";

  if (!name) redirect("/bienvenue?erreur=1");

  const { error } = await supabase.from("coaches").insert({
    id: user.id,
    name,
    first_name: firstName || null,
    pronoun,
  });

  if (error) redirect("/bienvenue?erreur=1");
  redirect("/clients");
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const t = await getTranslations("welcome");
  const { erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Already introduced — nothing to do here.
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (coach) redirect("/clients");

  // A client who lands here has an account but belongs on her own screen.
  const { data: asClient } = await supabase
    .from("clients")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (asClient) redirect("/aujourdhui");

  // Masse is invite-only. Showing the form to someone the database will refuse
  // would be a lie told twice.
  const { data: allowed } = await supabase.rpc("may_become_coach");

  if (!allowed) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="atmosphere" aria-hidden />
        <div className="glass lift w-full max-w-[460px] rounded-r4 p-8">
          <h1 className="font-display text-[22px] font-extrabold tracking-[-.04em]">
            {t("notAllowed")}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink2)]">
            {t("notAllowedBody")}
          </p>
          <a
            href="/invitation"
            className="mt-5 flex h-11 w-full items-center justify-center rounded-r2 bg-[var(--a1)] text-[14px] font-semibold text-[var(--onA)]"
          >
            {t("goInvite")}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass lift w-full max-w-[460px] rounded-r4 p-8">
        <h1 className="font-display text-[28px] font-extrabold tracking-[-.04em]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink2)]">
          {t("lede")}
        </p>

        {erreur && (
          <p role="alert" className="mt-4 text-[13px] text-[var(--a3)]">
            {t("error")}
          </p>
        )}

        <form action={createCoach} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink3)]"
            >
              {t("name")}
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder={t("namePlaceholder")}
              className="mt-2 h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-3 text-[14px] placeholder:text-[var(--ink3)]"
            />
          </div>

          <div>
            <label
              htmlFor="first_name"
              className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink3)]"
            >
              {t("firstName")}
            </label>
            <input
              id="first_name"
              name="first_name"
              placeholder={t("firstNamePlaceholder")}
              className="mt-2 h-11 w-full rounded-r2 border border-[var(--edge)] bg-[var(--glass)] px-3 text-[14px] placeholder:text-[var(--ink3)]"
            />
          </div>

          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
              {t("pronoun")}
            </legend>
            <div className="mt-2 flex gap-2">
              {(["she", "he"] as const).map((value) => (
                <label
                  key={value}
                  className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-r2 border border-[var(--edge)] bg-[var(--glass)] text-[13px] has-checked:border-[var(--a1)] has-checked:text-[var(--a1)]"
                >
                  <input
                    type="radio"
                    name="pronoun"
                    value={value}
                    defaultChecked={value === "she"}
                    className="sr-only"
                  />
                  {t(value)}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="h-11 w-full rounded-r2 bg-[var(--a1)] text-[14px] font-semibold text-[var(--onA)]"
          >
            {t("submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
