function getMp3(name, dict) {
    var request = new XMLHttpRequest();
    request.open('GET', "mp3/" + encodeURIComponent(name) + ".mp3", true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        audioContext.decodeAudioData(request.response, function(buffer) {
            dict[name] = buffer;
        }, onError);
    };
    request.send();
}

// Play a sound from a data buffer
function playSound(buffer, rate, callback) {
    if (audioContext === null || audioContext.state !== "running") {
        audioContext = new AudioContext();
    }
    if (rate === undefined) {
        rate = 1.0;
    }
    var sound = audioContext.createBufferSource();
    sound.buffer = buffer;
    sound.playbackRate.value = rate;
    sound.onended = callback;
    sound.connect(audioContext.destination);
    sound.start(0);
}

// Return a random integer between [min, max)
// Specify prev to guarantee a different number from prev
function getRandomInt(min, max, prev) {
    var rand = Math.floor(Math.random() * (max - min)) + min;
    if (prev !== undefined) {
        while (prev === rand) {
            rand = Math.floor(Math.random() * (max - min)) + min;
        }
    }
    return rand;
}