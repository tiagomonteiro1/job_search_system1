import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, MapPin, DollarSign, Building2, Send, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Jobs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { data: resumes = [] } = trpc.user.getResumes.useQuery();
  const { data: applications = [], refetch: refetchApplications } = trpc.user.getApplications.useQuery();
  const { data: plans = [] } = trpc.public.getPlans.useQuery();
  
  const searchMutation = trpc.jobs.searchJobs.useMutation();
  const applyMutation = trpc.jobs.applyToJob.useMutation();
  
  const currentPlan = plans.find(p => p.id === profile?.subscriptionPlanId);
  const applicationsLimit = currentPlan?.maxApplications || 0;
  const applicationsUsed = applications.length;
  const canApply = applicationsUsed < applicationsLimit;

  const handleSearchJobs = async () => {
    if (resumes.length === 0) {
      toast.error('Envie um currículo antes de buscar vagas');
      return;
    }

    try {
      const result = await searchMutation.mutateAsync({
        query: searchQuery,
      });
      
      setJobs(result.jobs);
      toast.success(`${result.jobs.length} vagas encontradas!`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar vagas. Tente novamente.');
    }
  };

  const handleApplyToJob = async (job: any) => {
    if (!canApply) {
      toast.error(`Você atingiu o limite de ${applicationsLimit} candidaturas do seu plano`);
      return;
    }

    if (resumes.length === 0) {
      toast.error('Envie um currículo antes de se candidatar');
      return;
    }

    try {
      await applyMutation.mutateAsync({
        jobListingId: job.id || 1,
        resumeId: resumes[0].id,
      });
      
      toast.success('Candidatura enviada com sucesso!');
      refetchApplications();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar candidatura. Tente novamente.');
    }
  };

  const handleApplyToAll = async () => {
    const remainingApplications = applicationsLimit - applicationsUsed;
    
    if (jobs.length === 0) {
      toast.info('Faça uma busca primeiro para encontrar vagas');
      return;
    }

    if (remainingApplications === 0) {
      toast.error(`Você atingiu o limite de ${applicationsLimit} candidaturas do seu plano`);
      return;
    }

    const jobsToApply = jobs.slice(0, remainingApplications);
    
    toast.info(`Enviando candidatura para ${jobsToApply.length} vagas...`);
    
    try {
      for (const job of jobsToApply) {
        await applyMutation.mutateAsync({
          jobListingId: job.id || 1,
          resumeId: resumes[0]?.id,
        });
      }
      
      toast.success(`${jobsToApply.length} candidaturas enviadas com sucesso!`);
      refetchApplications();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar candidaturas. Tente novamente.');
    }
  };

  const isJobApplied = (job: any) => {
    return applications.some(app => app.jobListingId === job.id);
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
            <h1 className="text-xl font-bold">Procurar Vagas</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {applicationsUsed} / {applicationsLimit} candidaturas usadas
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buscar Vagas Compatíveis</CardTitle>
            <CardDescription>
              Nossa IA encontra vagas que combinam com seu perfil profissional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cargo, empresa ou palavra-chave..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                />
              </div>
              <Button 
                onClick={handleSearchJobs} 
                disabled={searchMutation.isPending || resumes.length === 0}
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar Vagas
                  </>
                )}
              </Button>
            </div>
            {resumes.length === 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                ⚠️ Envie um currículo antes de buscar vagas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats and Actions */}
        {jobs.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Vagas Encontradas</h2>
              <p className="text-sm text-muted-foreground">
                {jobs.length} vagas compatíveis com seu perfil
              </p>
            </div>
            <Button 
              onClick={handleApplyToAll}
              disabled={!canApply || applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar para Todas
                </>
              )}
            </Button>
          </div>
        )}

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma vaga encontrada</p>
              <p className="text-sm text-muted-foreground">
                Faça uma busca para encontrar vagas compatíveis
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, index) => {
              const applied = isJobApplied(job);
              
              return (
                <Card key={index} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{job.title}</CardTitle>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {job.matchScore}% compatível
                          </Badge>
                          {applied && (
                            <Badge className="bg-green-100 text-green-700">
                              Candidatura Enviada
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {job.company}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {job.salary}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Descrição</h4>
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Requisitos</h4>
                        <p className="text-sm text-muted-foreground">{job.requirements}</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Fonte:</span>
                          <Badge variant="outline">{job.sourceSite}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(job.sourceUrl, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Vaga
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleApplyToJob(job)}
                            disabled={applied || !canApply || applyMutation.isPending}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {applied ? 'Candidatura Enviada' : 'Candidatar-se'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
