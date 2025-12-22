const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let state = { allMedia: [], activeMedia: null, tempTMDB: null, apiKeys: [], currentUser: null };

const ui = {
    toggleAuthMode: () => {
        document.getElementById('login-form').classList.toggle('hidden');
        document.getElementById('register-form').classList.toggle('hidden');
    },
    toggleSidebar: () => {
        document.getElementById('sidebar').classList.toggle('active');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    },
    toggleAdmin: () => document.getElementById('admin-panel').classList.toggle('hidden'),
    switchTab: (tabName, event) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        event.target.classList.add('active');
        if(tabName === 'users') app.loadUsers();
    },
    closeModal: () => document.getElementById('modal-details').classList.add('hidden'),
    startPlayer: () => {
        const media = state.activeMedia;
        document.getElementById('video-player-overlay').classList.remove('hidden');
        let url = media.video;
        if(url.includes("drive.google.com")){
            const id = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1];
            const keyObj = state.apiKeys.find(k => k.type === 'gdrive');
            url = keyObj ? `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${keyObj.value}` : url;
        }
        document.getElementById('video-container').innerHTML = `<video controls autoplay style="width:100%; height:100%;"><source src="${url}" type="video/mp4"></video>`;
    },
    stopPlayer: () => {
        document.getElementById('video-player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = '';
    }
};

const app = {
    init: () => {
        auth.onAuthStateChanged(user => {
            if (user) {
                db.ref(`users/${user.uid}`).once('value', snap => {
                    const data = snap.val();
                    if(data?.blocked) {
                        alert("Sua conta está bloqueada!");
                        auth.signOut();
                    } else {
                        state.currentUser = data;
                        document.getElementById('auth-screen').classList.add('hidden');
                        document.getElementById('app-content').classList.remove('hidden');
                        if(data?.role === 'master') document.getElementById('btn-master').classList.remove('hidden');
                        app.loadCatalog();
                        app.loadApiKeys();
                    }
                });
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('app-content').classList.add('hidden');
            }
        });
    },

    login: () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        auth.signInWithEmailAndPassword(email, pass).catch(e => alert("Erro: " + e.message));
    },

    register: () => {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const phone = document.getElementById('reg-phone').value;
        auth.createUserWithEmailAndPassword(email, pass).then(res => {
            db.ref(`users/${res.user.uid}`).set({ email, phone, blocked: false, role: 'user' });
        }).catch(e => alert(e.message));
    },

    logout: () => auth.signOut().then(() => location.reload()),

    loadUsers: () => {
        db.ref('users').on('value', snap => {
            const list = document.getElementById('users-display-list');
            list.innerHTML = '';
            snap.forEach(child => {
                const u = child.val();
                const id = child.key;
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #222;">
                        <div>${u.email}<br><small>${u.phone}</small></div>
                        <div>
                            <a href="https://wa.me/55${u.phone?.replace(/\D/g,'')}" target="_blank" style="color:#25d366;"><i class="fab fa-whatsapp"></i></a>
                            <i class="fas fa-ban" onclick="app.toggleBlock('${id}', ${u.blocked})" style="color:orange; margin:0 10px;"></i>
                            <i class="fas fa-trash" onclick="app.deleteUser('${id}')" style="color:red;"></i>
                        </div>
                    </div>`;
            });
        });
    },

    toggleBlock: (id, status) => db.ref(`users/${id}`).update({ blocked: !status }),
    deleteUser: (id) => confirm("Excluir?") && db.ref(`users/${id}`).remove(),

    // ... (Mantenha funções de TMDB, PostMedia e LoadCatalog anteriores)
    loadApiKeys: () => {
        db.ref('settings/apiKeys').on('value', snap => {
            state.apiKeys = [];
            const list = document.getElementById('api-keys-list');
            list.innerHTML = "";
            snap.forEach(c => {
                const k = { id: c.key, ...c.val() };
                state.apiKeys.push(k);
                list.innerHTML += `<div style="padding:5px;">${k.label} (****${k.value.slice(-4)}) <i class="fas fa-trash" onclick="app.delKey('${k.id}')"></i></div>`;
            });
        });
    },
    saveApiKey: () => {
        const label = document.getElementById('api-label').value;
        const value = document.getElementById('api-value').value;
        const type = document.getElementById('api-type').value;
        db.ref('settings/apiKeys').push({ label, value, type });
    },
    delKey: (id) => db.ref(`settings/apiKeys/${id}`).remove(),

    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = "";
            state.allMedia = [];
            snap.forEach(c => {
                const item = { key: c.key, ...c.val() };
                state.allMedia.push(item);
            });
            // Agrupar e renderizar... (Lógica de categorias anterior)
        });
    }
};

window.onload = app.init;
