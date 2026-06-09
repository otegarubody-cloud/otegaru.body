import { PrismaClient } from '@prisma/client'
import BookingClient from './BookingClient'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { Suspense } from 'react'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

type GasBusySlot = { date: string, start: string, end: string, title: string }
type GasDate = { date: string, status: string, note: string }

export default async function BookingPage() {
  const menus = await prisma.menu.findMany()
  const calendarDates = await prisma.calendarDate.findMany()
  const reservations = await prisma.reservation.findMany({
    where: { status: 'confirmed' }
  })

  // Format data for the client component
  const availableDates = calendarDates
    .filter(d => d.type === '営業')
    .map(d => d.date)
  
  const closedDates = calendarDates
    .filter(d => d.type === '休業')
    .map(d => d.date)

  return (
    <>
      <Header />

      <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px' }}>読み込み中...</div>}>
        <BookingClient 
          menus={menus} 
          availableDates={availableDates}
          closedDates={closedDates}
          existingReservations={reservations}
        />
      </Suspense>

      <Footer />
    </>
  )
}
