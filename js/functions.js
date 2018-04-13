function draw() {
	// Draw the input as wave on the canvas
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  ctx.fillRect(0,0, WIDTH, HEIGHT);
  ctx.clearRect(0,0, WIDTH, HEIGHT);

  ctx.strokeStyle = "blue";
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.moveTo(0, HEIGHT/2);

  for (var i=0;i<WIDTH;i++) {
    ctx.lineTo(i*2.3  , HEIGHT/2+(buf[i])*WIDTH);
  }
  ctx.stroke();
  ctx.closePath();

  // ctx.beginPath();
  // ctx.strokeStyle = "rgba(0, 200, 0, 0.5)";
  // for (var i = 0; i < trailArray.length; i++) {
  //   ctx.lineTo(trailArray[i].x, HEIGHT/2+trailArray[i].y*40);
  // }
  // ctx.stroke();
  // ctx.closePath();
}

function holdPitch() {
/*
    let toleranceCents = 20
    let referenceNote = 440
    let currentPitch = 445.5321*/

    // function isInRange( cents ) {
    //   if ( cents >= (-toleranceCents) && cents <= (toleranceCents) ) {
    //     return true
    //   }
    //   return false
    // }

    // if ( isInRange(centOffset( currentPitch, referenceNote )) ) {
    //   // current average is in range
    //   baloon.pump()
    // } else {
    //   baloon.reset()
    // }

  avg = average(pitchArray);
  // log(avg +" "+ roundCurrPitch);
  for (var i = 0; i < pitchArray.length; i++) {
    if ( avg >= roundCurrPitch -20 && avg <= roundCurrPitch +20 ) {       
      ctx.strokeStyle = "red";
      ctx.beginPath();
      ctx.rect(20,20,150,100);
      ctx.stroke();
      ctx.closePath();
    }
    //else{reset flag}
  }
}

function updateInfo(){	
    if ( currPitch == -1 ) {
    $('#freq .inner,#note .inner, #tune .inner').text("--");
    $('#tune .inner').removeClass("sharp flat");
  } else {

    $('#freq .inner').text( roundCurrPitch );
    var notes = noteFromPitch( currPitch );
    $('#note .inner').text( keys[notes%12] + getOctNumber(currPitch));
    var offTune = centOffset( currPitch, notes );

      if ( offTune == 0 ) {
        $('#tune .inner').removeClass("flat sharp");
      } else {

        if (offTune < 0 ) {

          $('#tune .inner').removeClass("sharp");
          $('#tune .inner').addClass("flat");
        } else {

          $('#tune .inner').addClass("sharp");
          $('#tune .inner').removeClass("flat");
          $('#tune .inner').text((offTune) );
          //log(offTune);
          }
        }
    }
}

function fadeOut(){
  $("#menu").fadeToggle(1500);
  $(".infobar").fadeToggle(1600).removeClass("hidden");
  isRunning = true;
  setTimeout(
    function(){
      init();
    },1200);
}

function fadeIn(){
    $("#menu").fadeToggle(1200);
  $(".infobar").fadeToggle(700);
  isRunning = false;
  $("#cnv").fadeOut(1200);
  setTimeout(
    function(){
      $('#cnv').remove();
    },1200);
}

function getWav(name, dict) {
    var request = new XMLHttpRequest();
    request.open('GET', "sounds/" + encodeURIComponent(name) + ".wav", true);
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
function autoCorrelate( buf, sampleRate ) {
  var SIZE = buf.length;
  var MAX_SAMPLES = Math.floor(SIZE/2);
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;
  var foundGoodCorrelation = false;
  var correlations = new Array(MAX_SAMPLES);

  for (var i=0;i<SIZE;i++) {
    var val = buf[i];
    rms += val*val;
  }
  rms = Math.sqrt(rms/SIZE);
  if (rms<0.01) // not enough signal
    return -1;

  var lastCorrelation=1;
  for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i=0; i<MAX_SAMPLES; i++) {
      correlation += Math.abs((buf[i])-(buf[i+offset]));
    }
    correlation = 1 - (correlation/MAX_SAMPLES);
    correlations[offset] = correlation; // store it, for the tweaking we need to do below.
    if ((correlation>0.9) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {

      var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
      return sampleRate/(best_offset+(8*shift));
    }
    lastCorrelation = correlation;
  }
  if (best_correlation > 0.01) {
    // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
    return sampleRate/best_offset;
  }
  return -1;
//  var best_frequency = sampleRate/best_offset;
}
function average(value) {
    var total = 0;
    var len = value.length;
    for(i = 0; i < len; i++) {
        total += value[i];
    }
    return Math.round(total / len);
}

//From http://www.sengpielaudio.com/Rechner-centfrequenz.htm
function octFromFreq(freq)
{
  var oct = (Math.log(freq) - Math.log (261.626)) / Math.log (2) + 4.0;
  return oct;
}

function getOctNumber(freq) {
  var lnote = octFromFreq(freq);
  var oct = Math.floor(lnote);
  var offset = 50.0;
  var cents = 1200 * (lnote - oct);
  if (cents >= 1150) {
    cents -= 1200;
    oct++;
  }
  return oct;
}
//end sengpiel

function noteFromPitch( frequency ) {
  var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
  return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}

function centOffset( frequency, note ) {
  return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note )) / Math.log(2) );
}

function onError(err) {
    console.error(err);
}