'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

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
  try {
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
    return { success: false, message: 'Failed to create reservation' }
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
