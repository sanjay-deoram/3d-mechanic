<img src="assets/icon.svg" width="64" height="64" alt="">

# 3d-mechanic

Animated 3D repair guides for everyday people. The prototype covers front brake pads on a 2013 Honda Civic Si.

## Run it

```sh
cd app
npm install
npm run dev
```

Add `?step=7` to the URL to open the guide at a given step.

## Where things live

- `app/src/data/` — one file per guide: steps, tools, specs, and what each part does in each step.
- `app/src/scene/BrakeCorner.tsx` — the 3D parts, each registered under the id the guide data refers to.
- `app/src/engine.ts` — turns a step and a time into the position of every part.
