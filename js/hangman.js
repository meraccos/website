var numOfChars = 7;
var cost = 0;
var lastGuess = '_';

var wordsArray = [];
var countsArray = [];
var matchingWords = [];
var matchingCounts = [];

var availableChars = [];

async function startGame() {
    var numOfCharsBox = document.getElementById('num_of_chars_box');
    numOfChars = numOfCharsBox.value;
    numOfChars = parseInt(numOfChars, 10);

    // if numOfChars is not a number, it is 7
    if (isNaN(numOfChars)) {
        numOfChars = 7;
    }
    if (numOfChars < 4) {
        numOfChars = 4;
    }
    if (numOfChars > 15) {
        numOfChars = 15;
    }
    numOfCharsBox.value = numOfChars;

    // show all the letter_idx for idx=1 to numOfChars
    for (var i = 1; i <= numOfChars; i++) {
        var letterIdx = document.getElementById('letter' + i);
        letterIdx.style.display = 'inline-flex';
        letterIdx.innerHTML = '_';
        letterIdx.setAttribute('aria-pressed', 'false');
    }

    // hide all the letter_idx for idx=numOfChars+1 to 15
    for (var i = numOfChars + 1; i <= 15; i++) {
        var letterIdx = document.getElementById('letter' + i);
        letterIdx.style.display = 'none';
    }

    var wordsFileName = `/hangman/vocab/words_${numOfChars}.txt`;
    var countsFileName = `/hangman/vocab/counts_${numOfChars}.txt`;

    // initialize the words and counts array
    [wordsArray, countsArray] = await initVocab(wordsFileName, countsFileName);

    matchingWords = wordsArray;
    matchingCounts = countsArray;

    availableChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                          'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                          'u', 'v', 'w', 'x', 'y', 'z'];

    document.querySelector('.hangman').classList.add('is-playing');
    document.getElementById('start-button').textContent = 'Restart';
    document.getElementById('guessed-letter').textContent = '_';
    document.getElementById('entropy').textContent = '0';

    // init the vars
    cost = 0;
    lastGuess = '_';

    // log the cost
    var costElement = document.getElementById('cost');
    costElement.innerHTML = cost;
}

function guessNext() {
    // get the current state and matching words
    var currentState = getCurrentState();
    [matchingWords, matchingCounts] = getMatchingWords(currentState);
    
    console.log('Current state:', currentState);
    console.log('Matching words', matchingWords);

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
        var sum_counts = matchingCounts.reduce((a, b) => parseInt(a, 10) + parseInt(b, 10), 0);
        var entropy = -matchingCounts.reduce((acc, count) => {
            const prob = parseInt(count, 10) / sum_counts;
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
    var sum_total = counts.reduce((a, b) => parseInt(a, 10) + parseInt(b, 10), 0);

    // group the words by every position revealed by this letter
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        var count = parseInt(counts[i], 10);
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

async function initVocab(wordsFileName, countsFileName) {
    try {
        const wordsResponse = await fetch(wordsFileName);
        const wordsData = await wordsResponse.text();
        wordsArray = wordsData.split('\n').map(word => word.trim()).filter(word => word.length > 0);

        const countsResponse = await fetch(countsFileName);
        const countsData = await countsResponse.text();
        countsArray = countsData.split('\n').map(word => word.trim()).filter(word => word.length > 0);

        return [wordsArray, countsArray];
    } catch (error) {
        return null;
    }
}


function pickWord() {

    // The filename of the text file, words_{numofchars}.txt
    var wordsFileName = `/hangman/vocab/words_${numOfChars}.txt`;
    var countsFileName = `/hangman/vocab/counts_${numOfChars}.txt`;


    let selectedWord = '';
    let selectedCount = '';
    
    async function fetchData() {
        try {
            const wordsResponse = await fetch(wordsFileName);
            const wordsData = await wordsResponse.text();
            wordsArray = wordsData.split('\n').map(word => word.trim()).filter(word => word.length > 0);
            console.log(wordsArray); // Output the array of words to the console
    
            const countsResponse = await fetch(countsFileName);
            const countsData = await countsResponse.text();
            countsArray = countsData.split('\n').map(word => word.trim()).filter(word => word.length > 0);
            console.log(countsArray); // Output the array of words to the console
    
            // Convert countsArray to probs
            const countsSum = countsArray.reduce((a, b) => a + parseInt(b, 10), 0);
            const probs = countsArray.map(count => parseInt(count, 10) / countsSum);
            console.log(probs);
    
            // Sample a word and count from the probs distribution
            const cumulativeProbs = probs.reduce((acc, prob, index) => {
                if (index === 0) {
                    acc.push(prob);
                } else {
                    acc.push(acc[index - 1] + prob);
                }
                return acc;
            }, []);
    
            const randomValue = Math.random();
            const selectedIndex = cumulativeProbs.findIndex(cumProb => randomValue < cumProb);
    
            selectedWord = wordsArray[selectedIndex];
            selectedCount = countsArray[selectedIndex];
    
            console.log(`Selected word: ${selectedWord}, Selected count: ${selectedCount}`);
        } catch (error) {
            console.error('Error fetching the data:', error);
        }
    }
    
    fetchData();

}
