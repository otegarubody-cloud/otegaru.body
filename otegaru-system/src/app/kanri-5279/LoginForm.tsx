'use client'

import React, { useActionState } from 'react'
import { loginAdmin, type LoginState } from './auth-actions'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAdmin, undefined)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', padding: '40px 32px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '380px' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>
          おてがる整体 管理
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 24px 0' }}>ログインしてください</p>

        <form action={formAction} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label htmlFor="kanri-username" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>ユーザー名</label>
            <input
              id="kanri-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label htmlFor="kanri-password" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>パスワード</label>
            <input
              id="kanri-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          {state?.error && (
            <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0 }}>{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  )
}
