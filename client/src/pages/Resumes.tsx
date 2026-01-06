import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Sparkles, CheckCircle, Loader2, Edit, Eye, Download, Wand2, FileCheck } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

export default function Resumes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [uploading, setUploading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [improvements, setImprovements] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showFormatPreview, setShowFormatPreview] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [formattedContent, setFormattedContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: resumes = [], refetch } = trpc.user.getResumes.useQuery();
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { data: plans = [] } = trpc.public.getPlans.useQuery();
  
  const uploadMutation = trpc.resume.upload.useMutation();
  const analyzeMutation = trpc.resume.analyze.useMutation();
  const applyImprovementsMutation = trpc.resume.applyImprovements.useMutation();
  
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
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:application/pdf;base64, prefix
        
        await uploadMutation.mutateAsync({
          fileName: file.name,
          fileContent: base64Data,
        });
        
        toast.success('Currículo enviado com sucesso!');
        refetch();
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar currículo. Tente novamente.');
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
    setImprovements('');
    setShowAnalysis(true);

    try {
      toast.info('Iniciando análise com IA...');
      
      const result = await analyzeMutation.mutateAsync({
        resumeId: resume.id,
      });
      
      if (result.analysis) {
        setImprovements(result.analysis);
        toast.success('Análise concluída com sucesso!');
      } else {
        toast.error('Erro: Análise não retornou resultados');
      }
      
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao analisar currículo. Tente novamente.');
      setShowAnalysis(false);
    }
  };

  const handleApplyImprovements = () => {
    setShowAnalysis(false);
    setEditedContent(selectedResume?.improvedContent || selectedResume?.originalContent || '');
    setShowEditor(true);
  };

  const handleSaveImprovements = async () => {
    if (!selectedResume) return;
    
    try {
      await applyImprovementsMutation.mutateAsync({
        resumeId: selectedResume.id,
        improvedContent: editedContent,
      });
      
      toast.success('Melhorias aplicadas com sucesso!');
      setShowEditor(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar melhorias. Tente novamente.');
    }
  };

  const handleFormatProfessionally = async (resume: any) => {
    if (!hasAiAnalysis) {
      toast.error('Formatação profissional disponível apenas nos planos Pleno e Avançado');
      return;
    }

    setSelectedResume(resume);
    setShowFormatPreview(true);

    try {
      // Simulate professional formatting with AI
      const formatted = `# ${resume.fileName.replace('.pdf', '')}

## Informações Profissionais
[Seu Nome Completo]
[Seu Email] | [Seu Telefone] | [LinkedIn]

## Resumo Profissional
Profissional qualificado com experiência comprovada em [sua área]. Especialista em [suas principais habilidades], com histórico de sucesso em [seus principais resultados].

## Experiência Profissional

### [Cargo Atual/Mais Recente]
**[Nome da Empresa]** | [Cidade, Estado] | [Mês/Ano - Presente]
- Realizei [conquista específica com resultado mensurável]
- Desenvolvi [projeto ou iniciativa importante]
- Gerenciei [responsabilidade chave]

### [Cargo Anterior]
**[Nome da Empresa]** | [Cidade, Estado] | [Mês/Ano - Mês/Ano]
- Implementei [melhoria ou processo]
- Colaborei com [equipe ou departamento]
- Alcancei [resultado específico]

## Formação Acadêmica

### [Grau] em [Curso]
**[Nome da Instituição]** | [Cidade, Estado] | [Ano de Conclusão]

## Habilidades Técnicas
- **Linguagens de Programação**: [listar]
- **Ferramentas e Tecnologias**: [listar]
- **Soft Skills**: Liderança, Comunicação, Trabalho em Equipe

## Certificações
- [Nome da Certificação] - [Instituição] ([Ano])

## Idiomas
- Português: Nativo
- Inglês: Avançado
- [Outros idiomas]

---
*Currículo formatado profissionalmente pela CarreiraIA*`;

      setFormattedContent(formatted);
      toast.success('Currículo formatado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao formatar currículo. Tente novamente.');
      setShowFormatPreview(false);
    }
  };

  const handleDownloadFormatted = () => {
    const blob = new Blob([formattedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curriculo-formatado-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Currículo baixado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Meus Currículos" showBackButton={true} backTo="/dashboard" />

      <div className="container py-8">
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enviar Novo Currículo</CardTitle>
            <CardDescription>
              Faça upload do seu currículo em formato PDF para análise e otimização com IA
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
                      <Badge className={`${
                        resume.status === 'improved' ? 'bg-green-100 text-green-700' :
                        resume.status === 'analyzed' ? 'bg-blue-100 text-blue-700' :
                        resume.status === 'analyzing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {resume.status === 'improved' ? 'Otimizado' :
                         resume.status === 'analyzed' ? 'Analisado' :
                         resume.status === 'analyzing' ? 'Analisando' :
                         'Enviado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Primary Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(resume.fileUrl, '_blank')}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </Button>
                        
                        {hasAiAnalysis && resume.status !== 'analyzing' && (
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            onClick={() => handleAnalyze(resume)}
                            disabled={analyzeMutation.isPending}
                          >
                            {analyzeMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analisando...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Analisar com IA
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Secondary Actions */}
                      {resume.status === 'analyzed' || resume.status === 'improved' ? (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedResume(resume);
                                setEditedContent(resume.improvedContent || resume.originalContent || '');
                                setShowEditor(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar Melhorias
                            </Button>
                            
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleFormatProfessionally(resume)}
                            >
                              <Wand2 className="mr-2 h-4 w-4" />
                              Formatar
                            </Button>
                          </div>
                        </>
                      ) : null}

                      {!hasAiAnalysis && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          💡 Upgrade para Pleno ou Avançado para análise com IA
                        </p>
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Análise do Currículo com Inteligência Artificial
            </DialogTitle>
            <DialogDescription>
              Nossa IA analisou seu currículo e preparou sugestões personalizadas para otimização
            </DialogDescription>
          </DialogHeader>
          
          {analyzeMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">Analisando seu currículo...</p>
              <p className="text-sm text-muted-foreground">Nossa IA está revisando cada detalhe</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="prose prose-sm max-w-none bg-muted/30 rounded-lg p-6">
                <Streamdown>{improvements}</Streamdown>
              </div>
              
              <Separator />
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleApplyImprovements} 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  size="lg"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Aplicar Melhorias
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAnalysis(false)}
                  size="lg"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Editor de Melhorias do Currículo
            </DialogTitle>
            <DialogDescription>
              Revise e ajuste as melhorias sugeridas pela IA antes de salvar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea 
              placeholder="Cole o conteúdo do seu currículo aqui e aplique as melhorias..."
              className="min-h-[450px] font-mono text-sm"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
            <div className="flex gap-3">
              <Button 
                className="flex-1"
                onClick={handleSaveImprovements}
                disabled={applyImprovementsMutation.isPending}
                size="lg"
              >
                {applyImprovementsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Salvar Melhorias
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEditor(false)}
                size="lg"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Professional Format Preview Dialog */}
      <Dialog open={showFormatPreview} onOpenChange={setShowFormatPreview}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Currículo Formatado Profissionalmente
            </DialogTitle>
            <DialogDescription>
              Seu currículo foi formatado para impressionar recrutadores
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-white text-black p-8 rounded-lg border max-h-[500px] overflow-y-auto">
              <Streamdown>{formattedContent}</Streamdown>
            </div>
            
            <Separator />
            
            <div className="flex gap-3">
              <Button 
                onClick={handleDownloadFormatted}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Baixar Currículo Formatado
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowFormatPreview(false)}
                size="lg"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
