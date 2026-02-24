import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Save, Plug } from "lucide-react";

export function EvolutionApiPanel() {
  const [apiKey, setApiKey] = useState("");
  const [originalKey, setOriginalKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("configuracoes_sistema")
      .select("chave, valor")
      .in("chave", ["evolution_api_key", "evolution_base_url"]);

    if (!error && data) {
      for (const row of data) {
        if (row.chave === "evolution_api_key") {
          setApiKey(row.valor);
          setOriginalKey(row.valor);
        } else if (row.chave === "evolution_base_url") {
          setApiUrl(row.valor);
          setOriginalUrl(row.valor);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Informe a API Key");
      return;
    }
    if (!apiUrl.trim()) {
      toast.error("Informe a URL base");
      return;
    }
    setSaving(true);

    const updates = [];
    if (apiKey.trim() !== originalKey) {
      updates.push(
        supabase.from("configuracoes_sistema").update({ valor: apiKey.trim() }).eq("chave", "evolution_api_key")
      );
    }
    if (apiUrl.trim() !== originalUrl) {
      updates.push(
        supabase.from("configuracoes_sistema").update({ valor: apiUrl.trim() }).eq("chave", "evolution_base_url")
      );
    }

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas com sucesso");
      setOriginalKey(apiKey.trim());
      setOriginalUrl(apiUrl.trim());
    }
    setSaving(false);
  };

  const hasChanges = apiKey !== originalKey || apiUrl !== originalUrl;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="w-4 h-4" />
          Integração Evolution API
        </CardTitle>
        <CardDescription>Gerencie as credenciais de acesso da Evolution API</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">URL Base</label>
              <Input
                type="text"
                placeholder="https://api.exemplo.com.br"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Global API Key</label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="Cole sua API Key aqui"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-9 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
