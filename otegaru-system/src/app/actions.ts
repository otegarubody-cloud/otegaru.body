'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '../lib/admin-auth'
import { BUFFER_MINUTES } from '../lib/booking'

const prisma = new PrismaClient()

export async function createReservation(data: {
  name: string
  phone: string
  email: string
  menu: string
  date: string
  time: string
  notes?: string
}) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec'
  const TIME_SLOTS = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"]

  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  const toTimeString = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  try {
    // Server-side overlap validation (same approach as rescheduleReservation).
    // Duration comes from the DB menu record matched by the submitted menu name;
    // fall back to parsing the duration out of the menu name (reschedule's pattern).
    const menuRecord = await prisma.menu.findFirst({ where: { name: data.menu } })
    let duration = 30
    const recordDur = menuRecord?.duration.match(/\d+/)
    if (recordDur) {
      duration = parseInt(recordDur[0], 10)
    } else {
      const nameDur = data.menu.match(/(\d+)\s*分/)
      if (nameDur) duration = parseInt(nameDur[1], 10)
    }
    const start = toMinutes(data.time)
    const end = start + duration

    // Google Calendar data from GAS (best effort: on failure, DB check only)
    let gasBusySlots: { date: string, start: string, end: string, title: string }[] = []
    try {
      const gasRes = await fetch(GAS_URL, { cache: 'no-store' })
      const gasData = await gasRes.json()
      if (gasData.status === 'success') {
        gasBusySlots = gasData.busySlots || []
      }
    } catch (gasError) {
      console.error('Failed to fetch GAS data for create validation', gasError)
    }

    // Blocked slots on the target date: confirmed reservations + GAS busy slots
    // Reservations occupy treatment time + cleanup buffer; GAS busy slots keep their raw range (no buffer)
    const reservationBlocked: string[] = []
    const existing = await prisma.reservation.findMany({
      where: { date: data.date, status: 'confirmed' }
    })
    existing.forEach(r => {
      reservationBlocked.push(r.time)
      const m = r.menu?.match(/(\d+)\s*分/)
      const d = m ? parseInt(m[1], 10) : 30
      const s = toMinutes(r.time)
      for (let t = s + 30; t < s + d + BUFFER_MINUTES; t += 30) {
        const slot = toTimeString(t)
        if (TIME_SLOTS.includes(slot) && !reservationBlocked.includes(slot)) reservationBlocked.push(slot)
      }
    })
    const gasBlocked: string[] = []
    gasBusySlots.filter(b => b.date === data.date).forEach(b => {
      const busyStart = toMinutes(b.start)
      const busyEnd = toMinutes(b.end)
      TIME_SLOTS.forEach(t => {
        const slotStart = toMinutes(t)
        if (slotStart < busyEnd && slotStart + 30 > busyStart && !gasBlocked.includes(t)) {
          gasBlocked.push(t)
        }
      })
    })

    // Against other reservations, the candidate also occupies treatment + buffer
    for (let t = start; t < end + BUFFER_MINUTES; t += 30) {
      if (reservationBlocked.includes(toTimeString(t))) {
        return { success: false, message: 'その時間帯はご予約が入っています。別の時間をお選びください。' }
      }
    }
    // Against GAS busy slots, only the treatment time is compared (same semantics as reschedule)
    for (let t = start; t < end; t += 30) {
      if (gasBlocked.includes(toTimeString(t))) {
        return { success: false, message: 'その時間帯はご予約が入っています。別の時間をお選びください。' }
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        menu: data.menu,
        date: data.date,
        time: data.time,
        notes: data.notes || '',
        status: 'confirmed'
      }
    })

    // Forward the reservation to GAS for email notification
    try {
      const payload = {
        action: 'book',
        name: data.name,
        phone: data.phone,
        email: data.email,
        menu: data.menu,
        date: data.date.replace(/-/g, '/'), // format might be needed by the script
        isoDate: data.date,
        time: data.time,
        notes: data.notes || ''
      }

      await fetch('https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
    } catch (gasError) {
      console.error('Failed to notify GAS', gasError)
      // We still return success since it's saved in the DB
    }

    return { success: true, id: reservation.id }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'エラーが発生しました。もう一度お試しください。' }
  }
}

export async function updateReservationStatus(id: string, status: string) {
  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status }
    })
    
    // Notify GAS about cancellation
    if (status === 'cancel') {
      try {
        const payload = {
          action: 'cancel',
          name: reservation.name,
          phone: reservation.phone,
          email: reservation.email,
          menu: reservation.menu,
          date: reservation.date.replace(/-/g, '/'),
          isoDate: reservation.date,
          time: reservation.time,
        }
        await fetch('https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } catch (gasError) {
        console.error('Failed to notify GAS cancellation', gasError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false }
  }
}

export async function rescheduleReservation(id: string, newDate: string, newTime: string) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec'
  const TIME_SLOTS = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"]
  const CLOSE_MINUTES = 18 * 60

  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  const toTimeString = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } })
    if (!reservation) {
      return { success: false, message: '予約が見つかりませんでした' }
    }
    if (reservation.status !== 'confirmed') {
      return { success: false, message: 'この予約は変更できません' }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !TIME_SLOTS.includes(newTime)) {
      return { success: false, message: '日時の形式が正しくありません' }
    }

    // JST today / now (same approach as getReservationsByPhone)
    const nowJst = new Date()
    nowJst.setHours(nowJst.getHours() + 9)
    const todayStr = nowJst.toISOString().split('T')[0]
    const nowTimeStr = nowJst.toISOString().split('T')[1].slice(0, 5)

    if (newDate < todayStr) {
      return { success: false, message: '過去の日付には変更できません' }
    }
    if (newDate === todayStr && newTime <= nowTimeStr) {
      return { success: false, message: '過去の時間には変更できません' }
    }

    // Booking range (same setting as the booking page)
    const rangeSetting = await prisma.siteSetting.findUnique({ where: { key: 'booking_range_weeks' } })
    const bookingRangeWeeks = rangeSetting ? parseInt(rangeSetting.value, 10) : 4
    const maxDateObj = new Date(`${todayStr}T00:00:00Z`)
    maxDateObj.setUTCDate(maxDateObj.getUTCDate() + bookingRangeWeeks * 7)
    const maxDateStr = maxDateObj.toISOString().split('T')[0]
    if (newDate > maxDateStr) {
      return { success: false, message: '予約可能な期間外の日付です' }
    }

    // Business day check (same rules as the booking calendar)
    const calendarDates = await prisma.calendarDate.findMany()
    const availableDates = calendarDates.filter(d => d.type === '営業').map(d => d.date)
    const closedDates = calendarDates.filter(d => d.type === '休業').map(d => d.date)

    // Google Calendar data from GAS (same endpoint/GET the booking page uses)
    let gasBusySlots: { date: string, start: string, end: string, title: string }[] = []
    let gasDates: { date: string, status: string }[] = []
    try {
      const gasRes = await fetch(GAS_URL, { cache: 'no-store' })
      const gasData = await gasRes.json()
      if (gasData.status === 'success') {
        gasBusySlots = gasData.busySlots || []
        gasDates = gasData.dates || []
      }
    } catch (gasError) {
      console.error('Failed to fetch GAS data for reschedule validation', gasError)
    }

    const weekday = new Date(`${newDate}T00:00:00Z`).getUTCDay()
    let isBusinessDay = weekday === 2 || weekday === 3
    if (availableDates.includes(newDate)) isBusinessDay = true
    // Googleカレンダー側で「営業」とされた日も営業日として扱う（休業の指定があればそちらが優先）
    if (gasDates.some(d => d.date === newDate && d.status === '営業')) isBusinessDay = true
    if (closedDates.includes(newDate) || gasDates.some(d => d.date === newDate && d.status === '休業')) {
      isBusinessDay = false
    }
    if (!isBusinessDay) {
      return { success: false, message: 'その日は営業日ではありません' }
    }

    // Duration is parsed from the stored menu name (same as the booking flow)
    const durMatch = reservation.menu.match(/(\d+)\s*分/)
    const duration = durMatch ? parseInt(durMatch[1], 10) : 30
    const start = toMinutes(newTime)
    const end = start + duration
    if (end > CLOSE_MINUTES) {
      return { success: false, message: '営業時間（18:00まで）に収まる時間を選んでください' }
    }

    // Blocked slots on the target date: other confirmed reservations (excluding itself) + GAS busy slots
    // Reservations occupy treatment time + cleanup buffer; GAS busy slots keep their raw range (no buffer)
    const reservationBlocked: string[] = []
    const others = await prisma.reservation.findMany({
      where: { date: newDate, status: 'confirmed', id: { not: id } }
    })
    others.forEach(r => {
      reservationBlocked.push(r.time)
      const m = r.menu?.match(/(\d+)\s*分/)
      const d = m ? parseInt(m[1], 10) : 30
      const s = toMinutes(r.time)
      for (let t = s + 30; t < s + d + BUFFER_MINUTES; t += 30) {
        const slot = toTimeString(t)
        if (TIME_SLOTS.includes(slot) && !reservationBlocked.includes(slot)) reservationBlocked.push(slot)
      }
    })
    const gasBlocked: string[] = []
    gasBusySlots.filter(b => b.date === newDate).forEach(b => {
      const busyStart = toMinutes(b.start)
      const busyEnd = toMinutes(b.end)
      TIME_SLOTS.forEach(t => {
        const slotStart = toMinutes(t)
        if (slotStart < busyEnd && slotStart + 30 > busyStart && !gasBlocked.includes(t)) {
          gasBlocked.push(t)
        }
      })
    })

    // Against other reservations, the candidate also occupies treatment + buffer
    for (let t = start; t < end + BUFFER_MINUTES; t += 30) {
      if (reservationBlocked.includes(toTimeString(t))) {
        return { success: false, message: 'その時間帯はすでに予約が入っています' }
      }
    }
    // Against GAS busy slots, only the treatment time is compared (unchanged semantics)
    for (let t = start; t < end; t += 30) {
      if (gasBlocked.includes(toTimeString(t))) {
        return { success: false, message: 'その時間帯はすでに予約が入っています' }
      }
    }

    // Notify GAS: cancel the old slot first (same pattern as updateReservationDetails)
    try {
      const cancelPayload = {
        action: 'cancel',
        name: reservation.name,
        phone: reservation.phone,
        email: reservation.email || '',
        menu: reservation.menu,
        date: reservation.date.replace(/-/g, '/'),
        isoDate: reservation.date,
        time: reservation.time,
      }
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelPayload)
      })
    } catch (gasError) {
      console.error('Failed to notify GAS of reschedule cancel', gasError)
    }

    // Update DB
    const updated = await prisma.reservation.update({
      where: { id },
      data: { date: newDate, time: newTime }
    })

    // Notify GAS: book the new slot
    try {
      const bookPayload = {
        action: 'book',
        name: updated.name,
        phone: updated.phone,
        email: updated.email || '',
        menu: updated.menu,
        date: updated.date.replace(/-/g, '/'),
        isoDate: updated.date,
        time: updated.time,
        notes: updated.notes || ''
      }
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookPayload)
      })
    } catch (gasError) {
      console.error('Failed to notify GAS of reschedule book', gasError)
    }

    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'エラーが発生しました。もう一度お試しください' }
  }
}

export async function getReservationsByPhone(phone: string) {
  try {
    // Get JST today string
    const now = new Date()
    now.setHours(now.getHours() + 9)
    const todayStr = now.toISOString().split('T')[0]

    const reservations = await prisma.reservation.findMany({
      where: { 
        phone,
        date: {
          gte: todayStr
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, reservations }
  } catch (error) {
    console.error(error)
    return { success: false, reservations: [] }
  }
}

export async function createMenu(data: { name: string, price: string, duration: string, description: string }) {
  if (!(await requireAdmin())) return { success: false }
  try {
    const menu = await prisma.menu.create({ data })
    revalidatePath('/', 'layout')
    return { success: true, menu }
  } catch (error) {
    console.error(error)
    return { success: false }
  }
}

export async function updateMenu(id: string, data: { name: string, price: string, duration: string, description: string }) {
  if (!(await requireAdmin())) return { success: false }
  try {
    const updatedMenu = await prisma.menu.update({ where: { id }, data })
    revalidatePath('/', 'layout')
    return { success: true, menu: updatedMenu }
  } catch (error) {
    console.error(error)
    return { success: false }
  }
}

export async function deleteMenu(id: string) {
  if (!(await requireAdmin())) return { success: false }
  try {
    await prisma.menu.delete({ where: { id } })
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false }
  }
}

export async function updateSiteSettings(settings: { key: string, value: string }[]) {
  if (!(await requireAdmin())) return { success: false }
  try {
    for (const setting of settings) {
      await prisma.siteSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      })
    }
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false }
  }
}

export async function updateReservationDetails(id: string, data: { name: string, phone: string, email: string, menu: string, date: string, time: string, notes: string }) {
  if (!(await requireAdmin())) return { success: false, message: 'Unauthorized' }
  try {
    const oldReservation = await prisma.reservation.findUnique({ where: { id } })
    if (!oldReservation) return { success: false, message: 'Not found' }

    // 1. Cancel old reservation in GAS
    try {
      const cancelPayload = {
        action: 'cancel',
        name: oldReservation.name,
        phone: oldReservation.phone,
        email: oldReservation.email || '',
        menu: oldReservation.menu,
        date: oldReservation.date.replace(/-/g, '/'),
        isoDate: oldReservation.date,
        time: oldReservation.time,
      }
      await fetch('https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelPayload)
      })
    } catch (e) {
      console.error('GAS cancel failed', e)
    }

    // 2. Update DB
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        menu: data.menu,
        date: data.date,
        time: data.time,
        notes: data.notes
      }
    })

    // 3. Book new reservation in GAS
    try {
      const bookPayload = {
        action: 'book',
        name: data.name,
        phone: data.phone,
        email: data.email,
        menu: data.menu,
        date: data.date.replace(/-/g, '/'),
        isoDate: data.date,
        time: data.time,
        notes: data.notes
      }
      await fetch('https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookPayload)
      })
    } catch (e) {
      console.error('GAS book failed', e)
    }

    return { success: true, reservation: updated }
  } catch (error) {
    console.error(error)
    return { success: false }
  }
}
