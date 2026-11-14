const MODEL = {
    encodingFile: undefined,
    modelFile: undefined,
};

function getModel(model, dataset) {
    if (dataset == 'nizami') {
        MODEL.encodingFile =  '/encodings/enc_nizami.txt';
        if (model == 'bigram') {
            MODEL.modelFile = '/models/bigram_nizami.onnx'
        } else {
            MODEL.modelFile = '/models/lstm_nizami.onnx'
        }
    } else if (dataset == 'shakespeare') {
        MODEL.encodingFile =  '/encodings/enc_tinyshakespeare.txt';
        if (model == 'bigram') {
            MODEL.modelFile = '/models/bigram_shakespeare.onnx'
        } else {
            MODEL.modelFile = '/models/lstm_shakespeare.onnx'
        }
    }
}

function switchDataset(dataset) {
    const nizamiButton = document.getElementById('nizami-button');
    const shakespeareButton = document.getElementById('shakespeare-button');
    nizamiButton.disabled = (dataset === 'nizami');
    shakespeareButton.disabled = !nizamiButton.disabled;
    selectedDataset = dataset;
    getModel(selectedModel, selectedDataset)
}

function switchModel(model) {
    const bigramButton = document.getElementById('bigram-button');
    const lstmButton = document.getElementById('lstm-button');
    bigramButton.disabled = (model === 'bigram');
    lstmButton.disabled = !bigramButton.disabled;
    selectedModel = model;
    getModel(selectedModel, selectedDataset)
}

async function readCharacterEncodingFile() {
    const response = await fetch(MODEL.encodingFile);
    const data = await response.text();
    const lines = data;
    var characterDictionary = {};
    for (let i = 0; i < lines.length; i++) {
        const character = lines[i].trim();
        characterDictionary[i] = character;
    }
    characterDictionary[0] = "<br>";
    characterDictionary[1] = " ";

    return characterDictionary;
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
    return sampled_idx;
}

function zeroTensor(n_zeros) {
    const array = new Float32Array(n_zeros).fill(0);
    const tensor = new ort.Tensor("float32", array, [1, n_zeros]);
    return tensor;
}

function generateText() {
    const button = document.getElementById('generate_button');
    if (button.disabled) return;
    const inputElement = document.getElementById("inputText");
    const userInput = Number(inputElement.value.trim() || 200);
    if (!Number.isInteger(userInput) || userInput < 1 || userInput > 9999) {
        inputElement.setCustomValidity('Enter a whole number between 1 and 9999.');
        inputElement.reportValidity();
        inputElement.oninput = () => inputElement.setCustomValidity('');
        return;
    }
    inputElement.setCustomValidity('');
    inputElement.value = userInput;
    if (selectedModel === 'lstm') {
        generateLSTMText(userInput);
    } else if (selectedModel === 'bigram') {
        generateBigramText(userInput);
    }
}
