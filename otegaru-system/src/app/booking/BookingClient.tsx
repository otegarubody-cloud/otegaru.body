'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createReservation } from '../actions'

type Menu = { id: string, name: string, price: string, duration: string, description: string }
type Reservation = { date: string, time: string, status: string, menu?: string }
type GasBusySlot = { date: string, start: string, end: string, title: string }

export default function BookingClient({
  menus,
  availableDates,
  closedDates,
  existingReservations
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

  const getBlockedSlots = (dateStr: string) => {
    const blocked: string[] = []
    const confirmedOnDate = existingReservations.filter(r => r.date === dateStr && r.status === 'confirmed')
    
    confirmedOnDate.forEach(r => {
      blocked.push(r.time)
      if (r.menu?.includes('60分') || r.menu?.includes('40分')) {
        const [h, m] = r.time.split(':').map(Number)
        let nextH = h
        let nextM = m + 30
        if (nextM >= 60) {
          nextH += 1
          nextM -= 60
        }
        const nextTime = `${nextH.toString().padStart(2, '0')}:${nextM === 0 ? '00' : '30'}`
        blocked.push(nextTime)
      }
    })

    // Also block slots based on Google Calendar busy slots
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

          const isDisabled = isBlocked || isPast

          return (
            <button
              key={time}
              className={className}
              disabled={isDisabled}
              onClick={() => {
                setSelectedTime(time)
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
    setIsSubmitting(true)

    const res = await createReservation({
      name, phone, email, notes, date: selectedDate, time: selectedTime, menu: selectedMenu.name
    })

    setIsSubmitting(false)
    if (res.success) {
      router.push(`/complete?id=${res.id}`)
    } else {
      alert("エラーが発生しました。もう一度お試しください。")
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
              <div className="selection-grid booking-menu-grid" id="booking-menu-container">
                {menus.map((m, idx) => {
                  let svgPath = ""
                  if (idx === 0) svgPath = '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>'
                  else if (idx === 1) svgPath = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>'
                  else if (idx === 2) svgPath = '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2s5 1 7 2a1 1 0 0 1 1 1z"></path>'
                  else svgPath = '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path>'

                  let isMenuDisabled = false
                  let requiresTwoSlots = m.name.includes('60分') || m.name.includes('40分') || m.duration.includes('60') || m.duration.includes('40')
                  
                  if (requiresTwoSlots && selectedTime && selectedDate) {
                    const blocked = getBlockedSlots(selectedDate)
                    const [h, min] = selectedTime.split(':').map(Number)
                    let nextH = h
                    let nextM = min + 30
                    if (nextM >= 60) {
                      nextH += 1
                      nextM -= 60
                    }
                    const nextTime = `${nextH.toString().padStart(2, '0')}:${nextM === 0 ? '00' : '30'}`
                    
                    if (blocked.includes(nextTime) || !timeSlots.includes(nextTime)) {
                      isMenuDisabled = true
                    }
                  }

                  let btnClass = `select-btn menu-btn ${selectedMenu?.id === m.id ? 'selected' : ''}`
                  if (isMenuDisabled) btnClass += ' disabled-step'

                  return (
                    <button 
                      key={m.id}
                      className={btnClass}
                      disabled={isMenuDisabled}
                      onClick={() => {
                        setSelectedMenu(m)
                        if (step < 4) setStep(4)
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" dangerouslySetInnerHTML={{ __html: svgPath }}></svg>
                      <strong>{m.name}</strong>
                      <span style={{ fontSize: '0.8rem' }}>¥{parseInt(m.price).toLocaleString()} ({m.duration})</span>
                      {isMenuDisabled && <span style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>この時間帯は予約枠が足りません</span>}
                    </button>
                  )
                })}
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
