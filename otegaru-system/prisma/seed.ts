import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const menus = [
    { name: '全身整体（60分）', price: '6000', duration: '60分', description: '頭から足先まで全身をじっくりほぐします。慢性的な疲れやコリに。' },
    { name: '上半身集中（40分）', price: '4500', duration: '40分', description: 'デスクワークの方に。肩・首・腰を重点的にケアします。' },
    { name: '下半身集中（40分）', price: '4500', duration: '40分', description: '立ち仕事の方に。腰・股関節・脚の疲れをリセットします。' },
    { name: 'クイック整体（30分）', price: '3500', duration: '30分', description: 'お時間がない方にもおすすめ。短時間で効率的にリフレッシュ。' },
  ]

  for (const m of menus) {
    await prisma.menu.create({
      data: m
    })
  }

  const settings = [
    { key: 'サイトタイトル', value: 'おてがる整体 - 心と体のリフレッシュ' },
    { key: 'キャッチコピー', value: '日々の疲れを、\nおてがるリセット。' },
    { key: 'お知らせ', value: '初回限定で全メニュー1,000円OFFキャンペーン中！' }
  ]

  for (const s of settings) {
    await prisma.siteSetting.create({
      data: s
    })
  }

  const calendarDates = [
    { date: "2026-05-27", type: "休業", note: "定休日" },
    { date: "2026-05-26", type: "営業", note: "通常営業" }
  ]
  for (const d of calendarDates) {
    await prisma.calendarDate.create({ data: d })
  }

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
