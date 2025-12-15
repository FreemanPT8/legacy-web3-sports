import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="flex min-h-[calc(100vh-120px)] border-t border-border/60 bg-background">
          <AdminSidebar />
          <div className="flex-1 px-4 py-6 md:px-8 md:py-10 lg:px-10 lg:py-12">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
