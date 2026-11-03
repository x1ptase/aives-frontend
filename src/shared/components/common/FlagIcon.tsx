import vnFlag from '@/shared/assets/flags/vn.svg'
import usFlag from '@/shared/assets/flags/us.svg'

/** Cờ nhỏ cho ngôn ngữ NỘI DUNG (vi/en); tiếng Anh dùng cờ US. Trang trí nên alt rỗng. */
export default function FlagIcon({ language }: { language: 'vi' | 'en' }) {
  return <img src={language === 'en' ? usFlag : vnFlag} alt="" aria-hidden="true" width={16} height={11} draggable={false} className="inline-block shrink-0 rounded-[2px]" />
}
