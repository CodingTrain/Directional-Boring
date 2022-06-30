let pos, dir;
let path = [];
let bias = 1;
let angle = 0.01;
let biasButton;

let sliderSteps;
let stepsSpan;

function setup() {
  createCanvas(600, 400);
  pos = createVector(0, 100);
  dir = createVector(1, 0);
  createButton("toggle bias").mousePressed(function () {
    bias *= -1;
  });
  createButton("advance").mousePressed(function () {
    drill();
  });

  sliderSteps = createSlider(1, 50, 1);
  stepsSpan = createSpan(sliderSteps.value());
}

function drill() {
  path.push(pos.copy());
  const steps = 10;
  for (let i = 0; i < sliderSteps.value(); i++) {
    dir.rotate(bias * angle);
    path.push(pos.copy());
    pos.add(dir);
  }
}

function draw() {
  background(51);
  noStroke();
  rectMode(CORNER);
  fill(139, 69, 19);
  rect(0, 100, width, height - 100);
  fill(30, 144, 255);
  arc(width / 2, 100, 400, 200, 0, PI);

  stroke(0);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < path.length; i++) {
    vertex(path[i].x, path[i].y);
  }
  vertex(pos.x, pos.y);
  endShape();
  push();
  translate(pos.x, pos.y);
  strokeWeight(2);
  stroke(200, 100, 0);
  rotate(dir.heading() + (bias * PI) / 6);
  line(0, 0, 10, 0);
  pop();

  stepsSpan.html("steps: " + sliderSteps.value());
}
