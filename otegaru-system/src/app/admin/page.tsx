import { PrismaClient } from '@prisma/client'
import AdminClient from './AdminClient'

const prisma = new PrismaClient()

export default async function AdminPage() {
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
