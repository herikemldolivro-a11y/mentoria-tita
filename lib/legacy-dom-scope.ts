/**
 * Escopo das rotinas visuais legadas. Nao altera o DOM.
 * O calendario e gerenciado exclusivamente pelo React, inclusive durante
 * a troca de rota, antes de os efeitos da pagina anterior serem limpos.
 */
function isPrincipalCalendarPath(pathname: string) {
  return pathname === "/calendario" ||
    pathname.startsWith("/calendario/") ||
    pathname === "/revisoes" || pathname === "/revisoes/" ||
    pathname === "/nivelamentos" || pathname.startsWith("/nivelamentos/") ||
    pathname.startsWith("/questoes/lista/") ||
    pathname.startsWith("/questoes/banco/nivelamento/");
}

export function canRunLegacyDomEffect(
  pathname: string | null,
  root?: HTMLElement | null,
): boolean {
  if (!pathname || typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const currentPathname = window.location.pathname;
  if (
    isPrincipalCalendarPath(pathname) ||
    isPrincipalCalendarPath(currentPathname) ||
    pathname !== currentPathname
  ) {
    return false;
  }

  // O marcador protege tambem a transicao em que o HTML ja mudou,
  // mas o pathname capturado pelo efeito ainda pertence a pagina anterior.
  if (document.querySelector('[data-tita-react-calendar="principal"]')) {
    return false;
  }

  // Um callback atrasado nunca deve procurar o <main> de outra pagina.
  if (root !== undefined && (!root || !root.isConnected || document.querySelector("main") !== root)) {
    return false;
  }

  return true;
}
