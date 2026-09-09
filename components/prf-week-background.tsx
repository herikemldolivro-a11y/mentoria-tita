export function PrfWeekBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.13]" style={{ backgroundImage: 'url("/concursos/prf/semana-1-fundo.png")' }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_84%,transparent)_0%,color-mix(in_srgb,var(--background)_80%,transparent)_45%,color-mix(in_srgb,var(--background)_95%,transparent)_100%)]" />
    </div>
  );
}
