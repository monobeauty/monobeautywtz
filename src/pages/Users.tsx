import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { toast } from "sonner";
import { InstanceSidebar } from "@/components/InstanceSidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Shield, Pencil, Save, X, Menu, Plus, Trash2, UserPlus, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface PerfilUsuario {
  id: string;
  user_id: string;
  email: string | null;
  nome: string | null;
  instancias_permitidas: string[] | null;
  role: string | null;
}

type DialogMode = "create" | "edit" | null;

export default function Users() {
  const { instances } = useMessages();
  const { allowedInstances } = useUserProfile();
  const [profiles, setProfiles] = useState<PerfilUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingProfile, setEditingProfile] = useState<PerfilUsuario | null>(null);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [formEmail, setFormEmail] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<string>("atendente");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProfiles((data?.profiles || []) as PerfilUsuario[]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar usuários");
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const openCreate = () => {
    setDialogMode("create");
    setEditingProfile(null);
    setFormEmail("");
    setFormNome("");
    setFormPassword("");
    setFormRole("atendente");
    setSelectedInstances([]);
  };

  const openEdit = (profile: PerfilUsuario) => {
    setDialogMode("edit");
    setEditingProfile(profile);
    setFormEmail(profile.email || "");
    setFormNome(profile.nome || "");
    setFormRole(profile.role || "atendente");
    setSelectedInstances(profile.instancias_permitidas || []);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingProfile(null);
    setFormEmail("");
    setFormNome("");
    setFormPassword("");
    setFormRole("atendente");
    setSelectedInstances([]);
  };

  const toggleInstance = (instance: string) => {
    setSelectedInstances((prev) =>
      prev.includes(instance)
        ? prev.filter((i) => i !== instance)
        : [...prev, instance]
    );
  };

  const handleCreate = async () => {
    if (!formEmail.includes("@") || formPassword.length < 6) {
      toast.error("Informe um e-mail válido e senha com pelo menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      // Create auth user via edge function
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create",
          email: formEmail,
          password: formPassword,
          nome: formNome,
          role: formRole,
          instancias_permitidas: selectedInstances,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário criado com sucesso");
      closeDialog();
      fetchProfiles();
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err);
      toast.error(err.message || "Erro ao criar usuário");
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingProfile) return;
    if (formPassword && formPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        action: "update",
        user_id: editingProfile.user_id,
        nome: formNome,
        role: formRole,
        instancias_permitidas: selectedInstances,
        email: formEmail,
      };
      if (formPassword) body.password = formPassword;

      const { data, error } = await supabase.functions.invoke("manage-users", {
        body,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário atualizado");
      closeDialog();
      fetchProfiles();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
    setSaving(false);
  };

  const handleDelete = async (profile: PerfilUsuario) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", user_id: profile.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário removido");
      fetchProfiles();
    } catch (err: any) {
      console.error("Erro ao remover usuário:", err);
      toast.error(err.message || "Erro ao remover usuário");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      <div
        className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          fixed inset-y-0 left-0 z-40 w-80 transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
        `}
      >
        <InstanceSidebar
          instances={instances}
          selected={null}
          onSelect={() => {}}
          messageCounts={{}}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Usuários</h1>
              <p className="text-sm text-muted-foreground">Gerencie a equipe e permissões de acesso</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum usuário cadastrado
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                 <TableRow>
                   <TableHead>Nome</TableHead>
                   <TableHead>E-mail</TableHead>
                   <TableHead>Função</TableHead>
                   <TableHead>Instâncias Permitidas</TableHead>
                   <TableHead className="w-[120px] text-right">Ações</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {profiles.map((p) => (
                   <TableRow key={p.id}>
                     <TableCell className="font-medium">{p.nome || "—"}</TableCell>
                     <TableCell>{p.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.role === "admin" ? "default" : "secondary"} className="capitalize">
                        {p.role || "atendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(p.instancias_permitidas && p.instancias_permitidas.length > 0) ? (
                        <div className="flex flex-wrap gap-1">
                          {p.instancias_permitidas.map((inst) => (
                            <Badge key={inst} variant="outline" className="text-xs">
                              {inst}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Todas (sem restrição)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O usuário <strong>{p.email}</strong> será removido permanentemente do sistema. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(p)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Novo Usuário" : "Editar Usuário"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Email */}
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                placeholder="Nome do operador"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{dialogMode === "create" ? "Senha" : "Nova Senha (deixe vazio para manter)"}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={dialogMode === "create" ? "Mínimo 6 caracteres" : "Deixe vazio para manter a atual"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Gerar senha"
                    onClick={() => {
                      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
                      let pwd = "";
                      for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
                      setFormPassword(pwd);
                      setShowPassword(true);
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>Função</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instances */}
            <div className="space-y-1.5">
              <Label>Instâncias Permitidas</Label>
              <p className="text-xs text-muted-foreground">
                {formRole === "admin"
                  ? "Admins têm acesso a todas as instâncias automaticamente."
                  : "Selecione as instâncias que este atendente pode acessar."}
              </p>
              {formRole === "atendente" && (
                <div className="space-y-2 mt-2">
                  {instances.map((inst) => (
                    <label
                      key={inst}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedInstances.includes(inst)}
                        onCheckedChange={() => toggleInstance(inst)}
                      />
                      <span className="text-sm">{inst}</span>
                    </label>
                  ))}
                  {instances.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma instância encontrada</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={dialogMode === "create" ? handleCreate : handleUpdate}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Salvando..." : dialogMode === "create" ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
