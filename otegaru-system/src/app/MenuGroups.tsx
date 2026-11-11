'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export type MgMenu = { id: string, name: string, price: string, duration: string, description: string }

type Chip = { key: string, minutes: number, price: string, menus: MgMenu[] }
type GroupKey = 'full' | 'partial'

const durationMinutes = (m: MgMenu) => {
  const match = (m.duration || '').match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

const formatPrice = (price: string) => `¥${parseInt(price).toLocaleString()}`

const FullBodyIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="4.8" r="2.1"></circle>
    <path d="M12 7.5v5.5"></path>
    <path d="M6.5 10 12 8.6l5.5 1.4"></path>
    <path d="M9.3 20.5 12 13l2.7 7.5"></path>
  </svg>
)

const PartialIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="7" r="3.2"></circle>
    <path d="M4.5 20.5c1.4-3.9 4-5.7 7.5-5.7s6.1 1.8 7.5 5.7"></path>
  </svg>
)

export default function MenuGroups({
  menus,
  mode = 'page',
  selectedMenuId = null,
  onSelectMenu,
  isMenuDisabled,
}: {
  menus: MgMenu[]
  mode?: 'page' | 'booking'
  selectedMenuId?: string | null
  onSelectMenu?: (menu: MgMenu) => void
  isMenuDisabled?: (menu: MgMenu) => boolean
}) {
  const booking = mode === 'booking'

  const { fullChips, partialChips } = useMemo(() => {
    const toChips = (list: MgMenu[]): Chip[] => {
      const byMinutes = new Map<number, MgMenu[]>()
      list.forEach(m => {
        const mins = durationMinutes(m)
        if (!byMinutes.has(mins)) byMinutes.set(mins, [])
        byMinutes.get(mins)!.push(m)
      })
      return [...byMinutes.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([mins, ms]) => ({ key: String(mins), minutes: mins, price: ms[0].price, menus: ms }))
    }
    const full = menus
      .filter(m => m.name.includes('全身'))
      .sort((a, b) => durationMinutes(a) - durationMinutes(b))
    const partial = menus.filter(m => !m.name.includes('全身'))
    return { fullChips: toChips(full), partialChips: toChips(partial) }
  }, [menus])

  const locateMenu = (id: string | null): { group: GroupKey, key: string } | null => {
    if (!id) return null
    for (const chip of fullChips) {
      if (chip.menus.some(m => m.id === id)) return { group: 'full', key: chip.key }
    }
    for (const chip of partialChips) {
      if (chip.menus.some(m => m.id === id)) return { group: 'partial', key: chip.key }
    }
    return null
  }

  const [open, setOpen] = useState<{ full: string | null, partial: string | null }>(() => {
    const sel = locateMenu(selectedMenuId)
    if (booking) {
      // 予約モードではデフォルトで開かない。「選んだ」と誤解されないよう、
      // 詳細はタップして初めて出し、選択済みのものがある時だけそれを開く。
      return {
        full: sel?.group === 'full' ? sel.key : null,
        partial: sel?.group === 'partial' ? sel.key : null,
      }
    }
    const sixty = fullChips.find(c => c.minutes === 60)
    return {
      full: sel?.group === 'full' ? sel.key : (sixty ? sixty.key : (fullChips[0]?.key ?? null)),
      partial: sel?.group === 'partial' ? sel.key : null,
    }
  })

  // 選択中メニュー（autoMenu の事前選択など）が変わったら、そのチップを開く
  useEffect(() => {
    const sel = locateMenu(selectedMenuId)
    if (sel) {
      setOpen(prev => ({ ...prev, [sel.group]: sel.key }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenuId])

  const chipDisabled = (chip: Chip) =>
    booking && chip.menus.every(m => isMenuDisabled ? isMenuDisabled(m) : false)

  const handleChipClick = (group: GroupKey, chip: Chip) => {
    if (booking) {
      if (chip.menus.length === 1) {
        // 単一コースのチップ：タップで詳細を開く。選んだ時間に入るコースなら
        // そのまま選択もする。入らないコースは読むためだけに開き、選択しない
        // （オレンジにも「選択中」タグも付けない）。
        const menu = chip.menus[0]
        setOpen(prev => ({ ...prev, [group]: chip.key }))
        if (!(isMenuDisabled && isMenuDisabled(menu))) {
          onSelectMenu?.(menu)
        }
        return
      }
      // 複数コースを持つチップ（30分）は開閉のみ。選択は各行のボタンから
      setOpen(prev => ({ ...prev, [group]: prev[group] === chip.key ? null : chip.key }))
      return
    }
    if (chipDisabled(chip)) return
    // ページモードは開閉のみ
    setOpen(prev => ({ ...prev, [group]: prev[group] === chip.key ? null : chip.key }))
  }

  const renderDetail = (chip: Chip) => {
    if (!booking) {
      return (
        <div className="mg-detail">
          {chip.menus.map(m => (
            <div className="mg-detail-item" key={m.id}>
              <h4 className="mg-detail-name">{m.name}</h4>
              <p className="mg-detail-meta">{m.duration} <span aria-hidden="true">•</span> {formatPrice(m.price)}</p>
              <p className="mg-detail-desc">{m.description}</p>
              <Link href={`/booking?autoMenu=${encodeURIComponent(m.name)}`} className="mg-book-btn">予約する</Link>
            </div>
          ))}
        </div>
      )
    }

    if (chip.menus.length === 1) {
      const m = chip.menus[0]
      const disabled = isMenuDisabled ? isMenuDisabled(m) : false
      return (
        <div className="mg-detail">
          <div className="mg-detail-item">
            <h4 className="mg-detail-name">{m.name}</h4>
            <p className="mg-detail-meta">{m.duration} <span aria-hidden="true">•</span> {formatPrice(m.price)}{selectedMenuId === m.id && <span className="mg-selected-tag">選択中</span>}</p>
            <p className="mg-detail-desc" style={{ marginBottom: 0 }}>{m.description}</p>
            {disabled && <p className="mg-unavailable">この時間帯は予約枠が足りません</p>}
          </div>
        </div>
      )
    }

    return (
      <div className="mg-detail">
        {chip.menus.map(m => {
          const disabled = isMenuDisabled ? isMenuDisabled(m) : false
          const selected = selectedMenuId === m.id
          return (
            <button
              type="button"
              key={m.id}
              className={`mg-course-row ${selected ? 'selected' : ''}`}
              disabled={disabled}
              onClick={() => onSelectMenu?.(m)}
            >
              <span className="mg-course-row-head">
                <span className="mg-detail-name">{m.name}</span>
              </span>
              <span className="mg-detail-meta">{m.duration} <span aria-hidden="true">•</span> {formatPrice(m.price)}{selected && <span className="mg-selected-tag">選択中</span>}</span>
              <span className="mg-course-row-desc">{m.description}</span>
              {disabled && <span className="mg-unavailable">この時間帯は予約枠が足りません</span>}
            </button>
          )
        })}
      </div>
    )
  }

  const renderGroup = (group: GroupKey, title: string, subtitle: string, icon: React.ReactNode, chips: Chip[]) => {
    const openChip = chips.find(c => c.key === open[group]) ?? null
    return (
      <div className="mg-group" key={group}>
        <div className="mg-group-head">
          <div className="mg-group-icon">{icon}</div>
          <div className="mg-group-divider" aria-hidden="true"></div>
          <div className="mg-group-head-text">
            <h3 className="mg-group-title">{title}</h3>
            <p className="mg-group-sub">{subtitle}</p>
          </div>
        </div>
        <div className={`mg-chips ${group === 'full' ? 'mg-chips-4' : 'mg-chips-2'}`}>
          {chips.map(chip => {
            const disabled = chipDisabled(chip)
            const isOpen = open[group] === chip.key
            const isSelected = booking && chip.menus.some(m => m.id === selectedMenuId)
            return (
              <button
                type="button"
                key={chip.key}
                className={`mg-chip ${isOpen ? 'open' : ''} ${isSelected ? 'selected' : ''} ${disabled ? 'unavailable' : ''}`}
                aria-expanded={isOpen}
                aria-disabled={disabled || undefined}
                onClick={() => handleChipClick(group, chip)}
              >
                <span className="mg-chip-top">{chip.minutes}分</span>
                <span className="mg-chip-price">{formatPrice(chip.price)}</span>
              </button>
            )
          })}
        </div>
        {openChip && renderDetail(openChip)}
      </div>
    )
  }

  return (
    <div className={`mg-wrap${booking ? ' mg-booking' : ''}`}>
      {renderGroup('full', 'もみほぐし整体（全身）', '全身をしっかりほぐす、人気のスタンダードコース', FullBodyIcon, fullChips)}
      {renderGroup('partial', 'おてがる整体', 'すきま時間に、気になる部分をリフレッシュ', PartialIcon, partialChips)}
    </div>
  )
}
