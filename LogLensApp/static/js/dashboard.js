document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo biểu đồ rỗng ban đầu
    const ctx = document.getElementById('trafficChart').getContext('2d');
    const trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Normal Traffic',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: true
            },
            {
                label: 'Anomalies Traffic',
                data: [],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            scales: {
                yAxes: [{ ticks: { beginAtZero: true } }]
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Hàm chính để cập nhật toàn bộ dashboard
    async function updateDashboard() {
        try {
            const response = await fetch('/dashboard_data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // 1. Cập nhật các thẻ Cards
            document.getElementById('total-requests').textContent = data.cards.total_requests.toLocaleString();
            document.getElementById('anomalies-detected').textContent = data.cards.anomalies_detected.toLocaleString();
            document.getElementById('warnings-count').textContent = data.cards.warnings.toLocaleString();
            
            const healthStatusEl = document.getElementById('system-health');
            healthStatusEl.textContent = data.cards.system_health;
            healthStatusEl.className = `status-${data.cards.system_health.toLowerCase()}`;


            // 2. Cập nhật biểu đồ Chart
            trafficChart.data.labels = data.chart.labels;
            trafficChart.data.datasets[0].data = data.chart.normal_data;
            trafficChart.data.datasets[1].data = data.chart.anomalies_data;
            trafficChart.update();

            // 3. Cập nhật bảng Table
            const tableBody = document.querySelector('.table-container tbody');
            tableBody.innerHTML = ''; // Xóa các dòng cũ
            data.table.forEach(log => {
                const row = document.createElement('tr');
                
                // Xác định mức độ nghiêm trọng dựa trên điểm số
                let severity = 'Low';
                let severityClass = 'severity-low';
                if (log.suspicion_score > 0.9) {
                    severity = 'High';
                    severityClass = 'severity-high';
                } else if (log.suspicion_score > 0.7) {
                    severity = 'Medium';
                    severityClass = 'severity-medium';
                }

                row.innerHTML = `
                    <td>${log.timestamp}</td>
                    <td>${log.ip}</td>
                    <td>${log.url}</td>
                    <td>${log.status}</td>
                    <td class="${severityClass}">${severity}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error("Could not fetch or update dashboard data:", error);
        }
    }

    // Cập nhật dashboard lần đầu và sau đó mỗi 5 giây
    updateDashboard();
    setInterval(updateDashboard, 5000); // 5000ms = 5 giây
});