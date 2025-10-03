// Homepage-specific JavaScript (no authentication checks)

// Initialize home page
document.addEventListener('DOMContentLoaded', function() {
  // Initialize particles
  initializeParticles();
  
  // Handle navigation links
  handleNavigation();
});

function initializeParticles() {
  /* Particles config */
  if (typeof particlesJS !== 'undefined') {
    particlesJS("particles-js", {
      "particles": {
        "number": {"value": 72, "density": {"enable": true, "value_area": 900}},
        "color": {"value": "#88d498"},
        "shape": {"type": "circle"},
        "opacity": {"value": 0.55, "random": false},
        "size": {"value": 3, "random": true},
        "line_linked": {"enable": true, "distance": 140, "color": "#88d498", "opacity": 0.35, "width": 1},
        "move": {"enable": true, "speed": 2.5, "direction": "none", "random": false, "straight": false, "out_mode": "out"}
      },
      "interactivity": {
        "detect_on": "canvas",
        "events": {
          "onhover": {"enable": true, "mode": ["grab", "repulse"]},
          "onclick": {"enable": true, "mode": "push"},
          "resize": true
        },
        "modes": {
          "grab": {"distance": 140, "line_linked": {"opacity": 0.7}},
          "repulse": {"distance": 120, "duration": 0.4}, // Particles repel from cursor
          "push": {"particles_nb": 4}
        }
      },
      "retina_detect": true
    });
  }
}


function handleNavigation() {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
}
const blob = document.querySelector(".blob");

    document.addEventListener("mousemove", (e) => {
      blob.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Disable F12, Ctrl+Shift+I, Ctrl+U
document.addEventListener("keydown", (e) => {
  if (
    e.key === "F12" || 
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.key === "u")
  ) {
    e.preventDefault();
  }
});


const aboutpage = document.querySelector(".contact-form");

  document.addEventListener("click", (e) => {
    // If the click is inside the form, ignore
    if (aboutpage.contains(e.target)) return;

    // Create a spark
    const spark = document.createElement("div");
    spark.className = "spark";
    spark.style.left = `${e.clientX - 3}px`;
    spark.style.top = `${e.clientY - 3}px`;
    document.body.appendChild(spark);

    // Remove after animation
    spark.addEventListener("animationend", () => {
      spark.remove();
    });
  });

document.querySelectorAll(".card").forEach(card => {
  const canvas = card.querySelector(".card-overlay");
  const ctx = canvas.getContext("2d");

  // Match canvas to card size
  canvas.width = 300;
  canvas.height = 200;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = card.dataset.image; // automatically pick card-specific image

  img.onload = () => {
    // Draw initial image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  // Dissolve effect on hover
  card.addEventListener("mouseenter", () => {
    // Reset image before dissolving
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let pixels = [];
    const blockSize = 15;
    for (let y = 0; y < canvas.height; y += blockSize) {
      for (let x = 0; x < canvas.width; x += blockSize) {
        pixels.push({ x, y });
      }
    }

    pixels.sort(() => Math.random() - 0.5);

    let i = 0;
    const interval = setInterval(() => {
      for (let j = 0; j < 15; j++) {
        if (i >= pixels.length) {
          clearInterval(interval);
          return;
        }
        const p = pixels[i];
        ctx.clearRect(p.x, p.y, blockSize, blockSize);
        i++;
      }
    }, 20);
  });

  // Restore instantly on unhover
  card.addEventListener("mouseleave", () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  });
});
const faders = document.querySelectorAll('.fade-in-on-scroll');

const handleScroll = () => {
  faders.forEach(el => {
    const rect = el.getBoundingClientRect();
    const triggerPoint = window.innerHeight * 0.85; // 85% of viewport height

    if (rect.top < triggerPoint) {
      el.classList.add('visible'); // fade in when scrolling into view
    } 
    // optional: remove 'visible' if you want fade out when scrolling up
    // else {
    //   el.classList.remove('visible');
    // }
  });
};

window.addEventListener('scroll', handleScroll);
handleScroll(); // check on load
