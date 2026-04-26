import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from '../components/ShareResultSvg';

const DEFAULT_FILE_NAME = 'meuvoto-resultado.png';
const SVG_MIME_TYPE = 'image/svg+xml;charset=utf-8';
const PNG_MIME_TYPE = 'image/png';

const loadImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Nao foi possivel carregar o SVG para exportacao.'));
  image.src = url;
});

const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
      return;
    }

    reject(new Error('Nao foi possivel gerar o PNG.'));
  }, PNG_MIME_TYPE, 1);
});

const downloadBlob = (blob, fileName = DEFAULT_FILE_NAME) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export async function svgToPngBlob(svgElement, options = {}) {
  if (!svgElement) {
    throw new Error('Elemento SVG nao encontrado.');
  }

  const width = options.width || SHARE_IMAGE_WIDTH;
  const height = options.height || SHARE_IMAGE_HEIGHT;
  const svgClone = svgElement.cloneNode(true);

  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('width', String(width));
  svgClone.setAttribute('height', String(height));
  svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const serializedSvg = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([serializedSvg], { type: SVG_MIME_TYPE });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      throw new Error('Canvas 2D nao disponivel.');
    }

    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);

    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function shareResult(blob, options = {}) {
  const fileName = options.fileName || DEFAULT_FILE_NAME;
  const file = new File([blob], fileName, { type: PNG_MIME_TYPE });
  const shareData = {
    files: [file],
    title: options.title || 'meuvoto.org',
    text: options.text || 'Meu voto melhora o Congresso'
  };

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') {
        return 'aborted';
      }
    }
  }

  downloadBlob(blob, fileName);
  return 'downloaded';
}
