import { clientSession } from "@/lib/clientData";
import { ClientNav } from "@/components/client/ClientNav";

/**
 * The client's app on the web — the Android client, and anyone without the
 * iPhone app. Same five tabs, same order, same screens; only what a browser
 * cannot do (Apple Health, scheduled reminders) is missing.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { client } = await clientSession();

  return (
    <>
      <div className="atmosphere" aria-hidden />
      <main className="mx-auto min-h-dvh max-w-[560px] space-y-[18px] px-[22px] pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+96px)]">
        {children}
      </main>
      <ClientNav cycleTracking={client.cycle_tracking} />
    </>
  );
}
