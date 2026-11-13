// Select the slider, value, output and info elements
var numbering = document.querySelectorAll('.index');
var names = document.querySelectorAll('.movie_name');
var ratings = document.querySelectorAll('.rating');
var aligns = document.querySelectorAll('.align');
var sliders = document.querySelectorAll(".slider")
var values = document.querySelectorAll('.value')
var ValuesArray = []

// fill value elements with slider values and array with the values
function updateSliderFill(slider) {
    const minimum = Number(slider.min || 0);
    const maximum = Number(slider.max || 100);
    const percent = ((Number(slider.value) - minimum) / (maximum - minimum)) * 100;
    slider.style.setProperty('--slider-fill', percent + '%');
}

for (let i = 0; i < sliders.length; i++) {
    updateSliderFill(sliders[i]);
    sliders[i].setAttribute('aria-label', document.querySelectorAll('.genre')[i].textContent.trim());
    values[i].innerHTML = (sliders[i].value / 100).toFixed(2);
    ValuesArray.push(sliders[i].value / 100);

    sliders[i].oninput = function() {
        updateSliderFill(this);
        values[i].innerHTML = (this.value / 100).toFixed(2);
        ValuesArray[i] = sliders[i].value / 100;
    };
}

const movieButton = document.getElementById('movie_button');
const movieStatus = document.getElementById('movie-status');
const movieResults = document.getElementById('outputs-box');
const resourcePromises = new Map();
let resourcesReady = false;
let recommendationRunning = false;

// Cache each resource independently, retaining successful loads if another fails.
function cachedResource(key, loader) {
    if (!resourcePromises.has(key)) {
        resourcePromises.set(key, Promise.resolve().then(loader).catch((error) => {
            resourcePromises.delete(key);
            throw error;
        }));
    }
    return resourcePromises.get(key);
}

async function readMovieData(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
    return (await response.text()).split('\n');
}

function loadMovieResources() {
    return Promise.all([
        cachedResource('names', () => readMovieData('/movie/names.txt')),
        cachedResource('ratings', () => readMovieData('/movie/ratings.txt')),
        cachedResource('session', () => ort.InferenceSession.create('/movie/model.onnx')),
    ]).then((resources) => {
        resourcesReady = true;
        return resources;
    });
}

// Start while the visitor is choosing their genre preferences.
movieStatus.textContent = 'Loading recommender… You can adjust the sliders meanwhile.';
loadMovieResources().then(() => {
    if (!recommendationRunning) movieStatus.textContent = '';
}).catch((error) => {
    if (!recommendationRunning) {
        movieStatus.textContent = 'Could not finish loading. Select Recommend to retry.';
    }
    console.error('Movie preload failed:', error);
});

// main things going on here
async function recommend() {
    if (recommendationRunning) return;
    recommendationRunning = true;
    movieButton.disabled = true;
    movieButton.textContent = resourcesReady ? 'Finding movies…' : 'Loading…';
    movieStatus.textContent = resourcesReady ? 'Finding recommendations…' : 'Loading the model and movie data…';
    movieResults.setAttribute('aria-busy', 'true');
    // Keep this request tied to the preferences at the time of the click.
    const preferences = Float32Array.from(ValuesArray);
    try {
        const [movie_names, movie_ratings, session] = await loadMovieResources();
        movieButton.textContent = 'Finding movies…';
        movieStatus.textContent = 'Finding recommendations…';

        // Infer from the model 
        var data = preferences;
        const tensor = new ort.Tensor("float32", data, [18]); 
        
        const feeds = {"onnx::MatMul_0": tensor};
        const run_out = await session.run(feeds);
        const output = run_out[5]['data']
        
        // Extract top 10 indices
        let indices = Array.from({ length: output.length }, (_, i) => i);
        indices.sort((a, b) => output[b] - output[a]);
        let top10Indices = indices.slice(0, 10);

        names[0].innerHTML = "<b> Movie name";
        ratings[0].innerHTML = "<span>IMDb</span><span>rating</span>";
        aligns[0].innerHTML = "<span>Match</span><span>score</span>";

        // Print out the movies
        for (let i = 0; i < top10Indices.length; i++) {
            numbering[i+1].innerHTML = i+1 + '.  '
            names[i+1].innerHTML = movie_names[top10Indices[i]];
            ratings[i+1].innerHTML = movie_ratings[top10Indices[i]];
            aligns[i+1].innerHTML = (output[top10Indices[i]]).toFixed(2);
        }

        movieStatus.textContent = '';
    } catch (error) {
        movieStatus.textContent = 'Could not get recommendations. Select Recommend to try again.';
        console.error('Error:', error);
    } finally {
        recommendationRunning = false;
        movieButton.disabled = false;
        movieButton.textContent = 'Recommend';
        movieResults.setAttribute('aria-busy', 'false');
    }
}
