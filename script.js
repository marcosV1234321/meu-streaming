// CONFIGURAÇÃO FIREBASE (Master, use a sua aqui)
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const app = {
    init: () => {
        auth.onAuthStateChanged(user => {
            if (user) {
                db.ref(`users/${user.uid}`).once('value', snap => {
                    const data = snap.val();
                    if(data?.role === 'master') document.getElementById('btn-master').classList.remove('hidden');
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('app-content').classList.remove('hidden');
                    app.loadCatalog();
                });
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('app-content').classList.add('hidden');
            }
        });
    },

    login: () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        auth.signInWithEmailAndPassword(e, p).catch(err => alert("Erro: " + err.message));
    },

    register: () => {
        const e = document.getElementById('reg-email').value;
        const p = document.getElementById('reg-pass').value;
        const t = document.getElementById('reg-phone').value;
        auth.createUserWithEmailAndPassword(e, p).then(res => {
            db.ref(`users/${res.user.uid}`).set({ email: e, phone: t, blocked: false, role: 'user' });
        }).catch(err => alert(err.message));
    },

    logout: () => auth.signOut().then(() => location.reload()),

    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = "";
            const cats = ["Filmes", "Séries", "Kids"];
            cats.forEach(c => {
                let section = `<div class="row"><h3>${c}</h3><div class="carousel">`;
                snap.forEach(item => {
                    const m = item.val();
                    if(m.category === c) {
                        section += `<div class="movie-card" style="background-image:url(${m.img})"></div>`;
                    }
                });
                section += `</div></div>`;
                area.innerHTML += section;
            });
        });
    },

    loadUsers: () => {
        db.ref('users').on('value', snap => {
            const list = document.getElementById('list-users');
            list.innerHTML = "";
            snap.forEach(child => {
                const u = child.val();
                const id = child.key;
                list.innerHTML += `
                    <div class="user-item">
                        <div><b>${u.email}</b><br><small>${u.phone || 'N/A'}</small></div>
                        <div>
                            <a href="https://wa.me/55${u.phone?.replace(/\D/g,'')}" target="_blank" style="color:green;margin:0 10px;"><i class="fab fa-whatsapp"></i></a>
                            <i class="fas fa-ban" onclick="app.toggleBlock('${id}', ${u.blocked})" style="color:orange;cursor:pointer;margin:0 10px;"></i>
                            <i class="fas fa-trash" onclick="app.deleteUser('${id}')" style="color:red;cursor:pointer;"></i>
                        </div>
                    </div>`;
            });
        });
    },

    toggleBlock: (id, status) => db.ref(`users/${id}`).update({ blocked: !status }),
    deleteUser: (id) => confirm("Deletar usuário?") && db.ref(`users/${id}`).remove()
};

const ui = {
    toggleAuth: () => {
        document.getElementById('login-form').classList.toggle('hidden');
        document.getElementById('register-form').classList.toggle('hidden');
    },
    toggleSidebar: () => document.getElementById('sidebar').classList.toggle('active'),
    toggleAdmin: () => {
        document.getElementById('admin-panel').classList.toggle('hidden');
        app.loadUsers();
    },
    switchTab: (tab) => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
        document.getElementById(tab).classList.remove('hidden');
    }
};

window.onload = app.init;
