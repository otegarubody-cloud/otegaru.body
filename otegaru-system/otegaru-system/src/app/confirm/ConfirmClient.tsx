'use client'

import React, { useState } from 'react'
import { getReservationsByPhone, updateReservationStatus } from '../actions'

type Reservation = { id: string, name: string, phone: string, email: string | null, date: string, time: string, menu: string, status: string, notes: string | null }

export default function ConfirmClient() {
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  
  const [cancelModalRes, setCancelModalRes] = useState<Reservation | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

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

  return (
    <section className="page-section" style={{ padding: '100px 0', background: '#f9fafb', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '600px' }}>
        <a href="/" className="back-link" style={{ display: 'inline-block', marginBottom: '20px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>&larr; ホームに戻る</a>
        <h1 className="page-title" style={{ marginBottom: '8px', fontSize: '1.5rem', textAlign: 'left' }}>予約確認</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem', textAlign: 'left' }}>ご予約時の電話番号で、予約内容を確認・キャンセルできます。</p>
        
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
                      <div style={{ display: 'flex', gap: '12px' }}>
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
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor='#fef2f2'} 
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor='transparent'}
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
              {cancelModalRes.date} {cancelModalRes.time}<br/>
              この操作は取り消せません。<br/>本当にキャンセルしてよろしいですか？
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
    </section>
  )
}
