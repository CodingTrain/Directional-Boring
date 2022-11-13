// Horizontal Directional Drilling Simulation
// https://thecodingtrain.com/challenges/172-directional-boring
// from The Coding Train (https://thecodingtrain.com/)
// Inspired by Practical Engineering (https://practical.engineering/)
// CT video: https://youtu.be/FfCBNL6lWK0
// Practical Engineering Video: https://youtu.be/JAhdb7dKQpU

// Play the simulator: https://codingtrain.github.io/Directional-Boring/

// Event listeners
// Prevents scrolling while toggling bias
window.addEventListener('keydown', function (e) {
  if ((e.key == " " || e.code == 32) && e.target == document.body) {
    e.preventDefault();
  }
});

const defaultWidth = 1000;
const defaultHeight = 660;
let ratio = 1;

// Vectors for current position and direction
let pos, dir;
// Bias of current drill (up or down, 1 or -1)
let bias;
// All the points along the drill path so far
let path;
let reversePath;
let pathPosition;
let finalPathLength;
let oldPaths;
let actionSequence;
// let randomTurnResistance = 0;
let stuckCount = 0;
let sideTrackCount = 0;
let startCount = 0;
const maxStarts = 9;
const maxStuckTimes = 3;
const maxSideTracks = 5;
const referenceSaturation = 60;
// const randomTurnCorrelation = 0.2;

// corresponding Divs
let startDiv;
let sideTracksDiv;
let stuckDiv;

// Current state of game
let state;
let currentSeed = undefined;
let curRopDevider = 1;
let curRandomFactor6 = 3;

// Div for replays
let shareLinkDiv;
let shareTwitDiv;
let shareLinkedInDiv;
let linkToSolution = '';

// The turning radius to be computed
let turnCircleRadius;
let boulders;
let canvas;

// images of the drilling machine
let machineBack;
let machineFront;

// Groundcolor is used to determine win or lose state
const groundColor = [11, 106, 136];
const groundLevel = 140;
const boulderColor = [220, 150, 130];
const riverColor = [0, 0, 255];
const houseColor1 = [120, 0, 233];
const houseColor2 = [0, 120, 55];
const hillColor = [[123, 12, 0], [120, 0, 115]];
const backgroundColor = [45, 197, 244];
const boundaryColor = [0, 0, 0];
// Position of the goal square box (relative to ground)
const goal = { x: 900, w: 40 };
const goalColor = [252, 238, 33];
const surfacePipeColor = [103, 88, 76];
const dirtLayers = 7;
let connectionCountDown = 0;
let playbackCountDown = 0;

// simulations constants
const turnAnglePerPixel = 0.01;
const startingAngle = 0.2967; // that is 17 degrees
const machineWidth = 80;
const machineHeight = machineWidth * 9 / 16; // proportions according to the image
const pipeLengthMult = 0.87688219663; // relative to drilling machine width
const pipeLengthPixels = Math.floor(pipeLengthMult * machineWidth) - 2; // -2 accounts for the rounding of the pipe

// constants for machine visualization
const startingDepth = 2;
const startingX = 90;
const pipeOffset = 22;
const verticalPipeMovement = 5; // this is used to initialize the connection time
const pauseTimePlayback = 25;

// values related to current game speed;
let deltaSpeedCurGame = 1;
let turnAngleCurSpeed = turnAnglePerPixel;
let pipeLengthSteps = pipeLengthPixels;

// playback string undefined
let playback = undefined;

// Pixel map for scene
let hddScene;
let fogOfUncertinty;
let reflections;

// Buttons
// Button to start
let startButton;
let pullBackButton;
let toggleButton;
let newGameButton;

// Divs with information
let curLevelDiv;

// Divs which control behaviour
let nextLevelDiv;
let globalSpeedDiv;
let randomnessDiv;
// todo think of new controll?

// Checkboxes
let aimingCheckbox;
// let fogCheckbox;

// Sliders
let randomSlider;
let speedSliderP5;

// label
let speedLabel;

function setGradient(image, x, y, w, h, c1, c2, axis) {
  image.noFill();

  if (axis === 1) {
    // Top to bottom gradient
    for (let i = y; i <= y + h; i++) {
      let inter = map(i, y, y + h, 0, 1);
      let c = lerpColor(c1, c2, inter);
      image.stroke(c);
      image.line(x, i, x + w, i);
    }
  } else if (axis === 0) {
    // Left to right gradient
    for (let i = x; i <= x + w; i++) {
      let inter = map(i, x, x + w, 0, 1);
      let c = lerpColor(c1, c2, inter);
      image.stroke(c);
      image.line(i, y, i, y + h);
    }
  }
}

function toggleBias() {
  bias *= -1;
}

function newGameAction() {
  currentSeed = getNewSeed();
  playback = undefined;
  updateDivWithLinkToThisSolution(false);
  randomSeed(currentSeed);
  startDrill();
}

function getNewSeed() {
  return Math.floor(Math.random() * 999998) + 1;
}

function startStopUserAction() {
  if (!playback) {
    startStopAction();
  } else {
    playback = undefined;
    startDrill();
  }
}

function updateSideTrackDiv() {
  sideTracksDiv.html(`Sidetracks ${sideTrackCount}/${maxSideTracks}`);
}

function updateStartDiv() {
  startDiv.html(`Starts ${startCount}/${maxStarts}`);
}

function updateStuckDiv() {
  stuckDiv.html(`Bitwear ${stuckCount}/${maxStuckTimes}`);
}

function startStopAction() {
  if (state == 'PAUSED' || state == 'STUCK') {
    state = 'DRILLING';
    // actionSequence.push(1);
    let prevPath = undefined;
    if (oldPaths.length > 0) {
      prevPath = oldPaths[oldPaths.length - 1];
    }
    let oldPathPoint = undefined;
    if (prevPath && prevPath.length > 0) {
      // taking the first element of the last path (closest to the current bit position)
      oldPathPoint = prevPath[0];
    }
    // check if the previous segment drilled is near by and we are 'side-tracking'
    if (oldPathPoint &&
      dist(pos.x, pos.y, oldPathPoint[0].x, oldPathPoint[0].y) < 1.5) {
      sideTrackCount++;
      console.log("Side-track count" + sideTrackCount);
      // update side teack div
      updateSideTrackDiv();
    } //else {
    startCount++;
    console.log("Start count" + startCount);
    updateStartDiv();
  } else if (state == 'DRILLING') {
    state = 'PAUSED';
    actionSequence.push(1);
    // initializing playback countdown in case we are in playback mode
    playbackCountDown = pauseTimePlayback;
  } else if (state == 'WIN' || state == 'LOSE') {
    startDrill();
  }
  updateStartButtonText();
}

function pullBackUserAction() {
  if (!playback) {
    pullBack();
  }
}

function pullBack() {
  if (state == "PAUSED" || state == "DRILLING" || state == "STUCK") {
    actionSequence.push(3);
    state = 'PAUSED';
    playbackCountDown = pauseTimePlayback;
    let prevPosition = Math.floor((pathPosition - 1) / pipeLengthSteps) * pipeLengthSteps;
    if (prevPosition > 0) {
      oldPaths.push(path.slice(prevPosition));
      path = path.slice(0, prevPosition);
      pathPosition = path.length - 1;
      pos = path[pathPosition][0].copy();
      dir = path[pathPosition][1].copy();
    }
    updateStartButtonText();
  }
}

function touchStarted() {
  // ellipse(mouseX, mouseY, 5, 5);
  if (mouseY > height || mouseX < 0 || mouseX > width) {
    return true;
  }
  //todo add click zone in the bottom of the screen
  else if (mouseX <= machineWidth * ratio &&
    mouseY <= groundLevel * ratio)
  // && mouseY >= groundLevel - machineHeight)
  {
    startStopUserAction();
  }
  else {
    toggleBias();
  }
  // prevent default
  return false;
}

function keyPressed() {
  if (key == " ") {
    toggleBias();
  } else if (keyCode == ESCAPE || keyCode == RETURN || keyCode == ENTER) {
    startStopUserAction();
  } else if (keyCode == BACKSPACE) {
    pullBackUserAction();
  }
}

function drawRiver(hddScene, riverColor) {
  hddScene.noStroke();
  // hddScene.rectMode(CORNER);
  // hddScene.fill(groundColor);
  // hddScene.rect(0, groundLevel, width, defaultHeight - groundLevel);
  hddScene.fill(riverColor);
  hddScene.arc(defaultWidth / 2 + startingX / 2, groundLevel, defaultWidth / 2, defaultWidth / 6, 0, PI);
}
function drawHouse(hddScene, HouseColor) {
  hddScene.noStroke();
  hddScene.fill(HouseColor);
  hddScene.triangle(
    goal.x - 80, groundLevel - 40,
    goal.x - 40, groundLevel - 40,
    goal.x - 60, groundLevel - 80,
  )
  hddScene.rect(goal.x - 80, groundLevel - 40, goal.w, goal.w);
}
function drawHouse1(hddScene, HouseColor) {
  hddScene.noStroke();
  hddScene.fill(HouseColor);
  hddScene.triangle(
    goal.x + 80, groundLevel - 40,
    goal.x + 40, groundLevel - 40,
    goal.x + 60, groundLevel - 80
  )
  hddScene.rect(goal.x + 40, groundLevel - 40, goal.w, goal.w);
}



function drawHill(hddScene, hillColor) {
  hddScene.noStroke();
  hddScene.fill(hillColor[0]);
  hddScene.triangle(
    startingX + 80, groundLevel,
    defaultWidth / 4, groundLevel,
    220, 60);
  hddScene.fill(hillColor[1])
  hddScene.triangle(
    startingX + 180, groundLevel,
    defaultWidth / 5, groundLevel,
    250, 50);
}




function createHddScene() {
  hddScene = createGraphics(defaultWidth, defaultHeight);
  // Draw a new scene
  hddScene.background(backgroundColor);

  // Generate the dirt layers
  const landscapeIterations = 100;
  let dirt = [];
  for (let l = 0; l < dirtLayers; l++) {
    noiseSeed(random(1000));
    dirt.push([]);
    for (let i = 0; i < landscapeIterations; i++) {
      dirt[dirt.length - 1].push(
        noise((i * defaultWidth) / (landscapeIterations * 100))
      );
    }
  }

  // Draw the dirt layers
  hddScene.push();
  hddScene.noFill();
  hddScene.strokeWeight(3);
  for (let l = 0; l < dirtLayers; l++) {
    hddScene.noStroke();
    // hsl mode can be used in rgb to extract saturation
    hddScene.colorMode(HSL);
    // let earthColor = color(`hsba(9.4%, ${random(30, 90)}, 11.8%, 1)`)
    hddScene.fill(24, random(referenceSaturation - 30, referenceSaturation + 30), 18);
    // hddScene.fill(24, 90, 16);
    // hddScene.fill(earthColor);
    hddScene.beginShape();
    for (let x = 0; x < landscapeIterations; x++) {
      // Calculate the y of the dirt
      let y = 0;
      for (let i = 0; i < l; i++) {
        y += ((2.5 * (defaultHeight - groundLevel)) / dirtLayers) * dirt[i][x];
      }
      hddScene.vertex((x * defaultWidth) / landscapeIterations, groundLevel + y);
    }
    // Wrap around so the whole shape can be filled
    hddScene.vertex(defaultWidth, groundLevel);
    hddScene.vertex(defaultWidth, defaultHeight);
    hddScene.vertex(0, defaultHeight);
    hddScene.endShape(CLOSE);
  }
  hddScene.pop();

  drawHill(hddScene, hillColor);

  drawRiver(hddScene, riverColor);

  for (let i = 0; i < 10; i++) {
    let r = random(8, 36);
    let x = random(0, defaultWidth);
    let y = random(groundLevel + 50, defaultHeight - 50);
    boulders.push([x, y, r]);
    hddScene.fill(boulderColor);
    hddScene.circle(x, y, r * 2);
  }

  // todo add the houses here
  // it is important to color houses differently
  // because the status checking occurs based on color

  // house todo refactor this


  drawHouse(hddScene, houseColor1);
  drawHouse1(hddScene, houseColor2);

  // goal
  hddScene.fill(goalColor);
  hddScene.arc(goal.x + 12, groundLevel, goal.w, goal.x / 16, 0, PI);
}

function createFogOfUncertainty() {
  fogOfUncertinty = createGraphics(defaultWidth, defaultHeight);
  // Draw a new scene
  fogOfUncertinty.background(0, 0);
  setGradient(fogOfUncertinty, 0, groundLevel, defaultWidth, goal.w * 2, color(255), color(0), 1);
  fogOfUncertinty.fill(0);
  fogOfUncertinty.noStroke();
  fogOfUncertinty.rect(0, groundLevel + goal.w * 2, defaultWidth, defaultHeight);

  drawRiver(fogOfUncertinty, color(255));
}

function createReflections() {
  reflections = createGraphics(defaultWidth, defaultHeight);
  reflections.background(0, 0);
  drawReflection(reflections);
}

function recomputeDrillingConstants() {
  // computing speed-related constants
  // curRopMult = -speedSliderP5.value();
  // speedLabel.html("Game speed: 1/" + curRopMult);
  deltaSpeedCurGame = 1 / curRopDevider;
  turnAngleCurSpeed = turnAnglePerPixel * deltaSpeedCurGame;
  pipeLengthSteps = pipeLengthPixels * curRopDevider;

  // reseting the bit postion and steering
  pos = createVector(startingX, groundLevel + startingDepth);
  dir = p5.Vector.fromAngle(startingAngle, deltaSpeedCurGame);
}

// Reset the initial state
function startDrill() {
  randomSeed(currentSeed);
  recomputeDrillingConstants();

  // rest of the setup
  path = [];
  reversePath = [
    [createVector(defaultWidth, groundLevel - 4)],
    [createVector(goal.x + goal.w, groundLevel - 4)]];
  actionSequence = [];
  oldPaths = [];
  pathPosition = -1;
  finalPathLength = undefined;
  stuckCount = 0;
  startCount = 0;
  // randomTurnResistance = 0;
  sideTrackCount = 0;
  updateStartDiv();
  updateSideTrackDiv();
  updateStuckDiv();
  boulders = [];
  bias = 1;
  state = 'PAUSED';
  updateStartButtonText();

  // Related circle size
  const turnCircleLen = (PI * 2) / turnAnglePerPixel;
  turnCircleRadius = turnCircleLen / PI / 2;


  createHddScene();
  createFogOfUncertainty();
  createReflections();
}

function generateLink(randomness, seed, speed, replay) {
  let link = `?rnd=${randomness}`;
  if (seed) {
    link += `&seed=${seed}`;
  }
  link += `&ropd=${speed}`;
  if (replay) {
    let sol4 = actionSequenceToCondencedString();
    link += `&s4=${sol4}`;
  }
  return link;
}

function updateDivWithLinkToThisLevel() {
  shareLinkDiv.html(`<a href="${generateLink(curRandomFactor6, currentSeed, curRopDevider, false)}">Link to THIS level</a>`);
}

function copyLinkToClipboard() {
  navigator.clipboard.writeText(linkToSolution);
}

function updateDivWithLinkToThisSolution(addSolution = false) {
  // let solution = actionSequenceToString();
  // let restoredSequence = stringToActions(solution);

  // href="https://twitter.com/intent/tweet/?text=SHARE_TEXT&amp;url=SHARE_URLtwitter&amp;hashtags=geobanana"
  // <a class="resp-sharing-button__link" href="https://facebook.com/sharer/sharer.php?u=SHARE_URLfacebook" target="_blank"
  // rel="noopener" aria-label="Share on Facebook" tabindex="-1">
  // <a class="resp-sharing-button__link"
  // href="https://www.linkedin.com/shareArticle?mini=true&amp;url=SHARE_URLlinkedin&amp;title=SHARE_TEXT&amp;summary=SHARE_TEXT&amp;source=SHARE_URLlinkedin" target="_blank"
  // rel="noopener" aria-label="Share on LinkedIn" tabindex="-1">
  //
  if (addSolution) {
    const relativeLink = generateLink(curRandomFactor6, currentSeed, curRopDevider, true);
    //simple link commented out
    //shareLinkDiv.html(`<a href="${linkToSolution}">Link to YOUR result</a>`);
    // shareLinkDiv.html(`<a onclick="copyLinkToClipboard()">Copy Result link</a>`);

    const shareText = "Try to beat my score in the Underbore game."
    linkToSolution = window.location.href.split('?')[0] + relativeLink;
    const encodedUrl = encodeURIComponent(linkToSolution);
    shareLinkDiv.html(`<a href="${relativeLink}">Sharable link to Result</a>`);
    shareTwitDiv.html(`<a href="https://twitter.com/intent/tweet/?text=${shareText}&amp;url=${encodedUrl}&amp;hashtags=underbore" target="_blank" rel="noopener">Twit Result</a>`);
    //https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fstackoverflow.com%2Fquestions%2F10713542%2Fhow-to-make-custom-linkedin-share-button%2F10737122
    shareLinkedInDiv.html(`<a href="https://www.linkedin.com/sharing/share-offsite/?mini=true&amp;url=${encodedUrl}&amp;title=${shareText}" target="_blank" rel="noopener">Link Result In</a>`);
    //&amp;title=${shareText}&amp;summary=${shareText}&amp;source=${window.location.href.split('?')[0]}

  } else {
    shareTwitDiv.html('');
    shareLinkedInDiv.html('');
    updateDivWithLinkToThisLevel();
  }
}

// note, this funciton now also updates sharable link
function updateStartButtonText() {
  if (playback) {
    updateDivWithLinkToThisSolution(false);
    startButton.html("try to beat");
    if (state == 'PAUSED' || state == 'STUCK') {
      if (maxStarts - startCount <= 0 || maxSideTracks - sideTrackCount <= 0) {
        state = "LOSE";
      }
    }
    return;
  }
  if (state == 'DRILLING' || state == 'CONNECTION') {
    startButton.html('pause');
  }
  if (state == 'PAUSED' || state == 'STUCK') {
    // startButton.html(`start (${maxStarts - startCount} left)`);
    startButton.html('start');
    if (maxStarts - startCount <= 0 || maxSideTracks - sideTrackCount <= 0) {
      state = "LOSE";
    }
  }
  if (state == "WIN" || state == "LOSE") {
    updateDivWithLinkToThisSolution(true);
    startButton.html("try again");
  }
}

function setup() {
  // Let's begin!
  // todo there are some canvases in the end of the page that look weird
  const allowedWidth = min(windowWidth, screen.width);
  if (allowedWidth > defaultWidth) {
    canvas = createCanvas(defaultWidth, defaultHeight);
  } else {
    ratio = allowedWidth / defaultWidth;
    canvas = createCanvas(defaultWidth * ratio, defaultHeight * ratio);
    // scale(ratio);
  }
  // canvas = createCanvas(375, 400);
  // setting frame rate in case it is not set
  // and it goes crazy on screen with variable refresh rate
  frameRate(60);


  let params = getURLParams();
  if (params) {
    if (params["seed"]) {
      currentSeed = params["seed"];
      randomSeed(currentSeed);
    }
    // using uncondenced string
    if (params["sol"]) {
      playback = stringToActions(params["sol"]);
    }
    // using condenced string
    if (params["s4"]) {
      playback = condencedStringToActions(params["s4"]);
    }
    // randomness
    if (params["rnd"]) {
      curRandomFactor6 = params["rnd"];
    }
    // ROP (Rate Of Penetration aka speed) factor
    if (params["ropd"]) {
      curRopDevider = params["ropd"];
    }
  }
  if (!currentSeed) {
    currentSeed = getNewSeed();
    randomSeed(currentSeed);
  }

  // canvas.touchStarted(sceneOnTouchStarted);
  // frameRate(10);

  // todo Move to canvas?
  // Stat divs row 0
  startDiv = createDiv('Drill starts: ');
  updateStartDiv();
  sideTracksDiv = createDiv('Side tracks: ');
  updateSideTrackDiv();
  stuckDiv = createDiv('Bit damage: ');
  updateStuckDiv();

  // Buttons row 1
  // Handle the start and pause button
  startButton = createButton('start').mousePressed(startStopUserAction);

  // Handle the toggle bias button
  toggleButton = createButton("toggle bias").mousePressed(toggleBias);

  // Handle the pull-back button
  pullBackButton = createButton("pull back");
  pullBackButton.mousePressed(pullBackUserAction);

  // Divs with the links

  shareTwitDiv = createDiv(); // empty until something interesting is shareable
  shareLinkDiv = createDiv('<a href="?seed=">Link to THIS level</a>').id('seed-div');
  shareLinkedInDiv = createDiv();

  updateDivWithLinkToThisSolution(false);

  // A button for previewing steering bounds for aiming (@Denisovich I insist on the "limits")

  // // empty
  // createDiv('');

  // Handle new level button

  // newGameButton = createButton("new level");
  // newGameButton.mousePressed(newGameAction);


  // Lnks with information row 3
  // Links to control game behavior row 4
  createGameControlDivs();

  // Last row

  createDiv(
    '<a href="instructions/instructions-slide.png">Visual instructions</a>'
  ).id("visual-instructions");
  createDiv(
    '<a href="https://github.com/alin256/Directional-Boring">Link to GitHub</a>'
  );

  aimingCheckbox = createCheckbox("Steering limits", true).id("steer-lim-box");

  // copyright row
  const copyrightDiv = createDiv(
    'Copyright (c) 2022 Daniel Shiffman; Sergey Alyaev; ArztKlein; Denisovich; tyomka896. <a href="LICENSE.md">MIT License</a>'
  ).id("copyright");
  copyrightDiv.addClass('copyright');

  machineBack = loadImage('assets/drilling-machine-small.png');
  machineFront = loadImage('assets/machine-foreground-small.png');

  startDrill();

  // removing an anoying div from LaspPass
  const annoyingDivs = document.querySelectorAll(`div`);
  // [style="position: static !important;]
  for (const annoying1 of annoyingDivs) {
    // annoying1.remove();
    if (annoying1.style[0] === "position") {
      annoying1.remove();
    }
  }
}

function createGameControlDivs() {
  // divs with information
  // TODO remove curLevelDiv
  curLevelDiv = createDiv(`Level`);
  createDiv("Speed");
  createDiv("Randomness");
  let divText = '';
  // current / next level
  divText += `<b>${currentSeed}</b> `;
  divText += hyperLink(generateLink(curRandomFactor6, getNewSeed(), curRopDevider, false),
    'next ⏭');
  nextLevelDiv = createDiv(divText);

  // speed controls
  divText = '';
  divText += boldOrHyperLink(curRopDevider == 2,
    generateLink(curRandomFactor6, currentSeed, 2, false), 'chill');
  divText += boldOrHyperLink(curRopDevider == 1,
    generateLink(curRandomFactor6, currentSeed, 1, false), 'standard');
  createDiv(divText);

  // randomness controls
  divText = '';
  divText += boldOrHyperLink(curRandomFactor6 == 0,
    generateLink(0, currentSeed, curRopDevider, false), 'no');
  divText += boldOrHyperLink(curRandomFactor6 == 3,
    generateLink(3, currentSeed, curRopDevider, false), 'norm');
  divText += boldOrHyperLink(curRandomFactor6 == 6,
    generateLink(6, currentSeed, curRopDevider, false), 'chaos');
  createDiv(divText);
}

function boldOrHyperLink(expression, link, text) {
  if (expression) {
    return `<b>${text}</b> `;
  } else {
    return hyperLink(link, text);
  }
}

function hyperLink(link, text) {
  return `<a href="${link}">${text}</a> `;
}

function takeAction() {
  if (playback) {
    let decisionNumber = actionSequence.length;
    if (decisionNumber < playback.length) {
      let action = playback[decisionNumber];
      if (action == 1) { // pause
        startStopAction();
        return;
      } else if (action == 3) { // pull back
        pullBack();
        return;
      } else {
        if (decisionNumber == 0) {
          startStopAction();
        } else if (state == "STUCK" || state == "PAUSED") {
          startStopAction();
        }
        bias = playback[decisionNumber] - 1;
      }
    }
  }
}

// One drill step
function drill() {
  dir.rotate(turnAngleCurSpeed * bias);
  // Add some randomness
  // get color
  let c1 = hddScene.get(pos.x, pos.y);
  let c1Saturation = saturation(c1);
  let c1Factor = c1Saturation / referenceSaturation;
  // let c1Brightness = (c1[0] + c1[1] + c1[2]) / 3 / 60;
  // console.log(`color ${c1}. saturation ${c1Saturation}. factor ${c1Factor}.`);
  // random depending on the dirt color
  const newRandom = c1Factor * (random(-curRandomFactor6, 0) * turnAngleCurSpeed * bias) / 6;
  // updated with selected correlation
  // randomTurnResistance = randomTurnResistance * randomTurnCorrelation + newRandom * (1 - randomTurnCorrelation);
  dir.rotate(newRandom);

  // Drilling mode
  // Save previous position
  path.push([pos.copy(), dir.copy(), bias]);
  actionSequence.push(bias + 1);
  pathPosition = path.length - 1;
  if (path.length % pipeLengthSteps == 0) {
    state = "CONNECTION";
    connectionCountDown = verticalPipeMovement;
  }
  // Reduce uncertainty
  fogOfUncertinty.noStroke();
  fogOfUncertinty.fill(255);
  //   todo do not reduce uncertainty in playback mode
  if (!playback) {
    fogOfUncertinty.circle(pos.x, pos.y, goal.w * 2);
  } else {
    fogOfUncertinty.circle(pos.x, pos.y, goal.w);
  }
  pos.add(dir);
  if (pos.x < 0 || pos.x > defaultWidth || pos.y > defaultHeight) {
    state = 'LOSE';
    updateStartButtonText();
  }

  // Get pixel color under drill
  let c = hddScene.get(pos.x, pos.y);
  // Remove the alpha component
  c = c.splice(0, 3);
  // Turn the colour into a string so we can compare it
  c = c.toString();

  // Green you win!
  if (c == goalColor.toString()) {
    state = 'WIN';
    updateStartButtonText();
    // Anything else not the ground color you lose!
  } else if (c == boulderColor.toString()) {
    state = 'STUCK';
    stuckCount++;
    updateStuckDiv();
    if (stuckCount >= maxStuckTimes) {
      state = 'LOSE';
    } else if (playback) {
      // state = 'PAUSED';
      playbackCountDown = pauseTimePlayback;
    }
    updateStartButtonText();
  } else if (
    c == backgroundColor.toString() ||
    c == riverColor.toString() ||
    c == boundaryColor.toString() ||
    c == houseColor1.toString() ||
    c == houseColor2.toString() ||
    c == hillColor[0].toString() ||
    c == hillColor[1].toString()
  ) {
    state = 'LOSE';
    updateStartButtonText();
  }
}

function drawReflection(reflectionImage) {
  const spacing = goal.w;
  const step = 1;
  const visualRad = 3;
  const errorPercent = 10;
  for (let x = 0; x < defaultWidth - spacing; x += step) {
    let minTravelDist = computeReflextionTimeSinglePoint(x, x + spacing);
    let distToObjWithNoize = (100 + random(-10, 10)) / 100. * minTravelDist / 2;
    let xMid = x + spacing / 2;
    reflectionImage.fill(125);
    reflectionImage.noStroke();
    reflectionImage.circle(xMid, distToObjWithNoize + groundLevel, visualRad);
  }
  // drawRiver(reflectionImage);
}

function computeReflextionTimeSinglePoint(x0, x1) {
  let minArrivalDist = defaultHeight * 2;
  //const maxSteps = defaultHeight * 2;
  for (let j = 0; j < boulders.length; j++) {
    for (let i = 0; i < 360; i += 10) {
      // looping angles on the boulder
      let boulderDir = i * PI / 180;
      let boulderPoint = createVector(boulders[j][0], boulders[j][1]);
      boulderPoint.add(p5.Vector.fromAngle(boulderDir, boulders[j][2]));
      if (boulderPoint.x > x1 || boulderPoint.x < x0) {
        continue;
      }
      let distDown = dist(x0, groundLevel, boulderPoint.x, boulderPoint.y);
      let distUp = dist(x1, groundLevel, boulderPoint.x, boulderPoint.y);
      let totalDist = distDown + distUp;
      if (totalDist < minArrivalDist) {
        minArrivalDist = totalDist;
      }
    }
  }
  return minArrivalDist;
  // for (let i = 1; i < 180; i++){
  //   let dir = p5.Vector.fromAngle(i * PI / 180);
  //   let pos = createVector(x0, groundLevel);
  //   let step = 0;
  //   while (step < maxSteps){
  //     pos.add(dir);
  //     step++;
  //     for (let j = 0; j < boulders.length; j++) {
  //       if (dist(pos.x, pos.y, boulders[j][0], boulders[j][1]) <= boulders[j][2]){
  //         // collision detected, reflect
  //       }
  //     }
  //   }
  // }
}

function drawSurfacePipe() {
  let visibleLength = pipeLengthPixels - path.length % pipeLengthSteps * deltaSpeedCurGame + pipeOffset;
  push();
  translate(startingX, groundLevel + startingDepth);
  rotate(startingAngle);
  strokeWeight(3);
  stroke(surfacePipeColor);
  if (state == "CONNECTION") {
    // loading the pipe
    line(-pipeLengthPixels - pipeOffset, -connectionCountDown, -pipeOffset, -connectionCountDown);
    line(-pipeOffset, 0, 0, 0);
  } else {
    line(-visibleLength, 0, 0, 0);
  }
  noStroke();
  fill('black');
  rect(-visibleLength - 4, -5, 4, 9); // top drive / pusher for the pipe constants are hard coded to look nice
  pop();
}

function padNumber(num) {
  return String(Math.round(num)).padStart(5, ' ')
}

function pathToString() {
  let sequence = "";
  // go each 8 bit
  for (let i = 0; i * 8 < path.length; ++i) {
    // compute 8-bit number
    let number = 0;
    let mult = 1;
    for (let j = 0; j < 8; ++j) {
      if (i * 8 + j < path.length) {
        let bias = path[i * 8 + j][2];
        if (bias > 0) {
          number += mult * bias;
        }
        mult *= 2;
      }
    }
    // add 8-bit number to sttring
    sequence += String.fromCharCode(number);
  }
  // btoa encodes string to URL string
  return btoa(sequence);
}

function stringToBias(urlstr) {
  // atob decodes from url string
  let arrayFromStr = Array.from(atob(urlstr));
  let biasArray = [];
  for (let i = 0; i < arrayFromStr.length; ++i) {
    let curNumber = arrayFromStr[i].charCodeAt(0);
    for (let j = 0; j < 8; ++j) {
      biasArray.push(curNumber % 2);
      curNumber = Math.floor(curNumber / 2);
    }
  }
  return biasArray;
}

function actionSequenceToCondencedString() {
  let sequence = "";
  const maxLenght = 63;
  let left = 0;
  let right = 0;
  while (left < actionSequence.length) {
    let command = actionSequence[left];
    right = left + 1;
    while (right < actionSequence.length
      && actionSequence[right] == command
      && right - left < maxLenght) {
      right++;
    }
    let repeat = right - left;
    let encoded = repeat * 4 + command;
    sequence += String.fromCharCode(encoded);
    left = right;
  }
  return btoa(sequence);
}

function condencedStringToActions(urlstr) {
  let arrayFromStr = Array.from(atob(urlstr));
  let actionArray = [];
  for (let i = 0; i < arrayFromStr.length; ++i) {
    let encoded = arrayFromStr[i].charCodeAt(0);
    let command = encoded % 4;
    let repeat = Math.floor(encoded / 4);
    for (let j = 0; j < repeat; ++j) {
      actionArray.push(command);
    }
  }
  return actionArray;
}

function actionSequenceToString() {
  let sequence = "";
  // go each 8 bit
  for (let i = 0; i * 4 < actionSequence.length; ++i) {
    // compute 8-bit number
    let number = 0;
    let mult = 1;
    for (let j = 0; j < 4; ++j) {
      if (i * 4 + j < actionSequence.length) {
        let action = actionSequence[i * 4 + j];
        number += mult * action;
        mult *= 4;
      }
    }
    // add 8-bit number to sttring
    sequence += String.fromCharCode(number);
  }
  // btoa encodes string to URL string
  return btoa(sequence);
}

function stringToActions(urlstr) {
  // atob decodes from url string
  let arrayFromStr = Array.from(atob(urlstr));
  let actionArray = [];
  for (let i = 0; i < arrayFromStr.length; ++i) {
    let curNumber = arrayFromStr[i].charCodeAt(0);
    for (let j = 0; j < 4; ++j) {
      actionArray.push(curNumber % 4);
      curNumber = Math.floor(curNumber / 4);
    }
  }
  return actionArray;
}

function drawEndGameStatsAtY(textY) {
  textAlign(RIGHT, TOP);
  noStroke();
  fill(255);
  // todo fix font for linux
  textFont('courier-bold');
  const fontSize = 24;
  const textX = defaultWidth - fontSize;
  textSize(fontSize);

  if (!finalPathLength) {
    finalPathLength = path.length;
  }

  let reward = 0;
  if (state == "WIN") {
    reward = 5000;
    text(`mission reward = ${padNumber(reward)}+`, textX, textY);
  } else {
    reward = 1000;
    text(`partial reward = ${padNumber(reward)}+`, textX, textY);
  }
  textY += fontSize;
  if (state == "WIN") {
    let drilledPathPixels = finalPathLength * deltaSpeedCurGame;
    text(`final pipe length = ${padNumber(drilledPathPixels)}-`, textX, textY);
    reward -= drilledPathPixels;
  } else {
    let remainingDistance = Math.ceil(dist(pos.x, pos.y, goal.x + goal.w / 2, groundLevel));
    text(`remaining distance = ${padNumber(remainingDistance)}-`, textX, textY);
    reward -= remainingDistance;
  }
  textY += fontSize;

  let length = finalPathLength;
  for (let oldPath of oldPaths) {
    length += oldPath.length;
  }
  length *= deltaSpeedCurGame; // accouning for drilling speed
  text(`drilled length = ${padNumber(length)}-`, textX, textY);
  reward -= length;

  textY += fontSize;
  const startMult = Math.ceil(pipeLengthPixels / 40) * 10;
  let startCost = startCount * startMult;
  text(`starts: ${startCount} *${startMult} = ${padNumber(startCost)}-`, textX, textY);
  reward -= startCost;

  textY += fontSize;
  const sideTrackMult = Math.ceil(pipeLengthPixels / 20) * 10;
  let sideTrackCost = sideTrackCount * sideTrackMult;
  text(`side-tracks: ${sideTrackCount} *${sideTrackMult} = ${padNumber(sideTrackCost)}-`, textX, textY);
  reward -= sideTrackCost;

  textY += fontSize;
  const stuckMult = Math.ceil(pipeLengthPixels / 10) * 10;
  let stuckCost = stuckCount * stuckMult;
  text(`stuck count: ${stuckCount} *${stuckMult} = ${padNumber(stuckCost)}-`, textX, textY);
  reward -= stuckCost;

  textY += fontSize * 1.5;
  text(`FINAL SCORE = ${padNumber(reward)} `, textX, textY);

  // let compressedString = pathToString();
  // let restoredBias = stringToBias(compressedString);

  return reward;
}

// Draw loop
function draw() {
  //scaling everytging if needed
  scale(ratio);
  if (playback) {
    if (state == "STUCK" || (state == "PAUSED" && path.length > 0)) {
      if (playbackCountDown > 0) {
        playbackCountDown -= deltaSpeedCurGame;
      } else {
        takeAction();
      }
    } else {
      takeAction();
    }
  }
  // Dril!
  if (state == "DRILLING") {
    // frameRate(60); for the setting correct frame rate depending on the state in the future
    drill();
  }

  // // in playback mode we need to take actions when paused or stuck using drill()
  // if (playback){
  //   if (state == "STUCK" || (state == "PAUSED" && path.length > 0)){
  //     if (playbackCountDown > 0){
  //       playbackCountDown -= deltaSpeedCurGame;
  //     }else{
  //       // state = "DRILLING";
  //       startStopAction();
  //     }
  //   }
  // }


  // Draw the scene
  image(hddScene, 0, 0);
  if (state != "WIN" || playback) {
    blendMode(MULTIPLY);
    image(fogOfUncertinty, 0, 0);
    blendMode(BLEND);
  }
  // todo consider turning off reflections
  // if (!playback){
  image(reflections, 0, 0);
  // }

  // draw the machine
  image(machineBack, 0, groundLevel - machineHeight + 2, machineWidth, machineHeight);
  drawSurfacePipe();
  image(machineFront, 0, groundLevel - machineHeight + 2, machineWidth, machineHeight);

  // Draw the paths
  // abandoned paths first
  for (let oldPath of oldPaths) {
    beginShape();
    noFill();
    stroke(125);
    strokeWeight(2);
    for (let vPair of oldPath) {
      let v = vPair[0]
      vertex(v.x, v.y);
    }
    endShape();
  }

  // the newest well
  beginShape();
  noFill();
  stroke(255);
  strokeWeight(4);
  for (let vPair of path) {
    let v = vPair[0]
    vertex(v.x, v.y);
  }
  endShape();

  // the pulled pipe/cable if win

  if (state == 'WIN') {
    beginShape();
    noFill();
    stroke(127);
    strokeWeight(8);
    let v;
    for (let vPair of reversePath) {
      v = vPair[0]
      vertex(v.x, v.y);
    }
    endShape();
    // draw hole enlarger in black
    if (v) {
      stroke(0);
      // todo something weird with circle diameter should be the same as strokeWeight
      circle(v.x, v.y, 3);
    }
    // propogate pipe
    if (path.length > 0) {
      reversePath.push(path.pop());
    }
  }

  // Draw something where drill starts
  fill(255, 0, 0);
  stroke(0);
  strokeWeight(4);

  if (aimingCheckbox.checked() && !(state == "WIN" || state == "LOSE")) {
    // Start of the aiming arcs
    push();
    translate(pos.x, pos.y);
    rotate(dir.heading());

    // Draw the aiming lines
    stroke(125);
    strokeWeight(1);
    noFill();
    const maxAimAngle = QUARTER_PI * 1.8;
    arc(
      0,
      -turnCircleRadius,
      turnCircleRadius * 2,
      turnCircleRadius * 2,
      HALF_PI - maxAimAngle,
      HALF_PI,
      OPEN
    );
    arc(
      0,
      turnCircleRadius,
      turnCircleRadius * 2,
      turnCircleRadius * 2,
      -HALF_PI,
      -HALF_PI + maxAimAngle,
      OPEN
    );
    // test angle
    // arc(
    //   0,
    //   -turnCircleRadius * 4/3,
    //   turnCircleRadius * 2 * 4/3,
    //   turnCircleRadius * 2 * 4/3,
    //   HALF_PI - maxAimAngle,
    //   PI,
    //   OPEN
    // );
    // arc(
    //   0,
    //   turnCircleRadius * 4/3,
    //   turnCircleRadius * 2 * 4/3,
    //   turnCircleRadius * 2 * 4/3,
    //   -PI,
    //   -HALF_PI + maxAimAngle,
    //   OPEN
    // );
    pop();
  }

  // Draw the drill bit
  if (state != 'WIN') {
    push();
    stroke(252, 238, 33);
    strokeWeight(8);
    translate(pos.x, pos.y);
    rotate(dir.heading() + (startingAngle) * bias);
    line(0, 0, 10, 0);
    pop();
  }

  // show frame rate
  textAlign(LEFT, TOP);
  noStroke();
  fill(255);
  textSize(24);
  textFont('courier');
  // let frameRateObserved = getFrameRate();
  // text('Framerate ' +  Math.round(frameRateObserved/10) * 10, 10, defaultHeight - 24);
  // debug information for location
  // circle(xTouch, yTouch, 10);

  if (state == "CONNECTION") {
    // textAlign(CENTER, TOP);
    // noStroke();
    // fill(255);
    // textSize(24);
    // textFont('courier');
    // text('*pipe handling*', defaultWidth / 2, groundLevel / 2);
    connectionCountDown -= deltaSpeedCurGame;
    if (connectionCountDown <= 0) {
      state = "DRILLING";
    }
  }

  if (state == 'STUCK') {
    textAlign(CENTER, TOP);
    noStroke();
    fill(255);
    textSize(24);
    textFont('courier');
    text('STUCK! (' + stuckCount + '/' + maxStuckTimes + ' times)', defaultWidth / 2, groundLevel / 2);
  }

  if (!playback && state != "DRILLING" && state != "CONNECTION") {
    noStroke();
    fill(255);
    textSize(16);
    textFont('courier');
    // text('Click the machine \nto start / pause', 3, 3);
    textAlign(LEFT, TOP);
    text('Click the machine\nto start/pause [⏎]', 5, 5);
    textAlign(CENTER, TOP);
    text('Click anywehere else\nto toggle bias [⎵]', defaultWidth / 2 + 10, 5)
    textAlign(RIGHT, TOP);
    text('Use the button\nto pull back [⌫]', defaultWidth - 5, 5)
    // text('Click anywehere else\nto toggle bias', defaultWidth/2, 3)
  }

  // If you've lost!
  if (state == 'LOSE') {
    background(255, 0, 0, 150);
    textAlign(CENTER, TOP);
    noStroke();
    fill(255);
    textSize(96);
    textFont('courier-bold');
    if (playback) {
      text('THEY LOSE', defaultWidth / 2, groundLevel);
    } else {
      text('YOU LOSE', defaultWidth / 2, groundLevel);
    }
    drawEndGameStatsAtY(groundLevel + 96);
  } // If you've won!
  else if (state == 'WIN') {
    background(0, 255, 0, 150);
    textAlign(CENTER, TOP);
    noStroke();
    fill(255);
    textSize(96);
    textFont('courier-bold');
    if (playback) {
      text('THEY WIN', defaultWidth / 2, groundLevel);
    } else {
      text('YOU WIN', defaultWidth / 2, groundLevel);
    }
    // Starting idea for a score
    drawEndGameStatsAtY(groundLevel + 96);
  }
}
