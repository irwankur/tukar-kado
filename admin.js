// Data Aplikasi untuk Admin
const AppState = {
    participants: [], // Array of {name, giftNumber, id}
    results: [] // Array of {receiver, giftNumber}
};

// DOM Elements
const DOM = {
    participantName: () => document.getElementById('participantName'),
    giftNumber: () => document.getElementById('giftNumber'),
    addParticipantBtn: () => document.getElementById('addParticipant'),
    clearAllBtn: () => document.getElementById('clearAll'),
    generateResultsBtn: () => document.getElementById('generateResults'),
    viewResultsLink: () => document.getElementById('viewResults'),
    resultsLink: () => document.getElementById('resultsLink'),
    participantCount: () => document.getElementById('participantCount'),
    participantsList: () => document.getElementById('participantsList'),
    alert: () => document.getElementById('alert'),
    exportDataBtn: () => document.getElementById('exportData'),
    modal: () => document.getElementById('confirmModal'),
    modalTitle: () => document.getElementById('modalTitle'),
    modalMessage: () => document.getElementById('modalMessage'),
    modalConfirm: () => document.getElementById('modalConfirm'),
    modalCancel: () => document.getElementById('modalCancel')
};

// Modal State
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
    
    generateAvatarText(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length === 1) return name.charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },
    
    validateInput(name, number) {
        if (!name || name.trim() === '') {
            return { valid: false, message: 'Nama peserta tidak boleh kosong!' };
        }
        
        if (!number || number.trim() === '') {
            return { valid: false, message: 'Nomor kado tidak boleh kosong!' };
        }
        
        const num = parseInt(number);
        if (isNaN(num) || num < 1 || num > 999) {
            return { valid: false, message: 'Nomor kado harus antara 1-999!' };
        }
        
        // Cek duplikat nama
        const existingName = AppState.participants.find(p => 
            p.name.toLowerCase() === name.toLowerCase().trim()
        );
        if (existingName) {
            return { valid: false, message: `Nama "${name}" sudah terdaftar!` };
        }
        
        // Cek duplikat nomor
        const existingNumber = AppState.participants.find(p => p.giftNumber === number);
        if (existingNumber) {
            return { valid: false, message: `Nomor kado ${number} sudah digunakan oleh ${existingNumber.name}!` };
        }
        
        return { valid: true };
    },
    
    updateUIState() {
        const count = AppState.participants.length;
        DOM.participantCount().textContent = count;
        DOM.generateResultsBtn().disabled = count < 2;
        
        if (AppState.results.length > 0) {
            DOM.viewResultsLink().style.display = 'flex';
            DOM.resultsLink().style.display = 'inline-flex';
        } else {
            DOM.viewResultsLink().style.display = 'none';
            DOM.resultsLink().style.display = 'none';
        }
    }
};

// Penyimpanan Data
const Storage = {
    save() {
        const data = {
            participants: AppState.participants,
            results: AppState.results,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('giftExchangeData', JSON.stringify(data));
        Utils.updateUIState();
    },
    
    load() {
        const saved = localStorage.getItem('giftExchangeData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                AppState.participants = data.participants || [];
                AppState.results = data.results || [];
                Utils.updateUIState();
            } catch (e) {
                console.error('Error loading data:', e);
                localStorage.removeItem('giftExchangeData');
            }
        }
    },
    
    clear() {
        localStorage.removeItem('giftExchangeData');
        AppState.participants = [];
        AppState.results = [];
        Utils.updateUIState();
    },
    
    exportData() {
        const data = {
            participants: AppState.participants,
            results: AppState.results,
            timestamp: new Date().toISOString(),
            totalParticipants: AppState.participants.length
        };
        
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-tukar-kado-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showAlert('Data berhasil diexport!', 'success');
    }
};

// Render Daftar Peserta
function renderParticipantsList() {
    const list = DOM.participantsList();
    
    if (AppState.participants.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <h3>Belum ada peserta</h3>
                <p>Tambahkan peserta menggunakan form di atas</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    AppState.participants.forEach((participant, index) => {
        const avatarText = Utils.generateAvatarText(participant.name);
        html += `
            <div class="participant-item" data-id="${participant.id}">
                <div class="participant-info">
                    <div class="participant-avatar">${avatarText}</div>
                    <div class="participant-details">
                        <h3>${participant.name}</h3>
                        <div class="gift-number-badge">Kado #${participant.giftNumber}</div>
                    </div>
                </div>
                <button class="remove-btn" data-index="${index}" title="Hapus peserta">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    list.innerHTML = html;
    
    // Tambahkan event listener untuk tombol hapus
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeParticipant(index);
        });
    });
}

// Fungsi Manajemen Peserta
function addParticipant() {
    const name = DOM.participantName().value.trim();
    const number = DOM.giftNumber().value.trim();
    
    const validation = Utils.validateInput(name, number);
    if (!validation.valid) {
        Utils.showAlert(validation.message, 'error');
        return;
    }
    
    const participant = {
        id: Date.now().toString(),
        name: name,
        giftNumber: number
    };
    
    AppState.participants.push(participant);
    
    // Reset form
    DOM.participantName().value = '';
    DOM.giftNumber().value = '';
    DOM.participantName().focus();
    
    Storage.save();
    renderParticipantsList();
    Utils.showAlert(`${name} ditambahkan dengan kado #${number}`, 'success');
}

function removeParticipant(index) {
    const participant = AppState.participants[index];
    
    Utils.showModal(
        'Konfirmasi Hapus',
        `Hapus peserta "${participant.name}" dengan kado #${participant.giftNumber}?`,
        () => {
            AppState.participants.splice(index, 1);
            // Jika peserta dihapus setelah hasil diacak, reset hasil
            if (AppState.results.length > 0) {
                AppState.results = [];
                Utils.showAlert('Hasil direset karena peserta dihapus', 'warning');
            }
            
            Storage.save();
            renderParticipantsList();
            Utils.hideModal();
        }
    );
}

function clearAllParticipants() {
    if (AppState.participants.length === 0) {
        Utils.showAlert('Tidak ada peserta untuk dihapus', 'error');
        return;
    }
    
    Ut