import Link from 'next/link';
import { AlertTriangle, Layers } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type LegacyModuleNoticeProps = {
  courseId?: string;
  legacyHref?: string;
  title?: string;
  description?: string;
};

export function LegacyModuleNotice({
  courseId,
  legacyHref,
  title = 'Legacy modules view',
  description = 'Os módulos antigos já não sincronizam com o novo curriculum de tópicos. Usa o Course Builder para organizar os tópicos e lições.',
}: LegacyModuleNoticeProps) {
  const builderHref = courseId
    ? `/admin/courses/${courseId}/edit`
    : '/admin/courses';
  const legacyModulesHref =
    legacyHref ||
    (courseId ? `/admin/courses/${courseId}/modules?legacy=1` : '#');

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center bg-[#000c12] px-6 py-10 text-white">
      <Card className="w-full max-w-3xl border border-white/10 bg-[#05212b]/80 shadow-xl shadow-black/40">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 text-cyan-300">
            <Layers className="h-5 w-5" />
            <span className="text-xs uppercase tracking-[0.5em]">
              Courses · Curriculum
            </span>
          </div>
          <CardTitle className="text-2xl font-semibold text-white">
            {title}
          </CardTitle>
          <p className="text-sm text-slate-300">{description}</p>
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-xs">
              Esta página mantém o editor anterior apenas para consulta. O novo
              builder (tópicos → lições) é a fonte de verdade.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={builderHref}>Abrir Course Builder</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/30 text-white hover:text-cyan-300"
          >
            <Link href={legacyModulesHref}>
              Abrir editor legado (modules){' '}
              <span className="ml-1 text-xs text-slate-300">(opcional)</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
