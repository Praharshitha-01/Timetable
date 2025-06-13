import { 
  auth, 
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  onAuthStateChanged,
  signOut
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const loginContainer = document.getElementById('login-container');
  const signupContainer = document.getElementById('signup-container');
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  // Admin emails
  const adminEmails = [
    "23h51a0593@cmrcet.ac.in",
    "23h51a0519@cmrcet.ac.in",
    "23h51a05cx@cmrcet.ac.in",
    "23h51a05j8@cmrcet.ac.in",
    "23h51a05w1@cmrcet.ac.in",
    "23h51a05y3@cmrcet.ac.in"
  ];

  // Toggle between login and signup
  showSignup.addEventListener('click', function(e) {
    e.preventDefault();
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
    loginError.textContent = '';
  });

  showLogin.addEventListener('click', function(e) {
    e.preventDefault();
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    signupError.textContent = '';
  });

  // Login function
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!email || !password) {
      loginError.textContent = "Please fill in all fields";
      return;
    }

    try {
      // Login with email and password
      await signInWithEmailAndPassword(auth, email, password);
      
      // Verify user document exists
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        await signOut(auth);
        loginError.textContent = "User data not found. Please register again.";
        return;
      }
      
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = error.code === 'auth/wrong-password' 
        ? "Invalid password" 
        : error.code === 'auth/user-not-found'
        ? "User not found"
        : "Login failed. Please try again.";
    }
  });

  // Signup function
  signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    
    if (!username || !email || !password) {
      signupError.textContent = "Please fill in all fields";
      return;
    }

    if (password.length < 6) {
      signupError.textContent = "Password must be at least 6 characters";
      return;
    }

    try {
      // Check if username exists
      const usersRef = collection(db, "users");
      const usernameQuery = query(usersRef, where("username", "==", username));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        signupError.textContent = "Username already exists";
        return;
      }

      // Check if email exists
      const emailQuery = query(usersRef, where("email", "==", email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        signupError.textContent = "Email already registered";
        return;
      }

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Determine role
      const role = adminEmails.includes(email) ? "admin" : "user";
      
      // Save user data
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        role: role,
        createdAt: new Date()
      });
      
      // Show success and redirect to login
      signupError.textContent = '';
      signupContainer.style.display = 'none';
      loginContainer.style.display = 'block';
      signupForm.reset();
      alert('Registration successful! Please login.');
      
    } catch (error) {
      console.error("Signup error:", error);
      signupError.textContent = error.message || "Registration failed. Please try again.";
    }
  });

  // Check auth state on page load
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });
});
