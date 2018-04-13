// We need to be on https to work!
if (window.location.protocol != "https:" && window.location.protocol != "file:") {
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
}

var score = {"correct": 0, "total": 0};
var stats = $('#stats');
var prompt = $("#prompt");
var progress = $('#progress');
var resultText = $("#result");
var recordButton = $("#record");
var newNote = $("#new-note");
var keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var targetPitchIndex, targetPitch;
var reference = {};
var getUserMedia;

var RECORDING_LENGTH = 3;

var audioContext;
var micStream = null;
var jsNode;

var pitch;
var ANALYSIS_BUF_SIZE = 1024;
var MIN_PITCH = 50;
var MAX_PITCH = 440;
var MIN_PROBABILITY = 0.60;
var MIN_CONFIDENCE = 0.75;

var recordingBuffer;
var recordIndex = 0;
var recordingStarted = false;

$(function() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    
    // Get the reference C
    getMp3("C3", reference);

    // Initialize the pitch finder
    pitch = PitchFinder.MPM({
        sampleRate: audioContext.sampleRate,
        bufferSize: ANALYSIS_BUF_SIZE,
    });

    $(".button-collapse").sideNav();

    // Initialize the circular progress bar
    progress.circleProgress({
        value: 0.0,
        size: 130,
        thickness: 17,
        startAngle: -Math.PI/2,
        fill: {
            gradient: ["red", "orange"]
        }
    });

    $("#play-reference").click(function() {
        playSound(reference["C3"]);
    });

    recordButton.click(startRecording);

    newNote.click(newPitch);

    newPitch();

    // Try to get the user to enable the microphone
    getUserMedia = Modernizr.prefixed('getUserMedia', navigator);
    getUserMedia({audio: true}, onMicStream, onError);
});

function newPitch(event) {
    targetPitchIndex = getRandomInt(0, keys.length, targetPitchIndex);
    targetPitch = keys[targetPitchIndex];
    console.log("Target note is: " + targetPitch);

    recordButton.removeAttr("disabled");

    newNote.attr("disabled", "disabled");

    prompt.text("Press the button and sing the pitch " + targetPitch);
    resultText.css('visibility', 'hidden');
    progress.circleProgress({
        value: 0.0,
        lineCap: "butt",
        animation: false,
    });
}

function startRecording() {
    if (recordingStarted) {
        return;
    }

    if (Modernizr.getusermedia && micStream !== null) {
        console.log("Recording started");
        recordingStarted = true;
        recordIndex = 0;
        
        recordingBuffer = audioContext.createBuffer(1, audioContext.sampleRate * RECORDING_LENGTH, audioContext.sampleRate);

        jsNode = audioContext.createScriptProcessor(2048, 1, 1);

        jsNode.onaudioprocess = onRecordedAudio;

        progress.circleProgress({
            value: 0.0,
            lineCap: "butt",
            animation: false,
        });

        newNote.attr("disabled", "disabled");

        // Start a 3 second countdown before singing
        resultText.text("Sing in 3...");
        resultText.css('visibility', 'visible');
        var counter = 3;
        id = setInterval(function() {
            counter--;
            if(counter <= 0) {
                clearInterval(id);
                resultText.text("Sing!");
                progress.circleProgress({
                    value: 1.0,
                    lineCap: "round",
                    animation: {
                        duration: RECORDING_LENGTH * 1000,
                        easing: "linear",
                    }
                });

                micStream.connect(jsNode);
                jsNode.connect(audioContext.destination);
            } else {
                resultText.text("Sing in " + counter + "...");
            }
        }, 1000);

    } else {
        getUserMedia({audio: true},
            function(stream) {
                onMicStream(stream);
                startRecording();
            }, onError);
    }
}

function stopRecording() {
    if (recordingStarted) {
        micStream.disconnect();
        jsNode.disconnect();
        recordingStarted = false;

        // Play the recording for the user
        playSound(recordingBuffer);

        // Analyze the pitch
        var result = analyzePitches(recordingBuffer);
        console.log(result);

        // Make an appropriate feedback message
        var feedback;
        if (isNaN(result.confidence)) {
            feedback = "Whoops, did you select the right microphone?";
        } else if (result.confidence <= MIN_CONFIDENCE) {
            feedback = "Sorry, didn't quite catch that. Try singing a bit louder and longer.";
        } else {
            var freq = result.median;
            var pitch = freqToPitch(freq);
            var keyNum = freqToKeyNum(freq);
            var closestFreq = keyNumToFreq(keyNum);
            var diff = centDiff(freq, closestFreq);
            feedback = "Sounds like " + pitch;
            if (pitch === targetPitch) {
                if (Math.abs(diff) <= 15) {
                    feedback += ", right on!";
                    recordButton.attr("disabled", "disabled");
                } else if (diff < -15) {
                    feedback += " (but you were a bit high)";
                } else {
                    feedback += " (but you were a bit low)";
                }
                
                score["correct"] += 1;
                score["total"] += 1;
                stats.text("Score: " + score["correct"] + "/" + score["total"]);

                newNote.removeAttr("disabled");
            } else {
                feedback += ". Give it another try!";
                score["total"] += 1;
                stats.text("Score: " + score["correct"] + "/" + score["total"]);
            }
        }

        resultText.text(feedback);
        resultText.css('visibility', 'visible');
    }
}

function onRecordedAudio(event) {
    var inData = event.inputBuffer.getChannelData(0);

    if (recordIndex + inData.length > recordingBuffer.length) {
        stopRecording();
        return;
    } else {
        recordingBuffer.getChannelData(0).set(inData, recordIndex);
        recordIndex += inData.length;
    }
}

function analyzePitches(buffer) {
    var pitchList = [];
    var probabilityList = [];
    var samples = buffer.getChannelData(0);
    for (var i = 0, l = samples.length; i < l; i += ANALYSIS_BUF_SIZE) {
        // Get the frequency for the 1024 samples
        var result = pitch(samples.slice(i, i + ANALYSIS_BUF_SIZE));
        var f = result.freq;
        var p = result.probability;

        if (f !== -1 && isFinite(p)) {
            probabilityList.push(p);
        }

        // Filter out low confidence or unlikely pitches
        if (f !== -1 && f >= MIN_PITCH && f <= MAX_PITCH && p >= MIN_PROBABILITY) {
            pitchList.push(f);
        }
    }

    return {
        pitches: pitchList,
        avg: average(pitchList),
        median: median(pitchList),
        confidence: average(probabilityList),
    };
}

function onMicStream(stream) {
    micStream = audioContext.createMediaStreamSource(stream);
}

function freqToKeyNum(f) {
    return Math.round(12 * (Math.log(f / 440) / Math.LN2)) + 49;
}

function freqToPitch(f) {
    return keys[(freqToKeyNum(f) +8) % 12];
}

function keyNumToFreq(n) {
    return Math.pow(2, (n - 49) / 12) * 440;
}

function centDiff(f1, f2) {
    return Math.floor(1200 * Math.log(f1 / f2) / Math.LN2);
}

function average(values) {
    var total = 0;
    for(i = 0, l = values.length; i < l; i++) {
        total += values[i];
    }
    return total / l;
}

function median(values) {
    values.sort(function(a, b) {return a - b;});

    var half = Math.floor(values.length/2);

    if (values.length % 2) {
        return values[half];
    } else {
        return (values[half-1] + values[half]) / 2.0;
    }
}

function onError(err) {
    console.log(err);
    recordingStarted = false;
}