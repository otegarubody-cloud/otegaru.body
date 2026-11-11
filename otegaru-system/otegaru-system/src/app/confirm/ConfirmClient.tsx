'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getReservationsByPhone, updateReservationStatus, rescheduleReservation } from '../actions'
import { BUFFER_MINUTES } from '../../lib/booking'

type Reservation = { id: string, name: string, phone: string, email: string | null, date: string, time: string, menu: string, status: string, notes: string | null }
type BlockingReservation = { id: string, date: string, time: string, status: string, menu: string | null }
type GasBusySlot = { date: string, start: string, end: string, title: string }
type GasDate = { date: string, status: string }

export default function ConfirmClient({
  availableDates,
  closedDates,
  existingReservations,
  gasBusySlots,
  gasDates,
  bookingRangeWeeks
}: {
  availableDates: string[]
  closedDates: string[]
  existingReservations: BlockingReservation[]
  gasBusySlots: GasBusySlot[]
  gasDates: GasDate[]
  bookingRangeWeeks: number
}) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])

  const [cancelModalRes, setCancelModalRes] = useState<Reservation | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const [changeTarget, setChangeTarget] = useState<Reservation | null>(null)
  const [newDate, setNewDate] = useState<string | null>(null)
  const [newTime, setNewTime] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isChanging, setIsChanging] = useState(false)

  // --- Availability helpers (duplicated from BookingClient; it does not export them) ---
  const timeSlots = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"]
  const CLOSE_MINUTES = 18 * 60

  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const toTimeString = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  // 所要時間はメニュー名（例: もみほぐし整体 60分（全身））から取り出す。予約フローと同じ方法
  const getMenuDuration = (menuName: string) => {
    const match = menuName.match(/(\d+)\s*分/)
    return match ? parseInt(match[1], 10) : 30
  }

  // 既存予約が占有する30分枠（所要時間 + 片付けバッファぶんまで）
  const getReservationBlockedSlots = (dateStr: string, excludeId?: string) => {
    const blocked: string[] = []
    existingReservations
      .filter(r => r.date === dateStr && r.status === 'confirmed' && r.id !== excludeId)
      .forEach(r => {
        blocked.push(r.time)
        const dur = getMenuDuration(r.menu || '')
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

    gasBusySlots.filter(b => b.date === dateStr).forEach(b => {
      const busyStart = toMinutes(b.start)
      const busyEnd = toMinutes(b.end)
      timeSlots.forEach(t => {
        const slotStart = toMinutes(t)
        if (slotStart < busyEnd && slotStart + 30 > busyStart && !blocked.includes(t)) {
          blocked.push(t)
        }
      })
    })

    return blocked
  }

  const getBlockedSlots = (dateStr: string, excludeId?: string) => {
    const blocked = getReservationBlockedSlots(dateStr, excludeId)
    getGasBlockedSlots(dateStr).forEach(slot => {
      if (!blocked.includes(slot)) blocked.push(slot)
    })
    return blocked
  }

  // その予約（メニュー固定）を、その日時に開始できるか
  // （施術終了が閉店時刻以内で、他の予約とは「施術+片付けバッファ」の占有が重ならず、
  //   Googleカレンダーの予定とは施術時間が重ならないこと）
  const isTimeAvailableFor = (r: Reservation, dateStr: string, time: string) => {
    const start = toMinutes(time)
    const end = start + getMenuDuration(r.menu)
    if (end > CLOSE_MINUTES) return false
    const reservationBlocked = getReservationBlockedSlots(dateStr, r.id)
    for (let t = start; t < end + BUFFER_MINUTES; t += 30) {
      if (reservationBlocked.includes(toTimeString(t))) return false
    }
    const gasBlocked = getGasBlockedSlots(dateStr)
    for (let t = start; t < end; t += 30) {
      if (gasBlocked.includes(toTimeString(t))) return false
    }
    return true
  }

  const isFutureReservation = (r: Reservation) => {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    if (r.date > todayStr) return true
    if (r.date < todayStr) return false
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return r.time > nowStr
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setHasSearched(false)

    const res = await getReservationsByPhone(phone)
    setIsLoading(false)
    setHasSearched(true)

    if (res.success) {
      setReservations(res.reservations)
    }
  }

  const confirmCancel = async () => {
    if (!cancelModalRes) return
    setIsCancelling(true)
    const res = await updateReservationStatus(cancelModalRes.id, 'cancel')
    setIsCancelling(false)

    if (res.success) {
      setReservations(prev => prev.map(r => r.id === cancelModalRes.id ? { ...r, status: 'cancel' } : r))
      setCancelModalRes(null)
      alert("予約をキャンセルしました。")
    } else {
      alert("エラーが発生しました。")
    }
  }

  const openChangeModal = (r: Reservation) => {
    setChangeTarget(r)
    setNewDate(r.date)
    setNewTime(r.time)
    const [y, m] = r.date.split('-').map(Number)
    setCurrentMonth(new Date(y, m - 1, 1))
  }

  const confirmReschedule = async () => {
    if (!changeTarget || !newDate || !newTime) return
    setIsChanging(true)
    const res = await rescheduleReservation(changeTarget.id, newDate, newTime)
    setIsChanging(false)

    if (res.success) {
      setChangeTarget(null)
      const refreshed = await getReservationsByPhone(phone)
      if (refreshed.success) {
        setReservations(refreshed.reservations)
      }
      router.refresh()
      alert("予約の日時を変更しました。")
    } else {
      alert(res.message || "エラーが発生しました。")
    }
  }

  const renderChangeCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

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
      // Googleカレンダー側で「営業」とされた日も営業日として扱う（休業の指定があればそちらが優先）
      if (gasDates.some(d => d.date === dateStr && d.status === '営業')) {
        isAvailable = true
      }
      if (closedDates.includes(dateStr) || gasDates.some(d => d.date === dateStr && d.status === '休業')) {
        isAvailable = false
      }

      const isTooFar = date > maxDate
      if (isPast || isTooFar) {
        isAvailable = false
      }

      const isSelected = newDate === dateStr

      let className = "calendar-day"
      className += isAvailable ? " available" : " disabled"
      if (isSelected) className += " selected"

      days.push(
        <div
          key={dateStr}
          className={className}
          onClick={() => {
            if (isAvailable) {
              setNewDate(dateStr)
              setNewTime(null)
            }
          }}
        >
          {i}
        </div>
      )
    }

    return (
      <div className="calendar-container" style={{ position: 'relative' }}>
        <div className="calendar-header">
          <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>&lt;</button>
          <h4>{year}年{month + 1}月</h4>
          <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>&gt;</button>
        </div>
        <div className="calendar-days-header">
          <div className="text-red-500">日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div className="text-blue-500">土</div>
        </div>
        <div className="calendar-grid">
          {days}
        </div>
      </div>
    )
  }

  const renderChangeTimeSlots = () => {
    if (!changeTarget || !newDate) return null
    const blocked = getBlockedSlots(newDate, changeTarget.id)

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    return (
      <div className="selection-grid time-grid">
        {timeSlots.map(time => {
          let isDisabled = blocked.includes(time)

          if (newDate === todayStr) {
            const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            if (time <= nowStr) isDisabled = true
          }

          // 終了時刻が閉店（18:00）を超える開始時刻は選べない
          if (!isTimeAvailableFor(changeTarget, newDate, time)) isDisabled = true

          let className = "select-btn time-btn"
          if (isDisabled) className += " disabled-step"
          if (newTime === time) className += " selected"

          return (
            <button
              key={time}
              type="button"
              className={className}
              disabled={isDisabled}
              onClick={() => setNewTime(time)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {time}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <section className="page-section" style={{ padding: '100px 0', background: '#f9fafb', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '600px' }}>
        <a href="/" className="back-link" style={{ display: 'inline-block', marginBottom: '20px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>&larr; ホームに戻る</a>
        <h1 className="page-title" style={{ marginBottom: '8px', fontSize: '1.5rem', textAlign: 'left' }}>予約確認</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem', textAlign: 'left' }}>ご予約時の電話番号で、予約内容の確認・日時の変更・キャンセルができます。</p>

        <form id="confirm-form" onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '32px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="search-phone" className="sr-only" style={{ display: 'none' }}>電話番号</label>
            <input
              type="tel"
              id="search-phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="電話番号を入力（ハイフンなし）"
              pattern="^[0-9]+$"
              title="ハイフンなしの半角数字のみで入力してください"
              style={{ width: '100%', padding: '14px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', marginBottom: 0, fontFamily: 'inherit', outline: 'none', background: 'transparent', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          <button type="submit" className="btn-submit" id="search-btn" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: 'auto', padding: '14px 32px', whiteSpace: 'nowrap', marginTop: 0, borderRadius: '8px', opacity: isLoading ? 0.7 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            {isLoading ? '検索中...' : '検索'}
          </button>
        </form>

        {hasSearched && (
          <div id="search-result" style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px' }} id="result-title">予約一覧</h2>

            <div id="reservation-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reservations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>該当する予約は見つかりませんでした。</p>
              ) : (
                reservations.map(r => (
                  <div key={r.id} className="reservation-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>来店予定日時</span>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{r.date} {r.time}</div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, ...r.status === 'confirmed' ? { background: '#dcfce3', color: '#16a34a' } : { background: '#f3f4f6', color: '#6b7280' } }}>
                        {r.status === 'confirmed' ? '予約確定' : 'キャンセル済'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '20px', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex' }}><span style={{ color: '#6b7280', width: '80px' }}>メニュー</span><span style={{ fontWeight: 500 }}>{r.menu}</span></div>
                      <div style={{ display: 'flex' }}><span style={{ color: '#6b7280', width: '80px' }}>お名前</span><span style={{ fontWeight: 500 }}>{r.name} 様</span></div>
                    </div>
                    {r.status === 'confirmed' && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {isFutureReservation(r) && (
                          <button
                            className="show-change-modal-btn"
                            onClick={() => openChangeModal(r)}
                            style={{
                              display: 'flex',
                              background: 'white',
                              border: '1px solid var(--primary)',
                              color: 'var(--primary)',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff7ed'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            日時を変更
                          </button>
                        )}
                        <button
                          className="show-cancel-modal-btn"
                          onClick={() => setCancelModalRes(r)}
                          style={{
                            display: 'flex',
                            background: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                          キャンセル
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {cancelModalRes && (
        <div id="cancel-modal" className="modal-overlay show">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h3 className="modal-title" style={{ fontSize: '1.2rem', marginBottom: '12px' }}>予約をキャンセルしますか？</h3>
            <p className="modal-desc" style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {cancelModalRes.date} {cancelModalRes.time}<br />
              この操作は取り消せません。<br />本当にキャンセルしてよろしいですか？
            </p>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn-cancel" style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontWeight: 500 }} onClick={() => setCancelModalRes(null)}>戻る</button>
              <button className="btn-destructive" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 500 }} onClick={confirmCancel} disabled={isCancelling}>
                {isCancelling ? '処理中...' : 'キャンセルする'}
              </button>
            </div>
          </div>
        </div>
      )}

      {changeTarget && (
        <div id="change-modal" className="modal-overlay show">
          <div className="modal-content" style={{ textAlign: 'left', maxWidth: '560px', width: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="modal-title" style={{ fontSize: '1.2rem', marginBottom: '8px', textAlign: 'center' }}>日時を変更</h3>
            <p className="modal-desc" style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: 1.5, textAlign: 'center' }}>
              {changeTarget.menu}<br />
              現在：{changeTarget.date} {changeTarget.time}
            </p>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>① 新しい日付を選択</h4>
            {renderChangeCalendar()}

            {newDate && (
              <>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '24px 0 12px' }}>② 新しい時間を選択</h4>
                {renderChangeTimeSlots()}
              </>
            )}

            {newDate && newTime && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 16px', marginTop: '24px', fontSize: '0.95rem' }}>
                変更後の日時：<strong>{newDate} {newTime}</strong>
              </div>
            )}

            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn-cancel" style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontWeight: 500 }} onClick={() => setChangeTarget(null)}>戻る</button>
              <button
                className="btn-submit"
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 600, width: 'auto', marginTop: 0, opacity: (!newDate || !newTime || isChanging) ? 0.6 : 1 }}
                onClick={confirmReschedule}
                disabled={!newDate || !newTime || isChanging}
              >
                {isChanging ? '処理中...' : '変更する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
