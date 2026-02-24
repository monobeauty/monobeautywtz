import { useMessages } from "@/hooks/useMessages";
import { InstanceSidebar } from "@/components/InstanceSidebar";
import { SetoresPanel } from "@/components/SetoresPanel";
import { EvolutionApiPanel } from "@/components/EvolutionApiPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Radio, Database, Shield } from "lucide-react";

const Settings = () => {
  const { instances } = useMessages();

  return (
    <div className="flex h-screen bg-background">
      <div className="w-80">
        <InstanceSidebar instances={instances} selected={null} onSelect={() => {}} messageCounts={{}} />
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4" />
              Status do Sistema
            </CardTitle>
            <CardDescription>Informações sobre as conexões ativas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Banco de Dados</span>
              </div>
              <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Conectado
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Evolution API</span>
              </div>
              <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Conectado
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Real-time (WebSocket)</span>
              </div>
              <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>
        {/* Evolution API Integration */}
        <EvolutionApiPanel />

        {/* Setores de Atendimento CRUD */}
        <SetoresPanel />

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sobre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Versão</span>
              <span className="text-foreground font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Plataforma</span>
              <span className="text-foreground font-medium">Mono Beauty CRM</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
