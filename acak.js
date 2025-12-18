// DOM Elements
const DOM = {
    randomizeBtn: () => document.getElementById('randomizeBtn'),
    loading: () => document.getElementById('loading'),
    errorState: () => document.getElementById('errorState'),
    resultsSection: () => document.getElementById('resultsSection'),
    resultsList: () => document.getElementById('resultsList'),
    printResultsBtn: () => document.getElementById('printResults'),
    shareResultsBtn: () => document.getElementById('shareResults'),
    newRandomizeBtn: () => document.getElementById('newRandomize'),
    modal: () => document.getElementById('confirmModal'),
    modalTitle: () => document.getElementById('modalTitle'),
    modalMessage: () => document.getElementById('modalMessage'),
    modalConfirm: () => document.getElementById('modalConfirm'),
    modalCancel: () => document.getElementById('modalCancel')
};

// State untuk halaman acak
const AcakState = {
    results: [],
    isRandomized: false
};

// Modal State
let modalCallback = null;

// Fungsi Utilitas
const Utils = {
    showModal(title, message, callback) {
        DOM.modalTitle().textContent = title;
        DOM.modalMessage().textContent = message;
        modalCallback = callback;
        DOM.modal().style.display = 'flex';
    },
    
    hideModal() {
        DOM.modal().style.display = 'none';
        modalCallback = null;
    },
    
    generateAvatarText(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length === 1) return name.charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },
    
    showAlert(message, type = 'success') {
        // Buat alert element sementara
        const alertEl = document.createElement('div');
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
            background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
        `;
        alertEl.textContent = message;
        document.body.appendChild(alertEl);
        
        setTimeout(() => {
            alertEl.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                document.body.removeChild(alertEl);
            }, 500);
        }, 3000);
    }
};

// Algoritma Pengacakan
const Randomizer = {
    // Mengambil data dari localStorage (dari halaman admin)
    getParticipantsData() {
        const saved = localStorage.getItem('giftExchangeParticipants');
        if (!saved) {
            return null;
        }
        
        try {
            const data = JSON.parse(saved);
            return data.participants || [];
        } catch (e) {
            console.error('Error parsing participant data:', e);
            return null;
        }
    },
    
    // Algoritma pengacakan yang adil
    randomizeDistribution(participants) {
        if (!participants || participants.length < 2) {
            return null;
        }
        
        // Buat array penerima (nama peserta)
        let receivers = participants.map(p => p.name);
        
        // Acak penerima menggunakan Fisher-Yates
        for (let i = receivers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
        }
        
        // Mapping pemberi -> penerima
        const assignments = [];
        for (let i = 0; i < participants.length; i++) {
            const giver = participants[i].name;
            let receiver = receivers[i];
            const giftNumber = participants[i].giftNumber;
            
            // Jika pemberi sama dengan penerima, cari tukar dengan orang lain
            if (giver === receiver) {
                for (let j = 0; j < receivers.length; j++) {
                    if (j !== i && receivers[j] !== participants[j].name) {
                        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
                        receiver = receivers[i];
                        break;
                    }
                }
            }
            
            assignments.push({
                giver: giver,
                giftNumber: giftNumber,
                receiver: receiver
            });
        }
        
        // Verifikasi akhir
        const selfGift = assignments.find(item => item.giver === item.receiver);
        if (selfGift) {
            // Jika masih ada yang menerima kado sendiri, coba lagi
            return this.randomizeDistribution(participants);
        }
        
        // Buat hasil final (hanya untuk penerima)
        const results = assignments.map(item => ({
            receiver: item.receiver,
            giftNumber: item.giftNumber
        }));
        
        // Acak urutan hasil untuk privasi
        for (let i = results.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [results[i], results[j]] = [results[j], results[i]];
        }
        
        return results;
    },
    
    // Simpan hasil ke localStorage
    saveResults(results) {
        const data = {
            results: results,
            randomizedAt: new Date().toISOString(),
            version: '1.0'
        };
        localStorage.setItem('giftExchangeResults', JSON.stringify(data));
    },
    
    // Load hasil dari localStorage
    loadResults() {
        const saved = localStorage.getItem('giftExchangeResults');
        if (!saved) {
            return null;
        }
        
        try {
            const data = JSON.parse(saved);
            return data.results || null;
        } catch (e) {
            console.error('Error parsing results:', e);
            return null;
        }
    },
    
    // Hapus hasil dari localStorage (untuk acak ulang)
    clearResults() {
        localStorage.removeItem('giftExchangeResults');
    }
};

// UI Functions
const UI = {
    // Tampilkan loading state
    showLoading() {
        DOM.loading().style.display = 'block';
        DOM.randomizeBtn().disabled = true;
    },
    
    // Sembunyikan loading state
    hideLoading() {
        DOM.loading().style.display = 'none';
        DOM.randomizeBtn().disabled = false;
    },
    
    // Tampilkan error state
    showError() {
        DOM.errorState().style.display = 'block';
        DOM.randomizeBtn().disabled = true;
    },
    
    // Sembunyikan error state
    hideError() {
        DOM.errorState().style.display = 'none';
    },
    
    // Tampilkan hasil
    showResults(results) {
        DOM.resultsSection().style.display = 'block';
        AcakState.results = results;
        AcakState.isRandomized = true;
        
        // Render hasil
        this.renderResults(results);
        
        // Scroll ke hasil
        setTimeout(() => {
            DOM.resultsSection().scrollIntoView({ behavior: 'smooth' });
        }, 500);
    },
    
    // Render daftar hasil
    renderResults(results) {
        if (!results || results.length === 0) {
            DOM.resultsList().innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Tidak ada hasil</h3>
                    <p>Tidak ada data hasil yang dapat ditampilkan.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        results.forEach((result, index) => {
            const avatarText = Utils.generateAvatarText(result.receiver);
            html += `
                <div class="result-card">
                    <div class="participant-info">
                        <div class="avatar">${avatarText}</div>
                        <div class="participant-details">
                            <h3>${result.receiver}</h3>
                            <p>Peserta #${index + 1}</p>
                        </div>
                    </div>
                    <div class="gift-number">
                        <i class="fas fa-gift"></i> Kado #${result.giftNumber}
                    </div>
                </div>
            `;
        });
        
        DOM.resultsList().innerHTML = html;
    },
    
    // Tampilkan data yang sudah ada jika sudah diacak sebelumnya
    showExistingResults() {
        const results = Randomizer.loadResults();
        if (results && results.length > 0) {
            this.showResults(results);
            DOM.randomizeBtn().disabled = true;
            DOM.randomizeBtn().innerHTML = '<i class="fas fa-check-circle"></i> SUDAH DIACAK';
            Utils.showAlert('Hasil pengacakan sudah tersedia!', 'success');
        }
    }
};

// Event Handlers
const EventHandlers = {
    // Handler untuk tombol acak
    handleRandomize() {
        // Cek apakah sudah ada data peserta
        const participants = Randomizer.getParticipantsData();
        
        if (!participants || participants.length < 2) {
            UI.showError();
            return;
        }
        
        // Konfirmasi sebelum mengacak
        Utils.showModal(
            'Mulai Pengacakan',
            `Mengacak ${participants.length} peserta. Setelah diacak, hasil tidak dapat diubah. Lanjutkan?`,
            () => {
                // Mulai proses pengacakan
                UI.showLoading();
                UI.hideError();
                
                // Simulasi proses loading (bisa dihapus di production)
                setTimeout(() => {
                    // Lakukan pengacakan
                    const results = Randomizer.randomizeDistribution(participants);
                    
                    if (!results) {
                        UI.hideLoading();
                        Utils.showAlert('Gagal melakukan pengacakan!', 'error');
                        return;
                    }
                    
                    // Simpan hasil
                    Randomizer.saveResults(results);
                    
                    // Tampilkan hasil
                    UI.hideLoading();
                    UI.showResults(results);
                    
                    // Tampilkan notifikasi sukses
                    Utils.showAlert('Pengacakan berhasil!', 'success');
                    
                    // Hapus data peserta dari localStorage untuk keamanan
                    // localStorage.removeItem('giftExchangeParticipants');
                    
                    Utils.hideModal();
                }, 1500); // Delay untuk efek loading
            }
        );
    },
    
    // Handler untuk tombol print
    handlePrint() {
        window.print();
    },
    
    // Handler untuk tombol share
    handleShare() {
        if (!AcakState.results || AcakState.results.length === 0) {
            Utils.showAlert('Tidak ada hasil untuk dibagikan', 'error');
            return;
        }
        
        let shareText = '🎁 HASIL TUKAR KADO 🎁\n\n';
        AcakState.results.forEach((result, index) => {
            shareText += `${index + 1}. ${result.receiver} → Kado #${result.giftNumber}\n`;
        });
        
        shareText += '\n#TukarKado';
        
        if (navigator.share) {
            navigator.share({
                title: 'Hasil Tukar Kado',
                text: shareText,
                url: window.location.href
            }).catch(err => {
                console.log('Error sharing:', err);
                this.copyToClipboard(shareText);
            });
        } else {
            this.copyToClipboard(shareText);
        }
    },
    
    // Handler untuk tombol acak ulang
    handleNewRandomize() {
        Utils.showModal(
            'Acak Ulang',
            'Acak ulang akan menghasilkan pembagian kado yang baru. Hasil sebelumnya akan dihapus. Lanjutkan?',
            () => {
                // Hapus hasil sebelumnya
                Randomizer.clearResults();
                
                // Reset UI
                DOM.resultsSection().style.display = 'none';
                DOM.randomizeBtn().disabled = false;
                DOM.randomizeBtn().innerHTML = '<i class="fas fa-random"></i> ACAK SEKARANG';
                AcakState.isRandomized = false;
                
                Utils.showAlert('Siap untuk pengacakan ulang!', 'success');
                Utils.hideModal();
            }
        );
    },
    
    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(
            () => Utils.showAlert('Hasil berhasil disalin ke clipboard!', 'success'),
            () => Utils.showAlert('Gagal menyalin ke clipboard', 'error')
        );
    }
};

// Inisialisasi
function init() {
    // Setup event listeners
    DOM.randomizeBtn().addEventListener('click', EventHandlers.handleRandomize);
    DOM.printResultsBtn().addEventListener('click', EventHandlers.handlePrint);
    DOM.shareResultsBtn().addEventListener('click', EventHandlers.handleShare);
    DOM.newRandomizeBtn().addEventListener('click', EventHandlers.handleNewRandomize);
    
    // Modal events
    DOM.modalConfirm().addEventListener('click', () => {
        if (modalCallback) modalCallback();
    });
    
    DOM.modalCancel().addEventListener('click', () => {
        Utils.hideModal();
    });
    
    // Klik di luar modal untuk menutup
    window.addEventListener('click', (e) => {
        if (e.target === DOM.modal()) {
            Utils.hideModal();
        }
    });
    
    // Cek apakah sudah ada data peserta
    const participants = Randomizer.getParticipantsData();
    if (!participants || participants.length < 2) {
        UI.showError();
    } else {
        // Tampilkan jumlah peserta pada tombol
        DOM.randomizeBtn().innerHTML = `<i class="fas fa-random"></i> ACAK ${participants.length} PESERTA`;
    }
    
    // Cek apakah sudah ada hasil sebelumnya
    UI.showExistingResults();
    
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
}

// Jalankan saat DOM siap
document.addEventListener('DOMContentLoaded', init);