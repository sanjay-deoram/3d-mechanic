<img src="assets/icon.svg" width="64" height="64" alt="">

# 3d-mechanic

Animated 3D repair guides for everyday people. Two guides so far: front brake pads on a 2013 Honda Civic Si, and the engine air filter on a 2012–2015 Civic 1.8 L.

## Run it

```sh
cd app
npm install
npm run dev
```

Add `?step=7` to the URL to open a guide at a given step, and `?guide=engine-air-filter` to pick the guide.

## Where things live

- `app/src/data/` — one file per guide: steps, tools, specs, and what each part does in each step.
- `app/src/scene/BrakeCorner.tsx`, `AirBox.tsx` — the 3D parts for each guide, each registered under the id the guide data refers to.
- `app/src/engine.ts` — turns a step and a time into the position of every part.
