// All future frontend API calls will use this reusable helper.
async function callApi(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'The server returned an error.');
  return data;
}

document.getElementById('health-button').addEventListener('click', async () => {
  const message = document.getElementById('health-message');
  message.textContent = 'Checking backend...';
  try {
    const result = await callApi('/api/health');
    message.textContent = `✓ ${result.message}`;
  } catch (error) {
    message.textContent = `Could not reach the backend: ${error.message}`;
  }
});
