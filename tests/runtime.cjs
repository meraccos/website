// Run with: node tests/runtime.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function element(value = '') {
    return {
        value, disabled: false, textContent: '', innerHTML: '', style: {}, attributes: {},
        setAttribute(key, value) { this.attributes[key] = value; },
        removeAttribute(key) { delete this.attributes[key]; },
        setCustomValidity(value) { this.validationMessage = value; },
        reportValidity() {}, addEventListener() {}, classList: { add() {} },
    };
}

function load(context, files) {
    vm.createContext(context);
    for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
    return context;
}

async function run() {
    const elements = new Map();
    const get = id => {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    };
    const controls = ['bigram-button', 'lstm-button', 'nizami-button', 'shakespeare-button'].map(get);
    const events = {};
    const calls = new Map();
    let fetches = 0;
    let failLoad = false;
    let failRun = false;
    let runs = 0;
    const context = load({
        setTimeout: callback => callback(),
        document: {
            getElementById: get,
            querySelectorAll: () => controls,
            addEventListener: (name, fn) => { events[name] = fn; },
        },
        console: { error() {} },
        Math: Object.assign(Object.create(Math), { random: () => 0.25 }),
        fetch: async () => {
            fetches++;
            return { ok: true, text: async () => '\n ab' };
        },
        ort: {
            Tensor: class { constructor(type, data, dims) { Object.assign(this, { type, data, dims }); } },
            InferenceSession: { create: async file => {
                calls.set(file, (calls.get(file) || 0) + 1);
                if (failLoad) throw new Error('load failed');
                const lstm = file.includes('lstm');
                return {
                    inputNames: lstm ? ['token', 'hidden', 'cell'] : ['token'],
                    outputNames: lstm ? ['scores', 'next-hidden', 'next-cell'] : ['scores'],
                    run: async feeds => {
                        runs++;
                        if (failRun) throw new Error('inference failed');
                        assert.ok(feeds.token);
                        if (lstm) {
                            assert.ok(feeds.hidden && feeds.cell);
                            assert.equal(feeds.hidden.dims[1], 256);
                        }
                        return {
                            scores: { data: Float32Array.from([-100, -100, 100, -100]) },
                            'next-hidden': { data: new Float32Array(256), dims: [1, 256] },
                            'next-cell': { data: new Float32Array(256), dims: [1, 256] },
                        };
                    },
                };
            } },
        },
    }, ['language/language.js', 'language/bigram.js', 'language/lstm.js']);
    events.DOMContentLoaded();
    const [a, b] = await Promise.all([context.getSession('/shared'), context.getSession('/shared')]);
    assert.equal(a, b);
    assert.equal(calls.get('/shared'), 1);
    failLoad = true;
    await assert.rejects(context.getSession('/retry'));
    failLoad = false;
    await context.getSession('/retry');
    assert.equal(calls.get('/retry'), 2);
    const [encodingA, encodingB] = await Promise.all([
        context.readCharacterEncodingFile('/encoding'), context.readCharacterEncodingFile('/encoding'),
    ]);
    assert.equal(encodingA, encodingB);
    assert.equal(fetches, 1);
    assert.equal(encodingA[0], '\n');
    context.Math.random = () => 0.9999999999999999;
    assert.equal(context.multinomial([0.2, 0.2]), 1);
    context.Math.random = () => 0.25;
    get('inputText').value = '';
    await context.generateText();
    assert.equal(get('inputText').value, '200');
    assert.equal(get('output').textContent, 'a'.repeat(200));
    await context.generateText();
    assert.equal(calls.get('/language/models/bigram-nizami.onnx'), 1);
    context.switchModel('lstm');
    get('inputText').value = '3';
    await context.generateText();
    assert.equal(get('output').textContent, 'aaa');
    assert.equal(context.logits, undefined, 'logits must not leak into the global scope');
    context.switchDataset('shakespeare');
    await context.generateText();
    assert.equal(calls.get('/language/models/lstm-shakespeare.onnx'), 1);
    failRun = true;
    await context.generateText();
    assert.equal(get('generate_button').disabled, false);
    assert.equal(get('inputText').disabled, false);
    assert.match(get('generation-status').textContent, /try again/);
    assert.equal(get('output').attributes['aria-busy'], 'false');
    const beforeInvalid = runs;
    get('inputText').value = '-1';
    await context.generateText();
    assert.equal(runs, beforeInvalid);

    let vocabFetches = 0;
    let failVocab = false;
    const hangman = load({
        console: { error() {} },
        fetch: async file => {
            vocabFetches++;
            if (failVocab) return { ok: false, status: 503 };
            return { ok: true, text: async () => file.includes('counts') ? '2\n3\n' : 'able\nacid\n' };
        },
    }, ['hangman/hangman.js']);
    const vocab = await Promise.all([hangman.initVocab('words4', 'counts4'), hangman.initVocab('words4', 'counts4')]);
    assert.equal(vocab[0], vocab[1]);
    assert.equal(vocabFetches, 2);
    assert.equal(typeof vocab[0][1][0], 'number');
    failVocab = true;
    await assert.rejects(hangman.initVocab('words5', 'counts5'));
    failVocab = false;
    await hangman.initVocab('words5', 'counts5');
    const expected = -(0.4 * Math.log2(0.4) + 0.6 * Math.log2(0.6));
    assert.ok(Math.abs(hangman.probeChar('z', ['able', 'acid'], [2, 3]) - expected) < 1e-12);
    assert.equal(hangman.probeChar('b', ['able', 'acid'], [2, 3]), 0);

    for (let length = 4; length <= 18; length++) {
        const lines = file => fs.readFileSync(path.join(root, 'hangman/vocab', file), 'utf8').trim().split('\n');
        const words = lines(`words-${length}.txt`);
        const counts = lines(`counts-${length}.txt`).map(Number);
        assert.equal(words.length, counts.length);
        assert.ok(words.every(word => word.length === length));
        assert.ok(counts.every(count => Number.isSafeInteger(count) && count > 0));
    }

    const gameElements = new Map();
    const gameElement = id => {
        if (!gameElements.has(id)) gameElements.set(id, element());
        return gameElements.get(id);
    };
    const game = load({
        console: { error() {} },
        document: { getElementById: gameElement, querySelector: () => element() },
        fetch: async file => ({ ok: true, text: async () => fs.readFileSync(path.join(root, file), 'utf8') }),
    }, ['hangman/hangman.js']);
    for (const length of [16, 17, 18, 4]) {
        gameElement('num_of_chars_box').value = String(length);
        await game.startGame();
        assert.equal(game.numOfChars, length);
        assert.equal(game.getCurrentState().length, length);
        for (let position = 1; position <= 18; position++) {
            assert.equal(gameElement(`letter${position}`).style.display, position <= length ? 'inline-flex' : 'none');
        }
        game.guessNext();
        const letter = gameElement('guessed-letter').textContent;
        assert.match(letter, /^[a-z]$/);
        const target = game.wordsArray[0];
        for (let position = 0; position < length; position++) {
            if (target[position] === letter) game.replaceLetter(String(position + 1));
        }
        assert.ok(game.getMatchingWords(game.getCurrentState())[0].includes(target));
    }

    for (const [pathname, expectedPath] of [['/satellite/', '/projects'], ['/hangman/index.html', '/projects'], ['/language/', '/projects'], ['/movie/', '/projects'], ['/enigma/', '/enigma'], ['/', '/']]) {
        const nav = ['/', '/projects', '/enigma', '/quotes'].map(linkPath => Object.assign(element(), { href: `https://example.com${linkPath}`, linkPath }));
        load({
            URL, Date,
            window: { location: { pathname }, matchMedia: () => ({ addEventListener() {} }) },
            document: {
                querySelectorAll: selector => selector.includes('.nav') ? nav : [],
                getElementById: () => element(), addEventListener() {},
            },
        }, ['js/site.js']);
        assert.deepEqual(nav.filter(link => link.attributes['aria-current']).map(link => link.linkPath), [expectedPath]);
    }
    return 'Runtime checks passed: session/encoding caches, retries, generation, LSTM output mapping, vocabulary, sampling, and parent navigation.';
}

module.exports = run;
if (require.main === module) run().then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
