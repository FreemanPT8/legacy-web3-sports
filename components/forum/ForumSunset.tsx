import Link from 'next/link';
import { MessageSquareOff, Flame, Lock, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type ForumSunsetProps = {
  hideChrome?: boolean;
};

export function ForumSunset({ hideChrome = false }: ForumSunsetProps = {}) {
  const points = [
    'Private comments now live inside lessons, blog posts, and the Houses of Sports once you reach 369 XP.',
    'Emoji reactions replace likes: +1 (5/day), 🔥 (1/day), and -1 (1/day) with moderation visibility.',
    'Every week the public comment with the most reaction points (positive + 2×🔥) earns 88 XP and the “🔥 Comment of the Week” badge.',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      {!hideChrome ? <Header /> : null}
      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="border border-white/10 bg-gradient-to-br from-[#04141c] via-[#03121a] to-[#020b11] shadow-[0_40px_120px_rgba(2,8,18,0.4)]">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3 text-cyan-200">
                <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-xs uppercase tracking-[0.4em]">
                  Notice
                </Badge>
                <span className="text-xs text-slate-300 uppercase tracking-[0.55em]">
                  Forum retired
                </span>
              </div>
              <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
                <MessageSquareOff className="h-8 w-8 text-rose-300" />
                Forum access has moved to private comments
              </CardTitle>
              <p className="text-slate-200 text-sm leading-relaxed">
                We sunset the legacy forum to keep conversations closer to each lesson, blog post, and House. Earn 369 XP to unlock private comments and emoji reactions directly where the content lives.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
                {points.map((point) => (
                  <div key={point} className="flex items-start gap-3 text-sm text-slate-100">
                    <Sparkles className="h-4 w-4 text-[#fdd87c] mt-1" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3 text-sm text-slate-200">
                <div className="flex items-center gap-2 text-[#fdd87c]">
                  <Lock className="h-4 w-4" />
                  <span>Access requirements</span>
                </div>
                <p>
                  Private comments unlock when you accumulate <strong>369 XP</strong>. You can reach it faster by completing lessons, reading blog posts, clearing daily missions, and maintaining streaks inside the Academy.
                </p>
                <p>
                  Super Admins, Admins, and House moderators can always review private comments for moderation purposes.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3 text-sm text-slate-200">
                <div className="flex items-center gap-2 text-rose-300">
                  <Flame className="h-4 w-4" />
                  <span>Weekly highlight</span>
                </div>
                <p>
                  Keep an eye on lessons and blog posts every Friday: the public comment with the highest reaction points wins an automatic +88 XP plus the “🔥 Comment of the Week” badge.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/education/xp">
                  <Button className="bg-cyan-500 text-black hover:bg-cyan-400">
                    Learn how XP works
                  </Button>
                </Link>
                <Link href="/education">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Explore lessons
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Read the blog
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      {!hideChrome ? <Footer /> : null}
    </div>
  );
}

export default ForumSunset;
