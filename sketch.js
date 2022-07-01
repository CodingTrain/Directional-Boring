let pos;
let dir;
let path;
let bias;
let state;

// A measure of stability of ground, how much randomness is added
let randomFactor = 5;

const groundColor = [139, 69, 19];
const groundLevel = 100;
const goal = { x: 540, w: 20 };

let hddScene;

let startButton;

function startDrill() {
  pos = createVector(10, 100);
  dir = p5.Vector.fromAngle(PI / 6);
  path = [];
  bias = 1;
  state = 'PAUSED';
}

function setup() {
  createCanvas(600, 400);
  startDrill();

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

  createButton('toggle bias').mousePressed(function () {
    bias *= -1;
  });

  createSpan('randomness: ');
  randomSlider = createSlider(0, 10, 0, 0.01);

  hddScene = createGraphics(width, height);
  hddScene.background(51);
  hddScene.noStroke();
  hddScene.rectMode(CORNER);
  hddScene.fill(groundColor);
  hddScene.rect(0, groundLevel, width, height - groundLevel);
  hddScene.fill(30, 144, 255);
  hddScene.arc(width / 2, groundLevel, 400, 200, 0, PI);

  // Goal
  hddScene.fill(0, 255, 0);
  hddScene.rect(goal.x, groundLevel - goal.w, goal.w, goal.w);
}

function drill() {
  const angle = 0.01;
  dir.rotate(angle * bias);

  // Add some randomness
  const randomFactor = randomSlider.value();
  const r = random(-randomFactor, randomFactor) * angle;
  dir.rotate(r);

  path.push(pos.copy());
  pos.add(dir);

  const c = hddScene.get(pos.x, pos.y);
  if (c[0] == 0 && c[1] == 255 && c[2] == 0) {
    state = 'WIN';
    startButton.html('try again');
  } else if (
    c[0] != groundColor[0] ||
    c[1] !== groundColor[1] ||
    c[2] !== groundColor[2]
  ) {
    state = 'LOSE';
    startButton.html('try again');
  }
}

function draw() {
  if (state == 'DRILLING') drill();

  image(hddScene, 0, 0);

  beginShape();
  noFill();
  stroke(0);
  strokeWeight(2);
  for (let v of path) {
    vertex(v.x, v.y);
  }
  endShape();

  // Draw something where drill starts
  fill(255, 0, 0);
  stroke(255);
  strokeWeight(1);
  circle(10, groundLevel, 4);

  stroke(255, 0, 0);
  strokeWeight(2);
  push();
  translate(pos.x, pos.y);
  rotate(dir.heading() + (PI / 6) * bias);
  line(0, 0, 10, 0);
  pop();

  if (state == 'LOSE') {
    background(255, 0, 0, 150);
    textAlign(CENTER, CENTER);
    noStroke();
    fill(255);
    textSize(96);
    textFont('courier-bold');
    text('YOU LOSE', width / 2, height / 2);
  } else if (state == 'WIN') {
    background(0, 255, 0, 150);
    textAlign(CENTER, CENTER);
    noStroke();
    fill(255);
    textSize(96);
    textFont('courier-bold');
    text('YOU WIN', width / 2, height / 2);

    textSize(24);
    text(`pipe length: ${path.length}`, width / 2, height / 2 + 96);
  }
}
