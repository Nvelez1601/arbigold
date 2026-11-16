// Pre-commit: sobre los archivos en stage.
// ESLint corrige lo mecánico y BLOQUEA el commit si queda cualquier error o warning.
// Prettier deja el formato canónico. Luego el gate de specs (en .husky/pre-commit).
export default {
  '*.{ts,mts,mjs,js,vue}': ['eslint --max-warnings=0 --no-warn-ignored --fix', 'prettier --write'],
  '*.{json,md,yml,yaml,css,html}': ['prettier --write'],
};
