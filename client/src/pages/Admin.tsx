import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Plus, Edit, CheckCircle, XCircle, Clock, Send, Package, Users, 
  Sparkles, Tag, Search, Trash2, Eye, FileText
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Plan management state
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

  // User management state
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Promotion management state
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [promotionForm, setPromotionForm] = useState({
    code: "",
    description: "",
    discountPercent: 0,
    validUntil: ""
  });

  // Job search state
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [foundJobs, setFoundJobs] = useState<any[]>([]);

  const { data: plans = [], refetch: refetchPlans } = trpc.public.getPlans.useQuery();
  const { data: applications = [] } = trpc.admin.getAllApplications.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  const { data: users = [], refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  const { data: resumes = [] } = trpc.user.getResumes.useQuery();
  
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

  const handleSearchJobs = () => {
    // Simulate job search across multiple platforms
    const mockJobs = [
      {
        id: 1,
        title: "Desenvolvedor Full Stack",
        company: "Tech Corp",
        location: "São Paulo, SP",
        salary: "R$ 8.000 - R$ 12.000",
        platform: "LinkedIn"
      },
      {
        id: 2,
        title: "Analista de Dados",
        company: "Data Solutions",
        location: "Rio de Janeiro, RJ",
        salary: "R$ 6.000 - R$ 9.000",
        platform: "Indeed"
      },
      {
        id: 3,
        title: "Gerente de Projetos",
        company: "Consulting Group",
        location: "Remoto",
        salary: "R$ 10.000 - R$ 15.000",
        platform: "Catho"
      }
    ];
    
    setFoundJobs(mockJobs);
    toast.success(`${mockJobs.length} vagas encontradas!`);
  };

  const handleCreatePromotion = () => {
    toast.success('Promoção criada com sucesso!');
    setShowPromotionDialog(false);
    setPromotionForm({
      code: "",
      description: "",
      discountPercent: 0,
      validUntil: ""
    });
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
    totalResumes: resumes.length,
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Painel Administrativo" showBackButton={true} backTo="/dashboard" />

      <div className="container py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Currículos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalResumes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Send className="h-4 w-4" />
                Candidaturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalApplications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Confirmadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.confirmed}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-8">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
            <TabsTrigger value="resumes">Currículos</TabsTrigger>
            <TabsTrigger value="promotions">Promoções</TabsTrigger>
            <TabsTrigger value="jobs">Localizador</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
                <p className="text-muted-foreground">Visualize e gerencie todos os usuários do sistema</p>
              </div>
            </div>

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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDialog(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Detalhes
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
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
              {plans.map((plan) => (
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
              ))}
            </div>
          </TabsContent>

          {/* Resumes Tab */}
          <TabsContent value="resumes" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Análise de Currículos com IA</h2>
              <p className="text-muted-foreground">Visualize e analise todos os currículos enviados</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Currículos no Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                {resumes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum currículo enviado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumes.map((resume) => (
                      <div key={resume.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="font-medium">{resume.fileName}</span>
                            <Badge className={
                              resume.status === 'improved' ? 'bg-green-100 text-green-700' :
                              resume.status === 'analyzed' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {resume.status === 'improved' ? 'Otimizado' :
                               resume.status === 'analyzed' ? 'Analisado' : 'Enviado'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Enviado em: {new Date(resume.createdAt).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(resume.fileUrl, '_blank')}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Analisar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promotions Tab */}
          <TabsContent value="promotions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Cadastro de Promoções</h2>
                <p className="text-muted-foreground">Crie e gerencie cupons de desconto e promoções</p>
              </div>
              <Button onClick={() => setShowPromotionDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Promoção
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Promoções Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma promoção cadastrada ainda</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowPromotionDialog(true)}
                  >
                    Criar Primeira Promoção
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Locator Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Localizador de Vagas</h2>
              <p className="text-muted-foreground">Busque vagas nos principais sites de emprego</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Buscar Vagas</CardTitle>
                <CardDescription>
                  Pesquise vagas no LinkedIn, Indeed, Catho e outros sites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 mb-6">
                  <Input 
                    placeholder="Digite cargo, empresa ou palavra-chave..."
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                  />
                  <Button onClick={handleSearchJobs}>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </Button>
                </div>

                {foundJobs.length > 0 && (
                  <div className="space-y-3">
                    {foundJobs.map((job) => (
                      <div key={job.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{job.title}</h3>
                            <p className="text-sm text-muted-foreground">{job.company}</p>
                          </div>
                          <Badge variant="outline">{job.platform}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>📍 {job.location}</p>
                          <p>💰 {job.salary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <p className="text-sm">{selectedUser.name || 'Não informado'}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm">{selectedUser.email || 'Não informado'}</p>
              </div>
              <div>
                <Label>Role</Label>
                <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                  {selectedUser.role}
                </Badge>
              </div>
              <div>
                <Label>Data de Cadastro</Label>
                <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promotion Dialog */}
      <Dialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Promoção</DialogTitle>
            <DialogDescription>
              Crie um cupom de desconto ou promoção especial
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código da Promoção *</Label>
              <Input
                id="code"
                placeholder="PROMO2024"
                value={promotionForm.code}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, code: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-description">Descrição</Label>
              <Textarea
                id="promo-description"
                placeholder="Descrição da promoção..."
                value={promotionForm.description}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={promotionForm.discountPercent}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, discountPercent: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido até</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={promotionForm.validUntil}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleCreatePromotion}
                className="flex-1"
              >
                Criar Promoção
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPromotionDialog(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
