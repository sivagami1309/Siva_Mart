const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Login failed.');
  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      }),
    });

    localStorage.setItem('siva-token', result.token);
    window.location.href = '/';
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});
