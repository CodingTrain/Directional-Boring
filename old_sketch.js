// Horizontal Directional Drilling Simulation
// https://thecodingtrain.com/challenges/172-directional-boring
// from The Coding Train (https://thecodingtrain.com/)
// Inspired by Practical Engineering (https://practical.engineering/)
// CT video: https://youtu.be/FfCBNL6lWK0
// Practical Engineering Video: https://youtu.be/JAhdb7dKQpU

// Play the simulator: https://codingtrain.github.io/Directional-Boring/

// Vectors for current position and direction
let pos, dir;
// Bias of current drill (up or down, 1 or -1)
let bias;
// All the points along the drill path so far
let path;
// Current state of game
let state;
// Option to reverse direction of drill
let reverse;
// Track time
let mytime;
// level of difficulty
//const level = 5;
// Track best (lowest) score
let score;
let bestScore = 2000;
// The turning radius to be computed
let turnCircleRadius;
let boulders;

// Groundcolor is used to determine win or lose state
const groundColor = [11, 106, 136];
const groundLevel = 100;
const boulderColor = [220, 150, 130];
const riverColor = [0, 0, 255];
const backgroundColor = [45, 197, 244];
const boundaryColor = [0, 0, 0];
// Position of the goal square box (relative to ground)
const goal = {
  x: 540,
  w: 20
};
const goalColor = [252, 238, 33];
const dirtLayers = 7;

// simulations constants
const angle = 0.01;

// Pixel map for scene
let hddScene;
let fogOfUncertinty;
let reflections;

// Game controls
let startButton;
let toggleButton;
let reverseButton;
let aimingCheckbox;
let fogCheckbox;
let buttonDiv;
let controlDiv;
let levelSlider;

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

function drawRiver(hddScene, riverColor) {
  hddScene.noStroke();
  // hddScene.rectMode(CORNER);
  // hddScene.fill(groundColor);
  // hddScene.rect(0, groundLevel, width, height - groundLevel);
  hddScene.fill(riverColor);
  hddScene.arc(width / 2, groundLevel, width / 2, width / 4, 0, PI);
}

function createHddScene() {
  hddScene = createGraphics(width, height);
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
        noise((i * width) / (landscapeIterations * 100))
      );
    }
  }

  // Draw the dirt layers
  hddScene.push();
  hddScene.noFill();
  hddScene.strokeWeight(3);
  for (let l = 0; l < dirtLayers; l++) {
    hddScene.noStroke();
    hddScene.colorMode(HSB);
    hddScene.fill(24, random(30, 90), 30);
    hddScene.beginShape();
    for (let x = 0; x < landscapeIterations; x++) {
      // Calculate the y of the dirt
      let y = 0;
      for (let i = 0; i < l; i++) {
        y += ((2.5 * (height - groundLevel)) / dirtLayers) * dirt[i][x];
      }
      hddScene.vertex((x * width) / landscapeIterations, groundLevel + y);
    }
    // Wrap around so the whole shape can be filled
    hddScene.vertex(width, groundLevel);
    hddScene.vertex(width, height);
    hddScene.vertex(0, height);
    hddScene.endShape(CLOSE);
  }
  hddScene.pop();

  drawRiver(hddScene, riverColor);
  const level = levelSlider.value();
  for (let i = 0; i < level; i++) {
    let r = random(8, 36);
    let x = random(0, width);
    let y = random(groundLevel + 50, height - 50);
    boulders.push([x, y, r]);
    hddScene.fill(boulderColor);
    hddScene.circle(x, y, r * 2);
  }
  hddScene.fill(45, 197, 244);
  hddScene.noStroke();
  hddScene.rect(0, 0, width, groundLevel);

  // Add the goal
  hddScene.fill(goalColor);
  hddScene.rect(goal.x - 2, groundLevel - goal.w - 2, goal.w + 4, goal.w + 4);
  hddScene.triangle(goal.x - 6, groundLevel - goal.w - 2,
    goal.x + goal.w + 6, groundLevel - goal.w - 2,
    goal.x + goal.w / 2, groundLevel - goal.w * 1.8);
}

function createFogOfUncertainty() {
  fogOfUncertinty = createGraphics(width, height);
  // Draw a new scene
  fogOfUncertinty.background(0, 0);
  setGradient(fogOfUncertinty, 0, groundLevel, width, goal.w * 2, color(255), color(0), 1);
  fogOfUncertinty.fill(0);
  fogOfUncertinty.noStroke();
  fogOfUncertinty.rect(0, groundLevel + goal.w * 2, width, height);

  drawRiver(fogOfUncertinty, color(255));
}

function createReflections() {
  reflections = createGraphics(width, height);
  reflections.background(0, 0);
  drawReflection(reflections);
}

// Reset the initial state
function startDrill() {
  pos = createVector(10, 100);
  dir = p5.Vector.fromAngle(PI / 6);
  path = [];
  boulders = [];
  bias = 1;
  state = 'PAUSED';
  reverse = 'FALSE';
  startButton.html('start');

  // Related circle size
  const turnCircleLen = (PI * 2) / angle;
  turnCircleRadius = turnCircleLen / PI / 2;


  createHddScene();
  createFogOfUncertainty();
  createReflections();
}



function setup() {
  // Let's begin!
  createCanvas(600, 400);

  // Handle the start and stop button
  startButton = createButton('start').mousePressed(function () {
    if (state == 'PAUSED') {
      state = 'DRILLING';
      this.html('pause');
    } else if (state == 'DRILLING') {
      state = 'PAUSED';
      this.html('start');
    } else if (state == 'WIN' || state == 'LOSE') {
      startDrill();
    }
  });

  // Handle the toggle bias button
  createButton('toggle bias').mousePressed(function () {
    bias *= -1;
  });

  // Handle the toggle bias button
  reverseButton = createButton('reverse').mousePressed(function () {
    if (reverse == 'FALSE') {
      reverse = 'TRUE';
      this.html('forward');
    } else if (reverse == 'TRUE') {
      reverse = 'FALSE';
      this.html('reverse');
    }
  });

  // Add checkboxes for previewing aiming bounds and adding fog of uncertainty
  aimingCheckbox = createCheckbox('Steering limits', false).id("steer-lim-box");
  fogCheckbox = createCheckbox('Fog of uncertainty', true).id("fog-box");

  let div1 = createDiv().id('random');
  let div2 = createDiv().id('level');
  // A slider for adding some randomness (in %)
  let span1 = createSpan('randomness: ').id('slider-label');
  randomSlider = createSlider(0, 100, 50, 0.5);
  randomSlider.parent(div1);
  span1.parent(div1);
  // A slider to add difficulty level based on number of boulders
  let span2 = createSpan('level: ').id('level-label');
  levelSlider = createSlider(1, 10, 5, 1);
  levelSlider.parent(div2);
  span2.parent(div2);
  level = getItem("level");
  if (level !== null) {
    levelSlider.value(level);
  }
  levelSlider.changed(storeLevel);

  // Get previous best score
  bestScore = getItem("bestScore");

  // Draw the scene
  startDrill();
  mytime = millis();
}

// One drill step
function drill() {

  dir.rotate(angle * bias);

  // Add some randomness
  const randomFactor = randomSlider.value();
  const r = (random(-randomFactor, 0) * angle * bias) / 100;
  dir.rotate(r);

  // Save previous position
  path.push(pos.copy());

  // Allow player to reverse direction
  if (reverse == 'TRUE') {
    pos.sub(dir);
  } else {
    pos.add(dir);
  }

  // Reduce uncertainty
  fogOfUncertinty.noStroke();
  fogOfUncertinty.fill(255);
  fogOfUncertinty.circle(pos.x, pos.y, goal.w * 2);
  //pos.add(dir);
  if (pos.x < 0 || pos.x > width || pos.y > height) {
    state = 'LOSE';
    startButton.html('try again');
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
    startButton.html('try again');
    // Anything else not the ground color you lose!
  } else if (
    c == boulderColor.toString() ||
    c == backgroundColor.toString() ||
    c == riverColor.toString() ||
    c == boundaryColor.toString()
  ) {
    state = 'LOSE';
    startButton.html('try again');
  }
}

function drawReflection(reflectionImage) {
  const spacing = goal.w;
  const step = 1;
  const visualRad = 3;
  const errorPercent = 10;
  for (let x = 0; x < width - spacing; x += step) {
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
  let minArrivalDist = height * 2;
  //const maxSteps = height * 2;
  console.log('point ' + x0);
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
        console.log('boulder ' + boulderPoint);
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

// Draw loop
function draw() {
  // Drill!
  if (state == 'DRILLING') drill();

  // Draw the scene
  image(hddScene, 0, 0);
  if (!(state == "WIN" || state == "LOSE") && fogCheckbox.checked()) {
    blendMode(MULTIPLY);
    image(fogOfUncertinty, 0, 0);
    blendMode(BLEND);
  }
  image(reflections, 0, 0);
  // Draw the path
  beginShape();
  noFill();
  stroke(255);
  strokeWeight(4);
  for (let v of path) {
    vertex(v.x, v.y);
  }
  endShape();

  // Draw something where drill starts
  fill(255, 0, 0);
  stroke(0);
  strokeWeight(4);
  circle(10, groundLevel, 4);

  if (aimingCheckbox.checked() && reverse == "FALSE") {
    // Start of the aiming arcs
    push();
    translate(pos.x, pos.y);
    rotate(dir.heading());

    // Draw the aiming lines
    stroke(125);
    strokeWeight(1);
    noFill();
    const maxAimAngle = QUARTER_PI * 1.2;
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
    pop();
  }

  // Draw the drill bit
  push();
  stroke(252, 238, 33);
  strokeWeight(8);
  translate(pos.x, pos.y);
  if (!reverse) {
    rotate(dir.heading() + (PI / 6) * bias);
  } else {
    rotate(dir.heading(TWO_PI));
  }
  //rotate(dir.heading() + (PI / 6) * bias);
  line(0, 0, 10, 0);
  pop();

  // If you've lost!
  if (state == 'LOSE') {
    background(255, 0, 0, 150);
    textAlign(CENTER, CENTER);
    noStroke();
    fill(255);
    textSize(96);
    textFont('courier-bold');
    text('YOU LOSE', width / 2, height / 2);
    // If you've won!
  } else if (state == 'WIN') {
    background(0, 255, 0, 150);
    textAlign(CENTER, CENTER);
    noStroke();
    fill(255);
    textSize(96);
    textFont('courier-bold');
    text('YOU WIN', width / 2, height / 2);
    textSize(24);

    // Starting idea for a score
    score = int(0.5 * mytime + 0.5 * path.length);
    if (score < bestScore) {
      bestScore = updateBestScore(score);
      text(`New best score: ${bestScore}`, width / 2, height / 2 + 96);
    } else {
      text(`Score: ${score}`, width / 2, height / 2 + 96);
      // text(`pipe length: ${path.length}`, width / 2, height / 2 + 96);
    }
  }
}

function updateBestScore(score) {
  //let bestScore = getItem('bestScore');
  if (score < bestScore) {
    bestScore = score;
  }
  storeItem("bestScore", bestScore);
}

function storeLevel() {
  let level = levelSlider.value();
  storeItem("level", level);
}