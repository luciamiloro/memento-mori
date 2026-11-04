# Memento mori

Tu vida en semanas, hasta los 90 años. Cargás tu fecha de nacimiento y la app arma un póster imprimible: 52 columnas × 90 filas, una casilla por semana.

## Correr

```bash
npm install
npm run dev      # desarrollo
npm run build    # build de producción en /dist
```

Deploy en Vercel: importar el repo; Vercel detecta Vite solo (build `npm run build`, output `dist`).

## Qué hace

- Grilla de 4.680 semanas con trazo "a mano" (variaciones determinísticas por casilla) y textura de grano.
- Hover sobre cualquier semana: número de semana, fecha y, si corresponde, el hito.
- Animación de llenado de las semanas vividas (se desactiva con `prefers-reduced-motion`).
- Hasta 6 hitos marcados en la grilla y listados al pie.
- Fondo **oscuro** o **claro** (para imprimir en casa sin gastar tinta).
- Salida en **A4 o A3**: imprimir / guardar como PDF (vectorial) o PNG a 300 dpi.
- Interfaz y póster en español e inglés; modo claro/oscuro de la app.
- Todo corre en el navegador; los datos se guardan sólo en el `localStorage` del usuario.

## Decisiones técnicas

- El póster se diseña a 840 × 1188 px (proporción ISO A, la misma para A4 y A3) y se escala con `zoom`: en pantalla según el ancho disponible y en impresión al ancho exacto de la hoja. Así hay un solo DOM para preview, PDF y PNG.
- `@page` se inyecta según el tamaño elegido, así el diálogo de impresión ya viene en A4 o A3 sin márgenes.
- Las 4.680 casillas están memoizadas y el hover usa un único listener delegado, para que tipear o mover el mouse no re-renderice la grilla.
- Las fechas se calculan en UTC para evitar corrimientos por horario de verano.

## Estructura

```
src/
  App.tsx                 estado, persistencia, escala, exportación
  i18n.ts                 textos ES/EN (UI y póster)
  lib/weeks.ts            cálculo de semanas, fechas, variaciones
  components/
    Controls.tsx          formulario
    Poster.tsx            composición del póster
    WeekGrid.tsx          grilla + tooltip
  styles/
    app.css               interfaz, tema, impresión
    poster.css            póster (tonos oscuro/claro) y grilla
```
