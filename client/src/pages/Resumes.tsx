import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Sparkles, CheckCircle, Loader2, Edit, Eye } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

export default function Resumes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [improvements, setImprovements] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: resumes = [], refetch } = trpc.user.getResumes.useQuery();
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { data: plans = [] } = trpc.public.getPlans.useQuery();
  
  const currentPlan = plans.find(p => p.id === profile?.subscriptionPlanId);
  const hasAiAnalysis = currentPlan?.hasAiAnalysis || false;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Por favor, envie apenas arquivos PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB');
      return;
    }

    setUploading(true);
    
    try {
      // Simular upload para S3 (implementar com storagePut no backend)
      const formData = new FormData();
      formData.append('file', file);
      
      // TODO: Implementar endpoint de upload real
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Currículo enviado com sucesso!');
      refetch();
    } catch (error) {
      toast.error('Erro ao enviar currículo. Tente novamente.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAnalyze = async (resume: any) => {
    if (!hasAiAnalysis) {
      toast.error('Análise com IA disponível apenas nos planos Pleno e Avançado');
      return;
    }

    setSelectedResume(resume);
    setAnalyzing(true);
    setShowAnalysis(true);

    try {
      // TODO: Implementar chamada real para análise com IA
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAnalysis = `# Análise do Currículo

## Pontos Fortes
- Experiência relevante na área
- Boa estruturação de informações
- Formação acadêmica sólida

## Sugestões de Melhoria

### 1. Otimização de Palavras-chave
Adicione palavras-chave específicas da sua área para melhorar a visibilidade em sistemas ATS (Applicant Tracking Systems).

### 2. Quantificação de Resultados
Sempre que possível, adicione números e métricas para demonstrar o impacto do seu trabalho. Por exemplo:
- "Aumentei as vendas em 30%"
- "Gerenciei equipe de 10 pessoas"
- "Reduzi custos em R$ 50.000"

### 3. Formatação Profissional
- Use bullet points para facilitar a leitura
- Mantenha consistência na formatação
- Destaque suas principais conquistas

### 4. Seção de Habilidades
Crie uma seção dedicada às suas habilidades técnicas e comportamentais mais relevantes para a vaga desejada.

### 5. Resumo Profissional
Adicione um breve resumo no início do currículo destacando sua experiência e objetivos profissionais.`;

      setImprovements(mockAnalysis);
      toast.success('Análise concluída!');
    } catch (error) {
      toast.error('Erro ao analisar currículo. Tente novamente.');
      setShowAnalysis(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyImprovements = () => {
    setShowAnalysis(false);
    setShowEditor(true);
    toast.info('Abra o editor para aplicar as melhorias sugeridas');
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
            <h1 className="text-xl font-bold">Meus Currículos</h1>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enviar Novo Currículo</CardTitle>
            <CardDescription>
              Faça upload do seu currículo em formato PDF para análise e otimização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Arraste seu currículo aqui</p>
              <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Arquivo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Formatos aceitos: PDF (máx. 10MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resumes List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Currículos Enviados</h2>
          
          {resumes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum currículo enviado ainda</p>
                <p className="text-sm text-muted-foreground">
                  Envie seu primeiro currículo para começar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {resumes.map((resume) => (
                <Card key={resume.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{resume.fileName}</CardTitle>
                          <CardDescription>
                            Enviado em {new Date(resume.createdAt).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        resume.status === 'improved' ? 'bg-green-100 text-green-700' :
                        resume.status === 'analyzed' ? 'bg-blue-100 text-blue-700' :
                        resume.status === 'analyzing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {resume.status === 'improved' ? 'Otimizado' :
                         resume.status === 'analyzed' ? 'Analisado' :
                         resume.status === 'analyzing' ? 'Analisando' :
                         'Enviado'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.open(resume.fileUrl, '_blank')}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                      
                      {hasAiAnalysis && resume.status !== 'analyzing' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleAnalyze(resume)}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analisar com IA
                        </Button>
                      )}
                      
                      {resume.status === 'analyzed' && (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedResume(resume);
                            setShowEditor(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Dialog */}
      <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análise do Currículo com IA</DialogTitle>
            <DialogDescription>
              Confira as sugestões de melhoria para otimizar seu currículo
            </DialogDescription>
          </DialogHeader>
          
          {analyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Analisando seu currículo...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <Streamdown>{improvements}</Streamdown>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleApplyImprovements} className="flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Inserir Modificações
                </Button>
                <Button variant="outline" onClick={() => setShowAnalysis(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Editor de Currículo</DialogTitle>
            <DialogDescription>
              Aplique as melhorias sugeridas pela IA ao seu currículo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea 
              placeholder="Cole o conteúdo do seu currículo aqui e aplique as melhorias..."
              className="min-h-[400px] font-mono text-sm"
              defaultValue={selectedResume?.improvedContent || selectedResume?.originalContent || ''}
            />
            <div className="flex gap-3">
              <Button className="flex-1">
                <CheckCircle className="mr-2 h-4 w-4" />
                Salvar Melhorias
              </Button>
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
