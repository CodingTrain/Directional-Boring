let pos, dir;
let path = [];
let bias = 1;
let angle = 0.01;
let biasButton;

let sliderSteps;
let stepsSpan;

//let score = 0;
let scoreSpan;

let drilling = true;
let win = null;
let fail = false;

function setup() {
  createCanvas(600, 400);
  pos = createVector(0, 101);
  dir = createVector(1, 0);
  createButton("toggle bias").mousePressed(function () {
    bias *= -1;
  });
  createButton("advance").mousePressed(function () {
    if (!fail) {
      drill();
      win += sliderSteps.value();
    }
  });

  sliderSteps = createSlider(1, 50, 1);
  stepsSpan = createSpan(sliderSteps.value());
  scoreSpan = createSpan(win);
  div1 = createDiv();
  div1.position(10, 450);
  div2 = createDiv();
  div2.position(10, 550);
  let p = createP("Drill a hole under the water using the most efficient path (and lowest score).");
  p.parent(div1);
  scoreSpan.parent(div1);
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
  outcome(pos.x, pos.y);
  endShape();
  push();
  translate(pos.x, pos.y);
  strokeWeight(2);
  stroke(200, 100, 0);
  rotate(dir.heading() + (bias * PI) / 6);
  line(0, 0, 10, 0);
  pop();

  stepsSpan.html("steps: " + sliderSteps.value());

  if (!drilling && !fail) {
    
    p2 = createP("Congratulations!  You did it!");
    p2.parent(div2);
    scoreSpan.parent(div2);
    scoreSpan.html("Score: " + win/670);
    noLoop();
  } else if (!drilling && fail) {
    p3 = createP("Oops!  You hit an obstacle.");
    p3.parent(div2);
    noLoop();
  }
}


function outcome(x, y) {
  let e = isInEllipse(x, y);
  if (y > 100 && e) {
    drilling = false;
    fail = true;
  }
  else if (x < 200 && y < 100 || x > 600) {
    drilling = false;
    fail = true;
  } 
  else if (y > 400) {
    drilling = false;
    fail = true;
  }
  else if (x > 400 && y < 100) {
    drilling = false;
  }
}


//https://stackoverflow.com/questions/34731883/ellipse-mouse-collision-detection
function isInEllipse(x, y) {
  let a = 200;
  let b = 100;
  let dx = x - 300;
  let dy = y - 100;
  return ((dx * dx) / (a * a) + (dy * dy) / (b * b) <= 1);
}
