import { clientSession } from "@/lib/clientData";
import { ClientNav } from "@/components/client/ClientNav";
import { PendingScreen } from "@/components/client/PendingScreen";

/**
 * The client's app on the web — the Android client, and anyone without the
 * iPhone app. Same five tabs, same order, same screens; only what a browser
 * cannot do (Apple Health, scheduled reminders) is missing.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { client } = await clientSession();

  // A sign-up the coach has not accepted yet: one screen, whatever the URL,
  // and no tabs — nothing opens until the coach says yes.
  if (client.status === "pending") {
    return (
      <>
        <div className="atmosphere" aria-hidden />
        <main className="mx-auto min-h-dvh max-w-[560px] space-y-[18px] px-[22px] pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
          <PendingScreen />
        </main>
      </>
    );
  }

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
