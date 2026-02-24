import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Setor {
  id: string;
  numero_opcao: string;
  nome_setor: string;
  instancia_responsavel: string;
  msg_transferencia: string | null;
  msg_resposta: string;
  ativo: boolean | null;
  created_at: string | null;
}

const EMPTY_FORM = {
  numero_opcao: "",
  nome_setor: "",
  instancia_responsavel: "",
  msg_transferencia: "",
  msg_resposta: "",
};

export function SetoresPanel() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSetores = useMemo(() => {
    if (!searchQuery.trim()) return setores;
    const q = searchQuery.toLowerCase();
    return setores.filter(
      (s) =>
        s.nome_setor.toLowerCase().includes(q) ||
        s.instancia_responsavel.toLowerCase().includes(q) ||
        s.numero_opcao.toLowerCase().includes(q)
    );
  }, [setores, searchQuery]);

  const fetchSetores = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("setores_atendimento")
      .select("*")
      .order("numero_opcao", { ascending: true });
    if (!error && data) {
      setSetores(data as unknown as Setor[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSetores();

    const channel = supabase
      .channel("setores-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "setores_atendimento" }, () => {
        fetchSetores();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSetores]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  // Decode escaped \n back to real newlines for display
  const decodeNewlines = (text: string) => text.replace(/\\n/g, "\n");

  const openEdit = (setor: Setor) => {
    setEditingId(setor.id);
    setForm({
      numero_opcao: setor.numero_opcao,
      nome_setor: setor.nome_setor,
      instancia_responsavel: setor.instancia_responsavel,
      msg_transferencia: decodeNewlines(setor.msg_transferencia || ""),
      msg_resposta: decodeNewlines(setor.msg_resposta),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.numero_opcao.trim() || !form.nome_setor.trim() || !form.instancia_responsavel.trim() || !form.msg_resposta.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Client-side duplicate check
    const isDuplicate = setores.some(
      (s) => s.numero_opcao === form.numero_opcao.trim() && s.id !== editingId
    );
    if (isDuplicate) {
      toast.error(`Já existe um setor com a opção nº ${form.numero_opcao.trim()}`);
      return;
    }

    setSaving(true);

    const payload = {
      numero_opcao: form.numero_opcao.trim(),
      nome_setor: form.nome_setor.trim(),
      instancia_responsavel: form.instancia_responsavel.trim(),
      msg_transferencia: form.msg_transferencia.trim() || null,
      msg_resposta: form.msg_resposta.trim(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("setores_atendimento")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        const msg = error.message?.includes("unique") ? "Número de opção já cadastrado" : "Erro ao atualizar setor";
        toast.error(msg);
        console.error(error);
      } else {
        toast.success("Setor atualizado com sucesso");
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from("setores_atendimento")
        .insert(payload);
      if (error) {
        const msg = error.message?.includes("unique") ? "Número de opção já cadastrado" : "Erro ao criar setor";
        toast.error(msg);
        console.error(error);
      } else {
        toast.success("Setor criado com sucesso");
        setDialogOpen(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("setores_atendimento")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir setor");
    } else {
      toast.success("Setor excluído");
    }
    setDeleteId(null);
  };

  const handleToggleAtivo = async (setor: Setor) => {
    const newAtivo = !setor.ativo;
    const { error } = await supabase
      .from("setores_atendimento")
      .update({ ativo: newAtivo })
      .eq("id", setor.id);
    if (error) {
      toast.error("Erro ao alterar status do setor");
    } else {
      toast.success(newAtivo ? "Setor ativado" : "Setor desativado");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Setores de Atendimento
              </CardTitle>
              <CardDescription>Gerencie os setores e instâncias do menu de atendimento</CardDescription>
            </div>
            <Button size="sm" className="gap-1.5" onClick={openNew}>
              <Plus className="w-4 h-4" />
              Adicionar Setor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : setores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum setor cadastrado. Clique em "Adicionar Setor" para começar.
            </p>
          ) : (
            <div className="space-y-3">
              {setores.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, instância ou número..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-sm bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              )}
              {filteredSetores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum setor encontrado</p>
              ) : (
              filteredSetores.map((setor) => (
                <div
                  key={setor.id}
                  className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 group transition-opacity ${setor.ativo === false ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{setor.numero_opcao}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{setor.nome_setor}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                          {setor.instancia_responsavel}
                        </Badge>
                        {setor.ativo === false && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      {setor.msg_transferencia && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Transferência: {setor.msg_transferencia}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={setor.ativo !== false}
                      onCheckedChange={() => handleToggleAtivo(setor)}
                      className="scale-75"
                    />
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(setor)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(setor.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Setor" : "Adicionar Setor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Número da Opção no Menu *</label>
              <Input
                placeholder="Ex: 1"
                value={form.numero_opcao}
                onChange={(e) => setForm({ ...form, numero_opcao: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome do Setor *</label>
              <Input
                placeholder="Ex: Dúvidas Gerais"
                value={form.nome_setor}
                onChange={(e) => setForm({ ...form, nome_setor: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Instância Responsável (Evolution) *</label>
              <Input
                placeholder="Ex: conecta_digital"
                value={form.instancia_responsavel}
                onChange={(e) => setForm({ ...form, instancia_responsavel: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mensagem de Transferência</label>
              <Textarea
                placeholder="Ex: Vou transferir, aguarde..."
                value={form.msg_transferencia}
                onChange={(e) => setForm({ ...form, msg_transferencia: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mensagem de Resposta (Saudação) *</label>
              <Textarea
                placeholder="Ex: Olá! Sou do setor de Dúvidas Gerais..."
                value={form.msg_resposta}
                onChange={(e) => setForm({ ...form, msg_resposta: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir setor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O setor será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
