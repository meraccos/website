var numOfChars = 7;
const MIN_WORD_LENGTH = 4;
const MAX_WORD_LENGTH = 18;
var cost = 0;
var lastGuess = '_';

var wordsArray = [];
var countsArray = [];
var matchingWords = [];
var matchingCounts = [];

var availableChars = [];
const vocabLoads = new Map();
let vocabularyLoading = false;

async function startGame() {
    if (vocabularyLoading) return;
    var numOfCharsBox = document.getElementById('num_of_chars_box');
    let requestedLength = parseInt(numOfCharsBox.value, 10);

    // if numOfChars is not a number, it is 7
    if (isNaN(requestedLength)) {
        requestedLength = 7;
    }
    if (requestedLength < MIN_WORD_LENGTH) {
        requestedLength = MIN_WORD_LENGTH;
    }
    if (requestedLength > MAX_WORD_LENGTH) {
        requestedLength = MAX_WORD_LENGTH;
    }
    numOfCharsBox.value = requestedLength;

    var wordsFileName = `/hangman/vocab/words-${requestedLength}.txt`;
    var countsFileName = `/hangman/vocab/counts-${requestedLength}.txt`;

    // initialize the words and counts array
    vocabularyLoading = true;
    const startButton = document.getElementById('start-button');
    const guessButton = document.getElementById('guess-button');
    const status = document.getElementById('hangman-status');
    startButton.disabled = true;
    guessButton.disabled = true;
    status.textContent = 'Loading words…';
    try {
        [wordsArray, countsArray] = await initVocab(wordsFileName, countsFileName);
        status.textContent = '';
    } catch (error) {
        status.textContent = 'Could not load the word list. Please try again.';
        console.error('Word list loading failed:', error);
        return;
    } finally {
        vocabularyLoading = false;
        startButton.disabled = false;
        guessButton.disabled = false;
    }

    // Do not reset the visible game until its new vocabulary has loaded.
    numOfChars = requestedLength;
    for (var i = 1; i <= MAX_WORD_LENGTH; i++) {
        var letterIdx = document.getElementById('letter' + i);
        letterIdx.style.display = i <= numOfChars ? 'inline-flex' : 'none';
        letterIdx.innerHTML = '_';
        letterIdx.setAttribute('aria-pressed', 'false');
    }

    matchingWords = wordsArray;
    matchingCounts = countsArray;

    availableChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                          'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                          'u', 'v', 'w', 'x', 'y', 'z'];

    document.querySelector('.hangman').classList.add('is-playing');
    document.getElementById('start-button').textContent = 'Restart';
    document.getElementById('guessed-letter').textContent = '_';
    document.getElementById('mobile-guessed-letter').textContent = '_';
    document.getElementById('entropy').textContent = '0';

    // init the vars
    cost = 0;
    lastGuess = '_';

    // log the cost
    var costElement = document.getElementById('cost');
    costElement.innerHTML = cost;
}

function guessNext() {
    if (vocabularyLoading) return;
    // get the current state and matching words
    var currentState = getCurrentState();
    [matchingWords, matchingCounts] = getMatchingWords(currentState);
    

    // if the last guess failed, cut the matched words.
    if (!currentState.includes(lastGuess) && lastGuess !== '_') {
        var newMatchingWords = [];
        var newMatchingCounts = [];
        for (var i = 0; i < matchingWords.length; i++) {
            var word = matchingWords[i];
            if (!word.includes(lastGuess)) {
                newMatchingWords.push(word);
                newMatchingCounts.push(matchingCounts[i]);
            }
        }
        matchingWords = newMatchingWords;
        matchingCounts = newMatchingCounts;
        cost += 1;
    }

    // if there is only one word left, guess the next letter that is available
    if (matchingWords.length === 1) {
        document.getElementById('entropy').innerHTML = '0.00';
        var word = matchingWords[0];
        for (var i = 0; i < word.length; i++) {
            if (currentState[i] === '_') {
                var nextGuess = word[i];
                break;
            }
        }
    } else if (matchingWords.length === 0) {
        // return a random available letter
        var nextGuess = availableChars[Math.floor(Math.random() * availableChars.length)];
    } else {
        // calculate the entropy
        var sum_counts = matchingCounts.reduce((a, b) => a + b, 0);
        var entropy = -matchingCounts.reduce((acc, count) => {
            const prob = count / sum_counts;
            return acc + prob * Math.log2(prob);
        }, 0);

        // log the entropy
        var entropyElement = document.getElementById('entropy');
        entropyElement.innerHTML = entropy.toFixed(2);

        // estimate the expected entropy from each available letter
        var exp_entropies = [];
        for (var i = 0; i < availableChars.length; i++) {
            exp_entropies.push(probeChar(availableChars[i], matchingWords, matchingCounts));
        }
        // get the letter with the minimum expected entropy
        var min_entropy = Math.min(...exp_entropies);
        var min_entropy_idx = exp_entropies.indexOf(min_entropy);
        var nextGuess = availableChars[min_entropy_idx];
    }

    if (nextGuess === undefined) {
        nextGuess = "_";
    }

    // log the guess
    var guess = document.getElementById('guessed-letter');
    guess.textContent = nextGuess;
    document.getElementById('mobile-guessed-letter').textContent = nextGuess;
    lastGuess = nextGuess;

    // log the cost
    var costElement = document.getElementById('cost');
    costElement.innerHTML = cost;

    // update the available characters
    var nextGuessIdx = availableChars.indexOf(nextGuess);
    if (nextGuessIdx !== -1) {
        availableChars.splice(nextGuessIdx, 1);
    }
}

function probeChar(char, words, counts) {
    var pattern_counts = {};
    var sum_total = counts.reduce((a, b) => a + b, 0);

    // group the words by every position revealed by this letter
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        var count = counts[i];
        var pattern = '';
        for (var j = 0; j < word.length; j++) {
            pattern += word[j] === char ? '1' : '0';
        }

        if (pattern_counts[pattern] === undefined) {
            pattern_counts[pattern] = [];
        }
        pattern_counts[pattern].push(count);
    }

    // average the remaining word entropy over all possible patterns
    var exp_entropy = 0.0;
    for (var pattern in pattern_counts) {
        var group_counts = pattern_counts[pattern];
        var sum_group = group_counts.reduce((a, b) => a + b, 0);
        var prob_group = sum_group / sum_total;
        var entropy_group = -group_counts.reduce((acc, count) => {
            const prob = count / sum_group;
            return acc + prob * Math.log2(prob);
        }, 0);
        exp_entropy += prob_group * entropy_group;
    }

    return exp_entropy;
}

function getMatchingWords(currentState) {
    let words = []
    let counts = []

    for (var i = 0; i < matchingWords.length; i++) {
        var word = matchingWords[i];
        var match = true;
        for (var j = 0; j < currentState.length; j++) {
            if (currentState[j] !== '_' && currentState[j] !== word[j]) {
                match = false;
                break;
            }
            // a revealed letter cannot occur in any unselected position
            if (currentState[j] === '_' && currentState.includes(word[j])) {
                match = false;
                break;
            }
        }
        if (match) {
            words.push(word);
            counts.push(matchingCounts[i]);
        }
    }
    return [words, counts];
}

function replaceLetter(idx) {
    var letterIdx = document.getElementById('letter' + idx);

    // if the letter is not the lastGuess or _, return
    if (letterIdx.innerHTML !== '_' && letterIdx.innerHTML !== lastGuess) {
        return;
    }


    // if the letter is guessed and not equal to the last guess, return
    if (letterIdx.innerHTML !== '_') {
        letterIdx.innerHTML = "_";
        letterIdx.setAttribute('aria-pressed', 'false');
        return;
    }
    letterIdx.innerHTML = lastGuess;
    letterIdx.setAttribute('aria-pressed', String(lastGuess !== '_'));
}

function getCurrentState() {
    var currentState = [];
    for (var i = 1; i <= numOfChars; i++) {
        var letterIdx = document.getElementById('letter' + i);
        var letter = letterIdx.innerHTML;
        currentState.push(letter);
    }
    return currentState;
}

function initVocab(wordsFileName, countsFileName) {
    const key = `${wordsFileName}:${countsFileName}`;
    if (!vocabLoads.has(key)) {
        const load = Promise.all([wordsFileName, countsFileName].map(async (file) => {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`Could not load vocabulary: ${response.status}`);
            return (await response.text()).split('\n').map(line => line.trim()).filter(Boolean);
        })).then(([words, rawCounts]) => {
            const counts = rawCounts.map(Number);
            if (words.length !== counts.length || counts.some(count => !Number.isSafeInteger(count) || count <= 0)) {
                throw new Error('Invalid vocabulary counts');
            }
            return [words, counts];
        }).catch((error) => {
            vocabLoads.delete(key);
            throw error;
        });
        vocabLoads.set(key, load);
    }
    return vocabLoads.get(key);
}
