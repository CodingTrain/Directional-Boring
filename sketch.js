let pos;
let dir;
let bias = 1;
let path = [];

const ground = [139, 69, 19];

let state = 'PAUSED';

let hddScene;

let startButton;

function setup() {
  createCanvas(600, 400);
  pos = createVector(10, 100);
  dir = p5.Vector.fromAngle(0);

  startButton = createButton('start').mousePressed(function () {
    if (state == 'PAUSED') {
      state = 'DRILLING';
      this.html('pause');
    } else if (state == 'DRILLING') {
      state = 'PAUSED';
      this.html('start');
    }
  });

  createButton('toggle bias').mousePressed(function () {
    bias *= -1;
  });

  hddScene = createGraphics(width, height);
  hddScene.background(51);
  hddScene.noStroke();
  hddScene.rectMode(CORNER);
  hddScene.fill(ground);
  hddScene.rect(0, 100, width, height - 100);
  hddScene.fill(30, 144, 255);
  hddScene.arc(width / 2, 100, 400, 200, 0, PI);
}

function drill() {
  const angle = 0.01;
  dir.rotate(angle * bias);

  path.push(pos.copy());
  pos.add(dir);

  const c = hddScene.get(pos.x, pos.y);
  if (c[0] != ground[0] || c[1] !== ground[1] || c[2] !== ground[2]) {
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

  stroke(255, 0, 0);
  strokeWeight(4);
  push();
  translate(pos.x, pos.y);
  rotate(dir.heading() + (PI / 6) * bias);
  line(0, 0, 10, 0);
  pop();
}
