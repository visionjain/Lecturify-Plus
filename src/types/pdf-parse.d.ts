declare module "pdf-parse/lib/pdf-parse.js" {
  const pdfParse: (buffer: Buffer) => Promise<{ text: string }>;

  export default pdfParse;
}