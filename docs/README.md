# SORTLAB

An interactive sorting algorithm learning project built with Three.js, HTML, CSS, and JavaScript. Explore each algorithm step by step through 3D visualizations.

## Project structure

- `index.html` is the homepage; algorithm pages live in `pages/`.
- `css/` contains the global, homepage, visualization, and component styles.
- `js/algorithms/` contains the three page entry points and algorithm-specific steps.
- `js/modules/` and `js/utils/` contain shared visualization modules and helpers.
- `docs/` contains project documentation.

## Run locally

```sh
npm install
npm run dev
```

The homepage is at `/`. The algorithm visualizers are available at:

- `/pages/insertion-sort.html`
- `/pages/bubble-sort.html`
- `/pages/selection-sort.html`

Create a production build with `npm run build`.
