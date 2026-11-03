// Lee una constancia de pago (captura de Yape/Plin, voucher de banco o
// constancia de detracción del Banco de la Nación) en el navegador, sin
// servicios de pago: Tesseract para imágenes y pdf.js para PDF (si el PDF no
// trae texto, se renderiza la primera página y se pasa por Tesseract).
// Devuelve lo que pudo reconocer; el usuario siempre revisa antes de guardar.

const MESES = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12,
};

const BANCOS = [
  [/banco\s+de\s+la\s+naci[oó]n|bn\s+detracc/i, "Banco de la Nación"],
  [/\byape\b/i, "Yape"],
  [/\bplin\b/i, "Plin"],
  [/\bbcp\b|banco\s+de\s+cr[eé]dito/i, "BCP"],
  [/interbank/i, "Interbank"],
  [/bbva|continental/i, "BBVA"],
  [/scotiabank/i, "Scotiabank"],
  [/banbif/i, "BanBif"],
];

async function textoDeImagen(imagen) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa");
  try {
    const { data } = await worker.recognize(imagen);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

async function textoDePdf(archivo) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const pdf = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
  const pagina = await pdf.getPage(1);
  const contenido = await pagina.getTextContent();
  const texto = contenido.items.map((i) => i.str).join(" ");
  if (texto.replace(/\s/g, "").length > 30) return texto;
  // PDF escaneado: se renderiza a imagen para el OCR.
  const viewport = pagina.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await pagina.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return textoDeImagen(canvas);
}

// "1,234.50" | "1 234,50" | "1234.5" → 1234.5
function numero(txt) {
  let t = txt.replace(/\s/g, "");
  if (/,\d{2}$/.test(t) && !/\.\d{2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const iso = (a, m, d) => {
  const anio = a < 100 ? 2000 + a : a;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

function buscarFecha(texto) {
  const hoy = new Date().toLocaleDateString("en-CA");
  const candidatas = [];
  for (const m of texto.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) {
    candidatas.push(iso(Number(m[3]), Number(m[2]), Number(m[1])));
  }
  for (const m of texto.matchAll(/\b(\d{1,2})\s*(?:de\s+)?([a-záé]{3,10})\.?\s*(?:de(?:l)?\s+)?(\d{4})\b/gi)) {
    const mes = MESES[m[2].slice(0, 3).toLowerCase()];
    if (mes) candidatas.push(iso(Number(m[3]), mes, Number(m[1])));
  }
  return candidatas.find((f) => f && f <= hoy) || null;
}

function buscarMonto(texto) {
  const MONTO = String.raw`(?:S\/\.?|US\$|\$)\s*([\d.,\s]*\d)`;
  // Primero el que sigue a una palabra clave; si no, el mayor importe con símbolo.
  const clave = texto.match(new RegExp(String.raw`(?:monto|importe|total|pagaste|transferiste|yapeaste|depositado)[^\d\n]{0,25}?${MONTO}`, "i"));
  if (clave) return numero(clave[1]);
  const todos = [...texto.matchAll(new RegExp(MONTO, "gi"))].map((m) => numero(m[1])).filter(Boolean);
  return todos.length ? Math.max(...todos) : null;
}

function buscarOperacion(texto) {
  const m = texto.match(
    /(?:n[uú]mero|nro|n[°º]|c[oó]d(?:igo)?)\.?\s*(?:de\s+)?(?:la\s+)?(?:operaci[oó]n|constancia|op)\.?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{3,})/i
  ) || texto.match(/operaci[oó]n\s*(?:n[°º.]*)?\s*[:#]?\s*(\d{4,})/i);
  return m ? m[1] : null;
}

function buscarMedio(texto) {
  if (/\byape|\bplin\b/i.test(texto)) return "YAPE_PLIN";
  if (/dep[oó]sito/i.test(texto)) return "DEPOSITO";
  if (/transferencia/i.test(texto)) return "TRANSFERENCIA";
  return null;
}

// → { numeroOperacion, fecha (aaaa-mm-dd), monto, medio, banco, texto }
export async function leerConstancia(archivo) {
  const texto = archivo.type === "application/pdf" ? await textoDePdf(archivo) : await textoDeImagen(archivo);
  return interpretarTexto(texto);
}

export function interpretarTexto(texto) {
  return {
    numeroOperacion: buscarOperacion(texto),
    fecha: buscarFecha(texto),
    monto: buscarMonto(texto),
    medio: buscarMedio(texto),
    banco: BANCOS.find(([re]) => re.test(texto))?.[1] || null,
    texto,
  };
}
