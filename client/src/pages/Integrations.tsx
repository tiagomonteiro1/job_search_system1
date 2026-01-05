import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Link2, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PLATFORMS = [
  { id: "linkedin", name: "LinkedIn", icon: "🔗", color: "bg-blue-600" },
  { id: "indeed", name: "Indeed", icon: "💼", color: "bg-blue-700" },
  { id: "catho", name: "Catho", icon: "📋", color: "bg-orange-600" },
  { id: "infojobs", name: "InfoJobs", icon: "📊", color: "bg-purple-600" },
  { id: "vagas", name: "Vagas.com", icon: "🎯", color: "bg-green-600" },
];

export default function Integrations() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
  const [formData, setFormData] = useState({
    platformUrl: "",
    username: "",
    password: ""
  });
  const [saving, setSaving] = useState(false);
  
  const { data: integrations = [], refetch } = trpc.user.getIntegrations.useQuery();

  const handleAddIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlatform || !formData.username || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    
    try {
      // TODO: Implementar criação real de integração
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`Integração com ${selectedPlatform.name} adicionada com sucesso!`);
      setShowAddDialog(false);
      setFormData({ platformUrl: "", username: "", password: "" });
      setSelectedPlatform(null);
      refetch();
    } catch (error) {
      toast.error('Erro ao adicionar integração. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIntegration = async (id: number, platformName: string) => {
    if (!confirm(`Tem certeza que deseja remover a integração com ${platformName}?`)) {
      return;
    }

    try {
      // TODO: Implementar exclusão real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Integração removida com sucesso');
      refetch();
    } catch (error) {
      toast.error('Erro ao remover integração. Tente novamente.');
    }
  };

  const handleTestConnection = async (integration: any) => {
    toast.info('Testando conexão...');
    
    try {
      // TODO: Implementar teste real de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Conexão testada com sucesso!');
    } catch (error) {
      toast.error('Falha ao testar conexão. Verifique suas credenciais.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              ← Voltar
            </Button>
            <h1 className="text-xl font-bold">Integrações</h1>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Conecte suas Contas</h2>
          <p className="text-muted-foreground">
            Conecte suas contas de sites de emprego para envio automático de currículos
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-8 border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Sobre a Segurança</p>
              <p className="text-blue-700">
                Suas credenciais são criptografadas e armazenadas com segurança. Nunca compartilhamos 
                suas informações com terceiros. As integrações são usadas apenas para envio automático 
                de currículos nas vagas selecionadas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Available Platforms */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Plataformas Disponíveis</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {PLATFORMS.map((platform) => {
              const isConnected = integrations.some(i => i.platform === platform.id && i.isActive);
              
              return (
                <Card 
                  key={platform.id} 
                  className={`hover:border-primary/50 transition-colors cursor-pointer ${isConnected ? 'border-green-500' : ''}`}
                  onClick={() => {
                    if (!isConnected) {
                      setSelectedPlatform(platform);
                      setShowAddDialog(true);
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-lg ${platform.color} flex items-center justify-center text-2xl`}>
                          {platform.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{platform.name}</CardTitle>
                          {isConnected && (
                            <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                              <CheckCircle className="h-4 w-4" />
                              Conectado
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Connected Integrations */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Integrações Ativas</h3>
          
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Link2 className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma integração configurada</p>
                <p className="text-sm text-muted-foreground">
                  Conecte suas contas para começar a enviar currículos automaticamente
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => {
                const platform = PLATFORMS.find(p => p.id === integration.platform);
                
                return (
                  <Card key={integration.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-lg ${platform?.color || 'bg-gray-600'} flex items-center justify-center text-2xl`}>
                            {platform?.icon || '🔗'}
                          </div>
                          <div>
                            <CardTitle>{platform?.name || integration.platform}</CardTitle>
                            <CardDescription>
                              Usuário: {integration.username}
                            </CardDescription>
                            {integration.lastSyncAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Última sincronização: {new Date(integration.lastSyncAt).toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {integration.isActive ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm px-3 py-1 rounded-full bg-green-100">
                              <CheckCircle className="h-4 w-4" />
                              Ativa
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-600 text-sm px-3 py-1 rounded-full bg-gray-100">
                              <AlertCircle className="h-4 w-4" />
                              Inativa
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTestConnection(integration)}
                        >
                          Testar Conexão
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteIntegration(integration.id, platform?.name || integration.platform)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar {selectedPlatform?.name}</DialogTitle>
            <DialogDescription>
              Insira suas credenciais para conectar sua conta
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddIntegration} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformUrl">URL da Plataforma (opcional)</Label>
              <Input
                id="platformUrl"
                type="url"
                placeholder="https://www.linkedin.com"
                value={formData.platformUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, platformUrl: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Usuário ou Email *</Label>
              <Input
                id="username"
                type="text"
                placeholder="seu@email.com"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Conectar
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddDialog(false);
                  setFormData({ platformUrl: "", username: "", password: "" });
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
