import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { civicSi2013FrontPads as procedure } from './data/civicSi2013FrontPads'
import { Stage } from './scene/Stage'
import type { Spec } from './types'

function SpecCard({ spec }: { spec: Spec }) {
  return (
    <div className={`spec ${spec.status}`}>
      <div className="spec-head">
        <span className="spec-label">{spec.label}</span>
        <span className="badge">{spec.status === 'verified' ? 'Verified' : 'Unverified'}</span>
      </div>
      <div className="spec-value">{spec.value}</div>
      {spec.source && <p className="spec-source">{spec.source}</p>}
    </div>
  )
}

function Overview() {
  return (
    <>
      <div className="meta">
        <span>{procedure.time}</span>
        <span>{procedure.difficulty}</span>
      </div>
      <h3>Tools</h3>
      <ul className="kit">
        {procedure.tools.map((t) => (
          <li key={t.name}>
            <strong>{t.name}</strong>
            {t.detail && <span>{t.detail}</span>}
          </li>
        ))}
      </ul>
      <h3>Parts and supplies</h3>
      <ul className="kit">
        {procedure.supplies.map((t) => (
          <li key={t.name}>
            <strong>{t.name}</strong>
            {t.detail && <span>{t.detail}</span>}
          </li>
        ))}
      </ul>
      <h3>Specs</h3>
      {procedure.specs.map((s) => (
        <SpecCard key={s.label} spec={s} />
      ))}
    </>
  )
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
  const bar = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  const steps = procedure.steps
  const step = steps[stepIndex]
  const last = steps.length - 1

  const go = useCallback(
    (i: number) => setStepIndex(Math.min(last, Math.max(0, i))),
    [last],
  )

  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [stepIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(last, i + 1))
      if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const onProgress = useCallback((t: number) => {
    if (bar.current) bar.current.style.transform = `scaleX(${t})`
  }, [])

  return (
    <div className="app">
      <div className="viewport">
        <Stage
          procedure={procedure}
          stepIndex={stepIndex}
          playNonce={playNonce}
          viewNonce={viewNonce}
          onProgress={onProgress}
        />
        <div className="viewport-controls">
          {step.actions.length > 0 && (
            <button type="button" onClick={() => setPlayNonce((n) => n + 1)}>
              Replay
            </button>
          )}
          <button type="button" onClick={() => setViewNonce((n) => n + 1)}>
            Reset view
          </button>
        </div>
        <p className="hint">Drag to rotate · scroll or pinch to zoom</p>
        <div className="timeline" hidden={step.actions.length === 0}>
          <div className="timeline-fill" ref={bar} />
        </div>
      </div>

      <aside className="panel">
        <header className="panel-head">
          <p className="vehicle">{procedure.vehicle}</p>
          <h1>{procedure.title}</h1>
          <div className="dots" role="tablist" aria-label="Steps">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === stepIndex}
                aria-label={`Step ${i + 1}: ${s.title}`}
                title={s.title}
                className={i === stepIndex ? 'current' : i < stepIndex ? 'done' : ''}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </header>

        <div className="panel-body" ref={body}>
          <p className="count">
            {stepIndex === 0 ? 'Overview' : `Step ${stepIndex} of ${last}`}
          </p>
          <h2>{step.title}</h2>
          <p className="body">{step.body}</p>

          {step.tools && (
            <div className="chips">
              {step.tools.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          )}

          {step.id !== 'overview' && step.specs?.map((s) => <SpecCard key={s.label} spec={s} />)}

          {step.notes?.map((n) => (
            <p key={n.text} className={`note ${n.kind}`}>
              <strong>{n.kind === 'warning' ? 'Warning' : 'Tip'}</strong>
              {n.text}
            </p>
          ))}

          {step.id === 'overview' && <Overview />}
        </div>

        <footer className="panel-foot">
          <button type="button" className="secondary" disabled={stepIndex === 0} onClick={() => go(stepIndex - 1)}>
            Back
          </button>
          <button type="button" className="primary" disabled={stepIndex === last} onClick={() => go(stepIndex + 1)}>
            {stepIndex === 0 ? 'Start' : 'Next'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
