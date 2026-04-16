// import React from 'react'
// import { Button } from '@/components/ui/button'
// import { Edit3, Mail, Phone, ShieldCheck, User, Clock } from 'lucide-react'
// import { useProfile } from '@/features/auth/hooks/auth.hooks'
// import Loading from '@/app/loading'

// function TabInfo() {
//   const { data: profile , isLoading} = useProfile()

//   return (
//     <>
//       {
//         isLoading ? <Loading /> : (
//           <div className="space-y-3">
//         <TabCard title="Thông tin cá nhân" icon={User}
//           action={<Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8 text-xs"><Edit3 className="w-3 h-3" />Sửa</Button>}
//         >
//           <div className="divide-y divide-border">
//             <InfoRow icon={User} label="Họ và tên" value={profile.fullName} />
//             <InfoRow icon={Mail} label="Email" value={profile.email} verified={profile.isVerified} />
//             <InfoRow icon={Phone} label="Số điện thoại" value={phoneDisplay} />
//           </div>
//         </TabCard>
//         <TabCard title="Tài khoản" icon={Settings}>
//           <div className="divide-y divide-border">
//             <InfoRow icon={ShieldCheck} label="Trạng thái" value={profile.isVerified ? "Đã xác thực" : "Chưa xác thực"} verified={profile.isVerified} />
//             <InfoRow icon={User} label="Vai trò" value={ROLE_LABELS[profile.role as UserRole]} />
//             <InfoRow icon={Clock} label="Tham gia" value={formatMemberSince(profile.createdAt)} />
//           </div>
//         </TabCard>
//       </div>
//         )
//       }
//     </>
//   )
// }

// export default TabInfo