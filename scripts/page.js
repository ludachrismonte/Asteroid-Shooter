////  Page-scoped globals  ////

// Counters
var rocketIdx;
var asteroidIdx;
var shieldIdx;
var numFires;
var numHits;
var score;

// Size Constants
var MAX_ASTEROID_SIZE = 50;
var MIN_ASTEROID_SIZE = 15;
var ASTEROID_SPEED = 5;
var ROCKET_SPEED = 10;
var SHIP_SPEED = 25;
var ASTEROID_SPAWN_RATE = 1000;  //ms
var OBJECT_REFRESH_RATE = 33;  //30 FPS
var SCORE_UNIT = 100;  // scoring is in 100-point units
var ITEM_SPAWN_RATE = 3;

/*
 * This is a handy little container trick: use objects as constants to collect
 * vals for easier (and more understandable) reference to later.
 */
var KEYS = {
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  L_key: 76,
  spacebar: 32
}

// Size vars
var maxShipPosX, maxShipPosY;

// Global Window Handles (gwh__)
var gwhGame, gwhOver, gwhStatus, gwhScore, settings;

// Global Object Handles
var shipA, shipB;
var shieldA, shieldB;
var shieldState;

// "initial", "stage one", "stage two", "stage three", "gameover"
var gamePhase;
var mainLoop;
var audio;

// Main
$(document).ready( function() {
  console.log("Ready!");
  audio = false;

  // Set global handles (now that the page is loaded)
  gwhGame = $('.game-window');
  gwhOver = $('#game-over-panel');
  gwhStart = $("#start-panel");
  gwhStatus = $('.status-window');
  gwhScore = $('#score-box');
  gwhAccuracy = $('#accuracy-box');
  settings = $("#settings");
  settings.hide();

  shipA = $('#enterprise-1');
  shipB = $('#enterprise-2');

  shieldA = $('#shieldA');
  shieldB = $('#shieldB');

  // Add button handlers
  $("#start-button").on("click", startGame);
  $("#restart-button").on("click", restart);

  restart();

  $(window).keydown(keydownRouter);

  setInterval( function() {
    checkCollisions();
  }, 33);
});

// Takes the Player back to the Main Menu
function restart() {
  gamePhase = "initial";
  resetShip();
  shieldState = true;
  toggleShields();
  rocketIdx = 1;
  asteroidIdx = 1;
  shieldIdx = 1;
  numFires = 0;
  numHits = 0;
  score = 0;
  gwhScore.html(parseInt(score));
  setAccuracy();
  gwhOver.hide();
  gwhStart.show();
  if (audio) {
    $("#sound-intro")[0].play();
  }
}

function keydownRouter(e) {
  switch (e.which) {
    case KEYS.spacebar:
      fireRocket(shipA);
      if (gamePhase === "stage three") {
        fireRocket(shipB)
      }
      break;
    case KEYS.left:
    case KEYS.right:
    case KEYS.up:
    case KEYS.down:
      moveShip(e.which);
      break;
    case KEYS.L_key:
      advanceLevel();
      break;
    default:
      console.log("Invalid input!");
  }
}

var settingsOpen = false;

function toggleSettings() {
  if (settingsOpen) {
    settingsOpen = false;
    settings.hide();
    $("#settings-button-toggle").html("Open Setting Panel");
  }
  else {
    settingsOpen = true;
    settings.show();
    $("#settings-button-toggle").html("Close Setting Panel");
  }
}

function setSettings() {
  if ($("#settings-audio").is(':checked')) {
    audio = true;
  } 
  else {
    audio = false;
  }
  if ($("#settings-rate").val() !== "") {
    if ($("#settings-rate").val() < 0.2 || $("#settings-rate").val() > 4){
      alert("Asteroid rate must be between 0.2 and 4.0.");
      $("#settings-rate").val("");
      return;
    }
    ASTEROID_SPAWN_RATE = ($("#settings-rate").val() * (Math.random() + 0.5) * 1000).toFixed(0);
    console.log("Set ASTEROID_SPAWN_RATE to: " + ASTEROID_SPAWN_RATE);
    clearInterval(mainLoop);
    startSpawn();
  }
  settingsOpen = false;
  settings.hide();
  $("#settings-button-toggle").html("Open Setting Panel");
}

// Starts the Game
function startGame() {
  gwhStart.hide();
  gamePhase = "stage one";
  clearInterval(mainLoop);
  startSpawn();
}

function startSpawn() {
  console.log("Starting Asteroids...");
  mainLoop = setInterval(function(){ 
    if (gamePhase !== "stage one" && gamePhase !== "stage two" && gamePhase !== "stage three") {
      clearInterval(mainLoop);
      return;
    }
    createAsteroid();
  }, ASTEROID_SPAWN_RATE);
}

function resetShip() {
  maxShipPosX = gwhGame.width() - shipA.width();
  maxShipPosY = gwhGame.height() - shipA.height();
  shipA.css('top', maxShipPosY);
  shipA.css('left', maxShipPosX / 2);
  shipB.css('top', maxShipPosY);
  shipB.css('left', maxShipPosX / 2);
  shipB.hide();
}



function startStageThree() {
  gamePhase = "stage three";
  shipB.show();
  maxShipPosX = gwhGame.width() - shipA.width() * 2;
}

function gameOver() {
  gamePhase = "gameover";
  if (audio) {
    $("#sound-gameover")[0].play();
  }
  // Remove all game elements
  $('.rocket').remove();
  $('.asteroid').remove();
  $('.shield-pickup').remove();
  gwhOver.show();
  $('#game-over-score').html("Score: " + parseInt(score));
}

function addScore(s) {
  score += s;
  gwhScore.html(parseInt(score));
  if (gamePhase === "stage two" && score >= 20000) {
    startStageThree();
  }
  else if (gamePhase === "stage one" && score >= 10000) {
    gamePhase = "stage two";
  }
}

function setAccuracy() {
  if (numFires == 0) {
    gwhAccuracy.html("0%");
  }
  else gwhAccuracy.html(parseInt(Math.round(numHits / numFires * 100)) + "%");
}

function advanceLevel() {
  if (gamePhase === "stage one") {
    gamePhase = "stage two";
    score = 10000;
    gwhScore.html(parseInt(score));
  }
  else if (gamePhase === "stage two") {
    startStageThree();
    score = 20000;
    gwhScore.html(parseInt(20000));
  }
}

function toggleShields() {
  if (shieldState) {
    shieldState = false;
    shieldA.hide();
    shieldB.hide();
  }
  else {
    shieldState = true;
    shieldA.show();
    shieldB.show();
  }
}

// Check for any collisions and remove the appropriate object if needed
function checkCollisions() {
  // First, check for rocket-asteroid checkCollisions
  $('.rocket').each( function() {
    var curRocket = $(this);  // define a local handle for this rocket
    $('.asteroid').each( function() {
      var curAsteroid = $(this);  // define a local handle for this asteroid

      // For each rocket and asteroid, check for collisions
      if (isColliding(curRocket,curAsteroid)) {
        // If a rocket and asteroid collide, destroy both
        curRocket.remove();
        curAsteroid.remove();
        numHits++;
        if (numHits % ITEM_SPAWN_RATE === 0) {
          createShield();
        }
        var points = Math.ceil(MAX_ASTEROID_SIZE-curAsteroid.width()) * SCORE_UNIT;
        if (curAsteroid.hasClass('special')) {
          points *= 2;
        }
        addScore(points);
      }
    });
  });

  // Next, check for asteroid-ship interactions
  $('.asteroid').each( function() {
    var curAsteroid = $(this);
    if (isColliding(curAsteroid, shipA) || isColliding(curAsteroid, shipB)) {
      if (shieldState) {
        curAsteroid.remove();
        toggleShields();
      }
      else {
        gameOver();
      }      
    }
  });

  // Next, check for shield-ship interactions
  $('.shield-pickup').each( function() {
    var curShield = $(this);
    if (isColliding(curShield, shipA) || isColliding(curShield, shipB)) {
      if (!shieldState) {
        curShield.remove();
        toggleShields();
      }
    }
  });
}

// Check if two objects are colliding
function isColliding(o1, o2) {
  // Define input direction mappings for easier referencing
  o1D = { 'left': parseInt(o1.css('left')),
          'right': parseInt(o1.css('left')) + o1.width(),
          'top': parseInt(o1.css('top')),
          'bottom': parseInt(o1.css('top')) + o1.height()
        };
  o2D = { 'left': parseInt(o2.css('left')),
          'right': parseInt(o2.css('left')) + o2.width(),
          'top': parseInt(o2.css('top')),
          'bottom': parseInt(o2.css('top')) + o1.height()
        };
  // If horizontally overlapping...
  if ( (o1D.left < o2D.left && o1D.right > o2D.left) ||
       (o1D.left < o2D.right && o1D.right > o2D.right) ||
       (o1D.left < o2D.right && o1D.right > o2D.left) ) {

    if ( (o1D.top > o2D.top && o1D.top < o2D.bottom) ||
         (o1D.top < o2D.top && o1D.top > o2D.bottom) ||
         (o1D.top > o2D.top && o1D.bottom < o2D.bottom) ) {
      // Collision!
      return true;
    }
  }
  return false;
}

// Return a string corresponding to a random HEX color code
function getRandomColor() {
  // Return a random color. Note that we don't check to make sure the color does not match the background
  return '#' + (Math.random()*0xFFFFFF<<0).toString(16);
}

function createShield() {
  console.log("Making Shield");
  gwhGame.append("<div id='s-" + shieldIdx + "' class='shield-pickup'></div>");
  // Create and asteroid handle based on newest index
  var curShield = $('#s-' + shieldIdx);

  shieldIdx++;

  curShield.append("<img src='img/shield.png' height='30px'/>")

  var startingPosition = Math.random() * (gwhGame.width() - 30);

  // Set the instance-specific properties
  curShield.css('left', startingPosition+"px");

  // Make the asteroids fall towards the bottom
  setInterval( function () {
    curShield.css('top', parseInt(curShield.css('top')) + ASTEROID_SPEED);
    if (parseInt(curShield.css('top')) > (gwhGame.height() - curShield.height())) {
      curShield.remove();
    }
  }, OBJECT_REFRESH_RATE);
}

function createAsteroid() {
  // NOTE: source - http://www.clipartlord.com/wp-content/uploads/2016/04/aestroid.png
  gwhGame.append("<div id='a-" + asteroidIdx + "' class='asteroid'></div>");
  // Create and asteroid handle based on newest index
  var curAsteroid = $('#a-'+asteroidIdx);

  asteroidIdx++;

  // Set size of the asteroid (semi-randomized)
  var astrSize = MIN_ASTEROID_SIZE + (Math.random() * (MAX_ASTEROID_SIZE - MIN_ASTEROID_SIZE));
  curAsteroid.css('width', astrSize+"px");
  curAsteroid.css('height', astrSize+"px");
  curAsteroid.append("<img src='img/asteroid.png' height='" + astrSize + "'/>")

  var startingPosition = Math.random() * (gwhGame.width()-astrSize);

  // Set the instance-specific properties
  curAsteroid.css('left', startingPosition+"px");

  var mySpeed = OBJECT_REFRESH_RATE;
  var specialAsteroid = false;
  if ((gamePhase === "stage two" || gamePhase === "stage three") && asteroidIdx % 3 === 0) {
    curAsteroid.addClass("special");
    specialAsteroid = true;
    mySpeed /= 5; 
  }

  // Make the asteroids fall towards the bottom
  setInterval( function () {
    if (gamePhase === "stage three" && specialAsteroid) {
      if (curAsteroid.css('left') < shipA.css('left')) {
        curAsteroid.css('left', parseInt(curAsteroid.css('left'))+1);
      }
      else if (curAsteroid.css('left') > shipA.css('left')) {
        curAsteroid.css('left', parseInt(curAsteroid.css('left'))-1);
      }
    }
    curAsteroid.css('top', parseInt(curAsteroid.css('top'))+ASTEROID_SPEED);
    // Check to see if the asteroid has left the game/viewing window
    if (parseInt(curAsteroid.css('top')) > (gwhGame.height() - curAsteroid.height())) {
      curAsteroid.remove();
    }
  }, mySpeed);
}

function fireRocket(sh) {
  if (gamePhase === "initial" || gamePhase === "gameover") { return; }

  numFires++;
  console.log('Firing rocket...');
  console.log(audio);
  if (audio) {
    $("#sound-rocket")[0].play();
  }
  // NOTE: source - https://www.raspberrypi.org/learning/microbit-game-controller/images/missile.png
  gwhGame.append("<div id='r-" + rocketIdx + "' class='rocket'><img src='img/rocket.png'/></div>");
  var curRocket = $('#r-'+rocketIdx);
  rocketIdx++;

  // Set vertical position
  curRocket.css('top', sh.css('top'));

  // Set horizontal position
  if (sh === shipA) {
    var rxPos = parseInt(sh.css('left')) + (sh.width()/2 + 3);
  }
  else var rxPos = parseInt(sh.css('left')) + (sh.width()/2 + 77);
  curRocket.css('left', rxPos+"px");

  // Movement
  var thisInterval = setInterval( function() {
    curRocket.css('top', parseInt(curRocket.css('top'))-ROCKET_SPEED);
    if (parseInt(curRocket.css('top')) < curRocket.height()) {
      curRocket.remove();
      setAccuracy();
      clearInterval(thisInterval);
    }
  }, OBJECT_REFRESH_RATE);
}

// Handle ship movement events
function moveShip(arrow) {
  switch (arrow) {
    case KEYS.left:
      var newPos = parseInt(shipA.css('left'))-SHIP_SPEED;
      if (newPos < 0) {
        newPos = 0;
      }
      shipA.css('left', newPos);
      shipB.css('left', newPos);
    break;
    case KEYS.right:  // right arrow
      var newPos = parseInt(shipA.css('left'))+SHIP_SPEED;
      if (newPos > maxShipPosX) {
        newPos = maxShipPosX;
      }
      shipA.css('left', newPos);
      shipB.css('left', newPos);
    break;
    case KEYS.up:  // up arrow
      var newPos = parseInt(shipA.css('top'))-SHIP_SPEED;
      if (newPos < 0) {
        newPos = 0;
      }
      shipA.css('top', newPos);
      shipB.css('top', newPos);
    break;
    case KEYS.down:  // down arrow
      var newPos = parseInt(shipA.css('top'))+SHIP_SPEED;
      if (newPos > maxShipPosY) {
        newPos = maxShipPosY;
      }
      shipA.css('top', newPos);
      shipB.css('top', newPos);
    break;
  }
}
