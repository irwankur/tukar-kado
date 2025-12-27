// Data Aplikasi untuk Admin
const AppState = {
    participants: [],
    isOnline: false
};

// DOM Elements
const DOM = {
    participantName: () => document.getElementById('participantName'),
    giftNumber: () => document.getElementById('giftNumber'),
    addParticipantBtn: () => document.getElementById('addParticipant'),
    clearAllBtn: () => document.getElementById('clearAll'),
    goToResultsLink: () => document.getElementById('goToResults'),
    participantCount: () => document.getElementById('participantCount'),
    participantsList: () => document.getElementById('participantsList'),
    alert: () => document.getElementById('alert'),
    modal: () => document.getElementById('confirmModal'),
    modalTitle: () => document.getElementById('modalTitle'),
    modalMessage: () => document.getElementById('modalMessage'),
    modalConfirm: () => document.getElementById('modalConfirm'),
    modalCancel: () => document.getElementById('modalCancel'),
    connectionStatus: () => document.getElementById('connectionStatus')
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
        
        // Update connection status
        if (DOM.connectionStatus()) {
            DOM.connectionStatus().textContent = AppState.isOnline ? 
                '🟢 Online - Data tersimpan di cloud' : 
                '🔴 Offline - Data hanya lokal';
        }
    }
};

// Render Daftar Peserta
function renderParticipantsList() {
    const list = DOM.participantsList();
    
    if (AppState.participants.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <h3>Belum ada data</h3>
                <p>Tambahkan peserta menggunakan form di samping</p>
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
async function addParticipant() {
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
        giftNumber: number,
        addedAt: new Date().toISOString()
    };
    
    AppState.participants.push(participant);
    
    // Reset form
    DOM.participantName().value = '';
    DOM.giftNumber().value = '';
    DOM.participantName().focus();
    
    // Simpan ke Firebase
    const saved = await FirebaseService.saveParticipants(AppState.participants);
    
    if (saved) {
        AppState.isOnline = true;
        renderParticipantsList();
        Utils.updateUIState();
        Utils.showAlert(`${name} ditambahkan dengan kado #${number} (tersimpan online)`, 'success');
    } else {
        // Fallback ke localStorage
        localStorage.setItem('participants_backup', JSON.stringify(AppState.participants));
        Utils.showAlert(`${name} ditambahkan (hanya tersimpan lokal)`, 'warning');
    }
}

async function removeParticipant(index) {
    const participant = AppState.participants[index];
    
    Utils.showModal(
        'Konfirmasi Hapus',
        `Hapus peserta "${participant.name}" dengan kado #${participant.giftNumber}?`,
        async () => {
            AppState.participants.splice(index, 1);
            
            // Update Firebase
            const saved = await FirebaseService.saveParticipants(AppState.participants);
            
            renderParticipantsList();
            Utils.updateUIState();
            Utils.showAlert(`Peserta "${participant.name}" dihapus`, 'success');
            Utils.hideModal();
        }
    );
}

async function clearAllParticipants() {
    if (AppState.participants.length === 0) {
        Utils.showAlert('Tidak ada data untuk dihapus', 'error');
        return;
    }
    
    Utils.showModal(
        'Hapus Semua Data',
        `Apakah Anda yakin ingin menghapus semua ${AppState.participants.length} data peserta?`,
        async () => {
            AppState.participants = [];
            
            // Hapus dari Firebase
            await FirebaseService.resetAllData();
            
            renderParticipantsList();
            Utils.updateUIState();
            Utils.showAlert('Semua data telah dihapus', 'success');
            Utils.hideModal();
        }
    );
}

// Load data dari Firebase saat pertama kali
async function loadData() {
    try {
        const participants = await FirebaseService.getParticipants();
        if (participants && participants.length > 0) {
            AppState.participants = participants;
            AppState.isOnline = true;
            Utils.showAlert(`Data ${participants.length} peserta berhasil dimuat dari cloud`, 'success');
        } else {
            // Coba load dari localStorage backup
            const backup = localStorage.getItem('participants_backup');
            if (backup) {
                AppState.participants = JSON.parse(backup);
                Utils.showAlert(`Data ${AppState.participants.length} peserta dimuat dari backup lokal`, 'warning');
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Utils.showAlert('Tidak bisa terhubung ke server. Mode offline.', 'error');
    }
    
    renderParticipantsList();
    Utils.updateUIState();
}

// Konfirmasi sebelum pindah ke halaman acak
function confirmBeforeLeaving() {
    if (AppState.participants.length < 2) {
        Utils.showAlert('Minimal diperlukan 2 peserta untuk tukar kado!', 'error');
        return;
    }
    
    Utils.showModal(
        'Konfirmasi',
        `Data ${AppState.participants.length} peserta sudah tersimpan. Peserta dapat membuka halaman acak di komputer mana pun dengan link ini:<br><br>
        <code>https://irwankur.github.io/tukar-kado/acak.html</code>`,
        () => {
            // Redirect ke halaman acak
            window.location.href = 'acak.html';
            Utils.hideModal();
        }
    );
}

// Inisialisasi
async function init() {
    // Load data dari Firebase
    await loadData();
    
    // Setup event listeners
    DOM.addParticipantBtn().addEventListener('click', addParticipant);
    
    DOM.participantName().addEventListener('keypress', (e) => {
        if (e.key === 'Enter') DOM.giftNumber().focus();
    });
    
    DOM.giftNumber().addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addParticipant();
    });
    
    DOM.clearAllBtn().addEventListener('click', clearAllParticipants);
    
    DOM.goToResultsLink().addEventListener('click', (e) => {
        e.preventDefault();
        confirmBeforeLeaving();
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
    
    // Set focus ke input nama
    DOM.participantName().focus();
    
    console.log('Admin System initialized with Firebase');
}

// Jalankan saat DOM siap
document.addEventListener('DOMContentLoaded', init);