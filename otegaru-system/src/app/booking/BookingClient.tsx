'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createReservation } from '../actions'
import { BUFFER_MINUTES } from '../../lib/booking'
import MenuGroups from '../MenuGroups'

type Menu = { id: string, name: string, price: string, duration: string, description: string }
type Reservation = { date: string, time: string, status: string, menu?: string }
type GasBusySlot = { date: string, start: string, end: string, title: string }

export default function BookingClient({
  menus,
  availableDates,
  closedDates,
  existingReservations,
  bookingRangeWeeks
}: {
  menus: Menu[]
  availableDates: string[]
  closedDates: string[]
  existingReservations: Reservation[]
  bookingRangeWeeks: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoMenu = searchParams.get('autoMenu')

  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // GAS data states
  const [gasDates, setGasDates] = useState<{ date: string, status: string }[]>([])
  const [gasBusySlotsState, setGasBusySlotsState] = useState<GasBusySlot[]>([])
  const [isLoadingGas, setIsLoadingGas] = useState(true)

  useEffect(() => {
    // Fetch GAS data on mount
    fetch('https://script.google.com/macros/s/AKfycby-mLIQe6MH3xq4G5LBlLv1RZqAcMAAp5dquqdC1mFp-aCikcPDsOOWb70Q4PsV8D4X/exec')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setGasDates(data.dates || [])
          setGasBusySlotsState(data.busySlots || [])
        }
      })
      .catch(err => console.error('Failed to load GAS data', err))
      .finally(() => setIsLoadingGas(false))
  }, [])

  useEffect(() => {
    if (autoMenu) {
      const match = menus.find(m => m.name === autoMenu)
      if (match) setSelectedMenu(match)
    }
  }, [autoMenu, menus])

  const timeSlots = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"]

  // 営業終了時刻（18:00）。開始時刻 + 所要時間がこれを超えるメニューは選べない
  const CLOSE_MINUTES = 18 * 60

  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const toTimeString = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  // メニューの所要時間を分で返す（duration の "90分" などから数値を取り出す）
  const getDurationMinutes = (menu: Menu) => {
    const match = menu.duration.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  // その日時にそのメニューを開始できるか
  // （施術終了が閉店時刻以内で、既存予約とは「施術+片付けバッファ」の占有が重ならず、
  //   Googleカレンダーの予定とは施術時間が重ならないこと）
  const isMenuAvailableAt = (dateStr: string, startTime: string, menu: Menu) => {
    const start = toMinutes(startTime)
    const end = start + getDurationMinutes(menu)
    if (end > CLOSE_MINUTES) return false
    // 既存予約との重なりは、候補側も施術+バッファの占有区間で判定する
    // （例: 60分コースは施術終了の15分後まで枠を占有する）
    const reservationBlocked = getReservationBlockedSlots(dateStr)
    for (let t = start; t < end + BUFFER_MINUTES; t += 30) {
      if (reservationBlocked.includes(toTimeString(t))) return false
    }
    // Googleカレンダーの予定との判定は従来どおり（施術時間のみ、バッファなし）
    const gasBlocked = getGasBlockedSlots(dateStr)
    for (let t = start; t < end; t += 30) {
      if (gasBlocked.includes(toTimeString(t))) return false
    }
    return true
  }

  // 既存予約が占有する30分枠（所要時間 + 片付けバッファぶんまで）
  const getReservationBlockedSlots = (dateStr: string) => {
    const blocked: string[] = []
    const confirmedOnDate = existingReservations.filter(r => r.date === dateStr && r.status === 'confirmed')

    confirmedOnDate.forEach(r => {
      blocked.push(r.time)
      // 既存予約が占有する枠は、メニュー名に含まれる所要時間 + バッファぶんすべてブロックする
      const durMatch = r.menu?.match(/(\d+)\s*分/)
      const dur = durMatch ? parseInt(durMatch[1], 10) : 30
      const start = toMinutes(r.time)
      for (let t = start + 30; t < start + dur + BUFFER_MINUTES; t += 30) {
        const slot = toTimeString(t)
        if (timeSlots.includes(slot) && !blocked.includes(slot)) blocked.push(slot)
      }
    })

    return blocked
  }

  // Googleカレンダーの予定が占有する30分枠（従来どおり、バッファは付けない）
  const getGasBlockedSlots = (dateStr: string) => {
    const blocked: string[] = []
    const dayBusy = gasBusySlotsState.filter(b => b.date === dateStr)
    dayBusy.forEach(b => {
      const [startH, startM] = b.start.split(':').map(Number)
      const [endH, endM] = b.end.split(':').map(Number)
      const startMins = startH * 60 + startM
      const endMins = endH * 60 + endM

      timeSlots.forEach(t => {
        const [th, tm] = t.split(':').map(Number)
        const slotStartMins = th * 60 + tm
        const slotEndMins = slotStartMins + 30

        if (slotStartMins < endMins && slotEndMins > startMins) {
          if (!blocked.includes(t)) blocked.push(t)
        }
      })
    })

    return blocked
  }

  const getBlockedSlots = (dateStr: string) => {
    const blocked = getReservationBlockedSlots(dateStr)
    getGasBlockedSlots(dateStr).forEach(slot => {
      if (!blocked.includes(slot)) blocked.push(slot)
    })
    return blocked
  }

  const renderCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days = []
    
    const today = new Date()
    today.setHours(0,0,0,0)

    // Limit to N weeks from today (configured in admin)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + (bookingRangeWeeks * 7))

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      
      const isPast = date < today
      let isAvailable = false
      if (date.getDay() === 2 || date.getDay() === 3) {
        isAvailable = true
      }
      if (availableDates.includes(dateStr)) {
        isAvailable = true
      }
      if (closedDates.includes(dateStr) || gasDates.some(d => d.date === dateStr && d.status === '休業')) {
        isAvailable = false
      }
      
      const isTooFar = date > maxDate
      if (isPast || isTooFar) {
        isAvailable = false
      }
      
      const isSelected = selectedDate === dateStr

      let className = "calendar-day"
      if (isAvailable) {
        className += " available"
      } else {
        className += " disabled"
      }
      
      if (isSelected) className += " selected"

      days.push(
        <div 
          key={dateStr} 
          className={className}
          onClick={() => {
            if (isAvailable) {
              setSelectedDate(dateStr)
              setSelectedTime(null)
              if (step < 2) setStep(2)
            }
          }}
        >
          {i}
        </div>
      )
    }

    return (
      <div className="calendar-container" id="calendar-container" style={{ position: 'relative' }}>
        {isLoadingGas && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', borderRadius: '12px',
            fontWeight: 'bold', color: 'var(--primary)'
          }}>
            予約状況を取得中...
          </div>
        )}
        <div className="calendar-header">
          <button type="button" id="prev-month" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>&lt;</button>
          <h4 id="calendar-month-year">{year}年{month + 1}月</h4>
          <button type="button" id="next-month" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>&gt;</button>
        </div>
        <div className="calendar-days-header">
          <div className="text-red-500">日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div className="text-blue-500">土</div>
        </div>
        <div className="calendar-grid" id="calendar-grid">
          {days}
        </div>
      </div>
    )
  }

  const renderTimeSlots = () => {
    if (!selectedDate) return null
    const blocked = getBlockedSlots(selectedDate)

    return (
      <div className="selection-grid time-grid" id="time-grid">
        {timeSlots.map(time => {
          const isBlocked = blocked.includes(time)
          
          let className = "select-btn time-btn"
          if (isBlocked) className += " disabled-step"
          if (selectedTime === time) className += " selected"

          // Also check past time on the current day
          let isPast = false
          if (selectedDate) {
            const now = new Date()
            const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
            if (selectedDate === todayStr) {
              const currentH = now.getHours()
              const currentM = now.getMinutes()
              const [th, tm] = time.split(':').map(Number)
              if (th < currentH || (th === currentH && tm <= currentM)) {
                isPast = true
              }
            }
          }

          if (isPast) {
             className += " disabled-step"
          }

          // メニューが先に選ばれている場合、そのメニューが入らない開始時刻は選べない
          const isMenuConflict = selectedMenu ? !isMenuAvailableAt(selectedDate, time, selectedMenu) : false
          if (isMenuConflict) {
             className += " disabled-step"
          }

          const isDisabled = isBlocked || isPast || isMenuConflict

          return (
            <button
              key={time}
              className={className}
              disabled={isDisabled}
              onClick={() => {
                setSelectedTime(time)
                // 時刻変更で選択中メニューが入らなくなったら、選択を取り消す
                if (selectedMenu && selectedDate && !isMenuAvailableAt(selectedDate, time, selectedMenu)) {
                  setSelectedMenu(null)
                }
                if (step < 3) setStep(3)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {time}
            </button>
          )
        })}
      </div>
    )
  }

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime || !selectedMenu) {
      alert("日時とメニューを選択してください。")
      return
    }
    if (!isMenuAvailableAt(selectedDate, selectedTime, selectedMenu)) {
      alert("選択したメニューはその時間帯では予約できません。日時またはメニューを選び直してください。")
      return
    }
    setIsSubmitting(true)

    const res = await createReservation({
      name, phone, email, notes, date: selectedDate, time: selectedTime, menu: selectedMenu.name
    })

    setIsSubmitting(false)
    if (res.success) {
      router.push(`/complete?id=${res.id}`)
    } else {
      alert(res.message || "エラーが発生しました。もう一度お試しください。")
    }
  }

  return (
    <section className="cta-section" id="booking" style={{ paddingTop: '80px' }}>
      <div className="container">
        <div className="text-center" id="booking-intro" style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <a href="/" className="back-link" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
              ホームに戻る
            </a>
          </div>
          <h1 className="page-title" style={{ marginBottom: '12px', fontSize: '1.8rem' }}>ご予約</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>日付・時間・メニューを選んで、お客様情報をご入力ください。</p>
        </div>

        <div id="booking-flow" className="booking-flow" style={{ display: 'block' }}>
          <div className="step-container" id="step-1">
            <h3>① 日付を選択</h3>
            {renderCalendar()}
          </div>

          {step >= 2 && selectedDate && (
            <div className={`step-container ${step >= 2 ? 'visible-step' : 'hidden-step'}`} id="step-2">
              <h3>② 時間を選択</h3>
              {renderTimeSlots()}
            </div>
          )}

          {step >= 3 && selectedTime && (
            <div className={`step-container ${step >= 3 ? 'visible-step' : 'hidden-step'}`} id="step-3">
              <h3>③ メニューを選択</h3>
              <div id="booking-menu-container">
                <MenuGroups
                  menus={menus}
                  mode="booking"
                  selectedMenuId={selectedMenu?.id ?? null}
                  onSelectMenu={(m) => {
                    const found = menus.find(x => x.id === m.id)
                    if (found) {
                      setSelectedMenu(found)
                      if (step < 4) setStep(4)
                    }
                  }}
                  isMenuDisabled={(m) => {
                    if (selectedTime && selectedDate) {
                      const found = menus.find(x => x.id === m.id)
                      return found ? !isMenuAvailableAt(selectedDate, selectedTime, found) : false
                    }
                    return false
                  }}
                />
              </div>
            </div>
          )}

          {step >= 4 && selectedMenu && (
            <div className={`step-container ${step >= 4 ? 'visible-step' : 'hidden-step'}`} id="step-4">
              <h3>④ お客様情報のご入力</h3>
              <div className="form-wrapper">
                <div className="summary-box">
                  <h4>選択内容</h4>
                  <p>日時: <span id="summary-datetime">{selectedDate} {selectedTime}</span></p>
                  <p>メニュー: <span id="summary-menu">{selectedMenu.name} (¥{parseInt(selectedMenu.price).toLocaleString()})</span></p>
                </div>
                <form id="final-booking-form" onSubmit={submitReservation}>
                  <div className="form-group">
                    <label htmlFor="cust-name">お名前 <span className="required">必須</span></label>
                    <input type="text" id="cust-name" required value={name} onChange={e=>setName(e.target.value)} placeholder="" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cust-phone">電話番号 <span className="required">必須</span></label>
                    <input type="tel" id="cust-phone" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="例: 09012345678（ハイフンなし）" pattern="^[0-9]+$" title="ハイフンなしの半角数字のみで入力してください" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cust-email">メールアドレス <span className="required">必須</span></label>
                    <input type="email" id="cust-email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cust-notes">備考・ご要望</label>
                    <textarea id="cust-notes" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder=""></textarea>
                  </div>
                  <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? '送信中...' : '予約を確定する'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
