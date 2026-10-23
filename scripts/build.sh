#!/usr/bin/env bash
#
# Gera a extensão de cada navegador a partir do código comum em src/.
#
# O manifest de cada navegador é src/manifest.json com o patch de browsers/<navegador>.json
# aplicado (JSON Merge Patch, RFC 7396: objetos são mesclados e `null` remove a chave).
# Nada é transpilado ou minificado: os arquivos de src/ são copiados como estão.
#
# Saída:
#   dist/<navegador>/                          pasta pronta para carregar sem compactação
#   dist/sigaa-promax-<versão>-<navegador>.zip pacote para enviar à loja
#
# Uso:
#   ./scripts/build.sh                         todos os navegadores
#   ./scripts/build.sh firefox edge            apenas os navegadores informados
#
# Requer: bash, jq e zip.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$RAIZ/src"
BROWSERS="$RAIZ/browsers"
DIST="$RAIZ/dist"
NOME="sigaa-promax"

erro() {
  echo "erro: $*" >&2
  exit 1
}

for cmd in jq zip; do
  command -v "$cmd" >/dev/null || erro "'$cmd' não encontrado. Instale com 'brew install $cmd' (macOS) ou 'sudo apt install $cmd' (Linux)."
done

# JSON Merge Patch (RFC 7396)
MERGE_PATCH='
  def patch($p):
    if ($p | type) == "object" then
      reduce ($p | to_entries[]) as $e (if type == "object" then . else {} end;
        if $e.value == null then del(.[$e.key]) else .[$e.key] |= patch($e.value) end)
    else $p end;
  $base[0] | patch($patch[0])
'

# Falha se o manifest apontar para um arquivo que não existe no pacote.
verificar_referencias() {
  local pasta="$1" faltando=()
  while IFS= read -r ref; do
    [[ -f "$pasta/$ref" ]] || faltando+=("$ref")
  done < <(jq -r '
    [(.icons // {})[], (.action.default_icon // {})[], .action.default_popup, .options_ui.page,
     .background.service_worker, (.background.scripts // [])[]] | .[] | strings
  ' "$pasta/manifest.json")
  ((${#faltando[@]} == 0)) || erro "arquivos citados no manifest não existem: ${faltando[*]}"
}

build() {
  local navegador="$1"
  local destino="$DIST/$navegador"
  rm -rf "$destino"
  mkdir -p "$destino"

  # copia src/ sem arquivos ocultos (.DS_Store etc.) e sem o manifest base
  (cd "$SRC" && find . -type f ! -name '.*' ! -name 'Thumbs.db' ! -name 'desktop.ini' ! -path './manifest.json' -print0 |
    while IFS= read -r -d '' arq; do
      mkdir -p "$destino/$(dirname "$arq")"
      cp -p "$arq" "$destino/$arq"
    done)

  jq -n --slurpfile base "$SRC/manifest.json" --slurpfile patch "$BROWSERS/$navegador.json" "$MERGE_PATCH" \
    >"$destino/manifest.json"
  verificar_referencias "$destino"

  local versao zip_path
  versao="$(jq -r .version "$destino/manifest.json")"
  zip_path="$DIST/$NOME-$versao-$navegador.zip"
  rm -f "$zip_path"
  # manifest.json na raiz do zip, sem atributos extras do sistema (-X)
  (cd "$destino" && zip -qrX9D "$zip_path" .)
  echo "  $(printf '%-8s' "$navegador") ${zip_path#"$RAIZ/"}"
}

disponiveis=()
for f in "$BROWSERS"/*.json; do
  disponiveis+=("$(basename "$f" .json)")
done

pedidos=("$@")
((${#pedidos[@]})) || pedidos=("${disponiveis[@]}")
for n in "${pedidos[@]}"; do
  [[ -f "$BROWSERS/$n.json" ]] || erro "navegador desconhecido: $n (disponíveis: ${disponiveis[*]})"
done

echo "$NOME $(jq -r .version "$SRC/manifest.json")"
mkdir -p "$DIST"
for n in "${pedidos[@]}"; do
  build "$n"
done
