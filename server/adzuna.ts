/**
 * Integração com Adzuna Jobs API
 * Documentação: https://developer.adzuna.com/
 */

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api";

if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
  console.warn("⚠️  ADZUNA_APP_ID ou ADZUNA_APP_KEY não configurados. A busca de vagas usará dados mockados.");
}

export interface AdzunaJobSearchParams {
  what?: string; // Palavras-chave (ex: "desenvolvedor")
  where?: string; // Localização (ex: "São Paulo")
  page?: number; // Número da página (padrão: 1)
  resultsPerPage?: number; // Resultados por página (padrão: 20, máximo: 50)
  salaryMin?: number; // Salário mínimo
  salaryMax?: number; // Salário máximo
  sortBy?: "relevance" | "date" | "salary"; // Ordenação
  fullTime?: boolean; // Apenas tempo integral
  partTime?: boolean; // Apenas meio período
  permanent?: boolean; // Apenas permanente
  contract?: boolean; // Apenas contrato
  maxDaysOld?: number; // Vagas publicadas nos últimos X dias
}

export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  created: string;
  redirect_url: string;
  company: {
    display_name: string;
  };
  location: {
    display_name: string;
    area?: string[];
  };
  category?: {
    label: string;
    tag: string;
  };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: number;
  contract_type?: string;
  contract_time?: string;
  latitude?: number;
  longitude?: number;
}

export interface AdzunaSearchResponse {
  count: number;
  mean?: number;
  results: AdzunaJob[];
}

/**
 * Busca vagas na API Adzuna
 */
export async function searchAdzunaJobs(
  params: AdzunaJobSearchParams,
  country: string = "br"
): Promise<AdzunaSearchResponse> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Credenciais da API Adzuna não configuradas");
  }

  const page = params.page || 1;
  const resultsPerPage = Math.min(params.resultsPerPage || 20, 50);

  // Construir URL
  const url = new URL(`${ADZUNA_BASE_URL}/jobs/${country}/search/${page}`);
  
  // Adicionar parâmetros obrigatórios
  url.searchParams.append("app_id", ADZUNA_APP_ID);
  url.searchParams.append("app_key", ADZUNA_APP_KEY);
  url.searchParams.append("results_per_page", resultsPerPage.toString());
  url.searchParams.append("content-type", "application/json");

  // Adicionar parâmetros opcionais
  if (params.what) {
    url.searchParams.append("what", params.what);
  }
  if (params.where) {
    url.searchParams.append("where", params.where);
  }
  if (params.salaryMin) {
    url.searchParams.append("salary_min", params.salaryMin.toString());
  }
  if (params.salaryMax) {
    url.searchParams.append("salary_max", params.salaryMax.toString());
  }
  if (params.sortBy) {
    url.searchParams.append("sort_by", params.sortBy);
  }
  if (params.fullTime) {
    url.searchParams.append("full_time", "1");
  }
  if (params.partTime) {
    url.searchParams.append("part_time", "1");
  }
  if (params.permanent) {
    url.searchParams.append("permanent", "1");
  }
  if (params.contract) {
    url.searchParams.append("contract", "1");
  }
  if (params.maxDaysOld) {
    url.searchParams.append("max_days_old", params.maxDaysOld.toString());
  }

  console.log(`[Adzuna] Buscando vagas: ${url.toString()}`);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Adzuna] Erro na API: ${response.status} - ${errorText}`);
      throw new Error(`Erro na API Adzuna: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`[Adzuna] ${data.results?.length || 0} vagas encontradas (total: ${data.count || 0})`);

    return data as AdzunaSearchResponse;
  } catch (error: any) {
    console.error("[Adzuna] Erro ao buscar vagas:", error);
    throw new Error(`Erro ao buscar vagas: ${error.message}`);
  }
}

/**
 * Testa a conexão com a API Adzuna
 */
export async function testAdzunaConnection(): Promise<boolean> {
  try {
    const result = await searchAdzunaJobs({
      what: "developer",
      resultsPerPage: 1,
    }, "br");

    return result.results.length >= 0; // API funcionando mesmo sem resultados
  } catch (error) {
    console.error("[Adzuna] Teste de conexão falhou:", error);
    return false;
  }
}
