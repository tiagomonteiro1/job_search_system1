import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Plus, Edit, CheckCircle, XCircle, Clock, Send, Package, Users, 
  Sparkles, Tag, Search, Trash2, Eye, FileText, UserCog, CreditCard
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
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

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
  const { data: userDetails, refetch: refetchUserDetails } = trpc.admin.getUserDetails.useQuery(
    { userId: selectedUser?.id || 0 },
    { enabled: !!selectedUser }
  );
  
  const createPlanMutation = trpc.admin.createPlan.useMutation();
  const updatePlanMutation = trpc.admin.updatePlan.useMutation();
  const updateUserPlanMutation = trpc.admin.updateUserPlan.useMutation();

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
      toast.error(error.message || 'Erro ao salvar plano');
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      maxApplications: plan.maxApplications,
      hasAiAnalysis: plan.hasAiAnalysis,
      features: plan.features
    });
    setShowPlanDialog(true);
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleChangePlan = (user: any) => {
    setSelectedUser(user);
    setSelectedPlanId(user.subscriptionPlanId || null);
    setShowChangePlanDialog(true);
  };

  const handleSaveUserPlan = async () => {
    if (!selectedUser || !selectedPlanId) {
      toast.error('Selecione um plano');
      return;
    }

    try {
      const result = await updateUserPlanMutation.mutateAsync({
        userId: selectedUser.id,
        planId: selectedPlanId,
      });
      
      toast.success(result.message || 'Plano atualizado com sucesso!');
      setShowChangePlanDialog(false);
      setSelectedUser(null);
      setSelectedPlanId(null);
      refetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar plano');
    }
  };

  const filteredUsers = users.filter((u: any) => 
    userSearchQuery === "" || 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const getUserPlanName = (user: any) => {
    if (!user.subscriptionPlanId) return "Sem plano";
    const plan = plans.find((p: any) => p.id === user.subscriptionPlanId);
    return plan?.name || "Plano desconhecido";
  };

  const stats = {
    totalUsers: users.length,
    totalApplications: applications.length,
    totalPlans: plans.length,
    activeUsers: users.filter((u: any) => u.subscriptionPlanId).length,
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <PageHeader title="Painel Administrativo" />
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Painel Administrativo
          </h1>
          <p className="text-slate-600">Gerencie usuários, planos, currículos e muito mais</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
              <p className="text-xs text-slate-500 mt-1">{stats.activeUsers} com plano ativo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Candidaturas</CardTitle>
              <Send className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalApplications}</div>
              <p className="text-xs text-slate-500 mt-1">Total de envios</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Planos Ativos</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalPlans}</div>
              <p className="text-xs text-slate-500 mt-1">Planos disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Taxa de Conversão</CardTitle>
              <Sparkles className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-500 mt-1">Usuários com plano</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Planos</span>
            </TabsTrigger>
            <TabsTrigger value="resumes" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Currículos</span>
            </TabsTrigger>
            <TabsTrigger value="promotions" className="gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Promoções</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Vagas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Gerenciamento de Usuários
                    </CardTitle>
                    <CardDescription>Visualize e gerencie todos os usuários da plataforma</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plano Atual</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">#{u.id}</TableCell>
                            <TableCell>{u.name || "Sem nome"}</TableCell>
                            <TableCell>{u.email || "Sem email"}</TableCell>
                            <TableCell>
                              <Badge variant={u.subscriptionPlanId ? "default" : "secondary"}>
                                {getUserPlanName(u)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'admin' ? "destructive" : "outline"}>
                                {u.role === 'admin' ? 'Admin' : 'Usuário'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewUser(u)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleChangePlan(u)}
                                  className="gap-2"
                                >
                                  <CreditCard className="h-4 w-4" />
                                  Mudar Plano
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Planos de Assinatura
                    </CardTitle>
                    <CardDescription>Gerencie os planos disponíveis para os usuários</CardDescription>
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
                  }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Plano
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan: any) => (
                    <Card key={plan.id} className="relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full" />
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{plan.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-3xl font-bold text-blue-600">
                          {plan.price}
                          <span className="text-sm font-normal text-slate-500">/mês</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Send className="h-4 w-4 text-slate-400" />
                            <span>{plan.maxApplications} candidaturas/mês</span>
                          </div>
                          {plan.hasAiAnalysis && (
                            <div className="flex items-center gap-2 text-sm">
                              <Sparkles className="h-4 w-4 text-purple-500" />
                              <span>Análise com IA</span>
                            </div>
                          )}
                        </div>
                        <div className="pt-4 border-t">
                          <p className="text-xs text-slate-600 whitespace-pre-line">{plan.features}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resumes Tab */}
          <TabsContent value="resumes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Análise de Currículos
                </CardTitle>
                <CardDescription>Analise currículos enviados pelos usuários com IA</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const { data: allResumes = [], refetch: refetchAllResumes } = trpc.admin.getAllResumes.useQuery(undefined, {
                    enabled: user?.role === 'admin',
                  });
                  const analyzeResumeMutation = trpc.admin.analyzeResumeAdmin.useMutation();
                  const [selectedResume, setSelectedResume] = useState<any>(null);
                  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
                  const [analysisResult, setAnalysisResult] = useState<string>("");
                  const [resumeSearchQuery, setResumeSearchQuery] = useState("");

                  const handleAnalyzeResume = async (resume: any) => {
                    try {
                      toast.loading('Analisando currículo com IA...', { id: 'analyze-resume' });
                      
                      const result = await analyzeResumeMutation.mutateAsync({
                        resumeId: resume.id,
                      });
                      
                      toast.success('Análise concluída!', { id: 'analyze-resume' });
                      setAnalysisResult(result.analysis);
                      setSelectedResume(resume);
                      setShowAnalysisDialog(true);
                      refetchAllResumes();
                    } catch (error: any) {
                      toast.error(error.message || 'Erro ao analisar currículo', { id: 'analyze-resume' });
                    }
                  };

                  const filteredResumes = allResumes.filter((r: any) => 
                    resumeSearchQuery === "" || 
                    r.fileName?.toLowerCase().includes(resumeSearchQuery.toLowerCase()) ||
                    r.userName?.toLowerCase().includes(resumeSearchQuery.toLowerCase()) ||
                    r.userEmail?.toLowerCase().includes(resumeSearchQuery.toLowerCase())
                  );

                  const getStatusBadge = (status: string) => {
                    const variants: Record<string, any> = {
                      uploaded: { variant: "secondary", label: "Enviado" },
                      analyzing: { variant: "default", label: "Analisando..." },
                      analyzed: { variant: "default", label: "Analisado" },
                      improved: { variant: "default", label: "Melhorado" },
                    };
                    const config = variants[status] || { variant: "secondary", label: status };
                    return <Badge variant={config.variant}>{config.label}</Badge>;
                  };

                  return (
                    <>
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Buscar por nome de arquivo, usuário ou email..."
                            value={resumeSearchQuery}
                            onChange={(e) => setResumeSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Arquivo</TableHead>
                              <TableHead>Usuário</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data de Envio</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredResumes.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                  Nenhum currículo encontrado
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredResumes.map((resume: any) => (
                                <TableRow key={resume.id}>
                                  <TableCell className="font-medium">#{resume.id}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-blue-600" />
                                      <span className="max-w-xs truncate">{resume.fileName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{resume.userName || "Sem nome"}</div>
                                      <div className="text-xs text-slate-500">{resume.userEmail || "Sem email"}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(resume.status)}</TableCell>
                                  <TableCell className="text-slate-600">
                                    {new Date(resume.createdAt).toLocaleDateString('pt-BR')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {resume.analyzedContent && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setSelectedResume(resume);
                                            setAnalysisResult(resume.analyzedContent);
                                            setShowAnalysisDialog(true);
                                          }}
                                          className="gap-2"
                                        >
                                          <Eye className="h-4 w-4" />
                                          Ver Análise
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleAnalyzeResume(resume)}
                                        disabled={resume.status === 'analyzing'}
                                        className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                      >
                                        <Sparkles className="h-4 w-4" />
                                        {resume.status === 'analyzing' ? 'Analisando...' : 'Analisar com IA'}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Analysis Result Dialog */}
                      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-purple-600" />
                              Análise do Currículo
                            </DialogTitle>
                            <DialogDescription>
                              {selectedResume?.fileName} - {selectedResume?.userName}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                              <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap text-slate-700">
                                  {analysisResult}
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAnalysisDialog(false)}>
                              Fechar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Promoções e Cupons
                    </CardTitle>
                    <CardDescription>Crie e gerencie códigos promocionais</CardDescription>
                  </div>
                  <Button onClick={() => setShowPromotionDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Promoção
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Nenhuma promoção cadastrada ainda.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Localizador de Vagas
                </CardTitle>
                <CardDescription>Busque vagas nos principais sites de emprego</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite palavras-chave para buscar vagas..."
                      value={jobSearchQuery}
                      onChange={(e) => setJobSearchQuery(e.target.value)}
                    />
                    <Button className="gap-2">
                      <Search className="h-4 w-4" />
                      Buscar
                    </Button>
                  </div>
                  {foundJobs.length === 0 ? (
                    <p className="text-slate-600 text-center py-8">
                      Nenhuma vaga encontrada. Faça uma busca para começar.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {foundJobs.map((job, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle>{job.title}</CardTitle>
                            <CardDescription>{job.company} - {job.location}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-slate-600">{job.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Histórico de Entregas
                </CardTitle>
                <CardDescription>Acompanhe o status de todas as candidaturas enviadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Vaga</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data de Envio</TableHead>
                        <TableHead>Payload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                            Nenhuma candidatura registrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        applications.map((app: any) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">#{app.id}</TableCell>
                            <TableCell>Usuário #{app.userId}</TableCell>
                            <TableCell>Vaga #{app.jobListingId}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  app.status === 'sent' ? 'default' :
                                  app.status === 'failed' ? 'destructive' :
                                  app.status === 'confirmed' ? 'default' :
                                  'secondary'
                                }
                              >
                                {app.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {app.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                                {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {app.status === 'confirmed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {app.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {app.sentAt ? new Date(app.sentAt).toLocaleString('pt-BR') : '-'}
                            </TableCell>
                            <TableCell>
                              {app.responsePayload ? (
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do plano de assinatura
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano</Label>
                <Input
                  id="name"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxApplications">Máximo de Candidaturas</Label>
                <Input
                  id="maxApplications"
                  type="number"
                  value={planForm.maxApplications}
                  onChange={(e) => setPlanForm({ ...planForm, maxApplications: parseInt(e.target.value) })}
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
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, hasAiAnalysis: checked })}
                  />
                  <span className="text-sm text-slate-600">
                    {planForm.hasAiAnalysis ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Recursos (um por linha)</Label>
              <Textarea
                id="features"
                value={planForm.features}
                onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                rows={4}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPlanDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPlan ? 'Atualizar' : 'Criar'} Plano
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas sobre o usuário
            </DialogDescription>
          </DialogHeader>
          {userDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Nome</Label>
                  <p className="font-medium">{userDetails.user.name || "Sem nome"}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Email</Label>
                  <p className="font-medium">{userDetails.user.email || "Sem email"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Plano Atual</Label>
                  <p className="font-medium">{userDetails.plan?.name || "Sem plano"}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Role</Label>
                  <Badge variant={userDetails.user.role === 'admin' ? "destructive" : "outline"}>
                    {userDetails.user.role === 'admin' ? 'Admin' : 'Usuário'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-slate-600">Currículos</Label>
                  <p className="text-2xl font-bold text-blue-600">{userDetails.stats.totalResumes}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Candidaturas</Label>
                  <p className="text-2xl font-bold text-green-600">{userDetails.stats.totalApplications}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Integrações</Label>
                  <p className="text-2xl font-bold text-purple-600">{userDetails.stats.totalIntegrations}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setShowUserDialog(false);
              handleChangePlan(selectedUser);
            }} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Mudar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar Plano do Usuário</DialogTitle>
            <DialogDescription>
              Selecione o novo plano para {selectedUser?.name || 'este usuário'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan-select">Novo Plano</Label>
              <Select
                value={selectedPlanId?.toString() || "none"}
                onValueChange={(value) => setSelectedPlanId(value === "none" ? null : parseInt(value))}
              >
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem plano</SelectItem>
                  {plans.map((plan: any) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlanId && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Atenção:</strong> Esta ação irá alterar imediatamente o plano do usuário.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUserPlan} disabled={!selectedPlanId}>
              Confirmar Mudança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promotion Dialog */}
      <Dialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Promoção</DialogTitle>
            <DialogDescription>
              Configure um código promocional para seus usuários
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={promotionForm.code}
                onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value })}
                placeholder="PROMO2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-description">Descrição</Label>
              <Input
                id="promo-description"
                value={promotionForm.description}
                onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                placeholder="Desconto especial de lançamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={promotionForm.discountPercent}
                  onChange={(e) => setPromotionForm({ ...promotionForm, discountPercent: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido até</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={promotionForm.validUntil}
                  onChange={(e) => setPromotionForm({ ...promotionForm, validUntil: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromotionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast.success('Promoção criada com sucesso!');
              setShowPromotionDialog(false);
            }}>
              Criar Promoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
