const MODEL = {
    encodingFile: undefined,
    modelFile: undefined,
};
let selectedModel = 'bigram';
let selectedDataset = 'nizami';
let generationRunning = false;
// A short pause keeps the character-by-character reveal visible.
const CHARACTER_DELAY_MS = 10;

function pauseBetweenCharacters() {
    return new Promise(resolve => setTimeout(resolve, CHARACTER_DELAY_MS));
}

const sessions = new Map();
const encodings = new Map();

// Cache promises immediately so concurrent callers share the same load.
// Failed loads are evicted, allowing a later attempt to retry.
function cachedLoad(cache, key, loader) {
    if (!cache.has(key)) {
        cache.set(key, Promise.resolve().then(loader).catch((error) => {
            cache.delete(key);
            throw error;
        }));
    }
    return cache.get(key);
}

function getSession(file) {
    return cachedLoad(sessions, file, () => ort.InferenceSession.create(file));
}

function getModel(model, dataset) {
    if (dataset == 'nizami') {
        MODEL.encodingFile =  '/language/encodings/enc_nizami.txt';
        if (model == 'bigram') {
            MODEL.modelFile = '/language/models/bigram_nizami.onnx'
        } else {
            MODEL.modelFile = '/language/models/lstm_nizami.onnx'
        }
    } else if (dataset == 'shakespeare') {
        MODEL.encodingFile =  '/language/encodings/enc_tinyshakespeare.txt';
        if (model == 'bigram') {
            MODEL.modelFile = '/language/models/bigram_shakespeare.onnx'
        } else {
            MODEL.modelFile = '/language/models/lstm_shakespeare.onnx'
        }
    }
}

function switchDataset(dataset) {
    if (generationRunning) return;
    const nizamiButton = document.getElementById('nizami-button');
    const shakespeareButton = document.getElementById('shakespeare-button');
    nizamiButton.disabled = (dataset === 'nizami');
    shakespeareButton.disabled = !nizamiButton.disabled;
    nizamiButton.setAttribute('aria-pressed', String(dataset === 'nizami'));
    shakespeareButton.setAttribute('aria-pressed', String(dataset === 'shakespeare'));
    selectedDataset = dataset;
    getModel(selectedModel, selectedDataset)
}

function switchModel(model) {
    if (generationRunning) return;
    const bigramButton = document.getElementById('bigram-button');
    const lstmButton = document.getElementById('lstm-button');
    bigramButton.disabled = (model === 'bigram');
    lstmButton.disabled = !bigramButton.disabled;
    bigramButton.setAttribute('aria-pressed', String(model === 'bigram'));
    lstmButton.setAttribute('aria-pressed', String(model === 'lstm'));
    selectedModel = model;
    getModel(selectedModel, selectedDataset)
}

function readCharacterEncodingFile(file = MODEL.encodingFile) {
    return cachedLoad(encodings, file, async () => {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`Could not load character encoding: ${response.status}`);
        const characters = (await response.text()).split('');
        characters[0] = '\n';
        characters[1] = ' ';
        return characters;
    });
}

function softmax(logits) {
    const maxLogit = logits.reduce((a, b) => Math.max(a, b), -Infinity);
    const scores = logits.map((l) => Math.exp(l - maxLogit));
    const denom = scores.reduce((a, b) => a + b);
    return scores.map((s) => s / denom);
  }

function multinomial(probs) {
    const length = probs.length;
    const cum_sums = new Array(length);
    let cur_sum = 0.0;

    for (let i = 0; i < length; i++) {
        cur_sum += probs[i];
        cum_sums[i] = cur_sum;
    }

    const randomValue = Math.random();
    const sampled_idx = cum_sums.findIndex((cum_sum) => cum_sum > randomValue);
    return sampled_idx === -1 ? length - 1 : sampled_idx;
}

function zeroTensor(n_zeros) {
    const array = new Float32Array(n_zeros).fill(0);
    const tensor = new ort.Tensor("float32", array, [1, n_zeros]);
    return tensor;
}

async function generateText() {
    const button = document.getElementById('generate_button');
    if (generationRunning) return;
    const inputElement = document.getElementById("inputText");
    const userInput = Number(inputElement.value.trim() || 200);
    if (!Number.isInteger(userInput) || userInput < 1 || userInput > 9999) {
        inputElement.setCustomValidity('Enter a whole number between 1 and 9999.');
        inputElement.reportValidity();
        inputElement.oninput = () => inputElement.setCustomValidity('');
        return;
    }
    inputElement.setCustomValidity('');
    inputElement.value = String(userInput);
    generationRunning = true;
    button.disabled = true;
    document.querySelectorAll('.language-model .switch button').forEach((control) => {
        control.disabled = true;
    });
    inputElement.disabled = true;
    const status = document.getElementById('generation-status');
    const output = document.getElementById('output');
    output.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading model…';
    try {
        // Capture a consistent model/dataset pair for the entire sample.
        const [session, characters] = await Promise.all([
            getSession(MODEL.modelFile), readCharacterEncodingFile(MODEL.encodingFile),
        ]);
        output.textContent = '';
        status.textContent = '';
        if (selectedModel === 'lstm') {
            await generateLSTMText(userInput, session, characters);
        } else {
            await generateBigramText(userInput, session, characters);
        }
        status.textContent = '';
    } catch (error) {
        status.textContent = 'Could not generate text. Please try again.';
        console.error('Text generation failed:', error);
    } finally {
        generationRunning = false;
        button.disabled = false;
        inputElement.disabled = false;
        output.setAttribute('aria-busy', 'false');
        switchModel(selectedModel);
        switchDataset(selectedDataset);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('inputText').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            generateText();
        }
    });
    switchDataset(selectedDataset);
    switchModel(selectedModel);
});
