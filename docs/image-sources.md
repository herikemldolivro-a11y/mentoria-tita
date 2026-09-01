# Fontes oficiais das imagens institucionais

A Mentoria Titã usa somente arquivos obtidos de páginas/domínios oficiais e não gera brasões ou logotipos com IA.
As imagens são usadas sem redesenho e com proporção preservada. A plataforma deve exibir o aviso:

> Plataforma independente. Sem vínculo oficial com as instituições exibidas.

| Instituição | Destino | Fonte oficial | Estado inicial |
|---|---|---|---|
| Polícia Civil de Alagoas | `/public/concursos/pcal/logo.png` | https://alagoasdigital.al.gov.br/orgao/48 | **Placeholder** — a IN nº 001/2025/CONSUPOC restringe o uso por terceiros sem autorização da Delegacia-Geral. |
| Polícia Militar de Alagoas | `/public/concursos/cfo-pmal/logo.png` | https://alagoasdigital.al.gov.br/orgao/42 | Buscar automaticamente em domínio oficial. |
| Polícia Militar do Estado de São Paulo | `/public/concursos/cfo-pmsp/logo.png` e `/public/concursos/soldado-pmsp/logo.png` | https://policiamilitar.sp.gov.br/institucional/brasao-de-armas | Buscar automaticamente em domínio oficial. O uso do Brasão é regulamentado pelo Decreto estadual nº 17.069/1981. |
| Polícia Militar de Pernambuco | `/public/concursos/pmpe/logo.png` | https://www.pm.pe.gov.br/ | Buscar automaticamente em domínio oficial. O uso do Brasão é regulamentado pela Portaria Normativa do Comando-Geral nº 375/2019. |
| Polícia Civil da Bahia | `/public/concursos/pcba/logo.png` | https://www.ba.gov.br/policiacivil/8/conheca-pc-ba | Buscar automaticamente em domínio oficial. |
| Polícia Civil do Maranhão | `/public/concursos/pcma/logo.png` | https://www.policiacivil.ma.gov.br/logo-pcma-site/ | Buscar automaticamente em domínio oficial. |
| Polícia Rodoviária Federal | `/public/concursos/prf/logo.png` | https://www.gov.br/prf/pt-br/noticias/estaduais/parana/2023/outubro/logotipo_prf.png | Buscar automaticamente em domínio oficial, seguindo o MIV/PRF. |
| Polícia Federal | `/public/concursos/pf/logo.png` | https://www.gov.br/pf/pt-br/principios-fundamentais/simbolos-da-policia-federal-2/emblema.png/view | **Placeholder** — o Decreto nº 98.380/1989 estabelece uso privativo e exige autorização para reprodução. |

## Automação

`scripts/fetch-official-logos.py` baixa somente de domínios permitidos, valida se o conteúdo é uma imagem e converte para PNG sem redesenho.
Se uma imagem não for confirmada como oficial ou falhar no download, o arquivo não é inventado: o onboarding usa o placeholder com a sigla.

A automação não baixa PCAL nem PF enquanto não houver autorização de uso.
