////  Page-scoped globals  ////

// Counters
var rocketIdx = 1;
var asteroidIdx = 1;
var numFires = 0;
var numHits = 0;

// Size Constants
var MAX_ASTEROID_SIZE = 50;
var MIN_ASTEROID_SIZE = 15;
var ASTEROID_SPEED = 5;
var ROCKET_SPEED = 10;
var SHIP_SPEED = 25;
var ASTEROID_SPAWN_RATE = 1000;  //ms
var OBJECT_REFRESH_RATE = 50;  //ms
var SCORE_UNIT = 100;  // scoring is in 100-point units

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
var gwhGame, gwhOver, gwhStatus, gwhScore;

// Global Object Handles
var shipA;
var shipB;

// "initial", "stage one", "stage two", "stage three", "gameover"
var gamePhase;

var audio;

// Main
$(document).ready( function() {
  console.log("Ready!");
  gamePhase = "initial"
  audio = true;
  if (audio) {
    //$("#sound-intro")[0].play();
  }

  // Set global handles (now that the page is loaded)
  gwhGame = $('.game-window');
  gwhOver = $('#game-over-panel');
  gwhStart = $("#start-panel");
  gwhStatus = $('.status-window');
  gwhScore = $('#score-box');
  gwhAccuracy = $('#accuracy-box');
  shipA = $('#enterprise-1');
  shipB = $('#enterprise-2');
  shipB.hide();

  // Add button handlers
  $("#start-button").on("click", startGame);
  $("#restart-button").on("click", restart);

  // Set global positions
  maxShipPosX = gwhGame.width() - shipA.width();
  maxShipPosY = gwhGame.height() - shipA.height();
  $(window).keydown(keydownRouter);

  // Periodically check for collisions (instead of checking every position-update)
  setInterval( function() {
    checkCollisions();  // Remove elements if there are collisions
  }, 100);
});

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

// Starts the Game
function startGame() {
  gwhStart.hide();
  gamePhase = "stage one";
  var mainLoop = setInterval(function(){ 
    if (gamePhase !== "stage one" && gamePhase !== "stage two" && gamePhase !== "stage three") {
      clearInterval(mainLoop);
      return;
    }
    createAsteroid();
  }, ASTEROID_SPAWN_RATE);
}

// Takes the Player back to the Main Menu
function restart() {
  gamePhase = "initial";
  shipB.hide();
  rocketIdx = 1;
  asteroidIdx = 1;
  numFires = 0;
  numHits = 0;
  setAccuracy();
  gwhOver.hide();
  gwhStart.show();
  if (audio) {
    $("#sound-intro")[0].play();
  }
}

function startStageThree() {
  gamePhase = "stage three";
  shipB.show();
  maxShipPosX = gwhGame.width() - shipA.width() * 2;
}

function gameOver() {
  gamePhase = "game over";
  if (audio) {
    $("#sound-gameover")[0].play();
  }
  // Remove all game elements
  $('.rocket').remove();
  $('.asteroid').remove();
  gwhOver.show();
}

function score(s) {
  gwhScore.html(parseInt($('#score-box').html()) + s);
  var score = parseInt($('#score-box').html());
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
    gwhScore.html(parseInt(10000));
  }
  else if (gamePhase === "stage two") {
    startStageThree();
    gwhScore.html(parseInt(20000));
  }
}

// Check for any collisions and remove the appropriate object if needed
function checkCollisions() {
  // First, check for rocket-asteroid checkCollisions
  /* NOTE: We dont use a global handle here because we need to refresh this
   * list of elements when we make the reference.
   */
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

        // Score points for hitting an asteroid! Smaller asteroid --> higher score
        var points = Math.ceil(MAX_ASTEROID_SIZE-curAsteroid.width()) * SCORE_UNIT;
        score(points);
      }
    });
  });


  // Next, check for asteroid-ship interactions
  $('.asteroid').each( function() {
    var curAsteroid = $(this);
    if (isColliding(curAsteroid, shipA) || (gamePhase === "stage three" && isColliding(curAsteroid, shipB))) {
      gameOver();
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

function createAsteroid() {
  // NOTE: source - http://www.clipartlord.com/wp-content/uploads/2016/04/aestroid.png
  var asteroidDivStr = "<div id='a-" + asteroidIdx + "' class='asteroid'></div>"
  // Add the rocket to the screen
  gwhGame.append(asteroidDivStr);
  // Create and asteroid handle based on newest index
  var curAsteroid = $('#a-'+asteroidIdx);

  asteroidIdx++;  // update the index to maintain uniqueness next time

  // Set size of the asteroid (semi-randomized)
  var astrSize = MIN_ASTEROID_SIZE + (Math.random() * (MAX_ASTEROID_SIZE - MIN_ASTEROID_SIZE));
  curAsteroid.css('width', astrSize+"px");
  curAsteroid.css('height', astrSize+"px");
  curAsteroid.append("<img src='img/asteroid.png' height='" + astrSize + "'/>")

  /* NOTE: This position calculation has been moved lower since verD -- this
  **       allows us to adjust position more appropriately.
  **/
  // Pick a random starting position within the game window
  var startingPosition = Math.random() * (gwhGame.width()-astrSize);  // Using 50px as the size of the asteroid (since no instance exists yet)

  // Set the instance-specific properties
  curAsteroid.css('left', startingPosition+"px");

  var mySpeed = OBJECT_REFRESH_RATE;
  if ((gamePhase == "stage two" || gamePhase == "stage three") && asteroidIdx % 3 == 0) {
    mySpeed /= 5; 
  }

  // Make the asteroids fall towards the bottom
  setInterval( function() {
    curAsteroid.css('top', parseInt(curAsteroid.css('top'))+ASTEROID_SPEED);
    // Check to see if the asteroid has left the game/viewing window
    if (parseInt(curAsteroid.css('top')) > (gwhGame.height() - curAsteroid.height())) {
      curAsteroid.remove();
    }
  }, mySpeed);
}

// Handle "fire" [rocket] events
function fireRocket(sh) {
  numFires++;
  console.log('Firing rocket...');
  if (audio) {
    $("#sound-rocket")[0].play();
  }
  // NOTE: source - https://www.raspberrypi.org/learning/microbit-game-controller/images/missile.png
  var rocketDivStr = "<div id='r-" + rocketIdx + "' class='rocket'><img src='img/rocket.png'/></div>";
  // Add the rocket to the screen
  gwhGame.append(rocketDivStr);
  // Create and rocket handle based on newest index
  var curRocket = $('#r-'+rocketIdx);
  rocketIdx++;
  // Set vertical position
  curRocket.css('top', sh.css('top'));
  // Set horizontal position
  var rxPos = parseInt(sh.css('left')) + (sh.width()/2);  // In order to center the rocket, shift by half the div size (recall: origin [0,0] is top-left of div)
  curRocket.css('left', rxPos+"px");

  // Create movement update handler
  var thisInterval = setInterval( function() {
    curRocket.css('top', parseInt(curRocket.css('top'))-ROCKET_SPEED);
    // Check to see if the rocket has left the game/viewing window
    if (parseInt(curRocket.css('top')) < curRocket.height()) {
      //curRocket.hide();
      curRocket.remove();
      
      // Update the accuracy
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
