import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, CheckCircle, XCircle, Clock, Send, Package, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: "",
    maxApplications: 0,
    hasAiAnalysis: false,
    features: ""
  });

  const { data: plans = [], refetch: refetchPlans } = trpc.public.getPlans.useQuery();
  const { data: applications = [] } = trpc.admin.getAllApplications.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  const { data: users = [] } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  
  const createPlanMutation = trpc.admin.createPlan.useMutation();
  const updatePlanMutation = trpc.admin.updatePlan.useMutation();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPlan) {
        await updatePlanMutation.mutateAsync({
          id: editingPlan.id,
          name: planForm.name,
          description: planForm.description,
          price: planForm.price,
          maxApplications: planForm.maxApplications,
          hasAiAnalysis: planForm.hasAiAnalysis,
          features: planForm.features,
        });
        toast.success('Plano atualizado com sucesso!');
      } else {
        await createPlanMutation.mutateAsync(planForm);
        toast.success('Plano criado com sucesso!');
      }
      
      setShowPlanDialog(false);
      setEditingPlan(null);
      setPlanForm({
        name: "",
        description: "",
        price: "",
        maxApplications: 0,
        hasAiAnalysis: false,
        features: ""
      });
      refetchPlans();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar plano. Tente novamente.');
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      maxApplications: plan.maxApplications,
      hasAiAnalysis: plan.hasAiAnalysis,
      features: plan.features || ""
    });
    setShowPlanDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'sent': return 'Enviada';
      case 'failed': return 'Falhou';
      default: return 'Pendente';
    }
  };

  const stats = {
    totalApplications: applications.length,
    confirmed: applications.filter(a => a.status === 'confirmed').length,
    sent: applications.filter(a => a.status === 'sent').length,
    failed: applications.filter(a => a.status === 'failed').length,
    pending: applications.filter(a => a.status === 'pending').length,
    totalUsers: users.length,
    adminUsers: users.filter(u => u.role === 'admin').length,
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              ← Voltar
            </Button>
            <h1 className="text-xl font-bold">Painel Administrativo</h1>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <Tabs defaultValue="plans" className="space-y-8">
          <TabsList>
            <TabsTrigger value="plans">Planos de Assinatura</TabsTrigger>
            <TabsTrigger value="history">Histórico de Entregas</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Planos de Assinatura</h2>
                <p className="text-muted-foreground">Gerencie os planos disponíveis na plataforma</p>
              </div>
              <Button onClick={() => {
                setEditingPlan(null);
                setPlanForm({
                  name: "",
                  description: "",
                  price: "",
                  maxApplications: 0,
                  hasAiAnalysis: false,
                  features: ""
                });
                setShowPlanDialog(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Plano
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const features = plan.features ? JSON.parse(plan.features) : [];
                
                return (
                  <Card key={plan.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">R$ {plan.price}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Candidaturas:</span>
                          <span className="font-medium">{plan.maxApplications}/mês</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Análise IA:</span>
                          <span className="font-medium">{plan.hasAiAnalysis ? 'Sim' : 'Não'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Histórico de Entregas</h2>
              <p className="text-muted-foreground">Acompanhe o status de todas as candidaturas enviadas</p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalApplications}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Confirmadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Enviadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Falharam</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
                </CardContent>
              </Card>
            </div>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>Candidaturas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma candidatura registrada ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.slice(0, 20).map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">ID: {app.id}</span>
                            <Badge className={getStatusColor(app.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(app.status)}
                                {getStatusLabel(app.status)}
                              </span>
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Usuário ID: {app.userId} | Currículo ID: {app.resumeId} | Vaga ID: {app.jobListingId}</p>
                            <p>Criado: {new Date(app.createdAt).toLocaleString('pt-BR')}</p>
                            {app.sentAt && (
                              <p>Enviado: {new Date(app.sentAt).toLocaleString('pt-BR')}</p>
                            )}
                            {app.errorMessage && (
                              <p className="text-red-600">Erro: {app.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        {app.responsePayload && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              toast.info('Payload de resposta', {
                                description: app.responsePayload || 'Nenhum payload disponível'
                              });
                            }}
                          >
                            Ver Payload
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Usuários do Sistema</h2>
              <p className="text-muted-foreground">Visualize todos os usuários cadastrados</p>
            </div>

            {/* User Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Administradores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.adminUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Regulares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalUsers - stats.adminUsers}</div>
                </CardContent>
              </Card>
            </div>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum usuário cadastrado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">{user.name || 'Sem nome'}</span>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? 'Admin' : 'Usuário'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Email: {user.email || 'Não informado'}</p>
                            <p>ID: {user.id} | OpenID: {user.openId}</p>
                            <p>Cadastrado em: {new Date(user.createdAt).toLocaleString('pt-BR')}</p>
                            <p>Último login: {new Date(user.lastSignedIn).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            <DialogDescription>
              Preencha as informações do plano de assinatura
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano *</Label>
                <Input
                  id="name"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={planForm.price}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={planForm.description}
                onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxApplications">Máximo de Candidaturas *</Label>
                <Input
                  id="maxApplications"
                  type="number"
                  value={planForm.maxApplications}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, maxApplications: parseInt(e.target.value) }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hasAiAnalysis" className="flex items-center gap-2">
                  Análise com IA
                </Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    id="hasAiAnalysis"
                    checked={planForm.hasAiAnalysis}
                    onCheckedChange={(checked) => setPlanForm(prev => ({ ...prev, hasAiAnalysis: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {planForm.hasAiAnalysis ? 'Habilitada' : 'Desabilitada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Recursos (JSON array)</Label>
              <Textarea
                id="features"
                placeholder='["Recurso 1", "Recurso 2", "Recurso 3"]'
                value={planForm.features}
                onChange={(e) => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
              >
                {editingPlan ? 'Atualizar Plano' : 'Criar Plano'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPlanDialog(false)}
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
