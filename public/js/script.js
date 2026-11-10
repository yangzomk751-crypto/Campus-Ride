// Campus Ride - Client Script

document.addEventListener('DOMContentLoaded', () => {
  // 1. Password Visibility Toggle
  const toggleBtn = document.getElementById('togglePassword');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleBtn.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
      }
    });
  }

  // 2. Demo Login Helper
  window.fillDemoAccount = function(role) {
    const emailField = document.getElementById('email');
    const passField = document.getElementById('password');
    if (!emailField || !passField) return;

    if (role === 'admin') {
      emailField.value = 'admin@sherubtse.edu.bt';
      passField.value = 'Admin@123';
    } else if (role === 'driver_car') {
      emailField.value = 'driver.ugyen@sherubtse.edu.bt';
      passField.value = 'Driver@123';
    } else if (role === 'driver_bus') {
      emailField.value = 'driver.tashi@sherubtse.edu.bt';
      passField.value = 'Driver@123';
    } else if (role === 'passenger') {
      emailField.value = 'sonam@sherubtse.edu.bt';
      passField.value = 'Student@123';
    }
  };

  // 3. Mark notification as read via fetch
  window.markNotificationRead = async function(notifId) {
    try {
      const res = await fetch(`/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        const el = document.getElementById(`notif-${notifId}`);
        if (el) {
          el.classList.remove('unread');
          const badge = el.querySelector('.badge-unread');
          if (badge) badge.remove();
        }
      }
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  };
});
