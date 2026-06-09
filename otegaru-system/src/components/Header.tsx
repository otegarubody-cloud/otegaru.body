'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (pathname.startsWith('/admin')) {
    return null // Admin uses its own layout
  }

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <Link href="/" className="logo">
          <img src="/logo.png" alt="おてがる整体ロゴ" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          おてがる整体
        </Link>
        <nav className="nav">
          <Link href="/" style={pathname === '/' ? { color: 'var(--primary)' } : {}}>ホーム</Link>
          <Link href="/booking" style={pathname === '/booking' ? { color: 'var(--primary)' } : {}}>ご予約</Link>
          <Link href="/confirm">予約確認</Link>
          <Link href="/booking" className="btn-primary-small">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="12" y1="14" x2="12" y2="18"></line><line x1="10" y1="16" x2="14" y2="16"></line></svg>
            予約する
          </Link>
        </nav>
      </div>
    </header>
  )
}
