// Hàm load settings khi mở tab
function loadSettings() {
  fetch('/api/settings')
    .then(res => res.json())
    .then(data => {
      document.getElementById('anomaly-threshold').value = data.anomaly_threshold;
      document.getElementById('alert-email').value = data.alert_email;
      document.getElementById('logs-per-page').value = data.logs_per_page;
    });
}

// Gửi form update settings
document.getElementById('settings-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const settings = {
    anomaly_threshold: parseFloat(document.getElementById('anomaly-threshold').value),
    alert_email: document.getElementById('alert-email').value,
    logs_per_page: parseInt(document.getElementById('logs-per-page').value)
  };
  fetch('/api/settings', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(settings)
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('settings-status').textContent = "Saved!";
    setTimeout(() => document.getElementById('settings-status').textContent = "", 2000);
  });
});

// Nếu bạn có tab chuyển bằng JS, hãy gọi loadSettings khi vào tab Settings
if (document.getElementById('settings-tab-btn')) {
  document.getElementById('settings-tab-btn').addEventListener('click', loadSettings);
}
