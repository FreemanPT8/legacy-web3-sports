'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Props = {
  houseKey: string;
  cta: { label: string; helper: string; checkbox: string };
};

export function HouseCTAForm({ houseKey, cta }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted) {
      toast({
        title: 'Confirmação necessária',
        description: 'Tens de aceitar o termo antes de avançar.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/houses/${houseKey}/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (response.status === 401) {
        toast({
          title: 'Inicia sessão',
          description: 'Precisas de estar autenticado para submeter o pedido.',
          variant: 'destructive',
        });
        return;
      }
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Erro ao submeter o pedido.');
      }
      toast({
        title: 'Pedido recebido',
        description: 'Vamos analisar com calma. Não há resposta imediata garantida.',
      });
      setNote('');
      setAccepted(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Não foi possível enviar',
        description: error?.message || 'Tenta novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="house-note" className="text-sm text-white">
          Mensagem (opcional)
        </Label>
        <Textarea
          id="house-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="border-white/20 bg-[#010913] text-white placeholder:text-white/50"
          placeholder="Partilha contexto ou expectativas em poucas palavras."
          rows={3}
        />
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-black/20 p-4">
        <Checkbox
          id="house-cta-checkbox"
          checked={accepted}
          onCheckedChange={(value) => setAccepted(Boolean(value))}
          className="border-white/40 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-[#04131b]"
        />
        <Label htmlFor="house-cta-checkbox" className="text-sm text-white leading-relaxed">
          {cta.checkbox}
        </Label>
      </div>
      <p className="text-xs text-white/70">{cta.helper}</p>
      <Button
        type="submit"
        disabled={!accepted || submitting}
        className="w-full bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
      >
        {submitting ? 'A enviar...' : cta.label}
      </Button>
    </form>
  );
}
