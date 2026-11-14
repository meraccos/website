async function forward_lstm(x, h, c, session) {
    const [inputName, hiddenName, cellName] = session.inputNames;
    const feeds = { [inputName]: x, [hiddenName]: h, [cellName]: c };
    const results = await session.run(feeds);

    // Both checked-in exports declare logits, hidden state, then cell state.
    const [logitsOutput, hiddenOutput, cellOutput] = session.outputNames;
    h = results[hiddenOutput];
    c = results[cellOutput];
    const logits = results[logitsOutput].data;

    return { logits, h, c };
};

async function generateLSTMText(userInput, session, characterDictionary) {
    const outputElement = document.getElementById("output");
    let generatedText = "";
    
    
    var x = Int32Array.from([0]);
    var h = zeroTensor(256);
    var c = zeroTensor(256);

    for (let j = 0; j < userInput; j++) {
        const x_ = new ort.Tensor("int32", x, [1]);
        var { logits, h, c } = await forward_lstm(x_, h, c, session);

        const probs = softmax(logits);
        const sampled_idx = multinomial(probs);
        const sampled_char = characterDictionary[sampled_idx];
        generatedText += sampled_char;
        outputElement.textContent = generatedText;

        x = Int32Array.from([sampled_idx]);
        if (j + 1 < userInput) await pauseBetweenCharacters();
    }

}
