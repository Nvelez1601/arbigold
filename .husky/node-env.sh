# Cargado por cada hook: usa la versión de Node de .nvmrc sin depender del Node de tu shell
# (puede ser el del sistema u otro proyecto). No cambia tu configuración global.
# No usa `nvm use`: husky corre los hooks con sh (dash en Ubuntu) y nvm no lo soporta bien.
# Toma la vX.* más nueva instalada en nvm y la antepone al PATH.
REQUERIDA="$(tr -d ' v\n' < .nvmrc)"
NODOS="${NVM_DIR:-$HOME/.nvm}/versions/node"
ELEGIDA="$(ls "$NODOS" 2>/dev/null | grep -E "^v${REQUERIDA}(\.|$)" | sort -V | tail -n 1)"
[ -n "$ELEGIDA" ] && PATH="$NODOS/$ELEGIDA/bin:$PATH" && export PATH

case "$(node -v 2>/dev/null)" in
  "v$REQUERIDA".*) ;;
  *)
    echo "✗ Los hooks requieren Node $REQUERIDA (.nvmrc) y hay $(node -v 2>/dev/null || echo 'ninguno')." >&2
    echo "  Instálalo con: nvm install $REQUERIDA" >&2
    exit 1
    ;;
esac
