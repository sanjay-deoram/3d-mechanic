import type { Action, Procedure, Vec3 } from '../types'
import { A, CLIPS, clipHinge, coverHinge, filterHinge, rodPivot } from '../scene/airBoxGeometry'

const CLIP_IDS = CLIPS.map((_, i) => `clip${i}`)
const Z_AXIS: Vec3 = [0, 0, 1]

const VIEW = {
  car: { pos: [-0.3, 13, 17.5] as Vec3, target: [-2.9, 0.8, 2.0] as Vec3 },
  bay: { pos: [3.5, 7, 8.5] as Vec3, target: [0.2, -0.2, 0.6] as Vec3 },
  box: { pos: [3.6, 3.6, 5.2] as Vec3, target: [0, -0.05, 0.1] as Vec3 },
  open: { pos: [4.6, 3.4, 4.6] as Vec3, target: [0.2, 0.3, 0.1] as Vec3 },
}

/** On the wide views the whole box gets one label saying what is inside. */
const HERE = { cover: 'Air box · filter is inside', lower: '' }

/** Direction the filter slides once it has been tipped up, clear of the open cover. */
const tilt = (A.filterTilt * Math.PI) / 180
const slideOut: Vec3 = [2.6 * Math.cos(tilt), 2.6 * Math.sin(tilt), 1.3]
const slideIn: Vec3 = [-slideOut[0], -slideOut[1], -slideOut[2]]

export const civic2012AirFilter: Procedure = {
  id: 'engine-air-filter',
  scene: 'airBox',
  background: ['body', 'engine', 'battery', 'fuseBox', 'reservoir', 'washer'],
  credit: {
    text: 'Steps follow the iFixit guide “2012–2015 Honda Civic Air Filter Replacement”.',
    url: 'https://www.ifixit.com/Guide/2012+2013+2014+2015+Honda+Civic+Air+Filter+Replacement/40403',
  },
  vehicle: '2012–2015 Honda Civic, 1.8 L',
  title: 'Engine air filter replacement',
  time: '10–15 minutes',
  difficulty: 'Easy',
  tools: [{ name: 'No tools needed', detail: 'The air box is held shut by four spring clips you release by hand' }],
  supplies: [
    { name: 'Engine air filter for the 1.8 L Civic', detail: 'Check the box lists your model year before you open it' },
    { name: 'Clean rag', detail: 'To wipe out the bottom of the air box' },
  ],
  specs: [
    {
      label: 'Engine',
      value: '1.8 L only',
      status: 'verified',
      source: 'The source guide covers 2012–2015 Civics with the 1.8 L engine. The Civic Si (2.4 L) has a different air box.',
    },
  ],
  partNames: {
    ...Object.fromEntries(CLIP_IDS.map((id) => [id, 'Clip'])),
    cover: 'Air box cover',
    lower: 'Air box',
    filterOld: 'Old filter',
    filterNew: 'New filter',
    propRod: 'Hood prop rod',
    engine: 'Engine',
    battery: 'Battery',
    fuseBox: 'Fuse box',
    reservoir: 'Brake fluid',
    washer: 'Washer fluid',
  },
  setup: [
    { type: 'pivot', parts: ['filterNew'], pivot: filterHinge, axis: Z_AXIS, angle: A.filterTilt },
    { type: 'move', parts: ['filterNew'], by: slideOut },
    { type: 'fade', parts: ['filterNew'], to: 0 },
  ],
  steps: [
    {
      id: 'overview',
      title: 'Before you start',
      highlight: ['cover', 'lower'],
      names: HERE,
      landmarks: ['engine', 'battery'],
      body: 'The engine air filter sits in a black plastic box next to the engine. You will unclip the box, lift its cover, swap the filter and clip it shut again. Do it with the engine off and cool.',
      notes: [{ kind: 'tip', text: 'This is for the 1.8 L engine. The Civic Si has a different air box.' }],
      camera: VIEW.car,
      actions: [],
    },
    {
      id: 'hood-release',
      title: 'Release the hood',
      body: 'Inside the car, find the hood release lever below the dashboard on the driver side and pull it toward you until you hear a click. At the front of the car the hood will have popped up slightly. Reach under its front edge, push the safety catch to the left and lift the hood.',
      camera: VIEW.car,
      actions: [],
    },
    {
      id: 'hood-prop',
      title: 'Prop the hood open',
      body: 'The prop rod lies along the ledge in front of the radiator. Lift it and put its end into the hole on the underside of the hood.',
      notes: [{ kind: 'warning', text: 'Make sure the rod is seated in the hole before you let go of the hood.' }],
      highlight: ['propRod'],
      camera: VIEW.car,
      duration: 2.5,
      actions: [{ type: 'pivot', parts: ['propRod'], pivot: rodPivot, axis: Z_AXIS, angle: 62 }],
    },
    {
      id: 'locate',
      title: 'Find the air box',
      body: 'Stand at the front of the car. The air box is the black plastic box on the right-hand side of the engine bay, toward the back. It sits between the engine cover on its left and the fuse box on its right, directly behind the battery. The brake fluid reservoir with the yellow cap is just behind it, against the back wall.',
      notes: [{ kind: 'tip', text: 'A thick ribbed rubber hose runs from the top of the box across to the engine. Follow that hose and you have found it.' }],
      highlight: ['cover', 'lower'],
      landmarks: ['engine', 'battery', 'fuseBox', 'reservoir', 'washer'],
      names: HERE,
      camera: VIEW.car,
      actions: [],
    },
    {
      id: 'clips-off',
      title: 'Release the four clips',
      body: 'Four metal spring clips hold the cover down: two on the front, one on the right side and one at the right rear. Push the top of each clip away from the box until it lets go of the cover.',
      notes: [{ kind: 'tip', text: 'The rear clip is the hard one to see. Feel for it with your fingers.' }],
      highlight: CLIP_IDS,
      detail: { target: [0.7, -0.05, A.halfZ + A.flange], span: 1.5, label: '4 clips · by hand' },
      camera: VIEW.box,
      duration: 5,
      actions: CLIPS.map(
        (c, i): Action => ({
          type: 'pivot',
          parts: [`clip${i}`],
          pivot: clipHinge(i),
          axis: c.axis,
          angle: c.open,
          at: [i * 0.22, i * 0.22 + 0.25],
        }),
      ),
    },
    {
      id: 'cover-up',
      title: 'Lift the cover',
      body: 'Gently lift the cover off the lower half of the box. It stays attached to the engine by its hose, so raise the free side and hold it there.',
      notes: [{ kind: 'warning', text: 'Do not force the cover or pull on the hose or any wiring attached to it.' }],
      highlight: ['cover'],
      camera: VIEW.open,
      duration: 2.5,
      actions: [{ type: 'pivot', parts: ['cover'], pivot: coverHinge, axis: Z_AXIS, angle: A.coverAngle }],
    },
    {
      id: 'filter-out',
      title: 'Take out the old filter',
      body: 'Lift the old filter out of the lower box and set it aside. Notice which way up it sat so the new one goes in the same way.',
      notes: [{ kind: 'tip', text: 'Keep it level as it comes out so dirt does not fall into the box.' }],
      highlight: ['filterOld'],
      camera: VIEW.open,
      duration: 3.5,
      actions: [
        { type: 'pivot', parts: ['filterOld'], pivot: filterHinge, axis: Z_AXIS, angle: A.filterTilt, at: [0, 0.3] },
        { type: 'move', parts: ['filterOld'], by: slideOut, at: [0.3, 0.8] },
        { type: 'fade', parts: ['filterOld'], to: 0, at: [0.8, 1] },
      ],
    },
    {
      id: 'clean',
      title: 'Wipe out the box',
      body: 'Wipe any leaves, sand or dust out of the bottom of the lower box with a clean rag.',
      notes: [{ kind: 'warning', text: 'Do not let anything fall into the opening that leads to the engine.' }],
      highlight: ['lower'],
      camera: VIEW.open,
      actions: [],
    },
    {
      id: 'filter-in',
      title: 'Fit the new filter',
      body: 'Set the new filter into the lower box the same way up as the old one. Press around the edge so its rubber seal sits flat on the rim all the way round.',
      highlight: ['filterNew'],
      camera: VIEW.open,
      duration: 3.5,
      actions: [
        { type: 'fade', parts: ['filterNew'], to: 1, at: [0, 0.2] },
        { type: 'move', parts: ['filterNew'], by: slideIn, at: [0.2, 0.7] },
        { type: 'pivot', parts: ['filterNew'], pivot: filterHinge, axis: Z_AXIS, angle: -A.filterTilt, at: [0.7, 1] },
      ],
    },
    {
      id: 'cover-down',
      title: 'Lower the cover',
      body: 'Lower the cover back onto the box and check it sits flat on the lower half with no gap anywhere.',
      notes: [{ kind: 'tip', text: 'If it will not sit flat, the filter seal is out of place. Lift the cover and reseat the filter.' }],
      highlight: ['cover'],
      camera: VIEW.open,
      duration: 2.5,
      actions: [{ type: 'pivot', parts: ['cover'], pivot: coverHinge, axis: Z_AXIS, angle: -A.coverAngle }],
    },
    {
      id: 'clips-on',
      title: 'Fasten the four clips',
      body: 'Swing each clip up and press it over the edge of the cover until it snaps on. Do all four.',
      highlight: CLIP_IDS,
      detail: { target: [0.7, -0.05, A.halfZ + A.flange], span: 1.5, label: 'All 4 snapped on' },
      camera: VIEW.box,
      duration: 5,
      actions: CLIPS.map(
        (c, i): Action => ({
          type: 'pivot',
          parts: [`clip${i}`],
          pivot: clipHinge(i),
          axis: c.axis,
          angle: -c.open,
          at: [i * 0.22, i * 0.22 + 0.25],
        }),
      ),
    },
    {
      id: 'finish',
      title: 'Close the hood',
      body: 'Hold the hood, lower the prop rod back into its clip on the ledge, then lower the hood and press it shut until it latches.',
      highlight: ['propRod'],
      camera: VIEW.car,
      duration: 2.5,
      actions: [{ type: 'pivot', parts: ['propRod'], pivot: rodPivot, axis: Z_AXIS, angle: -62 }],
    },
  ],
}
