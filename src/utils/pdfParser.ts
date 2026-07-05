// Client-side PDF Parser using PDF.js

export async function parsePdf(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set up the worker URL using a CDN for convenience in client-only apps
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file. Make sure it is a valid PDF containing text.');
  }
}
