async function forward_bigram(x, session) {
    const feeds = { [session.inputNames[0]]: x };
    const results = await session.run(feeds);
    const logits = results[session.outputNames[0]].data;
    return logits
}

async function generateBigramText(userInput, session, characterDictionary) {
    const outputElement = document.getElementById("output");
    let generatedText = "";
    

    var dataA = Int32Array.from([1]);

    for (let j = 0; j < userInput; j++) {
        const tensorA = new ort.Tensor("int32", dataA, []);
        const logits = await forward_bigram(tensorA, session);
        const probs = softmax(logits);
        const sampled_idx = multinomial(probs);
        const sampled_char = characterDictionary[sampled_idx];

        generatedText += sampled_char;
        outputElement.textContent = generatedText;

        dataA = Int32Array.from([sampled_idx]);
        if (j + 1 < userInput) await pauseBetweenCharacters();
    }

}
