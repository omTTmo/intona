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
var ANALYSIS_BUF_SIZE = 2048;
var buf = new Float32Array(ANALYSIS_BUF_SIZE);
var buf2 = new Uint8Array(ANALYSIS_BUF_SIZE);
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
var offTune = null;
var linePos = 0;
var velocity = 0.5;
var h;

function init(){

  if (isRunning) {
    // $("body").append("<canvas id='cnv'></canvas>");
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

    // getWav("a1",reference);
    // Ask user to enable microphone - log error if not allowed
    // getMicInput = navigator.mediaDevices.getUserMedia;
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
  /*this is only necessary when output should be audible
     micStream.connect(audioContext.destination);*/
    updatePlay();
    //holdPitch();
  }

//20 Cents max? Differenz in Cents
//flag if in pitch = true
//Vergleich mit max offset

function updatePlay(time) {
  if (isRunning) {
    resizeCanvas();    
    // Doesn't work in Safari...
    analyzer.getFloatTimeDomainData( buf );

    //Does work 
    // analyzer.getByteTimeDomainData( buf2 );
    // new Uint8Array(analyzer.frequencyBinCount)
    // var ac = autoCorrelate(buf, audioContext.sampleRate);
    currPitch = pitch(buf).freq;    
    roundCurrPitch = Math.round(currPitch);

    //hier checken ob Ton getroffen
    // holdPitch();
    updateInfo();
    animateOffset();
    draw();
    
    // console.log("Median"+median(buf));
    frameID = window.requestAnimationFrame( updatePlay );
    if (!window.requestAnimationFrame){
      window.requestAnimationFrame = window.webkitRequestAnimationFrame;
    }
  }else{
    audioContext.close();
    return;
  }
}


function resizeCanvas() {
  if ( canvas.width !== window.innerWidth || canvas.height !== window.innerHeight ) {
    WIDTH = canvas.width;
    HEIGHT = canvas.height; 
    // = window.innerHeight;
    h = HEIGHT /2;
  }
}

$("#menu .play").on("click", function() {
  fadeOutMenu();
})

$("#toMenu").on("click", function(){
  fadeInMenu();
})

$("#toMenu").hover(function(){$(this).addClass('rotate')})

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