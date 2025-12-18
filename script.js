// Data Aplikasi
const AppState = {
    participants: [], // Array of {name, giftNumber}
    randomized: [], // Array of {giver, giftNumber, receiver}
    results: [], // Array of {receiver, giftNumber}
    currentStep: 1 // 1: Inisialisasi, 2: Acak, 3: Hasil
};

// DOM Elements
const DOM = {
    // Input elements
    participantName: () => document.getElementById('participantName'),
    giftNumber: () => document.getElementById('giftNumber'),
    
    // Buttons
    addParticipantBtn: () => document.getElementById('addParticipant'),
    clearAllBtn: () => document.getElementById('clearAll'),
    proceedToRandomizeBtn: () => document.getElementById('proceedToRandomize'),
    randomizeBtn: () => document.getElementById('randomizeBtn'),
    resetRandomBtn: () => document.getElementById('resetRandom'),
    proceedToResultsBtn: () => document.getElementById('proceedToResults'),
    exportTxtBtn: () => document.getElementById('exportTxt'),
    exportJsonBtn: () => document.getElementById('exportJson'),
    copyResultsBtn: () => document.getElementById('copyResults'),
    resetAllBtn: () => document.getElementById('resetAll'),
    
    // Lists
    initList: () => document.getElementById('init-list'),
    randomResults: () => document.getElementById('random-results'),
    resultsList: () => document.getElementById('results-list'),
    
    // Counters
    initCount: () => document.getElementById('init-count'),
    randomCount: () => document.getElementById('random-count'),
    resultsCount: () => document.getElementById('results-count'),
    
    // Stats
    totalParticipants: () => document.getElementById('total-participants'),
    totalGifts: () => document.getElementById('total-gifts'),
    lastUpdate: () => document.getElementById('last-update'),
    
    // Alert
    alert: () => document.getElementById('alert'),
    
    // Modal
    modal: () => document.getElementById('confirmModal'),
    modalTitle: () => document.getElementById('modalTitle'),
    modalMessage: () => document.getElementById('modalMessage'),
    modalConfirm: () => document.getElementById('modalConfirm'),
    modalCancel: () => document.getElementById('modalCancel')
};

// Inisialisasi Modal
let modalCallback = null;

// Fungsi Utilitas
const Utils = {
    showAlert(message, type = 'success') {
        const alertEl = DOM.alert();
        alertEl.textContent = message;
        alertEl.className = `alert alert-${type}`;
        alertEl.style.display = 'block';
        
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 5000);
    },
    
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
    
    formatDate(date) {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },
    
    updateStats() {
        DOM.totalParticipants().textContent = AppState.participants.length;
        DOM.totalGifts().textContent = AppState.participants.length;
        DOM.lastUpdate().textContent = this.formatDate(new Date());
    },
    
    validateInput(name, number) {
        if (!name || name.trim() === '') {
            return { valid: false, message: 'Nama peserta tidak boleh kosong!' };
        }
        
        if (!number || number.trim() === '') {
            return { valid: false, message: 'Nomor kado tidak boleh kosong!' };
        }
        
        const num = parseInt(number);
        if (isNaN(num) || num < 1 || num > 100) {
            return { valid: false, message: 'Nomor kado harus antara 1-100!' };
        }
        
        // Cek duplikat nama
        const existingName = AppState.participants.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existingName) {
            return { valid: false, message: `Nama "${name}" sudah ada!` };
        }
        
        // Cek duplikat nomor
        const existingNumber = AppState.participants.find(p => p.giftNumber === number);
        if (existingNumber) {
            return { valid: false, message: `Nomor kado ${number} sudah digunakan!` };
        }
        
        return { valid: true };
    },
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(
            () => this.showAlert('Hasil berhasil disalin ke clipboard!', 'success'),
            () => this.showAlert('Gagal menyalin ke clipboard.', 'error')
        );
    }
};

// Fungsi Penyimpanan
const Storage = {
    save() {
        localStorage.setItem('giftExchangeData', JSON.stringify({
            participants: AppState.participants,
            randomized: AppState.randomized,
            results: AppState.results,
            currentStep: AppState.currentStep
        }));
        Utils.updateStats();
    },
    
    load() {
        const saved = localStorage.getItem('giftExchangeData');
        if (saved) {
            const data = JSON.parse(saved);
            AppState.participants = data.participants || [];
            AppState.randomized = data.randomized || [];
            AppState.results = data.results || [];
            AppState.currentStep = data.currentStep || 1;
        }
        Utils.updateStats();
    },
    
    clear() {
        localStorage.removeItem('giftExchangeData');
        AppState.participants = [];
        AppState.randomized = [];
        AppState.results = [];
        AppState.currentStep = 1;
        Utils.updateStats();
    }
};

// Fungsi UI untuk Kolom 1: Inisialisasi
const InitUI = {
    render() {
        const initList = DOM.initList();
        
        if (AppState.participants.length === 0) {
            initList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Belum ada peserta</h3>
                    <p>Tambahkan peserta dan nomor kado mereka</p>
                </div>
            `;
            DOM.initCount().textContent = '0';
            DOM.proceedToRandomizeBtn().disabled = true;
            return;
        }
        
        let html = '';
        AppState.participants.forEach((participant, index) => {
            html += `
                <div class="participant-item">
                    <div class="participant-info">
                        <div class="participant-name">${participant.name}</div>
                        <div class="gift-number">Kado #${participant.giftNumber}</div>
                    </div>
                    <button class="remove-btn" data-index="${index}" title="Hapus peserta">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        initList.innerHTML = html;
        DOM.initCount().textContent = AppState.participants.length;
        DOM.proceedToRandomizeBtn().disabled = AppState.participants.length < 2;
        
        // Tambahkan event listener untuk tombol hapus
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                Participants.remove(index);
            });
        });
    }
};

// Fungsi UI untuk Kolom 2: Acak
const RandomUI = {
    render() {
        const randomResults = DOM.randomResults();
        DOM.randomCount().textContent = AppState.randomized.length;
        
        if (AppState.randomized.length === 0) {
            randomResults.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-random"></i>
                    <h3>Belum diacak</h3>
                    <p>Klik "Acak Penerima Kado" untuk memulai</p>
                </div>
            `;
            DOM.resetRandomBtn().disabled = true;
            DOM.proceedToResultsBtn().disabled = true;
            return;
        }
        
        let html = '';
        AppState.randomized.forEach((item, index) => {
            html += `
                <div class="random-item">
                    <div class="random-item-header">
                        <i class="fas fa-user"></i> ${item.giver}
                    </div>
                    <div class="random-item-content">
                        <div>Kado #${item.giftNumber}</div>
                        <div><i class="fas fa-arrow-right"></i></div>
                        <div><strong>${item.receiver}</strong></div>
                    </div>
                </div>
            `;
        });
        
        randomResults.innerHTML = html;
        DOM.resetRandomBtn().disabled = false;
        DOM.proceedToResultsBtn().disabled = false;
    }
};

// Fungsi UI untuk Kolom 3: Hasil
const ResultsUI = {
    render() {
        const resultsList = DOM.resultsList();
        DOM.resultsCount().textContent = AppState.results.length;
        
        if (AppState.results.length === 0) {
            resultsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gift"></i>
                    <h3>Belum ada hasil</h3>
                    <p>Selesaikan pengacakan untuk melihat hasil</p>
                </div>
            `;
            DOM.exportTxtBtn().disabled = true;
            DOM.exportJsonBtn().disabled = true;
            DOM.copyResultsBtn().disabled = true;
            return;
        }
        
        let html = '';
        AppState.results.forEach(result => {
            html += `
                <div class="result-item">
                    <div class="result-info">
                        <div class="result-recipient">${result.receiver}</div>
                    </div>
                    <div class="result-gift">
                        <div class="gift-icon"><i class="fas fa-gift"></i></div>
                        <div class="gift-number">Menerima Kado #${result.giftNumber}</div>
                    </div>
                </div>
            `;
        });
        
        resultsList.innerHTML = html;
        DOM.exportTxtBtn().disabled = false;
        DOM.exportJsonBtn().disabled = false;
        DOM.copyResultsBtn().disabled = false;
    }
};

// Fungsi Manajemen Peserta
const Participants = {
    add() {
        const name = DOM.participantName().value.trim();
        const number = DOM.giftNumber().value.trim();
        
        const validation = Utils.validateInput(name, number);
        if (!validation.valid) {
            Utils.showAlert(validation.message, 'error');
            return;
        }
        
        AppState.participants.push({
            name: name,
            giftNumber: number
        });
        
        DOM.participantName().value = '';
        DOM.giftNumber().value = '';
        DOM.participantName().focus();
        
        Storage.save();
        InitUI.render();
        Utils.showAlert(`${name} ditambahkan dengan kado #${number}`, 'success');
    },
    
    remove(index) {
        const participant = AppState.participants[index];
        Utils.showModal(
            'Konfirmasi Hapus',
            `Hapus peserta "${participant.name}" dengan kado #${participant.giftNumber}?`,
            () => {
                AppState.participants.splice(index, 1);
                // Reset data jika peserta dihapus setelah pengacakan
                if (AppState.currentStep > 1) {
                    AppState.randomized = [];
                    AppState.results = [];
                    AppState.currentStep = 1;
                }
                Storage.save();
                InitUI.render();
                RandomUI.render();
                ResultsUI.render();
                Utils.showAlert(`Peserta "${participant.name}" dihapus`, 'success');
                Utils.hideModal();
            }
        );
    },
    
    clearAll() {
        if (AppState.participants.length === 0) {
            Utils.showAlert('Tidak ada peserta untuk dihapus', 'error');
            return;
        }
        
        Utils.showModal(
            'Konfirmasi Hapus Semua',
            `Hapus semua ${AppState.participants.length} peserta?`,
            () => {
                AppState.participants = [];
                AppState.randomized = [];
                AppState.results = [];
                AppState.currentStep = 1;
                Storage.clear();
                InitUI.render();
                RandomUI.render();
                ResultsUI.render();
                Utils.showAlert('Semua peserta dihapus', 'success');
                Utils.hideModal();
            }
        );
    }
};

// Fungsi Pengacakan
const Randomizer = {
    randomize() {
        if (AppState.participants.length < 2) {
            Utils.showAlert('Minimal diperlukan 2 peserta!', 'error');
            return;
        }
        
        AppState.randomized = [];
        AppState.results = [];
        
        // Buat array penerima (nama peserta)
        let receivers = AppState.participants.map(p => p.name);
        
        // Acak penerima menggunakan Fisher-Yates
        for (let i = receivers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
        }
        
        // Buat pasangan pemberi-penerima
        for (let i = 0; i < AppState.participants.length; i++) {
            const giver = AppState.participants[i].name;
            let receiver = receivers[i];
            const giftNumber = AppState.participants[i].giftNumber;
            
            // Jika pemberi sama dengan penerima, tukar dengan yang lain
            if (giver === receiver) {
                // Cari indeks lain untuk ditukar
                for (let j = 0; j < receivers.length; j++) {
                    if (j !== i && receivers[j] !== AppState.participants[j].name) {
                        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
                        receiver = receivers[i];
                        break;
                    }
                }
            }
            
            AppState.randomized.push({
                giver: giver,
                giftNumber: giftNumber,
                receiver: receiver
            });
        }
        
        // Verifikasi tidak ada yang menerima kado sendiri
        const selfGift = AppState.randomized.find(item => item.giver === item.receiver);
        if (selfGift) {
            // Coba lagi jika masih ada yang menerima kado sendiri
            return this.randomize();
        }
        
        // Buat hasil final (dari perspektif penerima)
        AppState.results = AppState.randomized.map(item => ({
            receiver: item.receiver,
            giftNumber: item.giftNumber
        }));
        
        // Acak urutan hasil untuk privasi
        for (let i = AppState.results.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [AppState.results[i], AppState.results[j]] = [AppState.results[j], AppState.results[i]];
        }
        
        AppState.currentStep = 2;
        Storage.save();
        RandomUI.render();
        Utils.showAlert('Pengacakan berhasil!', 'success');
    },
    
    reset() {
        AppState.randomized = [];
        AppState.results = [];
        AppState.currentStep = 1;
        Storage.save();
        RandomUI.render();
        ResultsUI.render();
        Utils.showAlert('Pengacakan direset', 'success');
    }
};

// Fungsi Ekspor
const Exporter = {
    exportTxt() {
        if (AppState.results.length === 0) return;
        
        let content = '=== HASIL TUKAR KADO ===\n\n';
        content += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
        content += `Total Peserta: ${AppState.results.length}\n\n`;
        content += 'DAFTAR PENERIMA KADO:\n\n';
        
        AppState.results.forEach((result, index) => {
            content += `${index + 1}. ${result.receiver} → Kado #${result.giftNumber}\n`;
        });
        
        content += '\n\n=== INFORMASI ===\n';
        content += '• Setiap peserta memberikan kado ke admin\n';
        content += '• Admin memberi nomor pada setiap kado\n';
        content += '• Sistem mengacak penerima kado\n';
        content += '• Tidak ada yang menerima kado sendiri\n';
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hasil-tukar-kado-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Hasil diexport ke file TXT', 'success');
    },
    
    exportJson() {
        if (AppState.results.length === 0) return;
        
        const data = {
            timestamp: new Date().toISOString(),
            totalParticipants: AppState.results.length,
            results: AppState.results,
            participants: AppState.participants
        };
        
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hasil-tukar-kado-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Hasil diexport ke file JSON', 'success');
    },
    
    copyResults() {
        if (AppState.results.length === 0) return;
        
        let content = '🎁 HASIL TUKAR KADO 🎁\n\n';
        AppState.results.forEach((result, index) => {
            content += `${index + 1}. ${result.receiver} → Kado #${result.giftNumber}\n`;
        });
        
        Utils.copyToClipboard(content);
    }
};

// Inisialisasi Aplikasi
const App = {
    init() {
        // Load data dari localStorage
        Storage.load();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render semua UI
        InitUI.render();
        RandomUI.render();
        ResultsUI.render();
        
        // Set focus ke input nama
        DOM.participantName().focus();
        
        // Enable/disable buttons berdasarkan state
        DOM.randomizeBtn().disabled = AppState.participants.length < 2;
        
        Utils.updateStats();
    },
    
    setupEventListeners() {
        // Tombol tambah peserta
        DOM.addParticipantBtn().addEventListener('click', () => {
            Participants.add();
        });
        
        // Enter key pada input
        DOM.participantName().addEventListener('keypress', (e) => {
            if (e.key === 'Enter') DOM.giftNumber().focus();
        });
        
        DOM.giftNumber().addEventListener('keypress', (e) => {
            if (e.key === 'Enter') Participants.add();
        });
        
        // Tombol hapus semua
        DOM.clearAllBtn().addEventListener('click', () => {
            Participants.clearAll();
        });
        
        // Tombol lanjut ke acak
        DOM.proceedToRandomizeBtn().addEventListener('click', () => {
            AppState.currentStep = 2;
            Storage.save();
            DOM.randomizeBtn().disabled = false;
            Utils.showAlert('Siap untuk mengacak penerima kado!', 'success');
        });
        
        // Tombol acak
        DOM.randomizeBtn().addEventListener('click', () => {
            Randomizer.randomize();
        });
        
        // Tombol reset acak
        DOM.resetRandomBtn().addEventListener('click', () => {
            Randomizer.reset();
        });
        
        // Tombol lanjut ke hasil
        DOM.proceedToResultsBtn().addEventListener('click', () => {
            AppState.currentStep = 3;
            Storage.save();
            ResultsUI.render();
        });
        
        // Tombol export
        DOM.exportTxtBtn().addEventListener('click', () => {
            Exporter.exportTxt();
        });
        
        DOM.exportJsonBtn().addEventListener('click', () => {
            Exporter.exportJson();
        });
        
        DOM.copyResultsBtn().addEventListener('click', () => {
            Exporter.copyResults();
        });
        
        // Tombol reset all
        DOM.resetAllBtn().addEventListener('click', () => {
            Utils.showModal(
                'Mulai Ulang Sistem',
                'Apakah Anda yakin ingin mengulang dari awal? Semua data akan dihapus.',
                () => {
                    Storage.clear();
                    InitUI.render();
                    RandomUI.render();
                    ResultsUI.render();
                    DOM.participantName().focus();
                    Utils.showAlert('Sistem direset, siap digunakan kembali!', 'success');
                    Utils.hideModal();
                }
            );
        });
        
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
    }
};

// Jalankan aplikasi ketika DOM siap
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});