from __future__ import annotations

import io
import shutil
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "concursos"
DOCS = ROOT / "docs"
USER_AGENT = "MentoriaTitaAssetFetcher/1.0 (+GitHub Actions; educational platform)"

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})


@dataclass
class Institution:
    name: str
    outputs: list[str]
    source_page: str
    allowed_domains: tuple[str, ...]
    alt_terms: tuple[str, ...] = ()
    src_terms: tuple[str, ...] = ()
    direct_candidates: tuple[str, ...] = ()
    note: str = ""
    auto_download: bool = True


INSTITUTIONS = [
    Institution(
        name="Polícia Civil de Alagoas",
        outputs=["pcal"],
        source_page="https://alagoasdigital.al.gov.br/orgao/48",
        allowed_domains=("alagoasdigital.al.gov.br", "pc.al.gov.br", "imprensaoficial.al.gov.br"),
        alt_terms=("logo do órgão", "polícia civil"),
        src_terms=("attachment/48", "policia", "civil"),
        note=(
            "A identidade visual da PCAL foi localizada em fonte oficial. "
            "A Instrução Normativa nº 001/2025/CONSUPOC informa que o uso por terceiros "
            "é vedado salvo autorização da Delegacia-Geral; por isso o arquivo NÃO é baixado "
            "automaticamente e o sistema mantém placeholder até autorização."
        ),
        auto_download=False,
    ),
    Institution(
        name="Polícia Militar de Alagoas",
        outputs=["cfo-pmal"],
        source_page="https://alagoasdigital.al.gov.br/orgao/42",
        allowed_domains=("alagoasdigital.al.gov.br", "pm.al.gov.br"),
        alt_terms=("logo do órgão", "polícia militar"),
        src_terms=("attachment/42", "pmal"),
        direct_candidates=(
            "https://alagoasdigital.al.gov.br/storage/image/admin/organ/attachment/42/atual/c70ZwjAbieNVPqwlTONGvtdnpDdKdexiMzGFAiIS.png",
        ),
    ),
    Institution(
        name="Polícia Militar do Estado de São Paulo",
        outputs=["cfo-pmsp", "soldado-pmsp"],
        source_page="https://policiamilitar.sp.gov.br/institucional/brasao-de-armas",
        allowed_domains=("policiamilitar.sp.gov.br", "www.policiamilitar.sp.gov.br"),
        alt_terms=("brasão", "brasao", "polícia militar"),
        src_terms=("brasao", "brasão", "arma", "logo"),
    ),
    Institution(
        name="Polícia Militar de Pernambuco",
        outputs=["pmpe"],
        source_page="https://www.pm.pe.gov.br/",
        allowed_domains=("pm.pe.gov.br", "www.pm.pe.gov.br"),
        alt_terms=("polícia militar de pernambuco", "pmpe", "brasão", "brasao"),
        src_terms=("pmpe", "brasao", "brasão", "logo"),
    ),
    Institution(
        name="Polícia Civil da Bahia",
        outputs=["pcba"],
        source_page="https://www.ba.gov.br/policiacivil/8/conheca-pc-ba",
        allowed_domains=("ba.gov.br", "www.ba.gov.br"),
        alt_terms=("brasão da polícia civil da bahia", "brasao da policia civil da bahia"),
        src_terms=("brasao", "brasão", "brasaohistorico", "pcba"),
        direct_candidates=(
            "https://www.ba.gov.br/policiacivil/sites/site-pcba/files/2024-08/Conheca_a_PCBA_BrasaoHistorico_PCBA_0.jpg",
        ),
    ),
    Institution(
        name="Polícia Civil do Maranhão",
        outputs=["pcma"],
        source_page="https://www.policiacivil.ma.gov.br/logo-pcma-site/",
        allowed_domains=("policiacivil.ma.gov.br", "www.policiacivil.ma.gov.br"),
        alt_terms=("pcma", "polícia civil", "policia civil"),
        src_terms=("logo-pcma", "pcma", "policia-civil"),
    ),
    Institution(
        name="Polícia Rodoviária Federal",
        outputs=["prf"],
        source_page="https://www.gov.br/prf/pt-br/noticias/estaduais/parana/2023/outubro/logotipo_prf.png",
        allowed_domains=("gov.br", "www.gov.br"),
        alt_terms=("logo prf", "logotipo prf", "polícia rodoviária federal"),
        src_terms=("logotipo_prf", "logo", "prf"),
        direct_candidates=(
            "https://www.gov.br/prf/pt-br/noticias/estaduais/parana/2023/outubro/logotipo_prf.png/@@images/image",
        ),
    ),
    Institution(
        name="Polícia Federal",
        outputs=["pf"],
        source_page="https://www.gov.br/pf/pt-br/principios-fundamentais/simbolos-da-policia-federal-2/emblema.png/view",
        allowed_domains=("gov.br", "www.gov.br"),
        alt_terms=("emblema da polícia federal", "polícia federal"),
        src_terms=("emblema", "policia-federal"),
        direct_candidates=(
            "https://www.gov.br/pf/pt-br/principios-fundamentais/simbolos-da-policia-federal-2/emblema.png/@@images/image",
        ),
        note=(
            "O Decreto nº 98.380/1989 estabelece que o emblema da Polícia Federal é de uso "
            "privativo e veda sua fabricação ou reprodução sem autorização do Diretor-Geral. "
            "Por isso o arquivo NÃO é baixado automaticamente e o sistema mantém placeholder."
        ),
        auto_download=False,
    ),
]


def domain_allowed(url: str, allowed_domains: tuple[str, ...]) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(host == domain or host.endswith("." + domain) for domain in allowed_domains)


def fetch_bytes(url: str, allowed_domains: tuple[str, ...]) -> tuple[bytes, str]:
    if not domain_allowed(url, allowed_domains):
        raise ValueError(f"Domínio não permitido: {url}")

    response = session.get(url, timeout=30, allow_redirects=True)
    response.raise_for_status()

    final_url = response.url
    if not domain_allowed(final_url, allowed_domains):
        raise ValueError(f"Redirecionamento para domínio não oficial: {final_url}")

    return response.content, final_url


def looks_like_image(data: bytes) -> bool:
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
        return True
    except Exception:
        return False


def normalize_to_png(data: bytes, destination: Path) -> None:
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        if source.mode in ("RGBA", "LA") or ("transparency" in source.info):
            image = source.convert("RGBA")
        else:
            image = source.convert("RGB")
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, format="PNG", optimize=True)


def collect_candidates(page_url: str, institution: Institution) -> list[tuple[int, str]]:
    response = session.get(page_url, timeout=30)
    response.raise_for_status()

    if not domain_allowed(response.url, institution.allowed_domains):
        raise ValueError(f"Página redirecionada para domínio não oficial: {response.url}")

    soup = BeautifulSoup(response.text, "html.parser")
    candidates: list[tuple[int, str]] = []

    generic_terms = ("logo", "brasao", "brasão", "emblema", "distintivo")

    for image in soup.find_all("img"):
        src = (
            image.get("src")
            or image.get("data-src")
            or image.get("data-lazy-src")
            or ""
        )
        if not src:
            srcset = image.get("srcset", "")
            if srcset:
                src = srcset.split(",")[-1].strip().split(" ")[0]
        if not src:
            continue

        url = urljoin(response.url, src)
        if not domain_allowed(url, institution.allowed_domains):
            continue

        alt = (image.get("alt") or "").lower()
        src_lower = url.lower()
        score = 0

        for term in institution.alt_terms:
            if term.lower() in alt:
                score += 25
        for term in institution.src_terms:
            if term.lower() in src_lower:
                score += 18
        for term in generic_terms:
            if term in alt or term in src_lower:
                score += 4

        if "governo" in alt or "governo" in src_lower:
            score -= 8
        if "banner" in alt or "banner" in src_lower:
            score -= 6

        candidates.append((score, url))

    for anchor in soup.find_all("a", href=True):
        href = urljoin(response.url, anchor["href"])
        if not domain_allowed(href, institution.allowed_domains):
            continue

        text = anchor.get_text(" ", strip=True).lower()
        href_lower = href.lower()
        score = 0

        for term in institution.alt_terms:
            if term.lower() in text:
                score += 20
        for term in institution.src_terms:
            if term.lower() in href_lower:
                score += 16
        if "@@images" in href_lower or href_lower.endswith((".png", ".jpg", ".jpeg", ".webp")):
            score += 5
        if "tamanho:" in text or "baixar" in text:
            score += 3

        if score > 0:
            candidates.append((score, href))

    return sorted(candidates, key=lambda item: item[0], reverse=True)


def download_institution(institution: Institution) -> tuple[bool, str | None, str]:
    if not institution.auto_download:
        return False, None, institution.note

    errors: list[str] = []

    for candidate in institution.direct_candidates:
        try:
            data, final_url = fetch_bytes(candidate, institution.allowed_domains)
            if looks_like_image(data):
                save_outputs(institution.outputs, data)
                return True, final_url, institution.note
            errors.append(f"{candidate}: conteúdo não reconhecido como imagem")
        except Exception as exc:
            errors.append(f"{candidate}: {exc}")

    try:
        candidates = collect_candidates(institution.source_page, institution)
    except Exception as exc:
        candidates = []
        errors.append(f"Falha ao analisar página: {exc}")

    for score, candidate in candidates:
        if score <= 0:
            continue
        try:
            data, final_url = fetch_bytes(candidate, institution.allowed_domains)
            if not looks_like_image(data):
                continue
            save_outputs(institution.outputs, data)
            return True, final_url, institution.note
        except Exception as exc:
            errors.append(f"{candidate}: {exc}")

    detail = "; ".join(errors[-4:]) if errors else "Nenhuma imagem oficial confirmada."
    return False, None, detail


def save_outputs(outputs: list[str], data: bytes) -> None:
    first_path = PUBLIC / outputs[0] / "logo.png"
    normalize_to_png(data, first_path)

    for slug in outputs[1:]:
        destination = PUBLIC / slug / "logo.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(first_path, destination)


def write_documentation(results: list[tuple[Institution, bool, str | None, str]]) -> None:
    DOCS.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Fontes das imagens institucionais",
        "",
        "As imagens abaixo são obtidas automaticamente somente de páginas ou domínios oficiais.",
        "Nenhum brasão ou logotipo é gerado por IA. As imagens são convertidas para PNG sem redesenho.",
        "",
        "> A Mentoria Titã é uma plataforma independente e não possui vínculo oficial com as instituições exibidas.",
        "",
        "| Instituição | Destino(s) | Fonte oficial | Imagem resolvida | Status |",
        "|---|---|---|---|---|",
    ]

    for institution, success, image_url, note in results:
        destinations = ", ".join(f"`/public/concursos/{slug}/logo.png`" for slug in institution.outputs)
        status = "OK" if success else "PLACEHOLDER"
        resolved = image_url or "—"
        lines.append(
            f"| {institution.name} | {destinations} | {institution.source_page} | {resolved} | {status} |"
        )
        if note:
            lines.append("")
            lines.append(f"**Observação — {institution.name}:** {note}")
            lines.append("")

    (DOCS / "image-sources.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    results = []

    for institution in INSTITUTIONS:
        print(f"Buscando: {institution.name}")
        success, image_url, detail = download_institution(institution)
        results.append((institution, success, image_url, detail))
        print("  OK" if success else f"  PLACEHOLDER: {detail}")

    write_documentation(results)


if __name__ == "__main__":
    main()
