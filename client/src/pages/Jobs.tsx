import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Search, MapPin, DollarSign, Building2, Send, Loader2, ExternalLink, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Jobs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocationFilter] = useState("");
  const [contractType, setContractType] = useState<string>("all");
  const [workMode, setWorkMode] = useState<string>("all");
  const [seniorityLevel, setSeniorityLevel] = useState<string>("all");
  const [minSalary, setMinSalary] = useState<number[]>([0]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 20;
  
  // Calculate pagination
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(jobs.length / jobsPerPage);
  
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
      
      setJobs(result.jobs || []);
      setCurrentPage(1); // Reset to first page
      toast.success(`${result.jobs?.length || 0} vagas encontradas`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar vagas');
    }
  };

  const handleApplyToJob = async (jobId: number) => {
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
        jobListingId: jobId,
        resumeId: resumes[0]?.id,
      });
      
      await refetchApplications();
      toast.success('Candidatura enviada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar candidatura');
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setLocationFilter("");
    setContractType("all");
    setWorkMode("all");
    setSeniorityLevel("all");
    setMinSalary([0]);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Faça login para buscar vagas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PageHeader title="Buscar Vagas" />

      <div className="container mx-auto py-8 px-4">
        {/* Status do Plano */}
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Plano {currentPlan?.name || 'Não definido'}</h3>
                <p className="text-sm text-muted-foreground">
                  {applicationsUsed} de {applicationsLimit} candidaturas utilizadas
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {applicationsLimit - applicationsUsed}
                </div>
                <p className="text-sm text-muted-foreground">restantes</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${(applicationsUsed / applicationsLimit) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Busca e Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Buscar Vagas</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Busca Principal */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cargo, palavra-chave ou empresa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                  className="pl-10"
                />
              </div>
              <div className="w-64 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Localização"
                  value={location}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleSearchJobs}
                disabled={searchMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>

            {/* Filtros Avançados */}
            {showFilters && (
              <div className="pt-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tipo de Contrato */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Contrato</label>
                    <Select value={contractType} onValueChange={setContractType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                        <SelectItem value="Freelance">Freelance</SelectItem>
                        <SelectItem value="Estágio">Estágio</SelectItem>
                        <SelectItem value="Temporário">Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Modalidade de Trabalho */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modalidade</label>
                    <Select value={workMode} onValueChange={setWorkMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="Remoto">Remoto</SelectItem>
                        <SelectItem value="Híbrido">Híbrido</SelectItem>
                        <SelectItem value="Presencial">Presencial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nível de Senioridade */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nível</label>
                    <Select value={seniorityLevel} onValueChange={setSeniorityLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Estágio">Estágio</SelectItem>
                        <SelectItem value="Júnior">Júnior</SelectItem>
                        <SelectItem value="Pleno">Pleno</SelectItem>
                        <SelectItem value="Sênior">Sênior</SelectItem>
                        <SelectItem value="Especialista">Especialista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Salário Mínimo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Salário Mínimo: R$ {minSalary[0].toLocaleString('pt-BR')}
                  </label>
                  <Slider
                    value={minSalary}
                    onValueChange={setMinSalary}
                    min={0}
                    max={30000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>R$ 0</span>
                    <span>R$ 30.000+</span>
                  </div>
                </div>

                {/* Botão Limpar Filtros */}
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Vagas */}
        {jobs.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {indexOfFirstJob + 1}-{Math.min(indexOfLastJob, jobs.length)} de {jobs.length} vagas
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {currentJobs.map((job) => {
                const hasApplied = applications.some(app => app.jobListingId === job.id);
                return (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {job.company}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </Badge>
                          {job.salary && (
                            <Badge variant="outline" className="flex items-center gap-1 text-green-600">
                              <DollarSign className="w-3 h-3" />
                              {job.salary}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {job.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.contractType && (
                        <Badge variant="outline">{job.contractType}</Badge>
                      )}
                      {job.workMode && (
                        <Badge variant="outline">{job.workMode}</Badge>
                      )}
                      {job.seniorityLevel && (
                        <Badge variant="outline">{job.seniorityLevel}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {hasApplied && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                          ✓ Já Candidatado
                        </Badge>
                      )}
                      <Button
                        onClick={() => handleApplyToJob(job.id)}
                        disabled={!canApply || applyMutation.isPending || hasApplied}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                      >
                        {applyMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : hasApplied ? (
                          <>
                            ✓ Já Candidatado
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Candidatar-se
                          </>
                        )}
                      </Button>
                      {job.url && (
                        <Button variant="outline" asChild>
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver Vaga
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>

            {/* Paginação Inferior */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                <span className="text-sm px-4">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma vaga encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Use a busca acima para encontrar oportunidades compatíveis com seu perfil
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
