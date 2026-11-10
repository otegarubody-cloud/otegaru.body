import { PrismaClient } from '@prisma/client'
import AdminClient from './AdminClient'
import LoginForm from './LoginForm'
import { isAdmin } from '../../lib/admin-auth'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export default async function KanriPage() {
  // Unauthenticated visitors get the login screen. This branch never
  // touches the database, so the login page renders even when the
  // database is unreachable.
  if (!(await isAdmin())) {
    return <LoginForm />
  }

  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: 'desc' }
  })
  const menus = await prisma.menu.findMany()
  const settings = await prisma.siteSetting.findMany()

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <AdminClient
        initialReservations={reservations}
        initialMenus={menus}
        initialSettings={settings}
      />
    </div>
  )
}
