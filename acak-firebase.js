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
    modalCancel: () => document.getElementById('modalCancel'),
    participantCount: () => document.getElementById('participantCount')
};

// State untuk halaman acak
const AcakState = {
    results: [],
    participants: [],
    isRandomized: false
};

// Modal State
let modalCallback = null;

// Fungsi Utilitas
const Utils = {
    showModal(title, message, callback) {
        DOM.modalTitle().textContent = title;
        DOM.modalMessage().innerHTML = message; // Changed to innerHTML for formatting
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
    // Mengambil data dari Firebase
    async getParticipantsData() {
        try {
            const participants = await FirebaseService.getParticipants();
            if (participants && participants.length > 0) {
                AcakState.participants = participants;
                
                // Update UI dengan jumlah peserta
                if (DOM.participantCount()) {
                    DOM.participantCount().textContent = participants.length;
                }
                
                // Update tombol acak
                DOM.randomizeBtn().innerHTML = `<i class="fas fa-random"></i> ACAK ${participants.length} PESERTA`;
                
                return participants;
            }
            return null;
        } catch (error) {
            console.error('Error getting participants:', error);
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
    
    // Simpan hasil ke Firebase
    async saveResults(results) {
        try {
            const saved = await FirebaseService.saveResults(results);
            if (saved) {
                console.log('Results saved to Firebase');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error saving results:', error);
            return false;
        }
    },
    
    // Load hasil dari Firebase
    async loadResults() {
        try {
            const resultsData = await FirebaseService.getResults();
            if (resultsData && resultsData.data && resultsData.randomized) {
                return resultsData.data;
            }
            return null;
        } catch (error) {
            console.error('Error loading results:', error);
            return null;
        }
    },
    
    // Hapus hasil dari Firebase (untuk acak ulang)
    async clearResults() {
        try {
            // Hanya hapus hasil, biarkan data peserta tetap ada
            await database.ref('results').remove();
            return true;
        } catch (error) {
            console.error('Error clearing results:', error);
            return false;
        }
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
        
        // Update tombol
        DOM.randomizeBtn().disabled = true;
        DOM.randomizeBtn().innerHTML = '<i class="fas fa-check-circle"></i> SUDAH DIACAK';
        
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
    async showExistingResults() {
        try {
            const results = await Randomizer.loadResults();
            if (results && results.length > 0) {
                this.showResults(results);
                Utils.showAlert('Hasil pengacakan sudah tersedia!', 'success');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading existing results:', error);
            return false;
        }
    },
    
    // Cek status data
    async checkDataStatus() {
        try {
            // Cek apakah sudah ada hasil
            const hasResults = await this.showExistingResults();
            if (hasResults) return;
            
            // Cek apakah ada data peserta
            const participants = await Randomizer.getParticipantsData();
            if (!participants || participants.length < 2) {
                this.showError();
            }
        } catch (error) {
            console.error('Error checking data status:', error);
            this.showError();
        }
    }
};

// Event Handlers
const EventHandlers = {
    // Handler untuk tombol acak
    async handleRandomize() {
        // Cek apakah sudah ada data peserta
        if (AcakState.participants.length < 2) {
            const participants = await Randomizer.getParticipantsData();
            if (!participants || participants.length < 2) {
                UI.showError();
                return;
            }
        }
        
        // Konfirmasi sebelum mengacak
        Utils.showModal(
            'Mulai Pengacakan',
            `Mengacak ${AcakState.participants.length} peserta. Setelah diacak, hasil tidak dapat diubah. Lanjutkan?`,
            async () => {
                // Mulai proses pengacakan
                UI.showLoading();
                UI.hideError();
                
                try {
                    // Lakukan pengacakan
                    const results = Randomizer.randomizeDistribution(AcakState.participants);
                    
                    if (!results) {
                        UI.hideLoading();
                        Utils.showAlert('Gagal melakukan pengacakan!', 'error');
                        Utils.hideModal();
                        return;
                    }
                    
                    // Simpan hasil ke Firebase
                    const saved = await Randomizer.saveResults(results);
                    
                    if (!saved) {
                        UI.hideLoading();
                        Utils.showAlert('Gagal menyimpan hasil!', 'error');
                        Utils.hideModal();
                        return;
                    }
                    
                    // Tampilkan hasil
                    UI.hideLoading();
                    UI.showResults(results);
                    
                    // Tampilkan notifikasi sukses
                    Utils.showAlert('Pengacakan berhasil! Data tersimpan online.', 'success');
                    
                } catch (error) {
                    console.error('Error during randomization:', error);
                    UI.hideLoading();
                    Utils.showAlert('Terjadi kesalahan saat mengacak!', 'error');
                }
                
                Utils.hideModal();
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
        
        shareText += `\nTotal: ${AcakState.results.length} peserta\n`;
        shareText += `#TukarKado`;
        
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
    async handleNewRandomize() {
        Utils.showModal(
            'Acak Ulang',
            'Acak ulang akan menghasilkan pembagian kado yang baru. Hasil sebelumnya akan dihapus. Lanjutkan?',
            async () => {
                // Hapus hasil sebelumnya
                const cleared = await Randomizer.clearResults();
                
                if (!cleared) {
                    Utils.showAlert('Gagal menghapus hasil sebelumnya', 'error');
                    Utils.hideModal();
                    return;
                }
                
                // Reset UI
                DOM.resultsSection().style.display = 'none';
                DOM.randomizeBtn().disabled = false;
                DOM.randomizeBtn().innerHTML = `<i class="fas fa-random"></i> ACAK ${AcakState.participants.length} PESERTA`;
                AcakState.isRandomized = false;
                AcakState.results = [];
                
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
async function init() {
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
    
    // Cek status data
    await UI.checkDataStatus();
    
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
    
    console.log('Acak System initialized with Firebase');
}

// Jalankan saat DOM siap
document.addEventListener('DOMContentLoaded', init);