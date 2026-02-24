import { cn } from "@/lib/utils";
import { MessageSquare, Radio, LayoutDashboard, Users, FileBarChart, Settings, LogOut, User, KeyRound, Mail, Eye, EyeOff, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/logo-mono-beauty.png";

interface InstanceSidebarProps {
  instances: string[];
  selected: string | null;
  onSelect: (instance: string | null) => void;
  messageCounts: Record<string, number>;
  instanceStatusMap?: Record<string, string>;
  instanceProfilePics?: Record<string, string | null>;
}

const OTHER_NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/contacts", label: "Contatos", icon: Users },
  { path: "/reports", label: "Relatórios", icon: FileBarChart },
  { path: "/users", label: "Usuários", icon: KeyRound },
  { path: "/settings", label: "Configurações", icon: Settings },
];

export function InstanceSidebar({ instances, selected, onSelect, messageCounts, instanceStatusMap = {}, instanceProfilePics = {} }: InstanceSidebarProps) {
  const { isAdmin, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const isOnChat = currentPath === "/";

  const [profileDialog, setProfileDialog] = useState<"password" | "email" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logout realizado");
    navigate("/auth");
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      toast.error("Informe a senha atual");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSaving(true);
    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      toast.error("Senha atual incorreta");
      setSaving(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao alterar senha");
    } else {
      toast.success("Senha alterada com sucesso");
      setProfileDialog(null);
      setCurrentPassword("");
      setNewPassword("");
    }
    setSaving(false);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      toast.error("Erro ao alterar e-mail");
    } else {
      toast.success("E-mail de confirmação enviado para o novo endereço");
      setProfileDialog(null);
      setNewEmail("");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <img src={logo} alt="Mono Beauty" className="h-10 object-contain" />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 pt-3 scrollbar-thin">
        <div className="space-y-0.5">
          {/* WhatsApp Monitor - parent item */}
          <button
            onClick={() => {
              navigate("/");
              onSelect(instances.length === 1 ? instances[0] : null);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              isOnChat
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <span>WhatsApp Monitor</span>
              {isOnChat && (
                <div className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground">Real-time</span>
                </div>
              )}
            </div>
            {instances.length > 1 && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {/* Instance submenu - only visible when multiple instances */}
          {instances.length > 1 && (
            <div className="pl-5 space-y-0.5 pb-1">
              <button
                onClick={() => onSelect(null)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  selected === null
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Todas as instâncias</span>
              </button>
              {instances.map((instance) => (
                <button
                  key={instance}
                  onClick={() => onSelect(instance)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    selected === instance
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-6 h-6">
                        {instanceProfilePics[instance] && (
                          <AvatarImage src={instanceProfilePics[instance]!} alt={instance} />
                        )}
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                          {instance.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                          (instanceStatusMap[instance] === "open" || instanceStatusMap[instance] === "connected")
                            ? "bg-green-500"
                            : instanceStatusMap[instance] === "connecting"
                            ? "bg-yellow-500"
                            : "bg-muted-foreground/40"
                        )}
                        title={instanceStatusMap[instance] || "unknown"}
                      />
                    </div>
                    <span className="truncate text-sm">{instance}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Other nav items */}
          {OTHER_NAV_ITEMS.filter((item) => item.path !== "/users" || isAdmin || profileLoading).map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Sidebar Footer - Profile & Logout */}
      <div className="px-3 py-3 border-t border-border mt-auto space-y-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">
                  {user?.email || "Usuário"}
                </span>
                <span className="text-xs text-muted-foreground">Meu Perfil</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setProfileDialog("password")}>
              <KeyRound className="w-4 h-4 mr-2" />
              Alterar Senha
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setProfileDialog("email")}>
              <Mail className="w-4 h-4 mr-2" />
              Alterar E-mail
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sair do sistema
        </Button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={profileDialog === "password"} onOpenChange={(open) => { if (!open) { setProfileDialog(null); setCurrentPassword(""); setNewPassword(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha Atual</label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  placeholder="Digite sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-9"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nova Senha</label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-9"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && (() => {
                let score = 0;
                if (newPassword.length >= 6) score++;
                if (newPassword.length >= 10) score++;
                if (/[A-Z]/.test(newPassword)) score++;
                if (/[0-9]/.test(newPassword)) score++;
                if (/[^A-Za-z0-9]/.test(newPassword)) score++;
                const level = score <= 1 ? "Fraca" : score <= 3 ? "Média" : "Forte";
                const color = score <= 1 ? "bg-destructive" : score <= 3 ? "bg-yellow-500" : "bg-green-500";
                const textColor = score <= 1 ? "text-destructive" : score <= 3 ? "text-yellow-600" : "text-green-600";
                const width = score <= 1 ? "w-1/3" : score <= 3 ? "w-2/3" : "w-full";
                return (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} ${width} rounded-full transition-all duration-300`} />
                    </div>
                    <span className={`text-xs font-medium ${textColor}`}>{level}</span>
                  </div>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProfileDialog(null); setNewPassword(""); }}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={profileDialog === "email"} onOpenChange={(open) => !open && setProfileDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar E-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Um e-mail de confirmação será enviado para o novo endereço.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Novo E-mail</label>
              <Input
                type="email"
                placeholder="novo@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProfileDialog(null); setNewEmail(""); }}>Cancelar</Button>
            <Button onClick={handleChangeEmail} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
