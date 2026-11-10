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
  const durationOf = (m: { duration: string }) => {
    const n = parseInt((m.duration || '').replace(/[^0-9]/g, ''), 10)
    return Number.isNaN(n) ? 999 : n
  }
  const sortedMenus = [...menus].sort((a, b) => {
    const aFull = a.name.includes('全身') ? 0 : 1
    const bFull = b.name.includes('全身') ? 0 : 1
    if (aFull !== bFull) return aFull - bFull
    return aFull === 0 ? durationOf(a) - durationOf(b) : 0
  })
  const calendarDates = await prisma.calendarDate.findMany()
  const reservations = await prisma.reservation.findMany({
    where: { status: 'confirmed' }
  })
  
  const settingsArray = await prisma.siteSetting.findMany()
  const rangeSetting = settingsArray.find(s => s.key === 'booking_range_weeks')
  const bookingRangeWeeks = rangeSetting ? parseInt(rangeSetting.value, 10) : 4

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
          menus={sortedMenus} 
          availableDates={availableDates}
          closedDates={closedDates}
          existingReservations={reservations}
          bookingRangeWeeks={bookingRangeWeeks}
        />
      </Suspense>

      <Footer />
    </>
  )
}
