import type { ReactNode } from "react";
import { SimuladoCalendarDock } from "@/components/simulado-calendar-dock";

/** MT_SIMULADO_CALENDAR_TEMPLATE_V8 - no modification of PrincipalCalendar. */
export default function CalendarioTemplate({children}:{children:ReactNode}) {
  return <>{children}<SimuladoCalendarDock/></>;
}
