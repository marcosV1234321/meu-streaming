// ... (mantenha seu firebaseConfig inicial)

const app = {
    init: () => {
        auth.onAuthStateChanged(user => {
            if(user) {
                document.getElementById('auth-screen').classList.add('hidden');
                document.getElementById('app-content').classList.remove('hidden');
                app.loadCatalog();
                app.loadApiKeys();
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('app-content').classList.add('hidden');
            }
        });
    },

    login: () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        auth.signInWithEmailAndPassword(e,p).catch(err => alert("Erro ao logar"));
    },

    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = "";
            const cats = ['Filmes', 'Séries', 'Kids'];
            
            cats.forEach(c => {
                let html = `<div class="section-title">${c}</div><div class="carousel">`;
                snap.forEach(child => {
                    const m = child.val();
                    if(m.category === c) {
                        html += `<div class="card" style="background-image:url(${m.img})"></div>`;
                    }
                });
                html += `</div>`;
                area.innerHTML += html;
            });
        });
    },

    saveApiKey: () => {
        const n = document.getElementById('api-name').value;
        const k = document.getElementById('api-key').value;
        db.ref('settings/apiKeys').push({ name: n, value: k }).then(() => {
            alert("API Adicionada!");
            app.loadApiKeys();
        });
    },

    loadApiKeys: () => {
        db.ref('settings/apiKeys').on('value', snap => {
            const list = document.getElementById('api-list-display');
            list.innerHTML = "";
            snap.forEach(child => {
                const api = child.val();
                list.innerHTML += `<div style="background:#222; padding:10px; margin-top:5px; border-radius:4px;">
                    <strong>${api.name}:</strong> ${api.value} 
                    <button onclick="app.delKey('${child.key}')" style="float:right; color:red; background:none; border:none;">X</button>
                </div>`;
            });
        });
    },

    delKey: (id) => db.ref(`settings/apiKeys/${id}`).remove(),
    logout: () => auth.signOut(),
    register: () => { /* lógica de cadastro anterior */ }
};

const ui = {
    toggleAdmin: () => document.getElementById('admin-panel').classList.toggle('hidden'),
    switchTab: (id) => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
        document.getElementById(`tab-${id}`).classList.remove('hidden');
    },
    toggleAuth: () => {
        document.getElementById('login-form').classList.toggle('hidden');
        document.getElementById('register-form').classList.toggle('hidden');
    }
};

window.onload = app.init;
