/**
 * MASTER FLIX PRO - CENTRAL DE CONEXÕES (DRIVE & DROPBOX)
 */

// 1. Inicialização e Injeção de Interface
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        app.initAdminTabs();
        app.injectNetflixFeatures();
    }, 1500);
});

// --- SISTEMA DE ABAS DO PAINEL MASTER ---
app.initAdminTabs = () => {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel || document.getElementById('admin-tabs')) return;

    const tabsHTML = `
        <div id="admin-tabs" style="display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #333; overflow-x:auto; padding-bottom:10px;">
            <button onclick="app.switchTab('m')" style="background:none; color:white; border:none; cursor:pointer; font-weight:bold; white-space:nowrap;">Mídias</button>
            <button onclick="app.switchTab('u')" style="background:none; color:var(--gold); border:none; cursor:pointer; font-weight:bold; white-space:nowrap;">Usuários</button>
            <button onclick="app.switchTab('c')" style="background:none; color:#1da1f2; border:none; cursor:pointer; font-weight:bold; white-space:nowrap;">Conexões API</button>
        </div>
        
        <div id="tab-connections" class="hidden">
            <div style="background:#000; padding:15px; border-radius:5px; margin-bottom:20px;">
                <h4 style="margin-bottom:10px; color:#1da1f2;">Vincular Nova Nuvem</h4>
                <select id="conn-type" style="width:100%; padding:10px; background:#222; color:white; border:1px solid #444;">
                    <option value="gdrive">Google Drive</option>
                    <option value="dropbox">Dropbox</option>
                </select>
                <input type="text" id="conn-name" placeholder="Nome Ex: Drive Filmes 01">
                <input type="text" id="conn-key" placeholder="API Key / Access Token">
                <input type="text" id="conn-folder" placeholder="ID da Pasta">
                <button onclick="app.saveConnection()" style="width:100%; padding:10px; margin-top:10px; background:#1da1f2; color:white; border:none; cursor:pointer; font-weight:bold;">SALVAR CONTA</button>
            </div>
            <div id="connections-list"></div>
            <button onclick="app.masterScan()" style="width:100%; padding:20px; background:var(--red); color:white; border:none; font-weight:bold; cursor:pointer; margin-top:20px; border-radius:8px;">
                <i class="fas fa-sync-alt"></i> VARRER TODAS AS CONTAS AGORA
            </button>
        </div>
        
        <div id="tab-users" class="hidden"><div id="users-list-container"></div></div>
    `;

    const title = adminPanel.querySelector('h3');
    title.insertAdjacentHTML('afterend', tabsHTML);
};

app.switchTab = (tab) => {
    const mediaTab = document.getElementById('admin-content-default');
    const userTab = document.getElementById('tab-users');
    const connTab = document.getElementById('tab-connections');
    
    [mediaTab, userTab, connTab].forEach(t => t.classList.add('hidden'));

    if (tab === 'm') mediaTab.classList.remove('hidden');
    if (tab === 'u') { userTab.classList.remove('hidden'); app.loadUsers(); }
    if (tab === 'c') { connTab.classList.remove('hidden'); app.loadConnections(); }
};

// --- GESTÃO DE CONEXÕES NO FIREBASE ---
app.saveConnection = () => {
    const data = {
        type: document.getElementById('conn-type').value,
        name: document.getElementById('conn-name').value,
        key: document.getElementById('conn-key').value,
        folder: document.getElementById('conn-folder').value
    };
    if(!data.name || !data.key) return alert("Preencha os dados da conta!");
    db.ref('settings/connections').push(data);
    alert("Conexão Master Salva!");
};

app.loadConnections = () => {
    const list = document.getElementById('connections-list');
    db.ref('settings/connections').on('value', snap => {
        list.innerHTML = "";
        snap.forEach(child => {
            const c = child.val();
            list.innerHTML += `
                <div style="background:#111; padding:10px; margin-bottom:5px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                    <span><i class="${c.type === 'gdrive' ? 'fab fa-google-drive' : 'fab fa-dropbox'}"></i> ${c.name}</span>
                    <button onclick="db.ref('settings/connections/${child.key}').remove()" style="background:none; border:none; color:red; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>`;
        });
    });
};

// --- O MOTOR DE VARREDURA MASTER (SCANNER) ---
app.masterScan = async () => {
    const btn = event.target;
    btn.innerText = "VARRENDO... AGUARDE";
    btn.disabled = true;

    const snap = await db.ref('settings/connections').once('value');
    if (!snap.exists()) return alert("Nenhuma conta vinculada!");

    let totalNew = 0;

    for (let child of Object.values(snap.val())) {
        if (child.type === 'gdrive') {
            totalNew += await app.scanGDrive(child);
        } else if (child.type === 'dropbox') {
            totalNew += await app.scanDropbox(child);
        }
    }

    btn.innerHTML = `<i class="fas fa-sync-alt"></i> VARRER TODAS AS CONTAS AGORA`;
    btn.disabled = false;
    alert(`Varredura completa! ${totalNew} novos filmes adicionados.`);
};

// Lógica GDrive
app.scanGDrive = async (conf) => {
    try {
        const url = `https://www.googleapis.com/drive/v3/files?q='${conf.folder}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=${conf.key}`;
        const res = await fetch(url);
        const data = await res.json();
        let count = 0;
        for (let file of data.files || []) {
            if (file.mimeType.includes('video')) {
                const streamUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${conf.key}`;
                const added = await app.addToCatalogIfNew(file.name, streamUrl);
                if(added) count++;
            }
        }
        return count;
    } catch (e) { return 0; }
};

// Lógica Dropbox
app.scanDropbox = async (conf) => {
    try {
        const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${conf.key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: conf.folder === 'root' ? '' : conf.folder })
        });
        const data = await res.json();
        let count = 0;
        for (let file of data.entries || []) {
            if (file['.tag'] === 'file' && file.name.match(/\.(mp4|mkv|webm)$/i)) {
                // Link raw do Dropbox
                const linkRes = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${conf.key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: file.path_lower })
                });
                const linkData = await linkRes.json();
                const added = await app.addToCatalogIfNew(file.name, linkData.link);
                if(added) count++;
            }
        }
        return count;
    } catch (e) { return 0; }
};

// Sincronização com TMDB e Firebase
app.addToCatalogIfNew = async (fileName, videoUrl) => {
    const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const snap = await db.ref('catalog').orderByChild('title').equalTo(cleanName).once('value');
    if (snap.exists()) return false;

    const tmdbRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=2eaf2fd731f81a77741ecb625b588a40&query=${encodeURI(cleanName)}&language=pt-BR`);
    const tmdb = await tmdbRes.json();
    const d = tmdb.results ? tmdb.results[0] : null;

    await db.ref('catalog').push({
        title: d ? d.title : cleanName,
        img: d ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : 'https://via.placeholder.com/500x750?text=Master+Flix',
        sinopse: d ? d.overview : 'Sincronizado automaticamente via Nuvem.',
        video: videoUrl,
        category: 'Filmes',
        genre: d && d.genre_ids ? 'Lançamento' : 'Drive'
    });
    return true;
};

// (Mantenha as funções de Continuar Assistindo, Minha Lista e Gestão de Usuários do código anterior abaixo...)
