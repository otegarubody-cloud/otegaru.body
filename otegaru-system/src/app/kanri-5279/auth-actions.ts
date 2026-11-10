'use server'

import { redirect } from 'next/navigation'
import {
  clearLoginFailures,
  clearSessionCookie,
  createSessionToken,
  getAdminUser,
  setSessionCookie,
  isLoginLocked,
  recordLoginFailure,
  verifyCredentials,
} from '../../lib/admin-auth'

export type LoginState = {
  error?: string
} | undefined

// One generic message for every failure (wrong username, wrong password,
// throttled) so a response never reveals which part was wrong.
const GENERIC_ERROR = 'ユーザー名またはパスワードが正しくありません。'

export async function loginAdmin(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  if (isLoginLocked()) {
    return { error: GENERIC_ERROR }
  }

  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!verifyCredentials(username, password)) {
    recordLoginFailure()
    return { error: GENERIC_ERROR }
  }

  clearLoginFailures()
  await setSessionCookie(createSessionToken(getAdminUser()))
  redirect('/kanri-5279')
}

export async function logoutAdmin(): Promise<void> {
  await clearSessionCookie()
  redirect('/kanri-5279')
}
