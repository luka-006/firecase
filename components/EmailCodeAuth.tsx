'use client'

import { useActionState, useState } from 'react'
import { TurnstileField } from './TurnstileField'
import { Field } from './Ui'
import type { Locale } from '@/lib/routes'
import { t } from '@/lib/dict'
import { loginWithPassword, sendAuthCode, verifyAuthCode } from '@/app/auth-actions'

type State = { error?: string; ok?: string; step?: 'code' } | null

export function EmailCodeAuth({ locale, mode }: { locale: Locale; mode: 'login' | 'register' }) {
  const d = t(locale)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [sendState, sendAction, sendPending] = useActionState(async (s: State, f: FormData) => {
    const res = await sendAuthCode(s, f)
    if (res?.step === 'code') {
      setEmail(String(f.get('email') ?? ''))
      setName(String(f.get('name') ?? ''))
      setStep('code')
    }
    return res
  }, null as State)
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyAuthCode, null as State)
  const [pwState, pwAction, pwPending] = useActionState(loginWithPassword, null as State)
  const [showPw, setShowPw] = useState(false)
  const needTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  return (
    <div className="space-y-8">
      {step === 'email' ? (
        <form action={sendAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="cf-turnstile-response" value={token} />
          {mode === 'register' && <Field label={d.name} name="name" autoComplete="name" required />}
          <Field label={d.email} name="email" type="email" required autoComplete="email" />
          <TurnstileField onToken={setToken} />
          {sendState?.error && <p className="text-sm text-red-400">{sendState.error}</p>}
          {sendState?.ok && <p className="text-sm text-emerald-400">{sendState.ok}</p>}
          <button className="btn w-full" disabled={sendPending || (needTurnstile && !token)}>
            {sendPending ? '…' : d.authSendCode}
          </button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="name" value={name} />
          <p className="text-sm text-mute">{d.mailOtpSent}</p>
          <Field label={d.authCode} name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="[0-9]{6}" />
          {verifyState?.error && <p className="text-sm text-red-400">{verifyState.error}</p>}
          <button className="btn w-full" disabled={verifyPending}>{verifyPending ? '…' : d.authVerify}</button>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => setStep('email')}>
            ← {d.email}
          </button>
        </form>
      )}

      {mode === 'login' && step === 'email' && (
        <div className="border-t border-line pt-6">
          {!showPw ? (
            <button type="button" className="link text-sm" onClick={() => setShowPw(true)}>{d.authUsePassword}</button>
          ) : (
            <form action={pwAction} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="cf-turnstile-response" value={token} />
              <Field label={d.email} name="email" type="email" required autoComplete="email" />
              <Field label={d.password} name="password" type="password" required autoComplete="current-password" />
              <TurnstileField onToken={setToken} />
              {pwState?.error && <p className="text-sm text-red-400">{pwState.error}</p>}
              <button className="btn-ghost w-full" disabled={pwPending || (needTurnstile && !token)}>{pwPending ? '…' : d.login}</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
