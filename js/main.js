/*
GNU GENERAL PUBLIC LICENSE v2.0

Copyright (c) 2017 Daniel Tofaute

*/
//Shorthand for logging
function log(input) {
  console.log(input);
}

var keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var getMicInput;
var audioContext;
var micStream = null;
var pitch = null;
var analyzer = null;
var ANALYSIS_BUF_SIZE = 1024;
var buf = new Float32Array(ANALYSIS_BUF_SIZE);
var convBuf;
var MIN_PITCH = 50;
var MAX_PITCH = 2637; //E7 - highest note on violin 
var MIN_SAMPLES = 0;
var MIN_PROBABILITY = 0.60;
var MIN_CONFIDENCE = 0.75;
var thePitch = null;
var WIDTH = null;
var HEIGHT = null;
var currPitch = null;
var pitchArray = [];
var trailArray = [];
var trailLength = 1024;
var tolerance = 20;
var reference= {};
var canvas, ctx, freq, note, tune;
var isRunning = false;

function init(){

  if (isRunning) {
    $("body").append("<canvas id='cnv'></canvas>");
    canvas = document.getElementById("cnv");
    ctx = canvas.getContext("2d");

    if (!ctx) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();

    // Initialize pitch detection (MacLeod)
    pitch = PitchFinder.MPM({
      sampleRate: audioContext.sampleRate,
      bufferSize: ANALYSIS_BUF_SIZE
    });
    
    getWav("a1",reference);
    // Ask user to enable microphone - log error if not allowed
    getMicInput = Modernizr.prefixed("getUserMedia", navigator);
    getMicInput({audio: true, video: false}, onMicStream, onError);
  }
}

// If there is input send it to the Analyzer Node
function onMicStream(stream) {
  log("gotStream");
  micStream = audioContext.createMediaStreamSource(stream);
  analyzer = audioContext.createAnalyser();
  analyzer.fftSize = 2048;
  micStream.connect( analyzer );
    // micStream.connect(audioContext.destination);
    updatePlay();
    //holdPitch();
  }

//unterteilen in draw() und update(),

//20 Cents max? Differenz in Cents
//flag if in pitch = true
//Vergleich mit max offset

function updatePlay(time) {

  resizeCanvas();

  analyzer.getFloatTimeDomainData( buf );

  // var ac = autoCorrelate(buf, audioContext.sampleRate);
  currPitch = pitch(buf).freq;

  roundCurrPitch = Math.round(currPitch);

  //hier checken ob Ton getroffen
  holdPitch();
  updateInfo();
  draw();  

  frameID = window.requestAnimationFrame( updatePlay );
  if (!window.requestAnimationFrame){
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  }
}

//Array pro Anzahl an trails .. circular buffer
// [ [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], ]
// [[1, 0.5, 0.3, 0.7], [0, 0, 0, 0], [0, 0, 0, 0]]
// [[0.1, 0.2, 0.3, 0.4],[1, 0.5, 0.3, 0.7] [0, 0, 0, 0]]


// function trail(xP, yP){
//   trailArray.push({
//     x: xP,
//     y: yP
//   });

//   if (trailArray.length > trailLength) {
//     trailArray.shift();
//   }
// }

function resizeCanvas() {
  if ( canvas.width !== window.innerWidth || canvas.height !== window.innerHeight ) {
    WIDTH = canvas.width = window.innerWidth;
    HEIGHT = canvas.height = window.innerHeight;
  }
}

$("#menu .play").on("click", function() {
  fadeOut();
})

$("#toMenu").on("click", function(){
  fadeIn();
})

$("#toMenu").hover(function(){$(this).addClass('rotate')}); 