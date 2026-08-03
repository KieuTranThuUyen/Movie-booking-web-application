import { UserManagementForm } from '@/components/forms/user-management-form';

export default function AdminUsersPage() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-white">Quản lý người dùng</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">Xem danh sách người dùng, thay đổi vai trò và xóa tài khoản khi cần.</p>
      <div className="mt-6">
        <UserManagementForm />
      </div>
    </section>
  );
}
