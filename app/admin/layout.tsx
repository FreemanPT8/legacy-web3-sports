import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-[calc(100vh-120px)]">
          <AdminSidebar />
          <div className="flex-1 p-6 md:p-10">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
