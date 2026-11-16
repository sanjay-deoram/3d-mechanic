import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { civicSi2013FrontPads as procedure } from './data/civicSi2013FrontPads'
import { Stage, type LabelElements } from './scene/Stage'
import type { Spec, Step } from './types'

const ICON = {
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  zoom: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.3-7.3a1 1 0 0 1-.3-.7z" />
      <circle cx="8" cy="8" r="1.2" />
    </>
  ),
  view: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  next: <path d="M5 12h14M13 6l6 6-6 6" />,
  wrench: (
    <path d="M14.5 6.2a4 4 0 0 0-5.2 5.2l-5.6 5.6a1.5 1.5 0 0 0 2.1 2.1l5.6-5.6a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.6-.6-2.1z" />
  ),
}

function Icon({ name }: { name: keyof typeof ICON }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[name]}
    </svg>
  )
}

function SpecChip({ spec }: { spec: Spec }) {
  return (
    <span className="chip spec" title={spec.source}>
      <i />
      <b>{spec.value}</b>
      {spec.label}
      <em className={spec.status}>{spec.status === 'verified' ? 'Verified' : 'Unverified'}</em>
    </span>
  )
}

function Kit() {
  return (
    <aside className="kit">
      <p className="meta">
        {procedure.time} · {procedure.difficulty}
      </p>
      <h3>Tools</h3>
      <ul>
        {procedure.tools.map((t) => (
          <li key={t.name}>
            <b>{t.name}</b>
            {t.detail && <span>{t.detail}</span>}
          </li>
        ))}
      </ul>
      <h3>Parts and supplies</h3>
      <ul>
        {procedure.supplies.map((t) => (
          <li key={t.name}>
            <b>{t.name}</b>
            {t.detail && <span>{t.detail}</span>}
          </li>
        ))}
      </ul>
      <h3>Specs</h3>
      <ul>
        {procedure.specs.map((s) => (
          <li key={s.label}>
            <b>
              {s.value} <em className={s.status}>{s.status === 'verified' ? 'Verified' : 'Unverified'}</em>
            </b>
            <span>{s.label}</span>
            {s.source && <span>{s.source}</span>}
          </li>
        ))}
      </ul>
    </aside>
  )
}

/** One label per distinct part name in the step, pinned to the first part with that name. */
function labelsFor(step: Step) {
  const byName = new Map<string, { part: string; name: string; count: number }>()
  for (const part of step.highlight ?? []) {
    const name = procedure.partNames[part]
    if (!name) continue
    const seen = byName.get(name)
    if (seen) seen.count++
    else byName.set(name, { part, name, count: 1 })
  }
  return [...byName.values()]
}

/** Lets a link open the guide at a given step, e.g. `?step=7`. */
function initialStep() {
  const n = Number(new URLSearchParams(window.location.search).get('step'))
  return Number.isInteger(n) && n >= 0 && n < procedure.steps.length ? n : 0
}

export default function App() {
  const [stepIndex, setStepIndex] = useState(initialStep)
  const [playNonce, setPlayNonce] = useState(0)
  const [viewNonce, setViewNonce] = useState(0)
  const [closeUp, setCloseUp] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const track = useRef<HTMLDivElement>(null)
  const labelEls = useRef<LabelElements>({})

  const steps = procedure.steps
  const step = steps[stepIndex]
  const last = steps.length - 1
  const overview = stepIndex === 0
  const labels = useMemo(() => (showLabels ? labelsFor(step) : []), [showLabels, step])

  const go = useCallback((i: number) => setStepIndex(Math.min(last, Math.max(0, i))), [last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(last, i + 1))
      if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const onProgress = useCallback(
    (t: number) => {
      track.current?.style.setProperty('--at', String((stepIndex + t) / (last + 1)))
    },
    [stepIndex, last],
  )

  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointermove' && e.buttons === 0) return
    const box = e.currentTarget.getBoundingClientRect()
    go(Math.floor(((e.clientX - box.left) / box.width) * (last + 1)))
  }

  return (
    <div className="page">
      <main className="card">
        <header className="top">
          <span className="pill">
            <Icon name="wrench" />
            3D Mechanic
          </span>
          <strong>{procedure.vehicle}</strong>
          <span className="pill job">{procedure.title}</span>
        </header>

        <div className="work">
          <section className="stage">
            <Stage
              procedure={procedure}
              stepIndex={stepIndex}
              playNonce={playNonce}
              viewNonce={viewNonce}
              onProgress={onProgress}
              labels={labelEls}
            />
            <div className="labels">
              {labels.map((l, i) => (
                <span
                  key={l.part}
                  className="label"
                  ref={(el) => {
                    labelEls.current[l.part] = el
                    return () => {
                      delete labelEls.current[l.part]
                    }
                  }}
                >
                  <span className="chip" style={{ bottom: 22 + i * 30 }}>
                    <i />
                    {l.count > 1 && <b>{l.count}×</b>}
                    {l.name}
                  </span>
                </span>
              ))}
            </div>
            <p className="stepno">
              {overview ? (
                <b className="word">Overview</b>
              ) : (
                <>
                  <b>{stepIndex}</b>
                  <span>/ {last}</span>
                </>
              )}
            </p>
            {step.detail && closeUp && (
              <figure className="detail">
                <Stage procedure={procedure} stepIndex={stepIndex} playNonce={playNonce} viewNonce={viewNonce} detail />
                <span className="detail-tag">Detail</span>
                <figcaption>
                  <span>{step.detail.label}</span>
                </figcaption>
              </figure>
            )}
            <p className="hint">drag to rotate · scroll or pinch to zoom</p>
          </section>
          {overview && <Kit />}
        </div>

        <section className="text">
          {(step.tools || (!overview && step.specs)) && (
            <div className="chips">
              {step.tools?.map((t) => (
                <span key={t} className="chip">
                  <i />
                  {t}
                </span>
              ))}
              {!overview && step.specs?.map((s) => <SpecChip key={s.label} spec={s} />)}
            </div>
          )}
          <h2>{overview ? step.title : `${stepIndex}. ${step.title}`}</h2>
          <p className="body">{step.body}</p>
          {step.notes?.map((n) => (
            <p key={n.text} className={`note ${n.kind}`}>
              <b>{n.kind === 'warning' ? 'Warning' : 'Tip'}</b>
              {n.text}
            </p>
          ))}
        </section>

        <footer className="bar">
          <div className="tools">
            <button
              type="button"
              className="round"
              aria-label="Replay this step"
              title="Replay this step"
              disabled={step.actions.length === 0}
              onClick={() => setPlayNonce((n) => n + 1)}
            >
              <Icon name="play" />
            </button>
            <button
              type="button"
              className="round"
              aria-label="Toggle close-up"
              title="Close-up"
              aria-pressed={closeUp}
              onClick={() => setCloseUp((v) => !v)}
            >
              <Icon name="zoom" />
            </button>
            <button
              type="button"
              className="round"
              aria-label="Toggle part labels"
              title="Part labels"
              aria-pressed={showLabels}
              onClick={() => setShowLabels((v) => !v)}
            >
              <Icon name="tag" />
            </button>
            <button
              type="button"
              className="round"
              aria-label="Reset view"
              title="Reset view"
              onClick={() => setViewNonce((n) => n + 1)}
            >
              <Icon name="view" />
            </button>
          </div>

          <div
            className="scrub"
            ref={track}
            role="slider"
            tabIndex={0}
            aria-label="Step"
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={stepIndex}
            aria-valuetext={overview ? 'Overview' : `Step ${stepIndex} of ${last}: ${step.title}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              scrub(e)
            }}
            onPointerMove={scrub}
          >
            <div className="scrub-fill" />
            <div className="scrub-ticks">
              {steps.map((s) => (
                <i key={s.id} />
              ))}
            </div>
            <div className="scrub-thumb" />
            <span>Step</span>
            <span>{overview ? 'Overview' : `${stepIndex} / ${last}`}</span>
          </div>

          <div className="nav">
            <button type="button" className="round" aria-label="Previous step" disabled={stepIndex === 0} onClick={() => go(stepIndex - 1)}>
              <Icon name="back" />
            </button>
            <button type="button" className="round" aria-label="Next step" disabled={stepIndex === last} onClick={() => go(stepIndex + 1)}>
              <Icon name="next" />
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}
