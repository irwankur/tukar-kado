// DOM Elements
const DOM = {
    resultsList: () => document.getElementById('resultsList'),
    printResultsBtn: () => document.getElementById('printResults'),
    refreshResultsBtn: () => document.getElementById('refreshResults')
};

// Fungsi Utilitas
function generateAvatarText(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return name.charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Load dan Tampilkan Hasil
function loadAndDisplayResults() {
    const saved = localStorage.getItem('giftExchangeData');
    
    if (!saved) {
        showNoResults();
        return;
    }
    
    try {
        const data = JSON.parse(saved);
        const results = data.results || [];
        
        if (results.length === 0) {
            showNoResults();
            return;
        }
        
        displayResults(results);
    } catch (e) {
        console.error('Error loading results:', e);
        showNoResults();
    }
}

function showNoResults() {
    DOM.resultsList().innerHTML = `
        <div class="empty-results">
            <i class="fas fa-gift"></i>
            <h2>Belum Ada Hasil</h2>
            <p>Admin belum mengacak distribusi kado. Silakan kembali nanti.</p>
            <a href="index.html" class="btn-primary" style="margin-top: 20px;">
                <i class="fas fa-arrow-left"></i> Kembali ke Halaman Admin
            </a>
        </div>
    `;
}

function displayResults(results) {
    let html = '';
    
    results.forEach((result, index) => {
        const avatarText = generateAvatarText(result.receiver);
        html += `
            <div class="result-card">
                <div class="participant-info">
                    <div class="avatar">${avatarText}</div>
                    <div class="participant-details">
                        <h3>${result.receiver}</h3>
                    </div>
                </div>
                <div class="gift-number">
                    <i class="fas fa-gift"></i> Kado #${result.giftNumber}
                </div>
            </div>
        `;
    });
    
    DOM.resultsList().innerHTML = html;
}

// Event Listeners
function setupEventListeners() {
    DOM.printResultsBtn().addEventListener('click', () => {
        window.print();
    });
    
    DOM.refreshResultsBtn().addEventListener('click', () => {
        loadAndDisplayResults();
        showAlert('Hasil direfresh!', 'success');
    });
    
    // Auto-refresh setiap 30 detik jika diperlukan
    setInterval(() => {
        loadAndDisplayResults();
    }, 30000);
}

// Alert sederhana untuk halaman hasil
function showAlert(message, type = 'success') {
    // Buat alert element jika belum ada
    let alertEl = document.getElementById('resultsAlert');
    if (!alertEl) {
        alertEl = document.createElement('div');
        alertEl.id = 'resultsAlert';
        alertEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideInRight 0.5s ease;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(alertEl);
    }
    
    alertEl.textContent = message;
    alertEl.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
    
    setTimeout(() => {
        alertEl.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 500);
    }, 3000);
}

// Tambahkan CSS untuk animasi alert
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayResults();
    setupEventListeners();
});