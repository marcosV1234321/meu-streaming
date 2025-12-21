/**
 * MASTER FLIX PRO - PLUGIN DE EXPERIÊNCIA NETFLIX
 * Pilar: Continuar Assistindo + Minha Lista + Gestão de Usuários
 */

// 1. Inicialização de Injeção
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        app.initAdminTabs(); // Mantém sua gestão de usuários
        app.injectNetflixFeatures();
    }, 1500);
});

app.injectNetflixFeatures = () => {
    // Escuta o progresso dos vídeos para o "Continuar Assistindo"
    if (currentUser) {
        app.loadContinueWatching();
        app.loadMyList();
    }
};

// --- FUNÇÃO: CONTINUAR ASSISTINDO ---
app.saveProgress = (mediaKey, time) => {
    if (!currentUser) return;
    db.ref(`users/${currentUser.uid}/progress/${mediaKey}`).set({
        time: time,
        lastDate: Date.now(),
        media: activeMedia // Salva os dados da mídia para facilitar o acesso
    });
};

app.loadContinueWatching = () => {
    db.ref(`users/${currentUser.uid}/progress`).orderByChild('lastDate').limitToLast(5).on('value', snap => {
        const area = document.getElementById('catalog-area');
        let section = document.getElementById('sec-continue');
        
        if (!snap.exists()) { if(section) section.remove(); return; }

        if (!section) {
            section = document.createElement('div');
            section.id = 'sec-continue';
            area.prepend(section);
        }

        section.innerHTML = `<h2 class="section-title">Continuar Assistindo como Master</h2><div class="carousel-cards" id="row-continue"></div>`;
        const row = section.querySelector('#row-continue');

        snap.forEach(child => {
            const data = child.val();
            const m = data.media;
            const card = document.createElement('div');
            card.className = "card";
            card.style.backgroundImage = `url(${m.img})`;
            card.style.position = "relative";
            // Barra de progresso visual no card
            card.innerHTML = `<div style="position:absolute; bottom:0; left:0; height:4px; background:var(--red); width:70%; border-radius:0 2px 2px 0;"></div>`;
            card.onclick = () => {
                activeMedia = m;
                ui.play(data.time); // Abre no tempo salvo
            };
            row.prepend(card); // Mais recentes primeiro
        });
    });
};

// --- FUNÇÃO: MINHA LISTA (FAVORITOS) ---
app.loadMyList = () => {
    db.ref(`users/${currentUser.uid}/favorites`).on('value', snap => {
        const area = document.getElementById('catalog-area');
        let section = document.getElementById('sec-mylist');

        if (!snap.exists()) { if(section) section.remove(); return; }

        if (!section) {
            section = document.createElement('div');
            section.id = 'sec-mylist';
            const continueSec = document.getElementById('sec-continue');
            continueSec ? continueSec.after(section) : area.prepend(section);
        }

        section.innerHTML = `<h2 class="section-title">Minha Lista</h2><div class="carousel-cards" id="row-mylist"></div>`;
        const row = section.querySelector('#row-mylist');

        snap.forEach(child => {
            const m = child.val();
            const card = document.createElement('div');
            card.className = "card";
            card.style.backgroundImage = `url(${m.img})`;
            card.onclick = () => app.details(m);
            row.appendChild(card);
        });
    });
};

// --- OVERRIDE: MELHORANDO O PLAYER E O MODAL ---
// Adiciona botão de favoritos no modal dinamicamente
const originalDetails = app.details;
app.details = (m) => {
    originalDetails(m);
    const infoDiv = document.querySelector('.modal-info');
    if (!document.getElementById('btn-fav-master')) {
        const btn = document.createElement('button');
        btn.id = 'btn-fav-master';
        btn.style = "background:#333; color:white; border:none; padding:10px; width:100%; margin-top:10px; cursor:pointer; font-weight:bold; border-radius:4px;";
        btn.innerHTML = '<i class="fas fa-plus"></i> Minha Lista';
        btn.onclick = () => app.toggleFavorite(activeMedia);
        infoDiv.appendChild(btn);
    }
};

app.toggleFavorite = (m) => {
    const ref = db.ref(`users/${currentUser.uid}/favorites/${m.key}`);
    ref.once('value', snap => {
        if (snap.exists()) {
            ref.remove();
            alert("Removido da Minha Lista");
        } else {
            ref.set(m);
            alert("Adicionado à Minha Lista!");
        }
    });
};

// Monitora o tempo do vídeo enquanto assiste
const originalPlay = ui.play;
ui.play = (startTime = 0) => {
    originalPlay();
    const videoTag = document.querySelector('#v-container video');
    if (videoTag) {
        if (startTime) videoTag.currentTime = startTime;
        
        videoTag.ontimeupdate = () => {
            // Salva a cada 5 segundos para não sobrecarregar o banco
            if (Math.floor(videoTag.currentTime) % 5 === 0) {
                app.saveProgress(activeMedia.key, videoTag.currentTime);
            }
        };
    }
};

// --- MANTÉM SUA GESTÃO DE USUÁRIOS (CÓDIGO ANTERIOR) ---
app.initAdminTabs = () => {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel || document.getElementById('admin-tabs')) return;
    const tabsHTML = `
        <div id="admin-tabs" style="display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px;">
            <button onclick="app.switchTab('m')" style="background:none; color:white; border:none; cursor:pointer; font-weight:bold; padding:10px;">Mídias</button>
            <button onclick="app.switchTab('u')" style="background:none; color:var(--gold); border:none; cursor:pointer; font-weight:bold; padding:10px;">Usuários</button>
        </div>
        <div id="tab-users" class="hidden"><div id="users-list-container" style="display:grid; gap:10px;"></div></div>`;
    const title = adminPanel.querySelector('h3');
    const defaultContent = document.getElementById('admin-content-default');
    title.insertAdjacentHTML('afterend', tabsHTML);
};

app.switchTab = (tab) => {
    const mediaTab = document.getElementById('admin-content-default');
    const userTab = document.getElementById('tab-users');
    if (tab === 'm') { mediaTab.classList.remove('hidden'); userTab.classList.add('hidden'); }
    else { mediaTab.classList.add('hidden'); userTab.classList.remove('hidden'); app.loadUsers(); }
};

app.loadUsers = () => {
    const container = document.getElementById('users-list-container');
    container.innerHTML = "<p>Carregando Master...</p>";
    db.ref('users').on('value', snap => {
        container.innerHTML = "";
        snap.forEach(child => {
            const user = child.val();
            const uid = child.key;
            const validade = user.expiry ? new Date(user.expiry).toLocaleDateString('pt-BR') : "Eterno";
            const statusColor = user.blocked ? "#ff4444" : "#00ff00";
            container.innerHTML += `
                <div style="background:#000; padding:15px; border-radius:5px; border-left:4px solid ${statusColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div><p style="font-weight:bold; margin:0;">${user.email || 'Novo Master'}</p><small style="color:gray;">Vence em: ${validade}</small></div>
                        <div style="display:flex; gap:5px;">
                            <button onclick="app.setExpiry('${uid}')" style="background:#222; border:none; color:white; padding:8px; border-radius:4px;"><i class="fas fa-calendar"></i></button>
                            <button onclick="app.toggleBlock('${uid}', ${user.blocked})" style="background:#222; border:none; color:${statusColor}; padding:8px; border-radius:4px;"><i class="fas fa-ban"></i></button>
                            <a href="https://wa.me/${user.phone || ''}" target="_blank" style="background:#25D366; color:white; padding:8px; border-radius:4px; text-decoration:none;"><i class="fab fa-whatsapp"></i></a>
                        </div>
                    </div>
                </div>`;
        });
    });
};

app.toggleBlock = (uid, current) => { db.ref('users/' + uid).update({ blocked: !current }); };
app.setExpiry = (uid) => {
    const dias = prompt("Quantos dias de acesso liberar?");
    if (dias) {
        const dataFim = new Date(); dataFim.setDate(dataFim.getDate() + parseInt(dias));
        db.ref('users/' + uid).update({ expiry: dataFim.getTime() });
        alert("Acesso Master liberado!");
    }
};
