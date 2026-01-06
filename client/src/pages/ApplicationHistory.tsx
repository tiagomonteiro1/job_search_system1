import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, Send, ExternalLink, Code } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function ApplicationHistory() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showPayload, setShowPayload] = useState(false);
  
  const { data: applications = [] } = trpc.user.getApplications.useQuery();
  
  if (!user) {
    setLocation("/");
    return null;
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            Enviado com Sucesso
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="mr-1 h-3 w-3" />
            Falha no Envio
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const getJobDetails = (application: any) => {
    // Extract job info from application if available
    return {
      title: "Vaga",
      company: "Empresa",
      location: "Localização",
      url: ""
    };
  };
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Histórico de Envios" showBackButton={true} backTo="/dashboard" />
      
      <div className="container py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Todas as Candidaturas</CardTitle>
            <CardDescription>
              Acompanhe o status de todas as suas candidaturas enviadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">
                  {applications.filter(a => a.status === "sent" || a.status === "confirmed").length}
                </div>
                <div className="text-sm text-green-600">Enviadas com Sucesso</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-700">
                  {applications.filter(a => a.status === "pending").length}
                </div>
                <div className="text-sm text-yellow-600">Pendentes</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">
                  {applications.filter(a => a.status === "failed").length}
                </div>
                <div className="text-sm text-red-600">Falharam</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Send className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma candidatura enviada</p>
              <p className="text-sm text-muted-foreground">
                Comece buscando vagas e enviando seu currículo
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const job = getJobDetails(application);
              
              return (
                <Card key={application.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{job?.title || "Vaga Desconhecida"}</CardTitle>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Empresa:</strong> {job?.company || "N/A"}</p>
                          <p><strong>Localização:</strong> {job?.location || "N/A"}</p>
                          <p><strong>Data de Envio:</strong> {application.sentAt ? new Date(application.sentAt).toLocaleString("pt-BR") : "Não enviado"}</p>
                          {application.retryCount > 0 && (
                            <p><strong>Tentativas:</strong> {application.retryCount}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {job?.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(job.url, "_blank")}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Vaga
                        </Button>
                      )}
                      {application.responsePayload && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowPayload(true);
                          }}
                        >
                          <Code className="mr-2 h-4 w-4" />
                          Ver Payload
                        </Button>
                      )}
                    </div>
                    {application.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Erro:</strong> {application.errorMessage}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Payload Dialog */}
      <Dialog open={showPayload} onOpenChange={setShowPayload}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payload da Requisição</DialogTitle>
            <DialogDescription>
              Detalhes técnicos da requisição POST enviada ao site da vaga
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              {selectedApplication?.responsePayload 
                ? JSON.stringify(JSON.parse(selectedApplication.responsePayload), null, 2)
                : "Nenhum payload disponível"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
