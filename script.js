const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let state = {
    allMedia: [],
    tempTMDB: null,
    apiKeys: [],
    currentUser: null // Para armazenar dados do usuário logado, incluindo o role (master/user)
};

const app = {
    init: () => {
        // Listener para o estado de autenticação
        auth.onAuthStateChanged(user => {
            if (user) {
                // Usuário logado: Carregar dados do perfil para verificar role
                db.ref(`users/${user.uid}`).once('value', snapshot => {
                    state.currentUser = { uid: user.uid, ...snapshot.val() };
                    
                    document.getElementById('auth-screen').classList.add('hidden');
                    document.getElementById('app-content').classList.remove('hidden');
                    
                    // Mostrar Painel apenas se for Master
                    if (state.currentUser.role === 'master') {
                        document.querySelector('.btn-adm').classList.remove('hidden');
                    } else {
                        document.querySelector('.btn-adm').classList.add('hidden'); // Esconder se não for master
                    }

                    app.loadCatalog();
                    app.loadApiKeys(); // Sempre carregar as chaves no início
                });
            } else {
                // Usuário deslogado: Mostrar tela de autenticação
                document.getElementById('auth-screen').classList.remove('hidden');
                document.getElementById('app-content').classList.add('hidden');
            }
        });
    },

    // --- AUTENTICAÇÃO ---
    login: () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        if (!email || !pass) {
            alert("Por favor, preencha todos os campos.");
            return;
        }
        auth.signInWithEmailAndPassword(email, pass)
            .catch(error => {
                alert("Erro ao fazer login: " + error.message);
            });
    },

    register: () => {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const phone = document.getElementById('reg-phone').value;
        if (!email || !pass || !phone) {
            alert("Por favor, preencha todos os campos.");
            return;
        }
        auth.createUserWithEmailAndPassword(email, pass)
            .then(userCredential => {
                // Salvar dados adicionais no Realtime Database
                db.ref(`users/${userCredential.user.uid}`).set({
                    email: email,
                    phone: phone,
                    blocked: false,
                    role: 'user' // Define como usuário padrão
                });
                alert("Cadastro realizado com sucesso! Faça login.");
                ui.toggleAuth(); // Volta para a tela de login
            })
            .catch(error => {
                alert("Erro ao cadastrar: " + error.message);
            });
    },

    logout: () => {
        auth.signOut()
            .then(() => {
                // Redireciona ou recarrega a página após o logout
                location.reload();
            })
            .catch(error => {
                alert("Erro ao fazer logout: " + error.message);
            });
    },

    // --- CATÁLOGO ---
    loadCatalog: () => {
        db.ref('catalog').on('value', snapshot => {
            const catalogArea = document.getElementById('catalog-area');
            catalogArea.innerHTML = ""; // Limpa o catálogo antes de renderizar
            state.allMedia = [];

            if (!snapshot.exists()) {
                catalogArea.innerHTML = "<p style='text-align:center; margin-top:50px;'>Nenhum conteúdo disponível.</p>";
                return;
            }

            // Coleta todas as mídias e as armazena no estado
            snapshot.forEach(childSnapshot => {
                state.allMedia.push({ key: childSnapshot.key, ...childSnapshot.val() });
            });

            // Agrupa por categoria e renderiza
            const categories = ["Filmes", "Séries", "Kids"]; // Categorias fixas

            categories.forEach(categoryName => {
                const filteredMedia = state.allMedia.filter(media => media.category === categoryName);
                if (filteredMedia.length > 0) {
                    let sectionHtml = `
                        <div class="row">
                            <h3>${categoryName}</h3>
                            <div class="cards-container">
                    `;
                    filteredMedia.forEach(media => {
                        sectionHtml += `
                            <div class="movie-card" 
                                 onclick="ui.openPlayer('${media.video}')" 
                                 style="background-image:url('${media.img}');"
                                 title="${media.title}">
                            </div>
                        `;
                    });
                    sectionHtml += `</div></div>`;
                    catalogArea.innerHTML += sectionHtml;
                }
            });
        });
    },

    // --- ADMIN: POSTAR MÍDIA ---
    fetchTMDB: async () => {
        const tmdbId = document.getElementById('tmdb-id').value;
        if (!tmdbId) {
            alert("Por favor, insira um ID TMDB.");
            return;
        }
        try {
            const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
            const data = await response.json();
            if (data.status_code === 34) { // Erro "The resource you requested could not be found."
                document.getElementById('preview-movie').innerText = "Erro: ID TMDB não encontrado.";
                state.tempTMDB = null;
                return;
            }
            state.tempTMDB = data;
            document.getElementById('preview-movie').innerText = `Conteúdo carregado: ${data.title}`;
        } catch (error) {
            alert("Erro ao buscar no TMDB: " + error.message);
            state.tempTMDB = null;
        }
    },

    postMedia: () => {
        if (!state.tempTMDB) {
            alert("Por favor, busque os dados do TMDB primeiro.");
            return;
        }
        const videoUrl = document.getElementById('video-url').value;
        const category = document.getElementById('manual-cat').value;
        if (!videoUrl) {
            alert("Por favor, insira o link do vídeo.");
            return;
        }

        db.ref('catalog').push({
            title: state.tempTMDB.title,
            sinopse: state.tempTMDB.overview,
            img: `https://image.tmdb.org/t/p/w500${state.tempTMDB.poster_path}`,
            video: videoUrl,
            category: category
        })
        .then(() => {
            alert("Mídia publicada com sucesso!");
            // Limpa os campos após a postagem
            document.getElementById('tmdb-id').value = '';
            document.getElementById('video-url').value = '';
            document.getElementById('preview-movie').innerText = '';
        })
        .catch(error => {
            alert("Erro ao publicar mídia: " + error.message);
        });
    },

    // --- ADMIN: GERENCIAR USUÁRIOS ---
    loadUsers: () => {
        db.ref('users').on('value', snapshot => {
            const usersList = document.getElementById('list-users');
            usersList.innerHTML = ""; // Limpa a lista antes de carregar
            if (!snapshot.exists()) {
                usersList.innerHTML = "<p>Nenhum usuário cadastrado.</p>";
                return;
            }

            snapshot.forEach(childSnapshot => {
                const user = childSnapshot.val();
                const userId = childSnapshot.key;
                const status = user.blocked ? "Bloqueado" : "Ativo";
                const statusClass = user.blocked ? 'status-blocked' : 'status-active';

                usersList.innerHTML += `
                    <div class="item-list">
                        <div class="user-info">
                            <strong>${user.email}</strong>
                            <small>Tel: ${user.phone || 'N/A'}</small>
                            <span class="${statusClass}">${status}</span>
                        </div>
                        <div class="action-buttons">
                            <a href="https://wa.me/55${user.phone?.replace(/\D/g,'')}" target="_blank" class="btn-whatsapp"><i class="fab fa-whatsapp"></i></a>
                            <button onclick="app.toggleBlockUser('${userId}', ${user.blocked})" class="btn-block"><i class="fas fa-${user.blocked ? 'unlock' : 'ban'}"></i></button>
                            <button onclick="app.deleteUser('${userId}')" class="btn-delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        });
    },

    toggleBlockUser: (userId, isBlocked) => {
        db.ref(`users/${userId}`).update({ blocked: !isBlocked })
            .then(() => alert(isBlocked ? "Usuário desbloqueado!" : "Usuário bloqueado!"))
            .catch(error => alert("Erro ao mudar status: " + error.message));
    },

    deleteUser: (userId) => {
        if (confirm("Tem certeza que deseja remover este usuário permanentemente?")) {
            // Cuidado: Isso remove apenas do Realtime DB. Para remover do Authentication, precisa de função do lado do servidor.
            db.ref(`users/${userId}`).remove()
                .then(() => alert("Usuário removido!"))
                .catch(error => alert("Erro ao remover usuário: " + error.message));
        }
    },

    // --- ADMIN: GERENCIAR APIs ---
    saveApiKey: () => {
        const name = document.getElementById('api-name').value;
        const value = document.getElementById('api-val').value;
        if (!name || !value) {
            alert("Por favor, preencha o nome e o valor da chave.");
            return;
        }
        db.ref('settings/apiKeys').push({ name: name, value: value })
            .then(() => {
                alert("Chave de API salva com sucesso!");
                document.getElementById('api-name').value = '';
                document.getElementById('api-val').value = '';
            })
            .catch(error => alert("Erro ao salvar chave: " + error.message));
    },

    loadApiKeys: () => {
        db.ref('settings/apiKeys').on('value', snapshot => {
            const apiList = document.getElementById('list-apis');
            apiList.innerHTML = ""; // Limpa a lista antes de carregar
            state.apiKeys = []; // Reseta o array de chaves no estado

            if (!snapshot.exists()) {
                apiList.innerHTML = "<p>Nenhuma chave de API cadastrada.</p>";
                return;
            }

            snapshot.forEach(childSnapshot => {
                const keyData = { key: childSnapshot.key, ...childSnapshot.val() };
                state.apiKeys.push(keyData); // Adiciona ao estado
                apiList.innerHTML += `
                    <div class="item-list">
                        <div class="api-info">
                            <strong>${keyData.name}</strong>
                            <small>Valor: ${keyData.value.substring(0, 5)}...${keyData.value.substring(keyData.value.length - 5)}</small>
                        </div>
                        <div class="action-buttons">
                            <button onclick="app.deleteApiKey('${keyData.key}')" class="btn-delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        });
    },

    deleteApiKey: (keyId) => {
        if (confirm("Tem certeza que deseja remover esta chave de API?")) {
            db.ref(`settings/apiKeys/${keyId}`).remove()
                .then(() => alert("Chave de API removida!"))
                .catch(error => alert("Erro ao remover chave: " + error.message));
        }
    }
};

const ui = {
    // Alterna entre formulário de login e cadastro
    toggleAuth: () => {
        document.getElementById('login-form').classList.toggle('hidden');
        document.getElementById('register-form').classList.toggle('hidden');
    },

    // Abre/fecha o painel de administração
    toggleAdmin: () => {
        document.getElementById('admin-panel').classList.toggle('hidden');
        // Ao abrir o painel, garante que a primeira aba (Postar) esteja ativa
        if (!document.getElementById('admin-panel').classList.contains('hidden')) {
            ui.switchTab('tab-post'); 
        }
    },

    // Troca as abas dentro do painel de administração
    switchTab: (tabId) => {
        document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.add('hidden'));
        document.getElementById(tabId).classList.remove('hidden');
        
        // Recarregar dados específicos da aba ao abri-la
        if (tabId === 'tab-users') app.loadUsers();
        if (tabId
