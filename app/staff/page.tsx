import { redirect } from 'next/navigation'
import { isStaff } from '@/lib/auth'

export default async function StaffHome() {
  redirect((await isStaff()) ? '/staff/proposals' : '/staff/login')
}
