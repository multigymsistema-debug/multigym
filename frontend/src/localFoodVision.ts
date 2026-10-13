import * as ort from 'onnxruntime-web/wasm';

export type FoodSuggestion = { name: string; probability: number };

const MODEL_URL = '/models/mobilenetv2-12-int8.onnx';
const LABELS_URL = '/models/synset.txt';
const SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

// Only explicit food/drink classes from the model's ImageNet synset list.
// Predictions are suggestions, not ingredient or portion measurements.
const FOOD_LABELS: Record<string, string> = {
  'ice cream': 'sorvete',
  'french loaf': 'pão francês',
  'bagel': 'bagel',
  'pretzel': 'pretzel',
  'hotdog': 'cachorro-quente',
  'hot dog': 'cachorro-quente',
  'mashed potato': 'purê de batata',
  'head cabbage': 'repolho',
  'broccoli': 'brócolis',
  'cauliflower': 'couve-flor',
  'spaghetti squash': 'abóbora espaguete',
  'acorn squash': 'abóbora',
  'cucumber': 'pepino',
  'bell pepper': 'pimentão',
  'mushroom': 'cogumelo',
  'strawberry': 'morango',
  'orange': 'laranja',
  'lemon': 'limão',
  'fig': 'figo',
  'pineapple': 'abacaxi',
  'banana': 'banana',
  'jackfruit': 'jaca',
  'custard apple': 'fruta-do-conde',
  'guacamole': 'guacamole',
  'chocolate sauce': 'calda de chocolate',
  'chocolate syrup': 'calda de chocolate',
  'meat loaf': 'bolo de carne',
  'meatloaf': 'bolo de carne',
  'pizza': 'pizza',
  'pizza pie': 'pizza',
  'cheeseburger': 'hambúrguer com queijo',
  'burrito': 'burrito',
  'corn': 'milho',
  'pomegranate': 'romã',
  'espresso': 'café espresso',
  'red wine': 'vinho tinto',
  'eggnog': 'gemada',
};

type LoadedSession = Awaited<ReturnType<typeof ort.InferenceSession.create>>;
let sessionPromise: Promise<LoadedSession> | null = null;
let labelsPromise: Promise<string[]> | null = null;

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível preparar a foto para análise local.'));
    image.src = source;
    if (image.complete && image.naturalWidth) resolve(image);
  });
}

async function loadSession(): Promise<LoadedSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      // Keep the WASM runtime and model on the same origin; do not use remote inference.
      ort.env.wasm.wasmPaths = '/models/onnxruntime-web/';
      ort.env.wasm.numThreads = 1;
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
    })();
  }
  try {
    return await sessionPromise;
  } catch (error) {
    sessionPromise = null;
    throw error;
  }
}

async function loadLabels(): Promise<string[]> {
  if (!labelsPromise) {
    labelsPromise = fetch(LABELS_URL, { credentials: 'same-origin' }).then(async response => {
      if (!response.ok) throw new Error('Não foi possível carregar as classes locais do modelo.');
      return (await response.text()).trim().split(/\r?\n/).map(line => line.replace(/^\S+\s+/, '').split(',')[0].trim());
    });
  }
  try {
    return await labelsPromise;
  } catch (error) {
    labelsPromise = null;
    throw error;
  }
}

function createInput(image: HTMLImageElement): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Este aparelho não conseguiu preparar a imagem localmente.');
  context.drawImage(image, 0, 0, SIZE, SIZE);
  const pixels = context.getImageData(0, 0, SIZE, SIZE).data;
  const tensor = new Float32Array(3 * SIZE * SIZE);
  const plane = SIZE * SIZE;
  for (let i = 0; i < plane; i += 1) {
    tensor[i] = (pixels[i * 4] / 255 - MEAN[0]) / STD[0];
    tensor[plane + i] = (pixels[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
    tensor[2 * plane + i] = (pixels[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
  }
  return tensor;
}

export async function suggestFoodsFromPhoto(source: string): Promise<FoodSuggestion[]> {
  const image = await loadImage(source);
  const [session, labels] = await Promise.all([loadSession(), loadLabels()]);
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  if (!inputName || !outputName) throw new Error('O modelo local não possui entradas compatíveis.');
  const tensor = new ort.Tensor('float32', createInput(image), [1, 3, SIZE, SIZE]);
  const result = await session.run({ [inputName]: tensor });
  const scores = result[outputName]?.data;
  if (!scores || scores.length !== labels.length) throw new Error('A resposta do modelo local está incompleta.');

  const max = Math.max(...Array.from(scores, Number));
  const exps = Array.from(scores, value => Math.exp(Number(value) - max));
  const denominator = exps.reduce((sum, value) => sum + value, 0);
  const ranked = exps.map((value, index) => ({ index, probability: value / denominator }))
    .sort((a, b) => b.probability - a.probability).slice(0, 12);
  const suggestions: FoodSuggestion[] = [];
  const seen = new Set<string>();
  for (const prediction of ranked) {
    const label = labels[prediction.index]?.toLowerCase();
    const name = label ? FOOD_LABELS[label] : undefined;
    if (name && prediction.probability >= 0.015 && !seen.has(name)) {
      seen.add(name);
      suggestions.push({ name, probability: prediction.probability });
    }
    if (suggestions.length === 3) break;
  }
  return suggestions;
}
