const stars = [];
function getStarCount() {
    if (window.innerWidth <= 480) return 80;
    if (window.innerWidth <= 768) return 100;
    return 30;
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
const loginBox = document.querySelector(".container");

document.addEventListener("click", (e) => {
    // If the click is inside the form, ignore
    if (loginBox.contains(e.target)) return;

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
function createStars(count) {
    for (let i = 0; i < count; i++) {
    const star = document.createElement("div");
    star.className = "stars";
    star.style.top = Math.random() * window.innerHeight + "px";
    star.style.left = Math.random() * window.innerWidth + "px";
    star.style.animationDuration = (Math.random() * 3 + 2) + "s";
    document.body.appendChild(star);
    stars.push(star);
    }
}

function repositionStars() {
    stars.forEach(star => {
    star.style.top = Math.random() * window.innerHeight + "px";
    star.style.left = Math.random() * window.innerWidth + "px";
    });
}

createStars(getStarCount());

window.addEventListener("resize", () => {
    repositionStars();
});

document.addEventListener("mousemove", (e) => {
    stars.forEach((star, i) => {
    const dx = (e.clientX - window.innerWidth / 2) * 0.0035 * (i % 5);
    const dy = (e.clientY - window.innerHeight / 2) * 0.0035 * (i % 5);
    star.style.transform = `translate(${dx}px, ${dy}px)`;
    });
});

function toggleForms() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm.classList.contains("hidden")) {
    registerForm.classList.add("hidden");
    registerForm.setAttribute("aria-hidden", "true");
    loginForm.classList.remove("hidden");
    loginForm.setAttribute("aria-hidden", "false");

    loginForm.classList.remove("form-animate");
    void loginForm.offsetWidth;
    loginForm.classList.add("form-animate");
    } else {
    loginForm.classList.add("hidden");
    loginForm.setAttribute("aria-hidden", "true");
    registerForm.classList.remove("hidden");
    registerForm.setAttribute("aria-hidden", "false");

    registerForm.classList.remove("form-animate");
    void registerForm.offsetWidth;
    registerForm.classList.add("form-animate");
    }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('loginName').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('.btn');
    const hideLoading = UI.showLoading(submitBtn);

    try {
    const result = await Auth.login({ name, password });

    if (result.success) {
        UI.showNotification('Login successful! Redirecting...', 'success');
        setTimeout(() => {
        window.location.href = 'dashboard.html';
        }, 1500);
    } else {
        UI.showNotification(result.error || 'Login failed', 'error');
    }
    } catch (error) {
    UI.showNotification('Network error. Please try again.', 'error');
    } finally {
    hideLoading();
    }
});

// Register form handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('registerPassword').value;
    const submitBtn = e.target.querySelector('.btn');
    const hideLoading = UI.showLoading(submitBtn);

    if (password.length < 6) {
    UI.showNotification('Password must be at least 6 characters', 'error');
    hideLoading();
    return;
    }

    try {
    const result = await Auth.register({ firstName, lastName, email, password });

    if (result.success) {
        UI.showNotification('Registration successful! You can now login.', 'success');
        document.getElementById('registerForm').reset();
        setTimeout(() => {
        toggleForms();
        }, 2000);
    } else {
        UI.showNotification(result.error || 'Registration failed', 'error');
    }
    } catch (error) {
    UI.showNotification('Network error. Please try again.', 'error');
    } finally {
    hideLoading();
    }
});