import { PageShell } from "@/components/page-shell";
import { PrincipalCalendar } from "@/components/principal-calendar";

export const dynamic = "force-dynamic";

export default function CalendarioPrincipalPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1540px] px-4 pb-16 pt-5 sm:px-6 sm:pt-6 xl:px-7">
        <PrincipalCalendar />
      </div>
    </PageShell>
  );
}

