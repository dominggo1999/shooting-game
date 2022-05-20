import gsap from 'gsap';

const canvas = document.querySelector('canvas');

const canvasHeight = window.innerHeight;
const canvasWidth = window.innerWidth;

// Score
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore'), 10) || 0;

// Ui
const scoreButton = document.getElementById('score');
const highScoreButton = document.getElementById('high-score');
highScoreButton.innerHTML = highScore;

const modal = document.getElementById('modal');
const startButton = document.getElementById('start-button');

// Make canvas fill the entire screen
canvas.height = canvasHeight;
canvas.width = canvasWidth;
const ctx = canvas.getContext('2d');

class Player {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class Projectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    this.draw();
    this.x += this.velocity.x * 7;
    this.y += this.velocity.y * 7;
  }
}

class Enemy {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    this.draw();
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }
}

const friction = 0.99;
class Particle {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.alpha = 1;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.draw();
    this.velocity.x *= friction;
    this.velocity.y *= friction;
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.alpha -= 0.01;
  }
}

let player;
let projectiles;
let enemies;
let particles;
let spawnInterval;

const handleGameClick = (e) => {
  const { clientX, clientY } = e;

  const angle = Math.atan2(
    clientY - canvasHeight / 2,
    clientX - canvasWidth / 2,
  );

  const velocity = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };

  const newProjectile = new Projectile(
    canvasWidth / 2,
    canvasHeight / 2,
    6,
    'white',
    velocity,
  );

  projectiles.push(newProjectile);
};

const spawnEnemies = () => {
  spawnInterval = setInterval(() => {
    if (document.hidden) {
      return;
    }

    const radius = 5 + Math.random() * 25;
    let x;
    let y;

    // If random < 0.5 then x is either 0-radius or canvaswidth+radius and y is random
    if (Math.random() < 0.5) {
      x = Math.random() > 0.5 ? 0 - radius : canvasWidth + radius;
      y = Math.random() * canvasHeight;
    } else {
      // If random >= 0.5 then y is either 0-radius or canvasheight+radius and x is random
      x = Math.random() * canvasWidth;
      y = Math.random() > 0.5 ? 0 - radius : canvasHeight + radius;
    }

    const color = `hsl(${Math.random() * 360},70%,70%)`;

    const angle = Math.atan2(
      canvasHeight / 2 - y,
      canvasWidth / 2 - x,
    );

    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    enemies.push(new Enemy(x, y, radius, color, velocity));
  }, 1000);
};

let animationId;
const animate = () => {
  animationId = requestAnimationFrame(animate);

  // Clear previous render
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  // Draw Player first
  player.draw();

  particles.forEach((p, id) => {
    if (p.alpha <= 0) {
      particles.splice(id, 1);
    } else {
      p.update();
    }
  });

  projectiles.forEach((i, id) => {
    i.update();

    // Remove off screen projectiles
    if (
      i.x + i.radius < 0
      || i.x - i.radius > canvasWidth
      || i.y + i.radius < 0
      || i.y - i.radius > canvasHeight
    ) {
      setTimeout(() => {
        projectiles.splice(id, 1);
      }, 0);
    }
  });

  enemies.forEach((e, eid) => {
    e.update();
    // Collision detection with player for "Game Over" state
    const dist = Math.hypot(player.x - e.x, player.y - e.y) - player.radius - e.radius;

    if (dist < 1) {
      cancelAnimationFrame(animationId);
      localStorage.setItem('highScore', score);
      modal.style.display = 'flex';

      modal.querySelector('span').innerHTML = score;
      window.removeEventListener('click', handleGameClick);
      clearInterval(spawnInterval);
    }

    // Collision detection for each projectiles
    projectiles.forEach((p, pid) => {
      const dist = Math.hypot(p.x - e.x, p.y - e.y) - p.radius - e.radius;

      // Remove both projectile and enemy
      if (dist < 1) {
        // Create particles
        for (let i = 0; i < e.radius * 2; i += 1) {
          particles.push(new Particle(
            p.x,
            p.y,
            Math.random() * 2,
            e.color,
            {
              x: (Math.random() - 0.5) * (8 * Math.random()),
              y: (Math.random() - 0.5) * (8 * Math.random()),
            },
          ));
        }

        if (e.radius - 10 > 5) {
          gsap.to(e, {
            radius: e.radius - 10,
          });
          setTimeout(() => {
            projectiles.splice(pid, 1);
          }, 0);

          score += 100;
          scoreButton.innerHTML = score;

          if (score > highScore) {
            highScore = score;
            highScoreButton.innerHTML = score;
          }
        } else {
          setTimeout(() => {
            enemies.splice(eid, 1);
            projectiles.splice(pid, 1);
          }, 0);
          score += 350;
          scoreButton.innerHTML = score;
          if (score > highScore) {
            highScore = score;
            highScoreButton.innerHTML = score;
          }
        }
      }
    });
  });
};

const init = () => {
  player = new Player(canvasWidth / 2, canvasHeight / 2, 10, 'white');
  projectiles = [];
  enemies = [];
  particles = [];
  window.addEventListener('click', handleGameClick);
};

startButton.addEventListener('click', () => {
  modal.style.display = 'none';

  init();
  spawnEnemies();
  animate();
});
