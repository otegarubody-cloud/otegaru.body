import { PrismaClient } from '@prisma/client'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import MenuGroups from '../MenuGroups'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const menus = await prisma.menu.findMany()

  const durationOf = (m: { duration: string }) => {
    const n = parseInt((m.duration || '').replace(/[^0-9]/g, ''), 10)
    return Number.isNaN(n) ? 999 : n
  }
  const sortedMenus = [...menus].sort((a, b) => {
    const aFull = a.name.includes('全身') ? 0 : 1
    const bFull = b.name.includes('全身') ? 0 : 1
    if (aFull !== bFull) return aFull - bFull
    return aFull === 0 ? durationOf(a) - durationOf(b) : 0
  })

  const plainMenus = sortedMenus.map(m => ({
    id: m.id,
    name: m.name,
    price: m.price,
    duration: m.duration,
    description: m.description,
  }))

  return (
    <>
      <Header />

      <div className="home menu-page">
        <section className="menu-section">
          <div className="container">
            <div className="text-center section-heading">
              <h1 className="section-title">施術メニュー</h1>
              <p className="subtitle">お悩みに合わせてお選びいただけます</p>
            </div>
            <MenuGroups menus={plainMenus} />
          </div>
        </section>
      </div>

      <Footer />
    </>
  )
}
