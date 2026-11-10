import { PrismaClient } from '@prisma/client'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ConfirmClient from './ConfirmClient'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

type GasBusySlot = { date: string, start: string, end: string, title: string }
type GasDate = { date: string, status: string }

export default async function ConfirmPage() {
  const calendarDates = await prisma.calendarDate.findMany()
  const reservations = await prisma.reservation.findMany({
    where: { status: 'confirmed' },
    select: { id: true, date: true, time: true, status: true, menu: true }
  })

  const settingsArray = await prisma.siteSetting.findMany()
  const rangeSetting = settingsArray.find(s => s.key === 'booking_range_weeks')
  const bookingRangeWeeks = rangeSetting ? parseInt(rangeSetting.value, 10) : 4

  // Format data for the client component (same assembly as the booking page)
  const availableDates = calendarDates
    .filter(d => d.type === '営業')
    .map(d => d.date)

  const closedDates = calendarDates
    .filter(d => d.type === '休業')
    .map(d => d.date)

  // Google Calendar data from GAS (same endpoint the booking flow reads)
  let gasBusySlots: GasBusySlot[] = []
  let gasDates: GasDate[] = []
  try {
    const gasRes = await fetch('https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec', { cache: 'no-store' })
    const gasData = await gasRes.json()
    if (gasData.status === 'success') {
      gasBusySlots = gasData.busySlots || []
      gasDates = (gasData.dates || []).map((d: { date: string, status: string }) => ({ date: d.date, status: d.status }))
    }
  } catch (error) {
    console.error('Failed to fetch GAS data for confirm page', error)
  }

  return (
    <>
      <Header />
      <ConfirmClient
        availableDates={availableDates}
        closedDates={closedDates}
        existingReservations={reservations}
        gasBusySlots={gasBusySlots}
        gasDates={gasDates}
        bookingRangeWeeks={bookingRangeWeeks}
      />
      <Footer />
    </>
  )
}
