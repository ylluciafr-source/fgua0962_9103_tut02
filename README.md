# **Quzi 8**

## **Part 1: Imaging Technique Inspiration**

I got inspired by Petros Vrellis’s *Interactive Starry Night*. In his project, the **brushstrokes turn into particles that move and flow** when people touch the screen. This makes the painting look alive instead of staying still. For my work, I want to use this idea in *The Scream*. The sky and the water can show slow waves and twists when the user interacts. The painting is still clear, but the moving parts make the feeling stronger. 

![Starry night](https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg)
![The Scream](https://upload.wikimedia.org/wikipedia/commons/3/34/Edvard-Munch-The-Scream.jpg)


## **Part 2: Coding Technique Exploration**

From my research, I found a coding technique called **Perlin Noise Wave** in p5.js. This method uses smooth random values to make natural wave shapes. It is different from simple math waves, because the lines and colors look more soft and real. By using this in paintings, the brushstrokes can move in a flowing way. When the user moves the mouse or touches the screen, the program can add small changes, so the sky and the water in *The Scream* move like they are alive.

```
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/024-perlinnoiseflowfield.html

var inc = 0.1;
var scl = 10;
var cols, rows;

var zoff = 0;

var fr;

var particles = [];

var flowfield;

function setup() {
  createCanvas(600, 400);
  cols = floor(width / scl);
  rows = floor(height / scl);
  fr = createP('');

  flowfield = new Array(cols * rows);

  for (var i = 0; i < 300; i++) {
    particles[i] = new Particle();
  }
  background(51);
}

function draw() {
  var yoff = 0;
  for (var y = 0; y < rows; y++) {
    var xoff = 0;
    for (var x = 0; x < cols; x++) {
      var index = x + y * cols;
      var angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
      var v = p5.Vector.fromAngle(angle);
      v.setMag(1);
      flowfield[index] = v;
      xoff += inc;
      stroke(0, 50);
      // push();
      // translate(x * scl, y * scl);
      // rotate(v.heading());
      // strokeWeight(1);
      // line(0, 0, scl, 0);
      // pop();
    }
    yoff += inc;

    zoff += 0.0003;
  }

  for (var i = 0; i < particles.length; i++) {
    particles[i].follow(flowfield);
    particles[i].update();
    particles[i].edges();
    particles[i].show();
  }

  // fr.html(floor(frameRate()));
}
```

## **Reference/Link :**

https://artof01.com/vrellis/works/starry_night.html

https://archive.p5js.org/examples/math-noise-wave.html

https://thecodingtrain.com/challenges/24-perlin-noise-flow-field