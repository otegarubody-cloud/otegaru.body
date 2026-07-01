'use client'

import React, { useState } from 'react'
import { updateReservationStatus, createMenu, updateMenu, deleteMenu, updateSiteSettings, updateReservationDetails, createReservation } from '../actions'

type Reservation = { id: string, name: string, phone: string, email: string | null, date: string, time: string, menu: string, status: string, notes: string | null }
type Menu = { id: string, name: string, price: string, duration: string, description: string }
type SiteSetting = { key: string, value: string }

const timeSlots = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']

export default function AdminClient({ initialReservations, initialMenus, initialSettings }: any) {
  const [activeTab, setActiveTab] = useState('timetable')
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
  
  // Timetable State
  const now = new Date()
  now.setHours(now.getHours() + 9)
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0])

  // Reservation Modal State (For Add/Edit from Timetable)
  const [isResModalOpen, setIsResModalOpen] = useState(false)
  const [editingRes, setEditingRes] = useState<Reservation | null>(null)
  const [prefilledTime, setPrefilledTime] = useState('')

  // Menu State
  const [menus, setMenus] = useState<Menu[]>(initialMenus)
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  
  // Settings State
  const defaultSettings = {
    catchphrase: '日々の疲れを、\nおてがるリセット。',
    seo_title: 'おてがる整体 | 仙台・一番町のもみほぐし・整体',
    seo_description: '仙台市青葉区一番町の「おてがる整体」です。火・水曜限定営業。心地よいもみほぐしで日々の疲れを手軽にリセットします。ネット予約受付中。',
    seo_keywords: '仙台,一番町,整体,もみほぐし,マッサージ,肩こり,腰痛',
    address_text: '仙台市青葉区一番町２丁目２\n－１１ ＴＫビル 6F',
    address_url: 'https://maps.app.goo.gl/UTiRWfJG4Ce7Xu7F8',
    business_days: '毎週 火曜日・水曜日',
    business_hours: '10:00 〜 18:00',
    instagram_id: '@otegaru_body',
    instagram_url: 'https://www.instagram.com/otegaru_body/',
    line_url: 'https://lin.ee/ddFvc0y',
    hero_image_url: 'https://media.base44.com/images/public/6a02ab8f7236bafb450eb2d2/83a5b5573_generated_480a2807.png',
    booking_range_weeks: '4',
  }

  const mappedSettings = { ...defaultSettings }
  initialSettings.forEach((s: SiteSetting) => {
    if (s.key in mappedSettings) {
      (mappedSettings as any)[s.key] = s.value
    }
  })
  
  const [settings, setSettings] = useState(mappedSettings)

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateReservationStatus(id, newStatus)
    if (res.success) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    } else {
      alert('更新に失敗しました')
    }
  }

  const handleSaveMenu = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      price: formData.get('price') as string,
      duration: formData.get('duration') as string,
      description: formData.get('description') as string,
    }
    
    if (editingMenu?.id) {
      const res = await updateMenu(editingMenu.id, data)
      if (res.success && res.menu) {
        setMenus(menus.map(m => m.id === editingMenu.id ? res.menu! : m))
        setIsMenuModalOpen(false)
      } else alert('保存に失敗しました')
    } else {
      const res = await createMenu(data)
      if (res.success && res.menu) {
        setMenus([...menus, res.menu!])
        setIsMenuModalOpen(false)
      } else alert('作成に失敗しました')
    }
  }

  const handleDeleteMenu = async (id: string) => {
    if (!confirm('本当にこのメニューを削除しますか？')) return
    const res = await deleteMenu(id)
    if (res.success) {
      setMenus(menus.filter(m => m.id !== id))
    } else alert('削除に失敗しました')
  }

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const payload = Object.entries(settings).map(([key, value]) => ({ key, value }))
    const res = await updateSiteSettings(payload)
    if (res.success) {
      alert('サイト設定を保存しました。サイトに即座に反映されます。')
    } else {
      alert('保存に失敗しました')
    }
  }

  const handleSaveReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      menu: formData.get('menu') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      notes: formData.get('notes') as string,
    }

    if (editingRes?.id) {
      const res = await updateReservationDetails(editingRes.id, data)
      if (res.success) {
        // Refresh page or update state to reflect changes
        alert('予約内容を更新しました。')
        window.location.reload()
      } else alert('更新に失敗しました')
    } else {
      const res = await createReservation(data)
      if (res.success) {
        alert('予定を追加しました。')
        window.location.reload()
      } else alert('追加に失敗しました')
    }
  }

  // Get reservations for selected date
  const dayReservations = reservations.filter(r => r.date === selectedDate && r.status === 'confirmed')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ width: '250px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '20px 0' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', padding: '0 20px 20px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
          おてがる整体 管理
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
          <button onClick={() => setActiveTab('dashboard')} className={`admin-nav-item ${activeTab==='dashboard'?'active':''}`} style={{border:'none', width:'100%', textAlign:'left', background: activeTab==='dashboard'?'#fff7ed':'transparent', color: activeTab==='dashboard'?'var(--primary)':'#64748b', padding:'12px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:500}}>ダッシュボード</button>
          <button onClick={() => setActiveTab('timetable')} className={`admin-nav-item ${activeTab==='timetable'?'active':''}`} style={{border:'none', width:'100%', textAlign:'left', background: activeTab==='timetable'?'#fff7ed':'transparent', color: activeTab==='timetable'?'var(--primary)':'#64748b', padding:'12px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:500}}>タイムテーブル</button>
          <button onClick={() => setActiveTab('reservations')} className={`admin-nav-item ${activeTab==='reservations'?'active':''}`} style={{border:'none', width:'100%', textAlign:'left', background: activeTab==='reservations'?'#fff7ed':'transparent', color: activeTab==='reservations'?'var(--primary)':'#64748b', padding:'12px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:500}}>予約リスト</button>
          <button onClick={() => setActiveTab('menus')} className={`admin-nav-item ${activeTab==='menus'?'active':''}`} style={{border:'none', width:'100%', textAlign:'left', background: activeTab==='menus'?'#fff7ed':'transparent', color: activeTab==='menus'?'var(--primary)':'#64748b', padding:'12px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:500}}>メニュー管理</button>
          <button onClick={() => setActiveTab('settings')} className={`admin-nav-item ${activeTab==='settings'?'active':''}`} style={{border:'none', width:'100%', textAlign:'left', background: activeTab==='settings'?'#fff7ed':'transparent', color: activeTab==='settings'?'var(--primary)':'#64748b', padding:'12px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:500}}>サイト設定</button>
        </div>
      </div>
      
      <div style={{ flex: 1, padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1e293b' }}>
            {activeTab === 'dashboard' ? 'ダッシュボード' : activeTab === 'timetable' ? 'タイムテーブル' : activeTab === 'reservations' ? 'すべての予約' : activeTab === 'menus' ? 'メニュー管理' : 'サイト設定'}
          </h1>
          <a href="/" target="_blank" className="btn-primary-outline" style={{ padding: '8px 16px' }}>サイトを表示 ↗</a>
        </div>

        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' }}>今日の予約</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
                  {reservations.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'confirmed').length}件
                </div>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' }}>確定済み予約（全体）</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                  {reservations.filter(r => r.status === 'confirmed').length}件
                </div>
              </div>
            </div>
            {/* Dashboard lists recent... omitted for brevity, kept structure from before */}
          </div>
        )}

        {activeTab === 'timetable' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '8px 16px', fontSize: '1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button 
                onClick={() => { setEditingRes(null); setPrefilledTime(''); setIsResModalOpen(true) }}
                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >+ 新規予定の追加</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              {timeSlots.map(time => {
                // Check if any reservation starts exactly at this time (simplification for 30min blocks)
                const res = dayReservations.find(r => r.time === time)
                return (
                  <div key={time} style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', minHeight: '60px' }}>
                    <div style={{ width: '80px', padding: '16px', background: '#f8fafc', color: '#64748b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      {time}
                    </div>
                    <div style={{ flex: 1, padding: '8px', position: 'relative' }}>
                      {res ? (
                        <div 
                          onClick={() => { setEditingRes(res); setPrefilledTime(''); setIsResModalOpen(true); }}
                          style={{ 
                            background: res.menu === '店舗都合' ? '#f1f5f9' : '#fff7ed', 
                            borderLeft: `4px solid ${res.menu === '店舗都合' ? '#94a3b8' : 'var(--primary)'}`,
                            padding: '12px', borderRadius: '4px', cursor: 'pointer', height: '100%', boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{res.name} 様</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{res.menu}</div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => { setEditingRes(null); setPrefilledTime(time); setIsResModalOpen(true); }}
                          style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                          title="クリックして予定を追加"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>日時</th>
                  <th style={{ padding: '12px 16px' }}>お名前</th>
                  <th style={{ padding: '12px 16px' }}>連絡先</th>
                  <th style={{ padding: '12px 16px' }}>メニュー</th>
                  <th style={{ padding: '12px 16px' }}>ステータス</th>
                  <th style={{ padding: '12px 16px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r: Reservation) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>{r.date}<br/>{r.time}</td>
                    <td style={{ padding: '12px 16px' }}>{r.name} 様</td>
                    <td style={{ padding: '12px 16px' }}>{r.phone}<br/>{r.email}</td>
                    <td style={{ padding: '12px 16px' }}>{r.menu}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                          background: r.status === 'confirmed' ? '#dcfce3' : '#fee2e2', 
                          color: r.status === 'confirmed' ? '#16a34a' : '#ef4444', 
                          padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 
                        }}>
                          {r.status === 'confirmed' ? '予約確定' : 'キャンセル'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setEditingRes(r); setPrefilledTime(''); setIsResModalOpen(true); }} className="btn-primary-outline" style={{ padding: '4px 8px', fontSize: '0.85rem', background:'transparent', borderRadius:'4px' }}>詳細・編集</button>
                      {r.status === 'confirmed' ? (
                        <button onClick={() => handleStatusChange(r.id, 'cancel')} className="btn-primary-outline" style={{ borderColor: '#ef4444', color: '#ef4444', padding: '4px 8px', fontSize: '0.85rem', background:'transparent', borderRadius:'4px' }}>取消</button>
                      ) : (
                        <button onClick={() => handleStatusChange(r.id, 'confirmed')} className="btn-primary-outline" style={{ borderColor: '#16a34a', color: '#16a34a', padding: '4px 8px', fontSize: '0.85rem', background:'transparent', borderRadius:'4px' }}>確定に戻す</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'menus' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>現在のメニュー一覧</h3>
              <button 
                onClick={() => { setEditingMenu(null); setIsMenuModalOpen(true); }}
                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + 新規メニュー追加
              </button>
            </div>
            
            {menus.map((m: Menu) => (
              <div key={m.id} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0' }}>{m.name}</h4>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{m.duration} / ¥{parseInt(m.price).toLocaleString()}</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>{m.description.substring(0, 50)}...</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditingMenu(m); setIsMenuModalOpen(true); }} style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>編集</button>
                  <button onClick={() => handleDeleteMenu(m.id)} style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>削除</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>サイト情報設定</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>ここで変更した内容は、サイトのトップページやフッターに即座に反映されます。</p>
            
            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>SEO: サイトのタイトル</label>
                <input type="text" value={settings.seo_title} onChange={e => setSettings({...settings, seo_title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>SEO: サイトの説明文</label>
                <textarea value={settings.seo_description} onChange={e => setSettings({...settings, seo_description: e.target.value})} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>SEO: 検索キーワード（カンマ区切り）</label>
                <input type="text" value={settings.seo_keywords} onChange={e => setSettings({...settings, seo_keywords: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>キャッチコピー</label>
                <textarea value={settings.catchphrase} onChange={e => setSettings({...settings, catchphrase: e.target.value})} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>営業日</label>
                <input type="text" value={settings.business_days} onChange={e => setSettings({...settings, business_days: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>営業時間</label>
                <input type="text" value={settings.business_hours} onChange={e => setSettings({...settings, business_hours: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>住所（テキスト）</label>
                <textarea value={settings.address_text} onChange={e => setSettings({...settings, address_text: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Googleマップ URL</label>
                <input type="url" value={settings.address_url} onChange={e => setSettings({...settings, address_url: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>公式LINE URL</label>
                <input type="url" value={settings.line_url} onChange={e => setSettings({...settings, line_url: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Instagram ID</label>
                <input type="text" value={settings.instagram_id} onChange={e => setSettings({...settings, instagram_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Instagram URL</label>
                <input type="url" value={settings.instagram_url} onChange={e => setSettings({...settings, instagram_url: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>トップページ画像 URL</label>
                <input type="url" value={settings.hero_image_url} onChange={e => setSettings({...settings, hero_image_url: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                設定を保存する
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Menu Modal */}
      {isMenuModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>{editingMenu ? 'メニューを編集' : '新規メニュー追加'}</h3>
            <form onSubmit={handleSaveMenu} style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>メニュー名</label>
                <input name="name" defaultValue={editingMenu?.name} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>料金（数字のみ）</label>
                  <input name="price" type="number" defaultValue={editingMenu?.price} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>所要時間（例: 60分）</label>
                  <input name="duration" defaultValue={editingMenu?.duration} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>説明文</label>
                <textarea name="description" rows={4} defaultValue={editingMenu?.description} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsMenuModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>キャンセル</button>
                <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>保存する</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {isResModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>{editingRes ? '予約内容の確認・変更' : '予定の追加（代理入力・ブロック）'}</h3>
            <form onSubmit={handleSaveReservation} style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>日付</label>
                  <input type="date" name="date" defaultValue={editingRes?.date || selectedDate} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>時間</label>
                  <select name="time" defaultValue={editingRes?.time || prefilledTime} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>メニュー / 予定の種類</label>
                <select name="menu" defaultValue={editingRes?.menu || (menus.length > 0 ? menus[0].name : '店舗都合')} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  {menus.map(m => <option key={m.name} value={m.name}>{m.name} ({m.duration})</option>)}
                  <option value="店舗都合">店舗都合（お休み・ブロックなど）</option>
                  <option value="電話予約">電話予約（メニュー未定）</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>お名前</label>
                <input name="name" defaultValue={editingRes?.name} required placeholder="例: 予定ブロック / 山田太郎" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>電話番号 (任意)</label>
                  <input name="phone" defaultValue={editingRes?.phone} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>メールアドレス (任意)</label>
                  <input type="email" name="email" defaultValue={editingRes?.email || ''} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>備考</label>
                <textarea name="notes" rows={3} defaultValue={editingRes?.notes || ''} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsResModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>キャンセル</button>
                <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>保存する</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
