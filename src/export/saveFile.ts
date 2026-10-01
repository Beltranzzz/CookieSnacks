import * as XLSX from 'xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// En iPhone abre la hoja de compartir (Guardar en Archivos, Numbers, Excel...); en Mac descarga el archivo.
export async function saveFile(data: BlobPart, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const file = new File([blob], filename, { type: mime });

  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'CookieSnacks' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // el usuario cerró la hoja de compartir
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await saveFile(data, filename, XLSX_MIME);
}
