import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 flex">
        <div className="flex flex-1 min-h-[calc(100vh-120px)] border-t border-white/10 bg-[#000c12]">
          <AdminSidebar />
          <div className="flex-1 px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto w-full">{children}</div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
