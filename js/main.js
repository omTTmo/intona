/*--------------------------------
INTONA - intonation trainer
--------------------------------*/

var keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var getMicInput = null;
var audioContext = null;
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
var ref= {};
var canvas, ctx, freq, note, tune;
var isRunning = false;
var offTune = null;
var linePos = 0;
var velocity = 0.5;
var h = 0;
var fps = 20;
var then = 0;
var elapsed = 0;

var init = function(arg){

  if (isRunning) {
    //Prepare the canvas for rendering    
    canvas = document.getElementById("cnv");
    ctx = canvas.getContext("2d");
    //Drop error if browser doesn't support it
    if (!ctx) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    //Call resize once here to get current value of h for drawing in animateOffset()
    resizeCanvas();
    h = HEIGHT/2;

    //Create AudioContext to work with audio data
    if (audioContext === null || audioContext.state !== "running") {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();        
    }

    // Initialize pitch detection (MacLeod) from pitchfinder.js
    pitch = PitchFinder.MPM({
      sampleRate: audioContext.sampleRate,
      bufferSize: ANALYSIS_BUF_SIZE
    });

    if (arg == 'tune') {      
    // Ask user to enable microphone - log error if not allowed
    // getMicInput = navigator.mediaDevices.getUserMedia;
      getUserInput();

    }else if (arg == 'play') {
      resizeCanvas();
      getWav("C_short", ref);

      $("#play").click(function() {
        playSound(ref["C_short"]);
      });
    }
  }
}

var getUserInput = function(){
    getMicInput = Modernizr.prefixed("getUserMedia", navigator);
    getMicInput({audio: true, video: false}, onMicStream, onError);
}

var onMicStream = function(stream) {
  console.log("gotStream");
// If there is input send it to the Analyzer Node
  micStream = audioContext.createMediaStreamSource(stream);
  analyzer = audioContext.createAnalyser();
  analyzer.fftSize = 2048;

  // Next line is only for debugging and when output should be audible
     // micStream.connect(audioContext.destination)

  micStream.connect( analyzer );
  fpsInterval = 1000/fps;
  then = Date.now();
  startTime = then;

  updateTune();
  }

//20 Cents max? difference in Cents
//flag if in pitch = true
//Vergleich mit max offset

var updateTune = function(time) {
  if (isRunning) {

    resizeCanvas();

    // Only works in MODERN browsers ( != Safari ;) )
    analyzer.getFloatTimeDomainData( buf );
    
    currPitch = pitch(buf).freq;    
    roundCurrPitch = Math.round(currPitch);

    // Control FPS - from https://stackoverflow.com/questions/19764018/controlling-fps-with-requestanimationframe
    // Calculate elapsed time since last loop
    now = Date.now();
    elapsed = now - then;

    // If enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {

      then = now - (elapsed % fpsInterval);
      updateInfo();
      animateOffset();
      draw();

    }

    //Callback loop 
    frameID = window.requestAnimationFrame( updateTune );
    if (!window.requestAnimationFrame){
      window.requestAnimationFrame = window.webkitRequestAnimationFrame;
    }
  }else{

    //If we are not running, disconnect the audio context
    audioContext.close();
    return;    
  }
}


var resizeCanvas = function() {
  if ( canvas.width !== window.innerWidth || canvas.height !== window.innerHeight ) {
    WIDTH = canvas.width;
    HEIGHT = canvas.height; 
    // = window.innerHeight;
    // h = HEIGHT /2;
  }
}

$("#menu .tune").on("click", function() {
  fadeOutMenu('tune');
  isTune();
})

$('#menu .play').on("click", function(){
  fadeOutMenu('play');
  isPlay();
})

$("#toMenu").on("click", function(){
  fadeInMenu();
})