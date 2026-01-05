import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { FileText, Upload, Search, Send, Settings, BarChart } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { data: resumes = [] } = trpc.user.getResumes.useQuery();
  const { data: applications = [] } = trpc.user.getApplications.useQuery();
  const { data: plans = [] } = trpc.public.getPlans.useQuery();
  
  const currentPlan = plans.find(p => p.id === profile?.subscriptionPlanId);
  const applicationsUsed = applications.length;
  const applicationsLimit = currentPlan?.maxApplications || 0;
  const progressPercentage = applicationsLimit > 0 ? (applicationsUsed / applicationsLimit) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" onClick={() => setLocation("/")}>
              ← Voltar
            </Button>
            <h1 className="text-xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Olá, {user?.name || "Usuário"}
            </span>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo de volta!</h2>
          <p className="text-muted-foreground">
            Gerencie seus currículos e acompanhe suas candidaturas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentPlan?.name || "Nenhum"}</div>
              <p className="text-xs text-muted-foreground">
                {currentPlan ? `R$ ${currentPlan.price}/mês` : "Selecione um plano"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currículos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumes.length}</div>
              <p className="text-xs text-muted-foreground">
                {resumes.length === 1 ? "currículo enviado" : "currículos enviados"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidaturas</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applicationsUsed}</div>
              <p className="text-xs text-muted-foreground">
                de {applicationsLimit} disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {applications.length > 0 
                  ? Math.round((applications.filter(a => a.status === 'confirmed').length / applications.length) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                candidaturas confirmadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Progress */}
        {currentPlan && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Uso do Plano</CardTitle>
              <CardDescription>
                Você usou {applicationsUsed} de {applicationsLimit} candidaturas disponíveis este mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercentage} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/resumes")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Meus Currículos</CardTitle>
              <CardDescription>
                Envie e gerencie seus currículos com análise de IA
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/jobs")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Procurar Vagas</CardTitle>
              <CardDescription>
                Encontre vagas compatíveis com seu perfil
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/applications")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Minhas Candidaturas</CardTitle>
              <CardDescription>
                Acompanhe o status das suas candidaturas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setLocation("/integrations")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Conecte suas contas de sites de emprego
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Suas últimas ações na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 && resumes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma atividade ainda.</p>
                <p className="text-sm mt-2">Comece enviando seu primeiro currículo!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">Candidatura enviada</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      app.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      app.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      app.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {app.status === 'confirmed' ? 'Confirmada' :
                       app.status === 'sent' ? 'Enviada' :
                       app.status === 'failed' ? 'Falhou' :
                       'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
