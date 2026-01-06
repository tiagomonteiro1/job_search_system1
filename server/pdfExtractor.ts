import { PDFParse } from 'pdf-parse';

/**
 * Extrai texto de um arquivo PDF
 * @param buffer Buffer do arquivo PDF
 * @returns Texto extraído do PDF
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Converter Buffer para Uint8Array se necessário
    const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    
    // Criar parser com o buffer
    const parser = new PDFParse({ data: uint8Array });
    
    // Extrair texto
    const result = await parser.getText();
    
    // Limpar e formatar o texto extraído
    let text = result.text;
    
    // Remover múltiplos espaços em branco
    text = text.replace(/\s+/g, ' ');
    
    // Remover espaços no início e fim
    text = text.trim();
    
    // Se o texto estiver vazio, retornar mensagem indicativa
    if (!text || text.length < 10) {
      throw new Error('Não foi possível extrair texto do PDF. O arquivo pode estar vazio ou protegido.');
    }
    
    return text;
  } catch (error: any) {
    console.error('Erro ao extrair texto do PDF:', error);
    throw new Error(`Falha na extração de texto: ${error.message}`);
  }
}

/**
 * Extrai informações básicas do PDF sem o texto completo
 * @param buffer Buffer do arquivo PDF
 * @returns Metadados do PDF
 */
export async function extractPDFMetadata(buffer: Buffer): Promise<{
  pages: number;
  info: any;
}> {
  try {
    const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const parser = new PDFParse({ data: uint8Array });
    const result = await parser.getText();
    
    return {
      pages: Array.isArray(result.pages) ? result.pages.length : 0,
      info: {},
    };
  } catch (error: any) {
    console.error('Erro ao extrair metadados do PDF:', error);
    throw new Error(`Falha na extração de metadados: ${error.message}`);
  }
}
