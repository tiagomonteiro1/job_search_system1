import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Users, 
  CreditCard, 
  Trash2,
  Upload,
  Sparkles,
  Search,
  BarChart3
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Navigation state
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  
  // Upload and analysis state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedResumeId, setUploadedResumeId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  
  // User management state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  
  // Clean cache dialog
  const [showCleanDialog, setShowCleanDialog] = useState(false);

  // Queries
  const { data: users = [] } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  
  const { data: allResumes = [], refetch: refetchResumes } = trpc.admin.getAllResumes.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  
  const { data: applications = [] } = trpc.admin.getAllApplications.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  
  const { data: plans = [] } = trpc.public.getPlans.useQuery();
  
  // Mutations
  const uploadResumeMutation = trpc.resume.upload.useMutation();
  const analyzeResumeMutation = trpc.resume.analyze.useMutation();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são permitidos');
        return;
      }
      if (file.size > 16 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 16MB');
        return;
      }
      setSelectedFile(file);
      setAnalysisResult("");
      setUploadedResumeId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo PDF');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        const result = await uploadResumeMutation.mutateAsync({
          fileName: selectedFile.name,
          fileContent: base64.split(',')[1], // Remove data:application/pdf;base64, prefix
        });
        
        // Get the resume ID from the database
        const resumes = await refetchResumes();
        const latestResume = resumes.data?.[0];
        if (latestResume) {
          setUploadedResumeId(latestResume.id);
        }
        toast.success('Currículo enviado com sucesso!');
        refetchResumes();
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar currículo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedResumeId) {
      toast.error('Faça o upload do currículo primeiro');
      return;
    }

    setIsAnalyzing(true);
    try {
      toast.loading('Analisando currículo com IA...', { id: 'analyze' });
      
      const result = await analyzeResumeMutation.mutateAsync({
        resumeId: uploadedResumeId,
      });
      
      if (!result.analysis || result.analysis.trim() === '') {
        throw new Error('A IA retornou uma análise vazia');
      }
      
      setAnalysisResult(result.analysis);
      toast.success('Análise concluída!', { id: 'analyze' });
      refetchResumes();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao analisar currículo', { id: 'analyze' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCleanCache = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    toast.success('Cache e cookies limpos com sucesso!');
    setShowCleanDialog(false);
    
    // Reload page
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const filteredUsers = users.filter((u: any) => 
    userSearchQuery === "" || 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    totalResumes: allResumes.length,
    totalApplications: applications.length,
    totalPlans: plans.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PageHeader title="Painel Administrativo" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Navigation Menu */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              <Button
                variant={activeSection === "dashboard" ? "default" : "outline"}
                onClick={() => setActiveSection("dashboard")}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant={activeSection === "upload" ? "default" : "outline"}
                onClick={() => setActiveSection("upload")}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload & Análise
              </Button>
              <Button
                variant={activeSection === "users" ? "default" : "outline"}
                onClick={() => setActiveSection("users")}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Usuários
              </Button>
              <Button
                variant={activeSection === "resumes" ? "default" : "outline"}
                onClick={() => setActiveSection("resumes")}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Currículos
              </Button>
              <Button
                variant={activeSection === "plans" ? "default" : "outline"}
                onClick={() => setActiveSection("plans")}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Planos
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowCleanDialog(true)}
                className="flex items-center gap-2 ml-auto"
              >
                <Trash2 className="h-4 w-4" />
                Clean
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Section */}
        {activeSection === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Currículos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.totalResumes}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Candidaturas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.totalApplications}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Planos Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.totalPlans}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload & Analysis Section */}
        {activeSection === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload e Análise de Currículo
              </CardTitle>
              <CardDescription>Envie um currículo e analise com IA na mesma tela</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resume-file">Selecionar Currículo (PDF)</Label>
                  <Input
                    id="resume-file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="mt-2"
                  />
                  {selectedFile && (
                    <p className="text-sm text-slate-600 mt-2">
                      Arquivo selecionado: {selectedFile.name}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Enviando...' : 'Enviar Currículo'}
                  </Button>
                  
                  <Button
                    onClick={handleAnalyze}
                    disabled={!uploadedResumeId || isAnalyzing}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                  </Button>
                </div>
              </div>

              {/* Analysis Result */}
              {analysisResult && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Resultado da Análise
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                      <Streamdown>{analysisResult}</Streamdown>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Users Section */}
        {activeSection === "users" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciamento de Usuários
              </CardTitle>
              <CardDescription>Visualize e gerencie todos os usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar usuário por nome ou email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                {filteredUsers.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedUser(u);
                      setShowUserDialog(true);
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{u.name || 'Sem nome'}</p>
                      <p className="text-sm text-slate-600">{u.email}</p>
                    </div>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumes Section */}
        {activeSection === "resumes" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Todos os Currículos
              </CardTitle>
              <CardDescription>Visualize currículos enviados pelos usuários</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allResumes.map((resume: any) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{resume.fileName}</p>
                      <p className="text-sm text-slate-600">
                        Usuário: {resume.userName || resume.userEmail}
                      </p>
                    </div>
                    <Badge>
                      {resume.status === 'uploaded' && 'Enviado'}
                      {resume.status === 'analyzing' && 'Analisando'}
                      {resume.status === 'analyzed' && 'Analisado'}
                      {resume.status === 'improved' && 'Melhorado'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Section */}
        {activeSection === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: any) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-blue-600">
                      R$ {plan.price.toFixed(2)}
                    </span>
                    /mês
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{plan.features}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                <p className="text-sm font-medium">{selectedUser.name || 'Não informado'}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <Label>Role</Label>
                <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                  {selectedUser.role}
                </Badge>
              </div>
              <div>
                <Label>Data de Cadastro</Label>
                <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clean Cache Dialog */}
      <Dialog open={showCleanDialog} onOpenChange={setShowCleanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar Cache e Cookies</DialogTitle>
            <DialogDescription>
              Esta ação irá limpar todo o cache e cookies armazenados. Você será redirecionado para a página inicial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCleanCache}>
              Confirmar Limpeza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
