# Tabla de modelos por dificultad

fecha: 2026-11-16

Los nombres de modelos envejecen rápido. **Si la fecha de arriba tiene más de ~90 días**
(compárala con `date +%Y-%m-%d`), avísale al humano que la tabla puede estar
desactualizada y sugiere revisarla. Al actualizarla, actualiza también la fecha.

| Categoría | Estrategia portable |
|---|---|
| 1–5 (muy sencilla y sencilla) | `arbigold-worker` heredando el modelo de la sesión; bajar el costo solo si el host ya ofrece una opción configurada |
| 6–7 (mediana) | `arbigold-worker` con el modelo heredado y razonamiento medio o equivalente |
| 8–9 (difícil: dinero, KYC, auth, RLS) | Modelo heredado; ofrecer escalar a la mejor opción disponible, y peer review recomendado |
| 10 (suma dificultad) | El mejor modelo permitido por el host, con supervisión humana; si es cuestión de gusto o es irreversible, el orquestador sigue involucrado |

Notas:

- No hardcodear proveedor ni nombre de modelo en los agentes versionados. Cada host
  resuelve el modelo heredado y el usuario conserva el control de sus credenciales.
- En OpenCode, `task` selecciona un agente, no un modelo arbitrario. Ofrece solo los
  subagentes que el host expone. Si `permission.task` está denegado, degrada a ejecución
  secuencial y dilo.
- Cuando los ejes chocan: en lo que toca dinero o llega al usuario final, **inteligencia
  y gusto pesan más que el costo**. El costo solo desempata.
- Escalado: si la entrega de un modelo económico trae findings de fondo (no de detalle),
  no insistas con rondas en el mismo modelo: re-despacha un escalón arriba.
