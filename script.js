const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let state = { allMedia: [], apiKeys: [] };

const ui = {
    toggleSidebar: () => document.getElementById('sidebar').classList.toggle('active'),
    toggleAdmin: () => document.getElementById('admin-panel').classList.toggle('hidden'),
    switchTab: (tabName, event) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        event.target.classList.add('active');
        if(tabName === 'users') app.loadUsers();
        if(tabName === 'config') app.loadApiKeys();
    }
};

const app = {
    init: () => {
        app.loadCatalog();
        app.loadApiKeys();
    },

    loadCatalog: () => {
        db.ref('catalog').on('value', snapshot => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = '';
            if(!snapshot.exists()) return;
            snapshot.forEach(child => {
                const m = child.val();
                area.innerHTML += `<div class="card" style="background-image:url(${m.img})"></div>`;
            });
        });
    },

    loadUsers: () => {
        db.ref('users').on('value', snap => {
            const list = document.getElementById('users-display-list');
            list.innerHTML = '';
            snap.forEach(child => {
                const u = child.val();
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #222;">
                        <span>${u.email} (${u.phone || 'Sem Tel'})</span>
                        <div>
                            <a href="https://wa.me/55${u.phone?.replace(/\D/g,'')}" target="_blank" style="color:green; margin-right:10px;"><i class="fab fa-whatsapp"></i></a>
                            <i class="fas fa-trash" onclick="app.deleteUser('${child.key}')" style="color:red;"></i>
                        </div>
                    </div>`;
            });
        });
    },

    saveApiKey: () => {
        const label = document.getElementById('api-label').value;
        const value = document.getElementById('api-value').value;
        const type = document.getElementById('api-type').value;
        db.ref('settings/apiKeys').push({ label, value, type }).then(() => alert("Salvo!"));
    },

    loadApiKeys: () => {
        db.ref('settings/apiKeys').on('value', snap => {
            const list = document.getElementById('api-keys-list');
            list.innerHTML = "";
            snap.forEach(c => {
                list.innerHTML += `<div style="padding:10px; border:1px solid #333;">${c.val().label} <i class="fas fa-trash" onclick="app.delKey('${c.key}')" style="float:right;"></i></div>`;
            });
        });
    },

    delKey: (id) => db.ref(`settings/apiKeys/${id}`).remove(),
    deleteUser: (id) => db.ref(`users/${id}`).remove(),
    logout: () => auth.signOut().then(() => location.reload())
};

window.onload = app.init;
