import { 
    auth, 
    signOut,
    onAuthStateChanged
  } from './firebase-config.js';
  
  const adminEmails = [
    "23h51a0593@cmrcet.ac.in",
    "23h51a0519@cmrcet.ac.in",
    "23h51a05cx@cmrcet.ac.in",
    "23h51a05j8@cmrcet.ac.in",
    "23h51a05w1@cmrcet.ac.in",
    "23h51a05y3@cmrcet.ac.in"
  ];
  
  document.addEventListener('DOMContentLoaded', async () => {
    const adminList = document.getElementById('admin-list');
    const logoutBtn = document.getElementById('logout-admin');
    const addAdminBtn = document.getElementById('add-admin');
    const newAdminEmail = document.getElementById('new-admin-email');
    const manageUsersBtn = document.getElementById('manage-users');
  
    // Check auth state
    onAuthStateChanged(auth, (user) => {
      if (!user || !adminEmails.includes(user.email)) {
        window.location.href = 'login.html';
      }
    });
  
    // Load admin list
    function loadAdminList() {
      adminList.innerHTML = '';
      adminEmails.forEach(email => {
        const li = document.createElement('li');
        li.className = 'admin-item';
        li.innerHTML = `
          <div class="admin-email">${email}</div>
          ${email !== auth.currentUser?.email ? 
            `<button class="remove-btn" data-email="${email}">Remove</button>` : 
            '<span class="current-user">(Current)</span>'}
        `;
        adminList.appendChild(li);
      });
    }
  
    // Event listeners
    manageUsersBtn.addEventListener('click', () => {
      window.open('https://console.firebase.google.com/u/0/project/eduslotter-65047/authentication/users', '_blank');
    });
  
    logoutBtn.addEventListener('click', () => {
      signOut(auth).then(() => {
        window.location.href = 'login.html';
      });
    });
  
    addAdminBtn.addEventListener('click', async () => {
      const email = newAdminEmail.value.trim();
      if (!email) return;
  
      if (!adminEmails.includes(email)) {
        adminEmails.push(email);
        loadAdminList();
        newAdminEmail.value = '';
      }
    });
  
    // Handle admin removal
    adminList.addEventListener('click', async (e) => {
      if (e.target.classList.contains('remove-btn')) {
        const email = e.target.getAttribute('data-email');
        const index = adminEmails.indexOf(email);
        if (index > -1) {
          adminEmails.splice(index, 1);
          loadAdminList();
        }
      }
    });
  
    // Initial load
    loadAdminList();
  });
