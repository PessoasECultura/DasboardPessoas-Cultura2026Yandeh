/* ══════════════════════════════════════════
   DASHBOARD PESSOAS & CULTURA 2026
   script.js — versão corrigida
══════════════════════════════════════════ */

/* ── ESTADO ───────────────────────────────── */
let allData = [];
let headcountData = [];   // aba Headcount: { mes, valor } por linha
let admissoesData = [];   // aba Admissões: linhas com colA e mes (col F)
let offboardingData = []; // aba Offboarding: linhas com colA e mes (col E)
let cotasPcdData = [];    // aba Cotas PCD: { mes, ativos, cotaMin, cotaAtual, contratar }
let cotasJaData  = [];    // aba Cotas JA:  { mes, ativos, minPessoas, maxPessoas, cotaAtual, contratar }
let movimentData = [];    // aba Movimentações Internas
let rsData       = [];    // planilha R&S: linhas da aba "Controle de Vagas 2026"
let peData       = [];    // planilha Período de Experiência
let climaData    = [];    // aba Clima das Áreas: { mes, mesNum, area, criticidade, bancohoras, pessoas, horasPorPessoa }
let ativosData   = [];    // aba Ativos: colaboradores ativos com salário, área, gestor, etc.
let charts  = {};          // instâncias Chart.js ativas
let currentCategory = 'dashboard';
let hasRealData = false;   // true quando planilha foi importada

/* ── PALETA ───────────────────────────────── */
const C = {
  blue:    '#0078d4',
  purple:  '#7030a0',
  teal:    '#00b7c3',
  green:   '#107c10',
  orange:  '#ff8c00',
  pink:    '#d83b81',
  red:     '#e74c3c',
  yellow:  '#ffb900',
  cyan:    '#00b7c3',
};
const PALETTE = Object.values(C);

/* ── KPIs ESTÁTICOS POR CATEGORIA ────────── */
/* Usados apenas na Visão Geral (sem dados importados) */
const KPI_STATIC = {
  dashboard:    [
    { label:'Headcount',          value:'—',        var:'',                  dir:0 },
    { label:'Turnover (12m)',     value:'—',        var:'',                  dir:0 },
    { label:'Absenteísmo',        value:'—',        var:'',                  dir:0 },
    { label:'Engajamento',        value:'—',        var:'',                  dir:0 },
    { label:'NPS eNPS',           value:'—',        var:'',                  dir:0 },
    { label:'Custo / Colaborador',value:'—',        var:'',                  dir:0 },
  ],
  recrutamento: [
    { label:'Vagas abertas',          value:'—', var:'', dir:0 },
    { label:'Tempo médio (dias)',      value:'—', var:'', dir:0 },
    { label:'Candidatos no funil',     value:'—', var:'', dir:0 },
    { label:'Taxa de aprovação',       value:'—', var:'', dir:0 },
    { label:'Ofertas aceitas',         value:'—', var:'', dir:0 },
    { label:'Custo por contratação',   value:'—', var:'', dir:0 },
  ],
  atestados: [
    { label:'Total de atestados',  value:'—', var:'', dir:0 },
    { label:'Pessoas afastadas',   value:'—', var:'', dir:0 },
    { label:'Dias perdidos',       value:'—', var:'', dir:0 },
    { label:'CIDs grupo F (%)',    value:'—', var:'', dir:0 },
    { label:'Recorrentes',         value:'—', var:'', dir:0 },
    { label:'Custo estimado',      value:'—', var:'', dir:0 },
  ],
  clima: [
    { label:'Nota média',         value:'—', var:'', dir:0 },
    { label:'Respondentes',       value:'—', var:'', dir:0 },
    { label:'Nota mínima',        value:'—', var:'', dir:0 },
    { label:'Nota máxima',        value:'—', var:'', dir:0 },
    { label:'Áreas avaliadas',    value:'—', var:'', dir:0 },
    { label:'Categorias',         value:'—', var:'', dir:0 },
  ],
  cotas: [
    { label:'Grupos mapeados',    value:'—', var:'', dir:0 },
    { label:'Total de registros', value:'—', var:'', dir:0 },
    { label:'Meta geral (%)',     value:'—', var:'', dir:0 },
    { label:'Áreas cobertas',     value:'—', var:'', dir:0 },
    { label:'Cumprimento médio',  value:'—', var:'', dir:0 },
    { label:'Alertas',            value:'—', var:'', dir:0 },
  ],
  movimentacoes: [
    { label:'Total movimentações',value:'—', var:'', dir:0 },
    { label:'Promoções',          value:'—', var:'', dir:0 },
    { label:'Transferências',     value:'—', var:'', dir:0 },
    { label:'Colaboradores',      value:'—', var:'', dir:0 },
    { label:'Áreas envolvidas',   value:'—', var:'', dir:0 },
    { label:'Tipos distintos',    value:'—', var:'', dir:0 },
  ],
  offboarding: [
    { label:'Desligamentos',         value:'—', var:'', dir:0 },
    { label:'Turnover voluntário',   value:'—', var:'', dir:0 },
    { label:'Posições críticas',     value:'—', var:'', dir:0 },
    { label:'Tempo médio de casa',   value:'—', var:'', dir:0 },
    { label:'Entrevistas de saída',  value:'—', var:'', dir:0 },
    { label:'Custo de reposição',    value:'—', var:'', dir:0 },
  ],
};

/* ═══════════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadSidebarState();
  initEventListeners();

  renderKPIs(currentCategory);
  renderCharts(currentCategory);
});

/* ═══════════════════════════════════════════
   EVENTOS
═══════════════════════════════════════════ */
function initEventListeners() {
  /* Tooltip CID Psiquiátrico — segue o card com label "CIDs" independente do slot */
  const cidTooltip = document.getElementById('cid-tooltip');
  if (cidTooltip) {
    document.addEventListener('mouseover', e => {
      const card = e.target.closest('.kpi-card');
      if (!card) return;
      const label = card.querySelector('.kpi-label')?.textContent || '';
      if (!label.includes('CID')) return;
      const rect = card.getBoundingClientRect();
      const ttW = 280;
      let left = rect.left + rect.width / 2 - ttW / 2;
      if (left + ttW > window.innerWidth - 8) left = window.innerWidth - ttW - 8;
      if (left < 8) left = 8;
      cidTooltip.style.left = left + 'px';
      cidTooltip.style.top = (rect.top - 8) + 'px';
      cidTooltip.style.transform = 'translateY(-100%)';
      cidTooltip.style.width = ttW + 'px';
      cidTooltip.classList.add('visible');
    });
    document.addEventListener('mouseout', e => {
      const card = e.target.closest('.kpi-card');
      if (!card) return;
      const label = card.querySelector('.kpi-label')?.textContent || '';
      if (label.includes('CID')) cidTooltip.classList.remove('visible');
    });
  }

  /* Tooltip Entrada no INSS — segue o card com label "INSS" */
  const inssTooltip = document.getElementById('inss-tooltip');
  if (inssTooltip) {
    document.addEventListener('mouseover', e => {
      const card = e.target.closest('.kpi-card');
      if (!card) return;
      const label = card.querySelector('.kpi-label')?.textContent || '';
      if (!label.includes('INSS')) return;
      const activeCat = document.querySelector('.category-section.active')?.id;
      if (activeCat !== 'atestados') return;
      const rect = card.getBoundingClientRect();
      const ttW = 280;
      let left = rect.left + rect.width / 2 - ttW / 2;
      if (left + ttW > window.innerWidth - 8) left = window.innerWidth - ttW - 8;
      if (left < 8) left = 8;
      inssTooltip.style.left = left + 'px';
      inssTooltip.style.top = (rect.top - 8) + 'px';
      inssTooltip.style.transform = 'translateY(-100%)';
      inssTooltip.style.width = ttW + 'px';
      inssTooltip.classList.add('visible');
    });
    document.addEventListener('mouseout', e => {
      const card = e.target.closest('.kpi-card');
      if (!card) return;
      if (card.querySelector('.kpi-label')?.textContent?.includes('INSS')) inssTooltip.classList.remove('visible');
    });
  }

  /* Tooltip Afastados no momento */
  const cardAfastados  = document.getElementById('card-afastados-agora');
  const afastTooltip   = document.getElementById('afastados-tooltip');
  if (cardAfastados && afastTooltip) {
    cardAfastados.addEventListener('mouseenter', () => {
      const activeCat = document.querySelector('.category-section.active')?.id;
      if (activeCat !== 'atestados') return;
      const rect = cardAfastados.getBoundingClientRect();
      const ttW  = 320;
      let left = rect.left + rect.width / 2 - ttW / 2;
      if (left + ttW > window.innerWidth - 8) left = window.innerWidth - ttW - 8;
      if (left < 8) left = 8;
      afastTooltip.style.left      = left + 'px';
      afastTooltip.style.top       = (rect.top - 8) + 'px';
      afastTooltip.style.transform = 'translateY(-100%)';
      afastTooltip.style.width     = ttW + 'px';
      afastTooltip.classList.add('visible');
    });
    cardAfastados.addEventListener('mouseleave', () => afastTooltip.classList.remove('visible'));
  }

  /* Upload R&S separado */
  // Upload R&S
  const rsUploadEl = document.getElementById('rs-file-upload');
  if (rsUploadEl) rsUploadEl.addEventListener('change', handleRsUpload);

  // Upload Período de Experiência — delegação para garantir que funcione independente de visibilidade
  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'pe-file-upload') handlePeUpload(e);
  });

  /* Também re-renderizar R&S ao trocar de aba para ela */

  /* Abrir e fechar sidebar */

document.getElementById('toggleSidebarMobile')
  .addEventListener('click', toggleSidebar);

  /* Navegação */
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchCategory(btn.dataset.category));
  });

  /* Filtros */
  document.getElementById('month-select').addEventListener('change', () => {
    renderKPIs(currentCategory);
    renderCharts(currentCategory);
    if (currentCategory === 'recrutamento') renderRS();
    if (currentCategory === 'periodoExperiencia') renderPE();
  });
  document.getElementById('area-select').addEventListener('change', () => {
    renderKPIs(currentCategory);
    renderCharts(currentCategory);
    if (currentCategory === 'recrutamento') renderRS();
    if (currentCategory === 'periodoExperiencia') renderPE();
  });

  /* Upload */
  document.getElementById('file-upload').addEventListener('change', handleUpload);

  /* Exportar */
  document.getElementById('exportBtn').addEventListener('click', exportData);

  /* Download modelo */
  document.getElementById('downloadTemplate').addEventListener('click', downloadTemplate);

  /* Limpar arquivo */
  document.getElementById('clearFile').addEventListener('click', clearData);

  /* Dark mode */
  document.getElementById('themeToggle').addEventListener('change', toggleTheme);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');

    sidebar.classList.toggle('collapsed');

    localStorage.setItem(
        'sidebarCollapsed',
        sidebar.classList.contains('collapsed')
    );
}

function loadSidebarState() {
    const collapsed =
        localStorage.getItem('sidebarCollapsed') === 'true';

    if (collapsed) {
        document.getElementById('sidebar')
            .classList.add('collapsed');
    }
}

/* ═══════════════════════════════════════════
   TEMA
═══════════════════════════════════════════ */
function toggleTheme() {
  const dark = document.getElementById('themeToggle').checked;
  document.body.classList.toggle('dark-mode', dark);
  localStorage.setItem('pc-theme', dark ? '1' : '0');
  // Recriar gráficos com cores atualizadas
  destroyCharts();
renderKPIs(currentCategory);
renderCharts(currentCategory);
}
function loadTheme() {
  const dark = localStorage.getItem('pc-theme') === '1';
  document.getElementById('themeToggle').checked = dark;
  document.body.classList.toggle('dark-mode', dark);
}

/* ═══════════════════════════════════════════
   NAVEGAÇÃO
═══════════════════════════════════════════ */
function switchCategory(cat) {
  currentCategory = cat;

  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.category === cat);
  });
  document.querySelectorAll('.category-section').forEach(s => s.classList.remove('active'));
  document.getElementById(cat).classList.add('active');

  // "Report Semanal" só fica visível no sidebar quando se está em
  // Recrutamento & Seleção ou já dentro do próprio Report Semanal
  const navReportSemanal = document.getElementById('navReportSemanal');
  if (navReportSemanal) {
    navReportSemanal.style.display = (cat === 'recrutamento' || cat === 'reportSemanal') ? 'flex' : 'none';
  }

  const subtitles = {
    dashboard:     'Visão geral dos principais indicadores de gestão de pessoas',
    atestados:     'Indicadores de absenteísmo e afastamentos médicos',
    clima:         'Índice de clima organizacional por área',
    cotas:         'Acompanhamento de diversidade e cotas',
    movimentacoes: 'Histórico de movimentações e promoções internas',
    offboarding:   'Indicadores de desligamento e turnover',
    recrutamento:  'Pipeline de vagas e métricas de Recrutamento & Seleção',
    reportSemanal:        'Resumo semanal de Recrutamento & Seleção',
    atingimentoMetas:     'Acompanhamento do atingimento de metas da área',
    periodoExperiencia:   'Indicadores de período de experiência dos colaboradores',
  };
  document.getElementById('headerSubtitle').textContent = subtitles[cat] || '';

  destroyCharts();
  renderKPIs(cat);
  renderCharts(cat);
  if (cat === 'recrutamento' && rsData.length) renderRS();
  if (cat === 'periodoExperiencia' && peData.length) renderPE();

  // Hero subtitle with key number for current category
  const heroSub = document.getElementById('headerSubtitle');
  if (heroSub) {
    const mesSel = document.getElementById('month-select').value;
    const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const mesLabel = mesSel ? MESES_LABEL[parseInt(mesSel)-1] : 'Acumulado';
    const mesRef = mesSel || String(new Date().getMonth()+1).padStart(2,'0');
    const subtitles = {
      dashboard:      'Visão geral dos principais indicadores de gestão de pessoas',
      atestados:      hasRealData ? `${allData.filter(d=>d.Tipo==='Atestado'&&(!mesSel||d.Mes===mesSel)).length} atestados registrados — ${mesLabel}` : 'Indicadores de saúde e absenteísmo',
      clima:          climaData.length ? `${climaData.filter(r=>r.mes===mesRef&&r.criticidade==='Alto').length} áreas em criticidade Alta — ${mesLabel}` : 'Índice de clima organizacional por área',
      movimentacoes:  movimentData.length ? `${movimentData.filter(r=>!mesSel||r.mes===mesSel).length} movimentações — ${mesLabel}` : 'Histórico de movimentações e promoções internas',
      offboarding:    offboardingData.length ? `${offboardingData.filter(r=>!mesSel||r.mes===mesSel).length} desligamentos — ${mesLabel}` : 'Análise de desligamentos e turnover',
      recrutamento:   rsData.length ? `${rsData.filter(r=>!mesSel||String(r.dataAbertura?new Date((r.dataAbertura-25569)*86400000).getUTCMonth()+1:'').padStart?'':String(new Date((r.dataAbertura-25569)*86400000).getUTCMonth()+1).padStart(2,'0')===mesSel).length} vagas abertas` : 'Pipeline de vagas e métricas de Recrutamento & Seleção',
      cotas:          'Acompanhamento de cotas PCD e Jovem Aprendiz',
      reportSemanal:        'Resumo semanal de Recrutamento & Seleção',
      atingimentoMetas:     'Acompanhamento do atingimento de metas da área',
      periodoExperiencia:   'Indicadores de período de experiência dos colaboradores',
    };
    heroSub.textContent = subtitles[cat] || '';
  }
}

/* ═══════════════════════════════════════════
   UPLOAD
═══════════════════════════════════════════ */
function handleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = ev => {
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });

      console.log('Abas encontradas:', wb.SheetNames);

      /* ── ABA ATESTADO ── */
      const wsAtestado = wb.Sheets['Atestado'];
      allData = [];
      if (wsAtestado) {
        const rawAtestado = XLSX.utils.sheet_to_json(wsAtestado, { defval: '' });
        const rawAtestadoArr = XLSX.utils.sheet_to_json(wsAtestado, { header: 1, defval: '' });
        const cabecalho = rawAtestadoArr[0] || [];
        const nomeColK  = String(cabecalho[10] || '').trim(); // CID (col K)
        const nomeColH  = String(cabecalho[7]  || '').trim(); // Dias afastamento (col H)
        const nomeColJ  = String(cabecalho[9]  || '').trim(); // Tipo/Doença (col J)
        const nomeColF  = String(cabecalho[5]  || '').trim(); // Data início afastamento (col F)
        const nomeColG  = String(cabecalho[6]  || '').trim(); // Data fim afastamento (col G)

        // Helper para converter data Excel (serial ou string) para Date
        const toDate = v => {
          if (!v && v !== 0) return null;
          if (typeof v === 'number') return excelDateToJS(v);
          const d = new Date(v);
          return isNaN(d) ? null : d;
        };

        allData = rawAtestado.map(r => {
          const out = {};
          Object.keys(r).forEach(k => {
            const nk = k === 'Mês de Referência' ? 'Mes'
                     : k === 'DESCRIÇÃO CENTRO DE CUSTO' ? 'Area'
                     : k === 'DESCRIÇÃO CARGO' ? 'Cargo'
                     : k;
            out[nk] = r[k];
          });
          if (r['NOME'])            out.Nome  = r['NOME'];
          if (r['DESCRIÇÃO CARGO']) out.Cargo = r['DESCRIÇÃO CARGO'];
          if (nomeColK && r[nomeColK] !== undefined) out.CID = String(r[nomeColK]).trim();
          // Coluna H — dias de afastamento
          if (nomeColH && r[nomeColH] !== undefined) out.DiasAfastamento = Number(r[nomeColH]) || 0;
          else out.DiasAfastamento = Number(r['DIAS DE AFASTAMENTO'] || 0);
          // Coluna J — tipo (doença, acidente, etc.)
          if (nomeColJ && r[nomeColJ] !== undefined) out.TipoAfastamento = String(r[nomeColJ]).trim();
          // Coluna F — data início afastamento
          const rawF = nomeColF ? r[nomeColF] : (r['DATA INÍCIO AFASTAMENTO'] || r['DATA INICIO AFASTAMENTO'] || null);
          out.DtInicioAfast = toDate(rawF);
          // Coluna G — data fim afastamento
          const rawG = nomeColG ? r[nomeColG] : (r['DATA FIM AFASTAMENTO'] || null);
          out.DtFimAfast = toDate(rawG);
          out.Tipo = 'Atestado';
          out.Mes  = getMesReferencia(out);
          return out;
        });
      }

      /* ── ABA HEADCOUNT ── */
      // Linha 1 = mês de referência, Linha 4 = headcount
      // sheet_to_json com header:1 retorna arrays por linha (0-indexed: idx 0 = linha 1, idx 3 = linha 4)
      headcountData = [];
      const wsHC = wb.Sheets['Headcount'];
      if (wsHC) {
        const rawHC = XLSX.utils.sheet_to_json(wsHC, { header: 1, defval: '' });
        // rawHC[0]=linha1(meses), rawHC[1]=linha2(inicio), rawHC[2]=linha3(fim), rawHC[3]=linha4(media/total)
        if (rawHC.length >= 1) {
          const linMes   = rawHC[0] || [];
          const linIni   = rawHC[1] || [];
          const linFim   = rawHC[2] || [];
          const linMedia = rawHC[3] || [];
          const maxCol   = linMes.length;
          const mesesMap = {
            jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',
            jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12',
            janeiro:'01',fevereiro:'02',março:'03',marco:'03',abril:'04',
            maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',
            outubro:'10',novembro:'11',dezembro:'12'
          };
          for (let c = 0; c < maxCol; c++) {
            const mesRaw = String(linMes[c] || '').trim();
            if (!mesRaw) continue;
            let mesNum = null;
            const mesLower = mesRaw.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
              .replace(/[^a-z0-9]/g,'');
            mesNum = mesesMap[mesLower] || null;
            if (!mesNum && /^\d{1,2}$/.test(mesRaw)) mesNum = mesRaw.padStart(2,'0');
            if (!mesNum && typeof linMes[c] === 'number') {
              const dt = excelDateToJS(linMes[c]);
              if (dt) mesNum = String(dt.getMonth() + 1).padStart(2,'0');
            }
            if (!mesNum) continue;
            const valMedia = linMedia[c] !== '' && linMedia[c] !== undefined ? Number(linMedia[c]) : null;
            const valIni   = linIni[c]   !== '' && linIni[c]   !== undefined ? Number(linIni[c])   : null;
            const valFim   = linFim[c]   !== '' && linFim[c]   !== undefined ? Number(linFim[c])   : null;
            headcountData.push({ mes: mesNum, valor: valMedia, inicio: valIni, fim: valFim });
          }
        }
      }

      /* ── ABA ADMISSÕES ── */
      // Col A = nome/registro, Col F (índice 5) = mês de referência
      admissoesData = [];
      const wsAdm = wb.Sheets['Admissões'] || wb.Sheets['Admissoes'];
      if (wsAdm) {
        const rawAdm = XLSX.utils.sheet_to_json(wsAdm, { header: 1, defval: '' });
        for (let r = 1; r < rawAdm.length; r++) { // pula cabeçalho
          const row   = rawAdm[r];
          const colA  = String(row[0] || '').trim();
          const colF  = String(row[5] || '').trim();
          if (!colA) continue;
          const mesNum = normalizarMes(colF, row[5]);
          admissoesData.push({ nome: colA, mes: mesNum });
        }
      }

      /* ── ABA OFFBOARDING ── */
      // Col A = nome/registro, Col E (índice 4) = mês de referência
      offboardingData = [];
      const wsOff = wb.Sheets['Offboarding'];
      if (wsOff) {
        const rawOff = XLSX.utils.sheet_to_json(wsOff, { header: 1, defval: '' });
        // Colunas: A(0)=Nome, B(1)=Área, C(2)=Gestor, D(3)=Cargo, E(4)=Classificação,
        //          F(5)=Dias Trabalhados, G(6)=Vol|Invol, H(7)=Motivo, I(8)=Mês Ref,
        //          J(9)=Offboarding|Período Exp, K(10)=DtAdm, L(11)=DtDem
        for (let r = 1; r < rawOff.length; r++) {
          const row  = rawOff[r];
          const nome = String(row[0] || '').trim();
          if (!nome) continue;
          const mesNum   = normalizarMes(String(row[8]||'').trim(), row[8]);
          const diasTrab = row[5] !== '' && !isNaN(Number(row[5])) ? Number(row[5]) : null;
          const tempoCasa = diasTrab !== null ? Math.round(diasTrab / 365 * 10) / 10 : null;
          offboardingData.push({
            nome,
            area:           String(row[1]  || '').trim(),
            gestor:         String(row[2]  || '').trim(),
            cargo:          String(row[3]  || '').trim(),
            classificacao:  String(row[4]  || '').trim(),
            diasTrabalhados: diasTrab,
            tempoCasa,
            tipo:    String(row[6]  || '').trim(), // Voluntário | Involuntário
            motivo:  String(row[7]  || '').trim(), // Motivo Rescisão
            mes:     mesNum,
            periodo: String(row[9]  || '').trim(), // Offboarding | Período de Experiência
            dtAdm:   row[10] || null,
            dtDem:   row[11] || null,
          });
        }
        console.log('[OFF] Registros:', offboardingData.length, '| Amostra:', offboardingData[0]);
      }

      /* ── ABA COTAS PCD ── */
      // Linha 1: meses | Linha 2: ativos | Linha 3: cotaMin(%) | Linha 5: cotaAtual | Linha 6: contratar
      cotasPcdData = [];
      const wsPcd = wb.Sheets['Cotas (PCD)'];
      console.log('[UPLOAD] Abas encontradas:', wb.SheetNames);
      console.log('[UPLOAD] wsPcd:', wsPcd ? 'encontrada' : 'NÃO encontrada');
      if (wsPcd) {
        const rawPcd = XLSX.utils.sheet_to_json(wsPcd, { header: 1, defval: '' });
        // Linha 1(idx0)=meses, Linha 2(idx1)=ativos, Linha 3(idx2)=cotaMin,
        // Linha 4(idx3)=cotaAtual(%), Linha 5(idx4)=contratar
        const pcdMes      = rawPcd[0] || [];
        const pcdCotaMin  = rawPcd[2] || [];
        const pcdCotaAtual= rawPcd[3] || [];
        const pcdContratar= rawPcd[4] || [];
        for (let c = 0; c < pcdMes.length; c++) {
          const mesRaw = String(pcdMes[c] || '').trim();
          if (!mesRaw) continue;
          const mesNum = normalizarMes(mesRaw, pcdMes[c]);
          if (!mesNum) continue;
          const contratar = pcdContratar[c] !== '' && pcdContratar[c] !== undefined
            ? Number(pcdContratar[c]) : null;
          if (contratar === null) continue;
          cotasPcdData.push({
            mes:       mesNum,
            cotaMin:   Number(pcdCotaMin[c])   || 0,
            cotaAtual: Number(pcdCotaAtual[c]) || 0,
            contratar: contratar,
          });
        }
      }

      /* ── ABA COTAS JA ── */
      // Linha 1(idx0)=meses, Linha 2(idx1)=ativos, Linha 3(idx2)=cotaMin,
      // Linha 4(idx3)=cotaMax, Linha 5(idx4)=cotaAtual, Linha 6(idx5)=contratar
      cotasJaData = [];
      const wsJa = wb.Sheets['Cotas (JA)'];
      console.log('[UPLOAD] wsJa:', wsJa ? 'encontrada' : 'NÃO encontrada');
      console.log('[UPLOAD] cotasPcdData após parse:', cotasPcdData);
      if (wsJa) {
        const rawJa = XLSX.utils.sheet_to_json(wsJa, { header: 1, defval: '' });
        const jaMes       = rawJa[0] || [];
        const jaMin       = rawJa[2] || [];
        const jaCotaAtual = rawJa[4] || [];
        const jaContratar = rawJa[5] || [];
        for (let c = 0; c < jaMes.length; c++) {
          const mesRaw = String(jaMes[c] || '').trim();
          if (!mesRaw) continue;
          const mesNum = normalizarMes(mesRaw, jaMes[c]);
          if (!mesNum) continue;
          const contratar = jaContratar[c] !== '' && jaContratar[c] !== undefined
            ? Number(jaContratar[c]) : null;
          if (contratar === null) continue;
          cotasJaData.push({
            mes:       mesNum,
            cotaMin:   Number(jaMin[c])        || 0,
            cotaAtual: Number(jaCotaAtual[c])  || 0,
            contratar: contratar,
          });
        }
      }

      /* ── ABA CLIMA DAS ÁREAS ── */
      climaData = [];
      const wsClima = wb.Sheets['Clima das Áreas'] || wb.Sheets['Clima das Areas'] || wb.Sheets['Clima'];
      if (wsClima) {
        const rawClima = XLSX.utils.sheet_to_json(wsClima, { header: 1, defval: '' });
        // Linha 0 = cabeçalho: [Mês, Área, área1, área2, ...]
        const cabClima = rawClima[0] || [];
        const AREAS_CLIMA = cabClima.slice(2).map(a => String(a).trim()).filter(Boolean);
        const MESES_PT = {
          'janeiro':'01','fevereiro':'02','março':'03','marco':'03',
          'abril':'04','maio':'05','junho':'06','julho':'07',
          'agosto':'08','setembro':'09','outubro':'10','novembro':'11','dezembro':'12'
        };
        // Estrutura real: col0=Mês (preenchido em TODAS as linhas), col1=Métrica, col2..N=áreas
        // Cada mês tem 4 linhas: Criticidade Geral, Banco de Horas TT, Número de Pessoas, Horas por Pessoa
        const normStr = s => String(s||'').trim().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g,'');

        const parseHoras = (v) => {
          if (v === '' || v === undefined || v === null) return null;
          const n = Number(v);
          if (isNaN(n)) return null;
          // SheetJS lê tempo [h]:mm do Excel como fração de dia (ex: 8h30 = 0.354)
          if (n > 0 && n < 5 && !Number.isInteger(n)) return Math.round(n * 24 * 100) / 100;
          return n;
        };

        // Agrupa todas as linhas por mês + métrica
        const blocos = {}; // { 'janeiro': { criticidade: row, bancohoras: row, ... } }
        for (let i = 1; i < rawClima.length; i++) {
          const row     = rawClima[i] || [];
          const mesRaw  = String(row[0] || '').trim();
          const metrica = normStr(row[1]);
          if (!mesRaw || !metrica) continue;

          const mesKey = normStr(mesRaw);
          if (!blocos[mesKey]) blocos[mesKey] = { mesNome: mesRaw, mesNum: MESES_PT[mesKey] || null };

          if      (metrica.includes('criticidade'))                                   blocos[mesKey].criticidade   = row;
          else if (metrica.includes('banco'))                                          blocos[mesKey].bancohoras    = row;
          else if (metrica.includes('numero') || metrica.includes('pessoas'))         blocos[mesKey].pessoas       = row;
          else if (metrica.includes('hora') && metrica.includes('pessoa'))            blocos[mesKey].horasPorPessoa= row;
        }

        // Gera climaData a partir dos blocos
        Object.values(blocos).forEach(b => {
          if (!b.mesNum) return;
          AREAS_CLIMA.forEach((area, ai) => {
            const col   = ai + 2;
            const crit  = String((b.criticidade||[])[col] || '').trim();
            const horas = parseHoras((b.bancohoras||[])[col]);
            const rawP  = (b.pessoas||[])[col];
            const pess  = rawP !== '' && rawP !== undefined && !isNaN(Number(rawP)) ? Number(rawP) : null;
            const hpp   = parseHoras((b.horasPorPessoa||[])[col]);
            climaData.push({ mes: b.mesNum, mesNome: b.mesNome, area,
              criticidade: crit, bancohoras: horas, pessoas: pess, horasPorPessoa: hpp });
          });
        });
        console.log('[CLIMA] Registros parseados:', climaData.length);
        console.log('[CLIMA] Amostra raw row1 (Banco de Horas):', rawClima[1]);
        console.log('[CLIMA] Primeiros registros:', climaData.slice(0,4).map(r=>({area:r.area,mes:r.mes,bancohoras:r.bancohoras,hpp:r.horasPorPessoa})));
      }

      /* ── ABA MOVIMENTAÇÕES INTERNAS ── */
      movimentData = [];
      const wsMovim = wb.Sheets['Movimentações Internas'] || wb.Sheets['Movimentacoes Internas']
                   || wb.Sheets['Movimentações'] || wb.Sheets['Movimentacoes'];
      if (wsMovim) {
        const rawMovim = XLSX.utils.sheet_to_json(wsMovim, { header: 1, defval: '' });
        // Linha 0 = cabeçalho: NOME, CENTRO CUSTO ATUAL, NOVO CENTRO DE CUSTO, ÁREA ATUAL,
        //   NOVA ÁREA, DIRETORIA ATUAL, NOVA DIRETORIA, GESTOR ATUAL, NOVO GESTOR,
        //   CARGO ATUAL, NOVO CARGO, MOTIVO GERAL, MOTIVO, MÊS DE REF.
        const MESES_MAP_MOV = {
          'janeiro':'01','fevereiro':'02','março':'03','marco':'03','abril':'04',
          'maio':'05','junho':'06','julho':'07','agosto':'08','setembro':'09',
          'outubro':'10','novembro':'11','dezembro':'12'
        };
        const normMesMovim = v => {
          if (!v && v !== 0) return null;
          if (typeof v === 'number') {
            const dt = excelDateToJS(v);
            if (dt) return String(dt.getMonth()+1).padStart(2,'0');
            if (v >= 1 && v <= 12) return String(Math.round(v)).padStart(2,'0');
          }
          const s = String(v).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
          return MESES_MAP_MOV[s] || (s.match(/^\d{1,2}$/) ? s.padStart(2,'0') : null);
        };
        for (let r = 1; r < rawMovim.length; r++) {
          const row = rawMovim[r];
          const nome = String(row[0]||'').trim();
          if (!nome) continue;
          movimentData.push({
            nome,
            ccAtual:       String(row[1]||'').trim(),
            ccNovo:        String(row[2]||'').trim(),
            areaAtual:     String(row[3]||'').trim(),
            areaNova:      String(row[4]||'').trim(),
            dirAtual:      String(row[5]||'').trim(),
            dirNova:       String(row[6]||'').trim(),
            gestorAtual:   String(row[7]||'').trim(),
            gestorNovo:    String(row[8]||'').trim(),
            cargoAtual:    String(row[9]||'').trim(),
            cargoNovo:     String(row[10]||'').trim(),
            motivoGeral:   String(row[11]||'').trim(),
            motivo:        String(row[12]||'').trim(),
            mes:           normMesMovim(row[13]),
          });
        }
        console.log('[MOVIM] Registros:', movimentData.length, '| Amostra:', movimentData[0]);
      }

      /* ── ABA ATIVOS ── */
      ativosData = [];
      const wsAtivos = wb.Sheets['Ativos'];
      if (wsAtivos) {
        const rawAtivos = XLSX.utils.sheet_to_json(wsAtivos, { defval: '' });
        ativosData = rawAtivos.map(r => {
          // Salário: Excel pode entregar número nativo (float) ou string formatada
          const salRawVal = r['SALARIO'] || r['SALÁRIO'] || '';
          let salario = 0;
          if (typeof salRawVal === 'number') {
            salario = salRawVal; // já é número — usa direto
          } else {
            // String: remove R$, espaços, pontos de milhar, troca vírgula decimal por ponto
            const salStr = String(salRawVal).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
            salario = parseFloat(salStr) || 0;
          }
          // Data admissão (pode ser serial Excel ou string)
          let dtAdm = null;
          const admRaw = r['ADMISSAO'] || r['ADMISSÃO'] || r['ADMISSAO   '] || r['ADMISSÃO   '];
          if (typeof admRaw === 'number') dtAdm = excelDateToJS(admRaw);
          else if (admRaw) { const p = new Date(admRaw); if (!isNaN(p)) dtAdm = p; }
          // Fim de experiência
          let dtFimExp = null;
          const fimExpRaw = r['DATA FIM DA EXPERIENCIA'] || r['DATA FIM DA EXPERIÊNCIA'] || r['DATA FIM DA EXPERIENCIA   '];
          if (typeof fimExpRaw === 'number') dtFimExp = excelDateToJS(fimExpRaw);
          else if (fimExpRaw) { const p = new Date(fimExpRaw); if (!isNaN(p)) dtFimExp = p; }
          // Dias de experiência
          const diasExp = parseInt(r['DIAS DE EXPERIENCIA'] || r['DIAS DE EXPERIÊNCIA'] || 0) || 0;
          return {
            empresa:      String(r['EMPRESA']             || '').trim(),
            area:         String(r['ÁREA']  || r['AREA']  || '').trim(),
            gestor:       String(r['GESTOR']              || '').trim(),
            diretoria:    String(r['DIRETORIA']           || '').trim(),
            nome:         String(r['NOME COLABORADOR']    || '').trim(),
            matricula:    String(r['MATRICULA '] || r['MATRICULA'] || '').trim(),
            genero:       String(r['GENERO'] || r['GÊNERO'] || '').trim(),
            sexo:         String(r['SEXO'] || r['SEXO       '] || '').trim(),
            raca:         String(r['RAÇA COR'] || r['RACA COR'] || '').trim(),
            estado:       String(r['RES_ESTADO '] || r['RES_ESTADO'] || '').trim(),
            cidade:       String(r['RES_CIDADE '] || r['RES_CIDADE'] || '').trim(),
            classificacao:String(r['CLASSIFICAÇÃO'] || r['CLASSIFICACAO'] || '').trim(),
            cargo:        String(r['CARGO']               || '').trim(),
            salario,
            diasExp,
            dtAdm,
            dtFimExp,
          };
        }).filter(r => r.nome); // só linhas com nome preenchido
        console.log('[ATIVOS] Registros:', ativosData.length, '| Amostra:', ativosData[0]);
      }

      hasRealData = true;
      console.log('[UPLOAD] cotasJaData após parse:', cotasJaData);

      document.getElementById('fileNameBadge').textContent = file.name;
      document.getElementById('fileBadge').style.display = 'flex';
      document.getElementById('lastUpdate').textContent =
        new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

      const areas = [...new Set(allData.map(d => d.Area).filter(Boolean))].sort();
      const sel = document.getElementById('area-select');
      sel.innerHTML = '<option value="">Todas as áreas</option>';
      areas.forEach(a => { sel.innerHTML += `<option value="${a}">${a}</option>`; });

      destroyCharts();
      renderKPIs(currentCategory);
      renderCharts(currentCategory);

      toast('Planilha importada com sucesso!', 'success');

    } catch (err) {
      console.error(err);
      toast('Erro ao processar o arquivo.', 'error');
    }
  };

  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

/* Normaliza mês a partir de string ou serial Excel */
function normalizarMes(strVal, rawVal) {
  const mesesMap = {
    jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',
    jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12',
    janeiro:'01',fevereiro:'02',março:'03',marco:'03',abril:'04',
    maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',
    outubro:'10',novembro:'11',dezembro:'12'
  };
  const s = strVal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  if (mesesMap[s]) return mesesMap[s];
  if (/^\d{1,2}$/.test(strVal)) return strVal.padStart(2,'0');
  if (typeof rawVal === 'number') {
    const dt = excelDateToJS(rawVal);
    if (dt) return String(dt.getMonth() + 1).padStart(2,'0');
  }
  return null;
}

/* ═══════════════════════════════════════════
   UPLOAD R&S (planilha separada)
═══════════════════════════════════════════ */
function handleRsUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
      const ws = wb.Sheets['Controle de Vagas 2026'];
      if (!ws) {
        toast('Aba "Controle de Vagas 2026" não encontrada. Abas: ' + wb.SheetNames.join(', '), 'error');
        return;
      }

      // Usar header:1 para acessar por índice de coluna (A=0, B=1 ... W=22, X=23 ...)
      const rawArr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rawArr.length < 2) { toast('Aba R&S vazia.', 'error'); return; }

      // Pular linha de cabeçalho (idx 0), processar a partir da linha 1
      rsData = rawArr.slice(1).map(row => ({
        dataAbertura:   row[22],  // W
        dataFechamento: row[23],  // X
        mesFechamento:  row[24],  // Y - número do mês
        sla:            row[25],  // Z
        status:         String(row[26] || '').trim().toLowerCase(), // AA
        declinio:       row[27],  // AB
        mesDeclinio:    row[28],  // AC
        area:           String(row[2]  || '').trim(), // C
        cargo:          String(row[6]  || '').trim(), // G
        nivel:          String(row[8]  || '').trim(), // I
        peso:           row[9],   // J
        salario:        Number(row[17]) || 0,         // R
        gestor:         String(row[5]  || '').trim(), // F
        recrutador:     String(row[21] || '').trim(), // V
        ttf:            row[31] !== '' && row[31] !== 0 && !isNaN(Number(row[31])) && Number(row[31]) > 0 ? Number(row[31]) : null, // AF
        tts:            row[32] !== '' && row[32] !== 0 && !isNaN(Number(row[32])) && Number(row[32]) > 0 ? Number(row[32]) : null, // AG
        fonte:          String(row[33] || '').trim(), // AH
      })).filter(r => r.dataAbertura !== '' || r.status !== '');

      console.log('[RS] Linhas importadas:', rsData.length);
      console.log('[RS] Amostra:', rsData[0]);

      document.getElementById('rsFileBadgeText').textContent = file.name;
      document.getElementById('rsClearBtn').style.display = 'inline-flex';
      document.getElementById('emptyRecrutamento').style.display  = 'none';
      document.getElementById('chartsRecrutamento').style.display = 'block';

      renderRS();
      toast('Planilha R&S importada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      toast('Erro ao processar planilha R&S: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

function clearRsData() {
  rsData = [];
  document.getElementById('rsFileBadgeText').textContent = '';
  document.getElementById('rsClearBtn').style.display = 'none';
  document.getElementById('emptyRecrutamento').style.display  = 'flex';
  document.getElementById('chartsRecrutamento').style.display = 'none';
  if (window._rsChartEvol)   { window._rsChartEvol.destroy();   window._rsChartEvol   = null; }
  if (window._rsChartStatus) { window._rsChartStatus.destroy(); window._rsChartStatus = null; }
  if (window._rsChartNivel)  { window._rsChartNivel.destroy();  window._rsChartNivel  = null; }
  if (window._rsChartRec)    { window._rsChartRec.destroy();    window._rsChartRec    = null; }
  if (window._rsChartFontes) { window._rsChartFontes.destroy(); window._rsChartFontes = null; }
}

/* ── PERÍODO DE EXPERIÊNCIA — upload ── */
function handlePeUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      console.log('[PE] Iniciando leitura...');
      const data = new Uint8Array(ev.target.result);
      console.log('[PE] Bytes lidos:', data.length);

      let wb;
      try {
        wb = XLSX.read(data, { type: 'array' });
        console.log('[PE] Abas encontradas:', wb.SheetNames);
      } catch(e2) {
        console.error('[PE] Erro ao ler workbook:', e2);
        toast('Erro ao abrir o arquivo Excel: ' + e2.message, 'error');
        return;
      }

      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        toast('Aba não encontrada. Abas: ' + wb.SheetNames.join(', '), 'error');
        return;
      }

      let rawArr;
      try {
        rawArr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        console.log('[PE] Linhas lidas:', rawArr.length, '| Linha 1:', rawArr[0]);
      } catch(e3) {
        console.error('[PE] Erro ao parsear aba:', e3);
        toast('Erro ao ler conteúdo da planilha: ' + e3.message, 'error');
        return;
      }

      if (rawArr.length < 2) {
        toast('A planilha está vazia ou tem apenas cabeçalho.', 'error');
        return;
      }

      const toDate = v => {
        if (!v && v !== 0) return null;
        if (typeof v === 'number') {
          const d = new Date((v - 25569) * 86400 * 1000);
          return isNaN(d) ? null : d;
        }
        const d = new Date(v);
        return isNaN(d) ? null : d;
      };

      peData = rawArr.slice(1).map((row, i) => {
        try {
          return {
            categoria:  String(row[0]  || '').trim(),
            nome:       String(row[1]  || '').trim(),
            cargo:      String(row[2]  || '').trim(),
            time:       String(row[3]  || '').trim(),
            gestor:     String(row[4]  || '').trim(),
            dtAdmissao: toDate(row[5]),
            decisao45:  String(row[8]  || '').trim(),
            farol45:    String(row[9]  || '').trim(),
            resposta45: String(row[10] || '').trim(),
            decisao90:  String(row[13] || '').trim(),
            farol90:    String(row[14] || '').trim(),
            resposta90: String(row[15] || '').trim(),
          };
        } catch(eRow) {
          console.warn('[PE] Erro na linha', i+2, eRow);
          return null;
        }
      }).filter(r => r && r.nome !== '');

      console.log('[PE] Registros importados:', peData.length);
      if (peData[0]) console.log('[PE] Amostra:', peData[0]);
      console.log('[PE] resposta45:', peData.slice(0,3).map(r => JSON.stringify(r.resposta45)));
      console.log('[PE] resposta90:', peData.slice(0,3).map(r => JSON.stringify(r.resposta90)));
      console.log('[PE] Row[10] raw:', rawArr.slice(1,4).map(row => row[10]));
      console.log('[PE] Row[15] raw:', rawArr.slice(1,4).map(row => row[15]));

      document.getElementById('peFileBadgeText').textContent = file.name;
      document.getElementById('peClearBtn').style.display = 'inline-flex';
      document.getElementById('emptyPeriodoExperiencia').style.display  = 'none';
      document.getElementById('chartsPeriodoExperiencia').style.display = 'block';

      renderPE();
      toast('Planilha importada com sucesso! ' + peData.length + ' colaboradores.', 'success');
    } catch (err) {
      console.error('[PE] Erro geral:', err);
      toast('Erro ao processar planilha: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

function clearPeData() {
  peData = [];
  document.getElementById('peFileBadgeText').textContent = '';
  document.getElementById('peClearBtn').style.display = 'none';
  document.getElementById('emptyPeriodoExperiencia').style.display  = 'flex';
  document.getElementById('chartsPeriodoExperiencia').style.display = 'none';
  if (window._peChartDecisao45) { window._peChartDecisao45.destroy(); window._peChartDecisao45 = null; }
  if (window._peChartDecisao90) { window._peChartDecisao90.destroy(); window._peChartDecisao90 = null; }
  if (window._peChartArea)      { window._peChartArea.destroy();      window._peChartArea      = null; }
}

/* ═══════════════════════════════════════════
   PERÍODO DE EXPERIÊNCIA — render
═══════════════════════════════════════════ */
function renderPE() {
  if (!peData.length) return;

  const t = chartTheme();
  const mesSel = document.getElementById('month-select')?.value || '';
  const hoje = new Date();
  const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Normaliza a coluna A (Categoria): "45", "90" ou "Encerrado"
  const norm = s => String(s || '').trim().toLowerCase();

  let base45 = peData.filter(r => norm(r.categoria) === '45');
  let base90 = peData.filter(r => norm(r.categoria) === '90');
  let subLabel;

  if (mesSel) {
    // Mês selecionado: filtra ainda pela data de admissão dentro do mês
    const anoRef = hoje.getFullYear();
    const mesRefNum = parseInt(mesSel);
    const mesLabel = MESES_LABEL[mesRefNum - 1];

    const noMes = r => r.dtAdmissao && r.dtAdmissao.getFullYear() === anoRef && (r.dtAdmissao.getMonth() + 1) === mesRefNum;
    base45 = base45.filter(noMes);
    base90 = base90.filter(noMes);

    subLabel = `Referência: ${mesLabel}/${anoRef}`;
  } else {
    subLabel = 'Todos os registros importados';
  }

  const noPeriodo45 = base45;
  const noPeriodo90 = base90;

  document.getElementById('peCount45').textContent = noPeriodo45.length;
  document.getElementById('peCount90').textContent = noPeriodo90.length;
  document.getElementById('peLabel45Sub').textContent = subLabel;
  document.getElementById('peLabel90Sub').textContent = subLabel;

  window._peLists = { '45': noPeriodo45, '90': noPeriodo90 };

  // ── Dados para os GRÁFICOS de decisão ──
  // Sem mês selecionado: mostra o geral de TODAS as decisões já registradas
  // (independente da categoria atual — ex: quem já decidiu em 45 dias mas
  // hoje está em "90" ou "Encerrado" ainda entra no gráfico de 45 dias).
  // Com mês selecionado: usa a mesma base filtrada dos cards (noPeriodo45/90).
  let dadosGrafico45, dadosGrafico90;
  if (mesSel) {
    dadosGrafico45 = noPeriodo45;
    dadosGrafico90 = noPeriodo90;
  } else {
    dadosGrafico45 = peData.filter(r => String(r.decisao45 || '').trim() !== '');
    dadosGrafico90 = peData.filter(r => String(r.decisao90 || '').trim() !== '');
  }

  // ── Opções compartilhadas para os roscas com % no tooltip ──
  const donutOpts = (labels, t) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: t.tick, font:{size:11}, padding:12, usePointStyle:true, boxWidth:8 } },
      tooltip: {
        backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick,
        borderWidth:1, borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)',
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((s,v) => s+v, 0);
            const pct = total ? ((ctx.raw/total)*100).toFixed(1) : 0;
            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
          }
        }
      }
    }
  });

  const CORES_DECISAO = ['#107c10','#e81123','#ffb900','#0078d4','#7030a0'];
  const normDec = s => String(s||'').trim().toLowerCase();
  const corDecisao = label => {
    const n = normDec(label);
    if (n.includes('efetiv')) return '#107c10';
    if (n.includes('deslig')) return '#e81123';
    if (n.includes('prorrog')) return '#ffb900';
    return '#0078d4';
  };

  // ── Gráfico Decisão 45 dias ──
  const decMap45 = {};
  dadosGrafico45.forEach(r => {
    const d = r.decisao45 || 'Não informado';
    decMap45[d] = (decMap45[d]||0)+1;
  });
  const dec45Labels = Object.keys(decMap45);
  const dec45Values = dec45Labels.map(k => decMap45[k]);
  const dec45Cores  = dec45Labels.map(corDecisao);

  if (window._peChartDecisao45) window._peChartDecisao45.destroy();
  const ctx45 = document.getElementById('chartPeDecisao45');
  if (ctx45) {
    window._peChartDecisao45 = new Chart(ctx45, {
      type: 'doughnut',
      data: { labels: dec45Labels, datasets: [{ data: dec45Values, backgroundColor: dec45Cores, borderWidth: 2, borderColor: isDark()?'#1e2535':'#fff' }] },
      options: donutOpts(dec45Labels, t)
    });
  }

  // ── Gráfico Decisão 90 dias ──
  const decMap90 = {};
  dadosGrafico90.forEach(r => {
    const d = r.decisao90 || 'Não informado';
    decMap90[d] = (decMap90[d]||0)+1;
  });
  const dec90Labels = Object.keys(decMap90);
  const dec90Values = dec90Labels.map(k => decMap90[k]);
  const dec90Cores  = dec90Labels.map(corDecisao);

  if (window._peChartDecisao90) window._peChartDecisao90.destroy();
  const ctx90 = document.getElementById('chartPeDecisao90');
  if (ctx90) {
    window._peChartDecisao90 = new Chart(ctx90, {
      type: 'doughnut',
      data: { labels: dec90Labels, datasets: [{ data: dec90Values, backgroundColor: dec90Cores, borderWidth: 2, borderColor: isDark()?'#1e2535':'#fff' }] },
      options: donutOpts(dec90Labels, t)
    });
  }

  // ── Gráficos por Área ──
  const buildAreaChart = (dados, decisaoKey, ctxId, storageKey) => {
    // Agrupa por área (coluna D = time, usa como proxy de área)
    const areas = [...new Set(dados.map(r => r.time || 'Sem área').filter(Boolean))].sort();
    const categorias = ['Efetivado','Prorrogado','Desligado'];
    const coresCat   = ['#107c10','#ffb900','#e81123'];

    const datasets = categorias.map((cat, ci) => ({
      label: cat,
      backgroundColor: coresCat[ci],
      borderRadius: 4,
      data: areas.map(area => {
        const registros = dados.filter(r => (r.time||'Sem área') === area);
        return registros.filter(r => normDec(r[decisaoKey]).includes(normDec(cat === 'Efetivado' ? 'efetiv' : cat === 'Prorrogado' ? 'prorrog' : 'deslig'))).length;
      })
    }));

    if (window[storageKey]) window[storageKey].destroy();
    const ctxEl = document.getElementById(ctxId);
    if (!ctxEl) return;
    window[storageKey] = new Chart(ctxEl, {
      type: 'bar',
      data: { labels: areas, datasets },
      options: {
        ...baseOptions({ plugins: { legend: { display: true, position: 'top', labels: { color: t.tick, usePointStyle: true, boxWidth: 8, font:{size:11} } } }, scales: { x: { ticks: { color: t.tick, font:{size:10}, maxRotation:35 } }, y: { beginAtZero: true, ticks: { color: t.tick, stepSize: 1 } } } }),
        responsive: true, maintainAspectRatio: false
      }
    });
  };

  // ── Gráfico único: Por Área — 45 e 90 dias combinados ──
  if (window._peChartArea) window._peChartArea.destroy();
  const ctxArea = document.getElementById('chartPeArea');
  if (ctxArea) {
    const todosRegistros = peData; // usa todos sempre (não filtrado pelo mês)
    const areas = [...new Set(todosRegistros.map(r => r.time || 'Sem área').filter(Boolean))].sort();
    const incl = (decisao, termo) => normDec(decisao).includes(termo);

    const datasets = [
      { label: 'Efetivado 45d',  backgroundColor: '#107c10',             borderRadius: 3, data: areas.map(a => todosRegistros.filter(r => (r.time||'Sem área')===a && incl(r.decisao45,'efetiv')).length) },
      { label: 'Prorrogado 45d', backgroundColor: '#ffb900',             borderRadius: 3, data: areas.map(a => todosRegistros.filter(r => (r.time||'Sem área')===a && incl(r.decisao45,'prorrog')).length) },
      { label: 'Desligado 45d',  backgroundColor: '#e81123',             borderRadius: 3, data: areas.map(a => todosRegistros.filter(r => (r.time||'Sem área')===a && incl(r.decisao45,'deslig')).length) },
      { label: 'Efetivado 90d',  backgroundColor: 'rgba(16,124,16,.4)',  borderRadius: 3, borderWidth:1, borderColor:'#107c10', data: areas.map(a => todosRegistros.filter(r => (r.time||'Sem área')===a && incl(r.decisao90,'efetiv')).length) },
      { label: 'Prorrogado 90d', backgroundColor: 'rgba(255,185,0,.4)', borderRadius: 3, borderWidth:1, borderColor:'#ffb900', data: areas.map(a => todosRegistros.filter(r => (r.time||'Sem área')===a && incl(r.decisao90,'prorrog')).length) },
      { label: 'Desligado 90d',  backgroundColor: 'rgba(232,17,35,.4)', borderRadius: 3, borderWidth:1, borderColor:'#e81123', data: areas.map(a => todosRegistros.filter(r => (r.time||'Sem área')===a && incl(r.decisao90,'deslig')).length) },
    ];

    window._peChartArea = new Chart(ctxArea, {
      type: 'bar',
      data: { labels: areas, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: t.tick, usePointStyle: true, boxWidth: 8, font:{size:10}, padding:10 } },
          tooltip: { backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick, borderWidth:1, borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)' }
        },
        scales: {
          x: { ticks: { color: t.tick, font:{size:10}, maxRotation:35 }, grid: { color: t.grid } },
          y: { beginAtZero:true, ticks: { color: t.tick, stepSize:1 }, grid: { color: t.grid } }
        }
      }
    });
  }

  buildPeFullTable();
}

/* Tabela completa com todos os colaboradores da planilha */
function buildPeFullTable() {
  const tbody = document.getElementById('peFullTableBody');
  if (!tbody || !peData.length) return;

  const fmtData = d => d instanceof Date ? d.toLocaleDateString('pt-BR') : '—';
  const norm = s => String(s || '').trim().toLowerCase();

  // Popula selects na primeira vez (preserva seleção)
  const selArea   = document.getElementById('peFilterArea');
  const selGestor = document.getElementById('peFilterGestor');

  if (selArea && selArea.options.length <= 1) {
    [...new Set(peData.map(r => r.time).filter(Boolean))].sort()
      .forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; selArea.appendChild(o); });
  }
  if (selGestor && selGestor.options.length <= 1) {
    [...new Set(peData.map(r => r.gestor).filter(Boolean))].sort()
      .forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; selGestor.appendChild(o); });
  }

  const areaFiltro   = selArea?.value   || '';
  const gestorFiltro = selGestor?.value || '';
  const termo        = norm(document.getElementById('peSearchInput')?.value || '');

  const catBadge = categoria => {
    const n = norm(categoria);
    const cls = n === '45' ? 'pe-cat-45' : n === '90' ? 'pe-cat-90' : 'pe-cat-encerrado';
    return `<span class="pe-cat-badge ${cls}">${categoria || '—'}</span>`;
  };

  const farolBadge = decisao => {
    const n = norm(decisao);
    let cls = 'pe-farol-cinza';
    if (n.includes('efetiv'))  cls = 'pe-farol-verde';
    else if (n.includes('prorrog')) cls = 'pe-farol-amarelo';
    else if (n.includes('deslig'))  cls = 'pe-farol-vermelho';
    return `<span class="pe-farol-dot-only ${cls}" title="${decisao || '—'}"><span class="pe-farol-dot"></span></span>`;
  };

  const calcData = (dtAdmissao, dias) => {
    if (!(dtAdmissao instanceof Date) || isNaN(dtAdmissao)) return null;
    const d = new Date(dtAdmissao);
    d.setDate(d.getDate() + dias);
    return d;
  };

  const filtrados = peData.filter(r =>
    (!areaFiltro   || r.time   === areaFiltro) &&
    (!gestorFiltro || r.gestor === gestorFiltro) &&
    (!termo        || norm(r.nome).includes(termo))
  );

  const ord = [...filtrados].sort((a, b) => {
    const da = a.dtAdmissao instanceof Date ? a.dtAdmissao.getTime() : -Infinity;
    const db = b.dtAdmissao instanceof Date ? b.dtAdmissao.getTime() : -Infinity;
    return db - da;
  });

  if (!ord.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:18px;font-style:italic">Nenhum colaborador encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = ord.map((r, idx) => `
    <tr>
      <td>${catBadge(r.categoria)}</td>
      <td><span class="pe-nome-link" onclick="openPeDetail(${peData.indexOf(r)})">${r.nome || '—'}</span></td>
      <td>${fmtData(calcData(r.dtAdmissao, 45))}</td>
      <td>${r.decisao45 || '—'}</td>
      <td>${farolBadge(r.decisao45)}</td>
      <td>${fmtData(calcData(r.dtAdmissao, 90))}</td>
      <td>${r.decisao90 || '—'}</td>
      <td>${farolBadge(r.decisao90)}</td>
    </tr>
  `).join('');
}

function openPeDetail(idx) {
  const r = peData[idx];
  if (!r) return;

  const overlay = document.getElementById('peDetailOverlay');
  const title   = document.getElementById('peDetailTitle');
  const body    = document.getElementById('peDetailBody');
  if (!overlay || !title || !body) return;

  const fmtData = d => d instanceof Date ? d.toLocaleDateString('pt-BR') : '—';
  const calcData = (dt, dias) => {
    if (!(dt instanceof Date)) return null;
    const d = new Date(dt); d.setDate(d.getDate() + dias); return d;
  };

  title.textContent = r.nome;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="pe-detail-block">
        <div class="pe-detail-block-title">
          <span class="pe-cat-badge pe-cat-45">45 dias</span>
          <span style="color:var(--text-secondary);font-size:11px;margin-left:8px">Prazo: ${fmtData(calcData(r.dtAdmissao, 45))}</span>
        </div>
        <div class="pe-detail-row"><span class="pe-detail-label">Decisão</span><span class="pe-detail-value">${r.decisao45 || '—'}</span></div>
        <div class="pe-detail-row pe-detail-resposta"><span class="pe-detail-label">Resposta / Observação</span><span class="pe-detail-value">${r.resposta45 || '—'}</span></div>
      </div>
      <div class="pe-detail-block">
        <div class="pe-detail-block-title">
          <span class="pe-cat-badge pe-cat-90">90 dias</span>
          <span style="color:var(--text-secondary);font-size:11px;margin-left:8px">Prazo: ${fmtData(calcData(r.dtAdmissao, 90))}</span>
        </div>
        <div class="pe-detail-row"><span class="pe-detail-label">Decisão</span><span class="pe-detail-value">${r.decisao90 || '—'}</span></div>
        <div class="pe-detail-row pe-detail-resposta"><span class="pe-detail-label">Resposta / Observação</span><span class="pe-detail-value">${r.resposta90 || '—'}</span></div>
      </div>
      <div class="pe-detail-meta">
        <span>${r.cargo || ''}</span>
        ${r.time ? `<span>· ${r.time}</span>` : ''}
        ${r.gestor ? `<span>· Gestor: ${r.gestor}</span>` : ''}
        <span>· Admissão: ${fmtData(r.dtAdmissao)}</span>
      </div>
    </div>
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePeDetail(e) {
  if (e && e.target !== document.getElementById('peDetailOverlay')) return;
  document.getElementById('peDetailOverlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

function openPeModal(key) {
  const lists = window._peLists;
  if (!lists || !lists[key]) return;
  const pessoas = lists[key];

  const titles = { '45': 'Período de 45 dias', '90': 'Período de 45 a 90 dias' };
  const title = document.getElementById('expModalTitle');
  const body  = document.getElementById('expModalBody');
  const overlay = document.getElementById('expModalOverlay');
  if (!title || !body || !overlay) return;

  title.textContent = `${titles[key] || 'Colaboradores'} — ${pessoas.length} colaboradores`;

  if (!pessoas.length) {
    body.innerHTML = '<div class="exp-list-empty">Nenhum colaborador neste período.</div>';
  } else {
    const fmtData = d => d instanceof Date ? d.toLocaleDateString('pt-BR') : '—';
    const hoje = new Date();
    const diasDeCasa = d => d instanceof Date ? Math.floor((hoje - d) / (24*3600*1000)) : null;
    const ord = [...pessoas].sort((a, b) => (a.dtAdmissao || 0) - (b.dtAdmissao || 0));
    const decisaoCol = key === '45' ? 'decisao45' : 'decisao90';
    const decisaoLabel = key === '45' ? 'Decisão 45 dias' : 'Decisão 90 dias';
    body.innerHTML = `
      <table class="exp-list-table">
        <thead><tr><th>Nome</th><th>Cargo</th><th>Time</th><th>Gestor</th><th>Admissão</th><th>Tempo de casa</th><th>${decisaoLabel}</th></tr></thead>
        <tbody>` +
      ord.map(r => {
        const dias = diasDeCasa(r.dtAdmissao);
        return `<tr>
          <td>${r.nome}</td>
          <td>${r.cargo || '—'}</td>
          <td>${r.time || '—'}</td>
          <td>${r.gestor || '—'}</td>
          <td>${fmtData(r.dtAdmissao)}</td>
          <td>${dias !== null ? dias + ' dias' : '—'}</td>
          <td>${r[decisaoCol] || '—'}</td>
        </tr>`;
      }).join('') +
      `</tbody></table>`;
  }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ── Converte serial Excel para objeto Date (UTC para evitar fuso horário) ── */
function excelDateToDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  // Usar UTC para evitar que fuso horário mude o mês
  const ms = (serial - 25569) * 86400 * 1000;
  const dt = new Date(ms);
  if (isNaN(dt)) return null;
  // Retornar data em UTC
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

/* ── Extrai mês "MM" de serial Excel ou número direto ── */
function getMesRS(val) {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') {
    // pode ser serial Excel (>1000) ou mês direto (1-12)
    if (val >= 1 && val <= 12) return String(Math.round(val)).padStart(2,'0');
    const dt = excelDateToDate(val);
    if (dt) return String(dt.getMonth() + 1).padStart(2,'0');
  }
  return null;
}

/* ── Renderiza KPIs e gráficos de R&S ── */
function renderRS() {
  if (!rsData.length) return;

  // ── Filtros de área e gestor ──
  const rsAreaSel   = (document.getElementById('rsFilterArea')   || {}).value || 'Todas';
  const rsGestorSel = (document.getElementById('rsFilterGestor') || {}).value || 'Todos';
  const D = rsData.filter(r =>
    (rsAreaSel   === 'Todas' || r.area   === rsAreaSel) &&
    (rsGestorSel === 'Todos' || r.gestor === rsGestorSel)
  );

  const mesSel = document.getElementById('month-select').value; // "01".."12" ou ""
  const mesAnt = mesSel ? getMesAnterior(mesSel) : null;
  const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // ── Extrai mês "01".."12" de serial Excel ──
  const getMesDeSerial = (serial) => {
    if (!serial && serial !== 0) return null;
    const dt = excelDateToDate(serial);
    if (!dt || isNaN(dt)) return null;
    return String(dt.getUTCMonth() + 1).padStart(2, '0');
  };

  // ── Extrai mês do número direto da coluna Y/AC (1-12) ──
  const getMesDeNumero = (val) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 1 || n > 12) return null;
    return String(n).padStart(2, '0');
  };

  const getMesAbertura   = r => getMesDeSerial(r.dataAbertura);
  const getMesFechamento = r => getMesDeSerial(r.dataFechamento);
  const getMesDeclinio   = r => getMesDeNumero(r.mesDeclinio);

  // Filtra por mês usando a função extratora fornecida
  const porMes = (arr, fn, mes) => mes ? arr.filter(r => fn(r) === mes) : arr;

  const isFechada   = r => r.status === 'fechada';
  const isCancelada = r => r.status === 'cancelada';

  // Debug
  console.log('[RS] mesSel:', mesSel, '| total linhas:', D.length);
  console.log('[RS] amostra status:', [...new Set(D.map(r=>r.status))].slice(0,5));
  console.log('[RS] amostra dataAbertura:', D.slice(0,3).map(r=>r.dataAbertura));

  // ── VAGAS ABERTAS ──
  const abAtual = porMes(D, getMesAbertura, mesSel).filter(r => r.dataAbertura !== '').length;
  const abAnt   = mesAnt ? porMes(D, getMesAbertura, mesAnt).filter(r => r.dataAbertura !== '').length : null;

  // ── VAGAS FECHADAS (status = "fechada") ──
  const fecAtual = porMes(D, getMesFechamento, mesSel).filter(isFechada).length;
  const fecAnt   = mesAnt ? porMes(D, getMesFechamento, mesAnt).filter(isFechada).length : null;

  // ── VAGAS TRABALHADAS ──
  // Abertura preenchida E abertura <= fim do mês E (fechamento >= início do mês OU sem fechamento)
  const anoRef    = new Date().getUTCFullYear();
  const mesRef    = mesSel ? parseInt(mesSel) : new Date().getUTCMonth() + 1;
  const inicioMes = Date.UTC(anoRef, mesRef - 1, 1);
  const fimMes    = Date.UTC(anoRef, mesRef, 0, 23, 59, 59);

  const trabAtual = D.filter(r => {
    if (!r.dataAbertura) return false;
    const dtA = excelDateToDate(r.dataAbertura);
    if (!dtA || isNaN(dtA) || dtA.getTime() > fimMes) return false;
    if (!r.dataFechamento) return true;
    const dtF = excelDateToDate(r.dataFechamento);
    return !dtF || isNaN(dtF) || dtF.getTime() >= inicioMes;
  }).length;

  // ── DECLÍNIOS ──
  const decAtual = porMes(D, getMesDeclinio, mesSel).filter(r => r.declinio !== '' && r.declinio !== undefined).length;
  const decAnt   = mesAnt ? porMes(D, getMesDeclinio, mesAnt).filter(r => r.declinio !== '' && r.declinio !== undefined).length : null;
  const decPct   = fecAtual > 0 ? ((decAtual / fecAtual) * 100).toFixed(1) : '0.0';

  // ── SLA MÉDIO (fechadas) ──
  const slaRows    = porMes(D, getMesFechamento, mesSel).filter(r => isFechada(r) && r.sla !== '' && !isNaN(Number(r.sla)));
  const slaMedia   = slaRows.length ? Math.round(slaRows.reduce((s,r) => s + Number(r.sla), 0) / slaRows.length) : null;
  const slaRowsAnt = mesAnt ? porMes(D, getMesFechamento, mesAnt).filter(r => isFechada(r) && r.sla !== '' && !isNaN(Number(r.sla))) : [];
  const slaAnt     = slaRowsAnt.length ? slaRowsAnt.reduce((s,r) => s + Number(r.sla), 0) / slaRowsAnt.length : null;

  // ── CANCELADAS ──
  const canAtual = porMes(D, getMesFechamento, mesSel).filter(isCancelada).length;
  const canAnt   = mesAnt ? porMes(D, getMesFechamento, mesAnt).filter(isCancelada).length : null;

  console.log('[RS] abertas:', abAtual, '| fechadas:', fecAtual, '| trabalhadas:', trabAtual, '| declinios:', decAtual, '| SLA:', slaMedia, '| canceladas:', canAtual);

  // ── Helper badge variação ──
  const varBadge = (atual, anterior, elId, invertColor = false) => {
    const el = document.getElementById(elId);
    if (!el) return;
    if (anterior === null || anterior === 0) { el.innerHTML = ''; el.className = 'rs-kpi-var'; return; }
    const diff   = atual - anterior;
    const pct    = (diff / anterior * 100).toFixed(1);
    const dir    = diff > 0 ? 1 : diff < 0 ? -1 : 0;
    const corDir = invertColor ? -dir : dir;
    const svgUp  = `<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,1 9,8 1,8"/></svg>`;
    const svgDn  = `<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,9 9,2 1,2"/></svg>`;
    const arrow  = dir > 0 ? svgUp : dir < 0 ? svgDn : '';
    el.innerHTML = `${arrow} ${diff > 0 ? '+' : ''}${pct}% vs mês ant.`;
    el.className = `rs-kpi-var ${corDir > 0 ? 'delta-up' : corDir < 0 ? 'delta-down' : 'delta-neutral'}`;
  };

  // ── Preencher cards ──
  document.getElementById('rsVagasAbertas').textContent     = abAtual;
  document.getElementById('rsVagasFechadas').textContent    = fecAtual;
  document.getElementById('rsVagasTrabalhadas').textContent = trabAtual;
  document.getElementById('rsVagasTrabalhadasSub').textContent = mesSel ? `Ref: ${MESES[parseInt(mesSel)-1]}` : 'Mês atual';
  document.getElementById('rsDeclinios').textContent        = decAtual;
  document.getElementById('rsDecliniosPct').textContent     = `${decPct}% das vagas fechadas`;
  document.getElementById('rsSlaMedia').textContent         = slaMedia ? `${slaMedia} dias` : '—';

  // ── METAS R&S ──
  // Meta: no máximo 10% das vagas fechadas com SLA > 60 dias
  const vagasFechadasMes = porMes(D, getMesFechamento, mesSel).filter(isFechada);
  const acima60  = vagasFechadasMes.filter(r => r.sla !== '' && Number(r.sla) > 60).length;
  const pctSla60 = vagasFechadasMes.length ? Math.round(acima60 / vagasFechadasMes.length * 100) : 0;
  const metaSla60El = document.getElementById('rsMetaSla');
  if (metaSla60El) {
    const ok = pctSla60 <= 10;
    metaSla60El.textContent = `${pctSla60}% acima de 60 dias (meta: ≤10%)`;
    metaSla60El.className = `rs-meta-badge ${ok ? 'rs-meta-ok' : 'rs-meta-alert'}`;
  }
  // Meta: no máximo 5% de declínio
  const decPctNum = fecAtual > 0 ? Math.round(decAtual / fecAtual * 100) : 0;
  const metaDecEl = document.getElementById('rsMetaDec');
  if (metaDecEl) {
    const ok = decPctNum <= 5;
    metaDecEl.textContent = `${decPctNum}% de declínio (meta: ≤5%)`;
    metaDecEl.className = `rs-meta-badge ${ok ? 'rs-meta-ok' : 'rs-meta-alert'}`;
  }
  document.getElementById('rsVagasCanceladas').textContent  = canAtual;

  varBadge(abAtual,  abAnt,  'rsVagasAbertasVar',    false);
  varBadge(fecAtual, fecAnt, 'rsVagasFechadasVar',   false);
  varBadge(decAtual, decAnt, 'rsDecliniosVar',        true);
  varBadge(canAtual, canAnt, 'rsVagasCanceladasVar',  true);
  if (slaMedia && slaAnt) varBadge(parseFloat(slaMedia), slaAnt, 'rsSlaVar', true);

  // ── TIME TO START (coluna AG) ──
  const ttsRows    = porMes(D, getMesFechamento, mesSel).filter(r => r.tts !== null);
  const ttsMedia   = ttsRows.length ? Math.round(ttsRows.reduce((s,r) => s + r.tts, 0) / ttsRows.length) : null;
  const ttsRowsAnt = mesAnt ? porMes(D, getMesFechamento, mesAnt).filter(r => r.tts !== null) : [];
  const ttsAnt     = ttsRowsAnt.length ? ttsRowsAnt.reduce((s,r) => s + r.tts, 0) / ttsRowsAnt.length : null;
  document.getElementById('rsTtsMedia').textContent = ttsMedia !== null ? `${ttsMedia} dias` : '—';
  if (ttsMedia !== null && ttsAnt !== null) varBadge(ttsMedia, ttsAnt, 'rsTtsVar', true);
  else { const el = document.getElementById('rsTtsVar'); if(el){ el.innerHTML=''; el.className='rs-kpi-var'; } }

  // ── TIME TO FILL (coluna AF) ──
  const ttfRows    = porMes(D, getMesFechamento, mesSel).filter(r => r.ttf !== null);
  const ttfMedia   = ttfRows.length ? Math.round(ttfRows.reduce((s,r) => s + r.ttf, 0) / ttfRows.length) : null;
  const ttfRowsAnt = mesAnt ? porMes(D, getMesFechamento, mesAnt).filter(r => r.ttf !== null) : [];
  const ttfAnt     = ttfRowsAnt.length ? ttfRowsAnt.reduce((s,r) => s + r.ttf, 0) / ttfRowsAnt.length : null;
  document.getElementById('rsTtfMedia').textContent = ttfMedia !== null ? `${ttfMedia} dias` : '—';
  if (ttfMedia !== null && ttfAnt !== null) varBadge(ttfMedia, ttfAnt, 'rsTtfVar', true);
  else { const el = document.getElementById('rsTtfVar'); if(el){ el.innerHTML=''; el.className='rs-kpi-var'; } }

  // ── FONTE PRINCIPAL (coluna AH) ──
  const rsParaFonte = porMes(D, getMesFechamento, mesSel).filter(isFechada);
  const rsParaFonteAnt = mesAnt ? porMes(D, getMesFechamento, mesAnt).filter(isFechada) : [];
  const contaFonte = (arr) => {
    const m = {};
    arr.forEach(r => { const f = r.fonte || 'Não informado'; m[f] = (m[f]||0)+1; });
    return m;
  };
  const fonteMap    = contaFonte(rsParaFonte);
  const fonteMapAnt = contaFonte(rsParaFonteAnt);
  const fonteEntries = Object.entries(fonteMap).sort((a,b)=>b[1]-a[1]);
  const fontePrincipal = fonteEntries.length ? fonteEntries[0][0] : null;
  const fontePct = fontePrincipal && rsParaFonte.length
    ? Math.round((fonteMap[fontePrincipal]/rsParaFonte.length)*100) : null;
  const fontePctAnt = fontePrincipal && rsParaFonteAnt.length && fonteMapAnt[fontePrincipal]
    ? (fonteMapAnt[fontePrincipal]/rsParaFonteAnt.length)*100 : null;
  const elFonte = document.getElementById('rsFontePrincipal');
  const elFontePct = document.getElementById('rsFontePct');
  if (elFonte) elFonte.textContent = fontePrincipal || '—';
  if (elFontePct) elFontePct.textContent = fontePct !== null ? `${fontePct}% das contratações` : '';
  if (fontePct !== null && fontePctAnt !== null) varBadge(fontePct, fontePctAnt, 'rsFonteVar', false);
  else { const el = document.getElementById('rsFonteVar'); if(el){ el.innerHTML=''; el.className='rs-kpi-var'; } }

  // ── POPULATE FILTROS ÁREA + GESTOR ──
  const rsAreas   = ['Todas', ...[...new Set(D.map(r=>r.area).filter(Boolean))].sort()];
  const rsGestores= ['Todos', ...[...new Set(D.map(r=>r.gestor).filter(Boolean))].sort()];
  const selArea   = document.getElementById('rsFilterArea');
  const selGestor = document.getElementById('rsFilterGestor');
  if (selArea) {
    const curA = selArea.value;
    selArea.innerHTML = rsAreas.map(a => `<option value="${a}">${a}</option>`).join('');
    if (rsAreas.includes(curA)) selArea.value = curA;
  }
  if (selGestor) {
    const curG = selGestor.value;
    selGestor.innerHTML = rsGestores.map(g => `<option value="${g}">${g}</option>`).join('');
    if (rsGestores.includes(curG)) selGestor.value = curG;
  }

  // ── GRÁFICO 1: EVOLUÇÃO — por mês OU por dia (apenas 2026) ──
  const ANO_ATUAL = 2026;
  const todos12 = ['01','02','03','04','05','06','07','08','09','10','11','12'];

  const isAno2026 = (serial) => {
    if (!serial) return false;
    const dt = excelDateToDate(serial);
    if (!dt || isNaN(dt)) return false;
    return dt.getUTCFullYear() === ANO_ATUAL;
  };

  const D2026 = D.filter(r =>
    isAno2026(r.dataAbertura) || isAno2026(r.dataFechamento)
  );

  if (window._rsChartEvol) { window._rsChartEvol.destroy(); window._rsChartEvol = null; }
  const ctxE = document.getElementById('chartRsEvolucao');
  if (ctxE) {
    const t = chartTheme();
    const titleEl = document.getElementById('rsEvolucaoTitle');
    const badgeEl = document.getElementById('rsEvolucaoBadge');

    if (mesSel) {
      // Modo DIA: por dia dentro do mês selecionado, somente 2026
      const mesNum = parseInt(mesSel);
      const diasNoMes = new Date(ANO_ATUAL, mesNum, 0).getDate();
      const diasLabels = Array.from({length: diasNoMes}, (_,i) => String(i+1).padStart(2,'0'));

      const abPorDia = diasLabels.map(dia => D2026.filter(r => {
        if (!r.dataAbertura) return false;
        const dt = excelDateToDate(r.dataAbertura);
        if (!dt || isNaN(dt)) return false;
        return dt.getUTCFullYear() === ANO_ATUAL
          && (dt.getUTCMonth()+1) === mesNum
          && String(dt.getUTCDate()).padStart(2,'0') === dia;
      }).length);

      const fecPorDia = diasLabels.map(dia => D2026.filter(r => {
        if (!r.dataFechamento) return false;
        const dt = excelDateToDate(r.dataFechamento);
        if (!dt || isNaN(dt)) return false;
        return dt.getUTCFullYear() === ANO_ATUAL
          && (dt.getUTCMonth()+1) === mesNum
          && String(dt.getUTCDate()).padStart(2,'0') === dia
          && isFechada(r);
      }).length);

      if (titleEl) titleEl.textContent = `Vagas Abertas vs Fechadas — ${MESES[mesNum-1]}/${ANO_ATUAL} (por dia)`;
      if (badgeEl) { badgeEl.textContent = MESES[mesNum-1]; badgeEl.style.display = 'inline-flex'; }

      window._rsChartEvol = new Chart(ctxE, {
        type: 'bar',
        data: {
          labels: diasLabels.map(d => `${d}/${String(mesNum).padStart(2,'0')}`),
          datasets: [
            { label: 'Abertas', data: abPorDia, backgroundColor: 'rgba(0,120,212,.82)', borderColor: 'rgba(0,120,212,1)', borderWidth: 1, borderRadius: 3, borderSkipped: false },
            { label: 'Fechadas', data: fecPorDia, backgroundColor: 'rgba(16,124,16,.82)', borderColor: 'rgba(16,124,16,1)', borderWidth: 1, borderRadius: 3, borderSkipped: false },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: {
            legend: { display: true, position: 'top', labels: { color: t.tick, usePointStyle: true, boxWidth: 8, padding: 16, font:{size:11} } },
            tooltip: { backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick, borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:10 }
          },
          scales: {
            x: { ticks: { color: t.tick, font:{size:10}, maxRotation:45 }, grid: { color: t.grid }, border:{display:false} },
            y: { beginAtZero:true, ticks: { color: t.tick, font:{size:11}, stepSize:1 }, grid: { color: t.grid }, border:{display:false} }
          }
        }
      });
    } else {
      // Modo MÊS: todos os 12 meses de 2026
      // IMPORTANTE: checa o ANO da própria data de abertura/fechamento,
      // não apenas se o registro pertence a D2026 (que inclui vagas abertas
      // em 2025 mas fechadas em 2026, ou vice-versa).
      const evolAb  = todos12.map(m => D.filter(r =>
        isAno2026(r.dataAbertura) && getMesAbertura(r) === m && r.dataAbertura !== ''
      ).length);
      const evolFec = todos12.map(m => D.filter(r =>
        isAno2026(r.dataFechamento) && getMesFechamento(r) === m && isFechada(r)
      ).length);

      // Vagas trabalhadas por mês: abertura <= fim do mês E (sem fechamento OU fechamento >= início do mês)
      const evolTrab = todos12.map((m, idx) => {
        const mesNumLoop = idx + 1;
        const inicioMesLoop = Date.UTC(ANO_ATUAL, mesNumLoop - 1, 1);
        const fimMesLoop    = Date.UTC(ANO_ATUAL, mesNumLoop, 0, 23, 59, 59);
        return D.filter(r => {
          if (!r.dataAbertura) return false;
          const dtA = excelDateToDate(r.dataAbertura);
          if (!dtA || isNaN(dtA) || dtA.getTime() > fimMesLoop) return false;
          if (!r.dataFechamento) return true;
          const dtF = excelDateToDate(r.dataFechamento);
          return !dtF || isNaN(dtF) || dtF.getTime() >= inicioMesLoop;
        }).length;
      });

      if (titleEl) titleEl.textContent = `Vagas Abertas vs Fechadas por Mês — ${ANO_ATUAL}`;
      if (badgeEl) badgeEl.style.display = 'none';

      window._rsChartEvol = new Chart(ctxE, {
        type: 'bar',
        data: {
          labels: MESES,
          datasets: [
            { label: 'Abertas', data: evolAb, backgroundColor: 'rgba(0,120,212,.82)', borderColor: 'rgba(0,120,212,1)', borderWidth: 1, borderRadius: 4, borderSkipped: false },
            { label: 'Fechadas', data: evolFec, backgroundColor: 'rgba(16,124,16,.82)', borderColor: 'rgba(16,124,16,1)', borderWidth: 1, borderRadius: 4, borderSkipped: false },
            { label: 'Trabalhadas', data: evolTrab, type: 'line', borderColor: 'rgba(112,48,160,1)', backgroundColor: 'rgba(112,48,160,.1)', borderWidth: 2.5, tension: .3, fill: false, pointRadius: 3, pointBackgroundColor: 'rgba(112,48,160,1)' },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: {
            legend: { display: true, position: 'top', labels: { color: t.tick, usePointStyle: true, boxWidth: 8, padding: 16, font:{size:11} } },
            tooltip: { backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick, borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:10 }
          },
          scales: {
            x: { ticks: { color: t.tick, font:{size:11} }, grid: { color: t.grid }, border:{display:false} },
            y: { beginAtZero:true, ticks: { color: t.tick, font:{size:11}, stepSize:1 }, grid: { color: t.grid }, border:{display:false} }
          }
        }
      });
    }
  }

  // ── GRÁFICO 2: STATUS (doughnut filtrado por mês) ──
  const rsParaStatus = mesSel
    ? D.filter(r => getMesAbertura(r) === mesSel || getMesFechamento(r) === mesSel)
    : D;

  const statusCount = {};
  rsParaStatus.forEach(r => {
    const s = r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : 'Sem status';
    statusCount[s] = (statusCount[s] || 0) + 1;
  });
  const PAL_STATUS = { 'Fechada':'#107c10', 'Aberta':'#0078d4', 'Cancelada':'#e81123', 'Em andamento':'#ff8c00', 'Sem status':'#94a3b8' };
  const statusLabels = Object.keys(statusCount).sort();
  const statusVals   = statusLabels.map(s => statusCount[s]);
  const statusColors = statusLabels.map(s => PAL_STATUS[s] || '#b4a0ff');

  if (window._rsChartStatus) { window._rsChartStatus.destroy(); window._rsChartStatus = null; }
  const ctxS = document.getElementById('chartRsStatus');
  if (ctxS) {
    const t = chartTheme();
    window._rsChartStatus = new Chart(ctxS, {
      type: 'doughnut',
      data: { labels: statusLabels, datasets: [{ data: statusVals, backgroundColor: statusColors, borderWidth: 2, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: t.tick, boxWidth: 10, padding: 10, font:{size:11}, usePointStyle: true } },
          tooltip: {
            backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick,
            borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:10,
            callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} vaga${ctx.parsed!==1?'s':''}` }
          }
        }
      }
    });
  }

  // ── GRÁFICO 3: NÍVEL — linha estilo PCD, 3 datasets (aberta/fechada/cancelada) ──
  const rsParaNivel = mesSel
    ? D.filter(r => getMesAbertura(r) === mesSel || getMesFechamento(r) === mesSel)
    : D;

  // Normaliza o texto do nível para comparação flexível (sem acento, sem case)
  const normNivel = s => String(s||'').trim()
    .normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

  // Coleta todos os níveis únicos presentes nos dados
  const niveisPresentes = [...new Set(rsParaNivel.map(r => String(r.nivel||'').trim()).filter(Boolean))];
  console.log('[RS] Níveis encontrados:', niveisPresentes);

  // Ordem preferida (normalizada para match)
  const NIVEL_PREF_NORM = [
    'estagio','junior','trainee','pleno','senior','especialista',
    'coordenador','gerente','diretor','n/a'
  ];
  // Ordena: primeiro os que batem com a preferência, depois o resto alfabético
  const nivelLabels = [
    ...NIVEL_PREF_NORM
      .map(pref => niveisPresentes.find(n => normNivel(n) === pref))
      .filter(Boolean),
    ...niveisPresentes
      .filter(n => !NIVEL_PREF_NORM.includes(normNivel(n)))
      .sort()
  ];

  const nivelAbertas   = nivelLabels.map(n => rsParaNivel.filter(r => String(r.nivel||'').trim() === n && !isFechada(r) && !isCancelada(r)).length);
  const nivelFechadas  = nivelLabels.map(n => rsParaNivel.filter(r => String(r.nivel||'').trim() === n && isFechada(r)).length);
  const nivelCanceladas= nivelLabels.map(n => rsParaNivel.filter(r => String(r.nivel||'').trim() === n && isCancelada(r)).length);

  // Média salarial separada por status (somente vagas com salário > 0)
  const avgSalPor = (statusFn) => {
    const map = {};
    rsParaNivel.filter(statusFn).forEach(r => {
      const n = String(r.nivel||'').trim();
      if (!n || !(r.salario > 0)) return;
      if (!map[n]) map[n] = [];
      map[n].push(r.salario);
    });
    return nivelLabels.map(n => {
      const arr = map[n] || [];
      return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
    });
  };
  const nivelAvgSalAb  = avgSalPor(r => !isFechada(r) && !isCancelada(r));
  const nivelAvgSalFec = avgSalPor(r => isFechada(r));
  const nivelAvgSalCan = avgSalPor(r => isCancelada(r));

  if (window._rsChartNivel) { window._rsChartNivel.destroy(); window._rsChartNivel = null; }
  const ctxN = document.getElementById('chartRsNivel');
  if (ctxN) {
    const t = chartTheme();
    window._rsChartNivel = new Chart(ctxN, {
      type: 'line',
      data: {
        labels: nivelLabels,
        datasets: [
          {
            label: 'Abertas',
            data: nivelAbertas,
            borderColor: '#0078d4',
            backgroundColor: 'rgba(0,120,212,.10)',
            borderWidth: 2.5, tension: 0.3, fill: false,
            pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#0078d4',
            pointBorderColor: isDark() ? '#1e2535' : '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Fechadas',
            data: nivelFechadas,
            borderColor: '#107c10',
            backgroundColor: 'rgba(16,124,16,.10)',
            borderWidth: 2.5, tension: 0.3, fill: false,
            pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#107c10',
            pointBorderColor: isDark() ? '#1e2535' : '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Canceladas',
            data: nivelCanceladas,
            borderColor: '#e81123',
            backgroundColor: 'rgba(232,17,35,.08)',
            borderWidth: 2, tension: 0.3, fill: false,
            borderDash: [5,4],
            pointRadius: 4, pointHoverRadius: 6,
            pointBackgroundColor: '#e81123',
            pointBorderColor: isDark() ? '#1e2535' : '#fff',
            pointBorderWidth: 2,
          },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: t.tick, usePointStyle: true, boxWidth: 8, padding: 14, font:{size:11} } },
          tooltip: {
            backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick,
            borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:12,
            callbacks: {
              title: ctx => ctx[0].label,
              afterBody: ctx => {
                const idx = ctx[0].dataIndex;
                const dsIdx = ctx[0].datasetIndex; // 0=Abertas 1=Fechadas 2=Canceladas
                const salArr = [nivelAvgSalAb, nivelAvgSalFec, nivelAvgSalCan];
                const sal = salArr[dsIdx] ? salArr[dsIdx][idx] : null;
                const total = (nivelAbertas[idx]||0) + (nivelFechadas[idx]||0) + (nivelCanceladas[idx]||0);
                const lines = [`Total no nível: ${total} vaga${total!==1?'s':''}`];
                if (sal && sal > 0) lines.push(`Média salarial (${ctx[0].dataset.label.toLowerCase()}): R$ ${sal.toLocaleString('pt-BR')}`);
                else lines.push(`Média salarial (${ctx[0].dataset.label.toLowerCase()}): —`);
                return lines;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: t.tick, font:{size:10} }, grid: { color: t.grid }, border:{display:false} },
          y: { beginAtZero:true, ticks: { color: t.tick, font:{size:11}, stepSize:1 }, grid: { color: t.grid }, border:{display:false} }
        }
      }
    });
  }

  // ── GRÁFICO 4: RECRUTADOR — horizontal bar filtrado por mês ──
  const rsParaRec = mesSel
    ? D.filter(r => getMesAbertura(r) === mesSel || getMesFechamento(r) === mesSel)
    : D;

  const recMap = {};
  rsParaRec.forEach(r => {
    const rec = r.recrutador || 'Sem recrutador';
    if (!recMap[rec]) recMap[rec] = { abertas: 0, fechadas: 0, canceladas: 0, trabalhadas: 0 };
    if (r.dataAbertura) recMap[rec].trabalhadas++;
    if (isFechada(r))        recMap[rec].fechadas++;
    else if (isCancelada(r)) recMap[rec].canceladas++;
    else if (r.dataAbertura) recMap[rec].abertas++;
  });
  const recLabels     = Object.keys(recMap).sort((a,b) => recMap[b].trabalhadas - recMap[a].trabalhadas);
  const recAbertas    = recLabels.map(r => recMap[r].abertas);
  const recFechadas   = recLabels.map(r => recMap[r].fechadas);
  const recCanceladas = recLabels.map(r => recMap[r].canceladas);
  const recTrab       = recLabels.map(r => recMap[r].trabalhadas);

  // ── GRÁFICO 5: FONTES DE CONTRATAÇÃO por mês ──
  const todos12F = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const todasFontes = [...new Set(D.filter(isFechada).map(r=>r.fonte).filter(Boolean))].sort();
  const fontesDatasets = todasFontes.map((fonte, fi) => {
    const FPAL = ['#0078d4','#107c10','#b4a0ff','#ff8c00','#00b7c3','#e81123','#ffd700','#a0c4ff'];
    const cor = FPAL[fi % FPAL.length];
    return {
      label: fonte,
      data: todos12F.map(m => D.filter(r => getMesFechamento(r) === m && isFechada(r) && r.fonte === fonte).length),
      borderColor: cor,
      backgroundColor: cor.replace(')',', .15)').replace('rgb','rgba').replace('#', 'rgba(').replace(/rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}),/, (_, r, g, b) => `rgba(${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},`),
      borderWidth: 2.5, tension: 0.35, fill: false,
      pointRadius: 4, pointHoverRadius: 6,
      pointBackgroundColor: cor,
    };
  });

  if (window._rsChartFontes) { window._rsChartFontes.destroy(); window._rsChartFontes = null; }
  const ctxF = document.getElementById('chartRsFontes');
  if (ctxF && todasFontes.length) {
    const t = chartTheme();
    // Helper para converter hex em rgba
    const hex2rgba = (hex, a) => {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${a})`;
    };
    const FPAL = ['#0078d4','#107c10','#b4a0ff','#ff8c00','#00b7c3','#e81123','#ffd700','#a0c4ff'];
    const cleanDs = todasFontes.map((fonte, fi) => ({
      label: fonte,
      data: todos12F.map(m => D.filter(r => getMesFechamento(r) === m && isFechada(r) && r.fonte === fonte).length),
      borderColor: FPAL[fi % FPAL.length],
      backgroundColor: hex2rgba(FPAL[fi % FPAL.length], 0.1),
      borderWidth: 2.5, tension: 0.35, fill: false,
      pointRadius: 4, pointHoverRadius: 6,
      pointBackgroundColor: FPAL[fi % FPAL.length],
      pointBorderColor: isDark() ? '#1e2535' : '#fff',
      pointBorderWidth: 2,
    }));
    window._rsChartFontes = new Chart(ctxF, {
      type: 'line',
      data: { labels: MESES, datasets: cleanDs },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: t.tick, usePointStyle: true, boxWidth: 8, padding: 14, font:{size:11} } },
          tooltip: { backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick, borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:10 }
        },
        scales: {
          x: { ticks: { color: t.tick, font:{size:11} }, grid: { color: t.grid }, border:{display:false} },
          y: { beginAtZero:true, ticks: { color: t.tick, font:{size:11}, stepSize:1 }, grid: { color: t.grid }, border:{display:false} }
        }
      }
    });
  }

  if (window._rsChartRec) { window._rsChartRec.destroy(); window._rsChartRec = null; }
  const ctxR = document.getElementById('chartRsRecrutador');
  if (ctxR) {
    const t = chartTheme();
    window._rsChartRec = new Chart(ctxR, {
      type: 'bar',
      data: {
        labels: recLabels,
        datasets: [
          { label: 'Trabalhadas',    data: recTrab,       backgroundColor: 'rgba(180,160,255,.70)', borderColor: '#b4a0ff', borderWidth:1, borderRadius:3, borderSkipped:false },
          { label: 'Fechadas',       data: recFechadas,   backgroundColor: 'rgba(16,124,16,.82)',  borderColor: '#107c10', borderWidth:1, borderRadius:3, borderSkipped:false },
          { label: 'Ainda Abertas',  data: recAbertas,    backgroundColor: 'rgba(0,120,212,.75)',  borderColor: '#0078d4', borderWidth:1, borderRadius:3, borderSkipped:false },
          { label: 'Canceladas',     data: recCanceladas, backgroundColor: 'rgba(232,17,35,.70)',  borderColor: '#e81123', borderWidth:1, borderRadius:3, borderSkipped:false },
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: t.tick, usePointStyle: true, boxWidth: 8, padding: 16, font:{size:11} } },
          tooltip: { backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick, borderColor: isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:10 }
        },
        scales: {
          x: { beginAtZero:true, ticks: { color: t.tick, font:{size:11}, stepSize:1 }, grid: { color: t.grid }, border:{display:false} },
          y: { ticks: { color: t.tick, font:{size:11} }, grid: { color: 'transparent' }, border:{display:false} }
        }
      }
    });
  }
}

/* ── TABLE SEARCH ── */
function filterTable(tbodyId, query) {
  const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  rows.forEach(tr => {
    const text = tr.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    tr.style.display = !q || text.includes(q) ? '' : 'none';
  });
}

/* ── PRESENTATION MODE ── */
function togglePresentMode() {
  const body   = document.body;
  const btn    = document.getElementById('btnPresent');
  const sidebar= document.getElementById('sidebar');
  const isOn   = body.classList.toggle('present-mode');
  if (isOn) {
    sidebar.classList.add('collapsed');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Sair`;
    btn.style.background = 'var(--accent,#b4a0ff)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'transparent';
  } else {
    sidebar.classList.remove('collapsed');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Apresentar`;
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}
// ESC exits presentation mode
document.addEventListener('keydown', e => { if(e.key==='Escape' && document.body.classList.contains('present-mode')) togglePresentMode(); });

function clearData() {
  allData = [];
  headcountData = [];
  admissoesData = [];
  offboardingData = [];
  cotasPcdData = [];
  cotasJaData  = [];
  climaData    = [];
  movimentData = [];
  hasRealData = false;
  document.getElementById('fileBadge').style.display = 'none';
  document.getElementById('lastUpdate').textContent = 'Aguardando dados';
  destroyCharts();
  renderKPIs(currentCategory);
  renderCharts(currentCategory);
}

/* ═══════════════════════════════════════════
   FILTRO
═══════════════════════════════════════════ */
function excelDateToJS(excelDate) {

  if (!excelDate) return null;

  return new Date(
    (excelDate - 25569) * 86400 * 1000
  );
}

function getMesReferencia(row) {

  const valor = String(
    row.Mes || row['Mês de Referência'] || ''
  ).trim();

  // Se vier 06, 07, 12...
  if (/^\d{1,2}$/.test(valor)) {
    return valor.padStart(2, '0');
  }

  // Se vier Janeiro, Fevereiro...
  const meses = {
    janeiro: '01',
    fevereiro: '02',
    março: '03',
    marco: '03',
    abril: '04',
    maio: '05',
    junho: '06',
    julho: '07',
    agosto: '08',
    setembro: '09',
    outubro: '10',
    novembro: '11',
    dezembro: '12'
  };

  return meses[valor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')] || null;
}


function getMesAnterior(mes) {
    const atual = parseInt(mes);

    if (atual === 1) return '12';

    return String(atual - 1).padStart(2, '0');
}

function percentualVariacao(atual, anterior) {
    if (!anterior) return null;

    return ((atual - anterior) / anterior) * 100;
}

function formatVariacao(percentual) {

    if (percentual === null) {
        return {
            texto: '',
            dir: 0
        };
    }

    return {
        texto: `${percentual > 0 ? '+' : ''}${percentual.toFixed(1)}%`,
        dir: percentual > 0 ? 1 : percentual < 0 ? -1 : 0
    };
}

function getFiltered() {
  const month = document.getElementById('month-select').value;
  const area  = document.getElementById('area-select').value;
  return allData.filter(d => {
const mesRegistro = getMesReferencia(d);

const mOK = !month || mesRegistro === month;
    const aOK = !area  || d.Area === area;
    return mOK && aOK;
  });
}

/* ═══════════════════════════════════════════
   KPIs
═══════════════════════════════════════════ */
/* ── SEMÁFORO DE RISCO ── */
function openTurnoverModal() {
  const bd = window._turnoverBreakdown;
  if (!bd) return;

  const { mesSel, mesLabel, hcMedia, total, vols, invols, OD, turnover } = bd;

  // Liderança vs Não-liderança
  const LIDER = ['ceo','diretor','head','gerente','coordenador','supervisor'];
  const isLider = r => LIDER.some(l => String(r.classificacao||r.cargo||'').toLowerCase().includes(l));
  const lider    = OD.filter(isLider).length;
  const naoLider = OD.length - lider;

  // Turnover real de cada recorte: contagem / média de headcount
  const calcTurnover = n => hcMedia ? ((n / hcMedia) * 100).toFixed(1) : null;
  const tvVol      = calcTurnover(vols);
  const tvInv      = calcTurnover(invols);
  const tvLider    = calcTurnover(lider);
  const tvNaoLider = calcTurnover(naoLider);

  const fmtTv = (n, tv) => `<strong>${n}</strong> <span style="color:var(--text-secondary);font-size:11px">(${tv !== null ? tv + '%' : '—'} turnover)</span>`;

  document.getElementById('turnoverModalTitle').textContent =
    `Detalhamento do Turnover${mesSel ? ' — ' + mesLabel : ''}`;

  document.getElementById('turnoverModalBody').innerHTML = `
    <div class="tv-grid">
      <div class="tv-section">
        <div class="tv-section-title">Por tipo</div>
        <div class="tv-row">
          <span class="tv-label">Voluntário</span>
          <span class="tv-value">${fmtTv(vols, tvVol)}</span>
        </div>
        <div class="tv-row">
          <span class="tv-label">Involuntário</span>
          <span class="tv-value">${fmtTv(invols, tvInv)}</span>
        </div>
      </div>
      <div class="tv-section">
        <div class="tv-section-title">Por nível</div>
        <div class="tv-row">
          <span class="tv-label">Liderança</span>
          <span class="tv-value">${fmtTv(lider, tvLider)}</span>
        </div>
        <div class="tv-row">
          <span class="tv-label">Não liderança</span>
          <span class="tv-value">${fmtTv(naoLider, tvNaoLider)}</span>
        </div>
      </div>
    </div>
    <div class="tv-total">
      Total de desligamentos: <strong>${total}</strong>
      ${turnover ? ` &nbsp;·&nbsp; Turnover geral: <strong>${turnover}%</strong>` : ''}
    </div>
  `;

  const overlay = document.getElementById('turnoverModalOverlay');
  if (overlay) { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeTurnoverModal(e) {
  if (e && e.target !== document.getElementById('turnoverModalOverlay')) return;
  const overlay = document.getElementById('turnoverModalOverlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function renderSemaforo() {
  const el = document.getElementById('semaforoCards');
  if (!el) return;
  if (!hasRealData && !climaData.length && !offboardingData.length) {
    el.innerHTML = '<div class="semaforo-empty">Importe a planilha principal para visualizar os alertas de risco.</div>';
    return;
  }

  const mesSel  = document.getElementById('month-select').value;
  const mesAtual= String(new Date().getMonth()+1).padStart(2,'0');
  const mesRef  = mesSel || mesAtual;

  // Reúne dados por área
  const todasAreas = [...new Set([
    ...allData.map(d=>d.Area),
    ...climaData.map(d=>d.area),
    ...offboardingData.map(d=>d.area),
  ].filter(Boolean))].sort();

  const areaRiscos = todasAreas.map(area => {
    const alertas = [];

    // 1. Banco de horas alto (criticidade = Alto neste mês)
    const climaReg = climaData.find(r=>r.area===area&&r.mes===mesRef);
    if (climaReg && climaReg.criticidade === 'Alto')
      alertas.push({ tipo:'banco', label:'Banco de Horas em Alerta', cor:'#ff8c00' });

    // 2. Atestados elevados (acima de 3 no mês)
    const atestMes = allData.filter(d=>d.Area===area&&d.Tipo==='Atestado'&&d.Mes===mesRef);
    if (atestMes.length >= 3)
      alertas.push({ tipo:'atestado', label:`${atestMes.length} Atestados`, cor:'#e81123' });

    // 3. Desligamentos recentes (pelo menos 1 no mês)
    const offMes = offboardingData.filter(r=>r.area===area&&r.mes===mesRef);
    if (offMes.length >= 1)
      alertas.push({ tipo:'off', label:`${offMes.length} Desligamento${offMes.length>1?'s':''}`, cor:'#7030a0' });

    return { area, alertas };
  }).filter(a => a.alertas.length >= 2) // só mostra com 2+ alertas
    .sort((a,b) => b.alertas.length - a.alertas.length);

  if (!areaRiscos.length) {
    el.innerHTML = '<div class="semaforo-ok">✓ Nenhuma área com múltiplos alertas simultâneos neste período.</div>';
    return;
  }

  el.innerHTML = areaRiscos.map(({area, alertas}) => {
    const nivel = alertas.length >= 3 ? 'alto' : 'medio';
    const cor   = alertas.length >= 3 ? '#e81123' : '#ff8c00';
    const tags  = alertas.map(a=>`<span class="sem-tag" style="background:${a.cor}22;color:${a.cor};border-color:${a.cor}44">${a.label}</span>`).join('');
    return `<div class="sem-card sem-${nivel}" style="border-left:4px solid ${cor}">
      <div class="sem-area">${area}</div>
      <div class="sem-tags">${tags}</div>
    </div>`;
  }).join('');
}

function renderKPIs(cat) {
  const ids = ['kpi-v1','kpi-v2','kpi-v3','kpi-v4','kpi-v5','kpi-v6','kpi-v7'];
  const lbs = ['label-kpi1','label-kpi2','label-kpi3','label-kpi4','label-kpi5','label-kpi6','label-kpi7'];
  const vrs = ['var-kpi1','var-kpi2','var-kpi3','var-kpi4','var-kpi5','var-kpi6','var-kpi7'];

  // Ocultar KPIs nas abas que não são dashboard quando não há dados
  const kpiSection = document.querySelector('.kpi-section');
  const abaComDadosProprios = cat === 'cotas' || cat === 'recrutamento';
  const abaSemDadosAinda = cat === 'reportSemanal' || cat === 'atingimentoMetas' || cat === 'periodoExperiencia';
  if (abaSemDadosAinda) { if (kpiSection) kpiSection.style.display = 'none'; return; }
  if (cat !== 'dashboard' && !hasRealData && !abaComDadosProprios) { if (kpiSection) kpiSection.style.display = 'none'; return; }
  if (cat === 'cotas' || cat === 'recrutamento') { if (kpiSection) kpiSection.style.display = 'none'; return; }
  if (kpiSection) kpiSection.style.display = '';

  let kpis;
  if (hasRealData || cat === 'dashboard') {
    kpis = calcKPIsFromData(cat, getFiltered());
  } else {
    kpis = KPI_STATIC[cat] || KPI_STATIC.dashboard;
  }
  if (!kpis) return;

  const allCards = document.querySelectorAll('.kpi-card');
  const card7    = document.getElementById('card-afastados-agora');
  const kpiContainer = document.querySelector('.kpi-container');

  if (cat === 'atestados') {
    allCards.forEach(c => { c.style.display = ''; });
    if (kpiContainer) {
      kpiContainer.style.gridTemplateColumns = ''; // deixa o CSS [data-layout] controlar
      kpiContainer.setAttribute('data-layout', 'atestados');
    }

  } else if (cat === 'dashboard') {
    if (card7) card7.style.display = 'none';
    let visibleCount = 0;
    allCards.forEach(c => {
      if (c.id === 'card-afastados-agora') { c.style.display = 'none'; return; }
      c.style.display = visibleCount < 3 ? '' : 'none';
      visibleCount++;
    });
    if (kpiContainer) { kpiContainer.style.gridTemplateColumns = 'repeat(3,1fr)'; kpiContainer.removeAttribute('data-layout'); }
  } else {
    if (card7) card7.style.display = 'none';
    allCards.forEach(c => {
      if (c.id === 'card-afastados-agora') { c.style.display = 'none'; return; }
      c.style.display = '';
    });
    if (kpiContainer) { kpiContainer.style.gridTemplateColumns = ''; kpiContainer.removeAttribute('data-layout'); }
  }

  // Preenche os cards na ordem do array kpis
  kpis.forEach((k, i) => {
    if (i >= ids.length) return;
    const lblEl = document.getElementById(lbs[i]);
    const valEl = document.getElementById(ids[i]);
    const subEl = document.getElementById('sub-kpi' + (i+1));
    const varEl = document.getElementById(vrs[i]);
    if (lblEl) lblEl.textContent = k.label;
    if (valEl) valEl.textContent = k.value;
    if (subEl) subEl.textContent = k.sub || '';
    if (varEl) {
      if (k.dir > 0) {
        varEl.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,1 9,8 1,8"/></svg> ${k.var}`;
        varEl.className = 'kpi-variation delta-up';
      } else if (k.dir < 0) {
        varEl.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,9 9,2 1,2"/></svg> ${k.var}`;
        varEl.className = 'kpi-variation delta-down';
      } else {
        varEl.innerHTML = k.var || '';
        varEl.className = 'kpi-variation delta-neutral';
      }
    }
  });

  renderSparklines(cat);
}

function calcKPIsFromData(cat, data) {
  /* Retorna array de 6 KPIs calculados dos dados reais */
  const count   = n => data.filter(d => d.Tipo === n).length;
  const uniq    = f => new Set(data.map(f).filter(Boolean)).size;
  const fmtN    = v => new Intl.NumberFormat('pt-BR').format(v);

  switch (cat) {
case 'atestados': {

    const mesSel  = document.getElementById('month-select').value;
    const areaSel = document.getElementById('area-select').value;

    const filtrarPor = (mes) =>
        allData.filter(d => {
            const mOk  = !mes     || getMesReferencia(d) === mes;
            const aOk  = !areaSel || (d.Area && d.Area === areaSel);
            return mOk && aOk && d.Nome && String(d.Nome).trim() !== '';
        });

    const atual    = filtrarPor(mesSel);
    const mesAnterior = mesSel ? getMesAnterior(mesSel) : null;
    const anterior = mesAnterior ? filtrarPor(mesAnterior) : [];

    const variacao = (vAtual, vAnterior) => {
        if (!mesAnterior || !vAnterior) return { texto: '', dir: 0 };
        const pct = ((vAtual - vAnterior) / vAnterior) * 100;
        return {
            texto: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs mês ant.`,
            dir: pct > 0 ? 1 : pct < 0 ? -1 : 0
        };
    };

    // Helper: identifica se o tipo é "doença" (coluna J)
    const isDoenca = d => {
        const t = String(d.TipoAfastamento || '').toLowerCase().trim();
        return t.includes('doença') || t.includes('doenca') || t === 'doença' || t === 'disease';
    };

    // ── Card 1: Total de atestados ──
    const totalAtestados    = atual.length;
    const varTotal          = variacao(totalAtestados, anterior.length);

    // ── Card 2: Colaboradores afastados ──
    const colaboradoresAfastados    = new Set(atual.map(d => d.Nome)).size;
    const colaboradoresAfastadosAnt = new Set(anterior.map(d => d.Nome)).size;
    const varColab                  = variacao(colaboradoresAfastados, colaboradoresAfastadosAnt);

    // ── Card NOVO: Afastados no momento ──
    const hoje3 = new Date(); hoje3.setHours(0,0,0,0);
    const afastadosAgora = allData.filter(d => {
        const aOk = !areaSel || (d.Area && d.Area === areaSel);
        if (!aOk || !d.Nome || !String(d.Nome).trim()) return false;
        if (!d.DtInicioAfast || !d.DtFimAfast) return false;
        const ini = new Date(d.DtInicioAfast); ini.setHours(0,0,0,0);
        const fim = new Date(d.DtFimAfast);    fim.setHours(0,0,0,0);
        return ini <= hoje3 && fim >= hoje3;
    });

    // Preenche tooltip de afastados no momento
    const afastTooltipList = document.getElementById('afastados-tooltip-list');
    if (afastTooltipList) {
        const fmtD = d => d instanceof Date ? d.toLocaleDateString('pt-BR') : (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
        if (!afastadosAgora.length) {
            afastTooltipList.innerHTML = '<li class="cid-tooltip-empty">Nenhum afastamento ativo hoje.</li>';
        } else {
            const ord = [...afastadosAgora].sort((a,b) => String(a.Nome).localeCompare(String(b.Nome)));
            afastTooltipList.innerHTML = ord.map(d => {
                const diasTotal = d.DiasAfastamento || 0;
                const tipo = d.TipoAfastamento || '—';
                const dtFim = d.DtFimAfast ? fmtD(d.DtFimAfast) : '—';
                return `<li>
                  <span>${d.Nome}</span>
                  <span class="cid-code" style="font-size:10px;text-align:right;color:var(--text-secondary)">${diasTotal}d · ${tipo}<br>${dtFim}</span>
                </li>`;
            }).join('');
        }
    }

    // ── Card 3: Total dias afastados (principal) + dias com 100% até hoje (sub) ──
    const totalDiasAtual = atual.filter(d => isDoenca(d)).reduce((s, d) => s + (d.DiasAfastamento || 0), 0);
    const totalDiasAnt   = anterior.filter(d => isDoenca(d)).reduce((s, d) => s + (d.DiasAfastamento || 0), 0);
    const varDias        = variacao(totalDiasAtual, totalDiasAnt);

    // Dias com 100% do quadro: conta dias no intervalo [1/jan – hoje] (ou mês selecionado)
    // onde NENHUM registro de doença (col J) estava ativo (col F ≤ dia ≤ col G)
    const hoje2    = new Date(); hoje2.setHours(0,0,0,0);
    const anoAtual = hoje2.getFullYear();

    // Define período de análise
    let periodoInicio, periodoFim;
    if (mesSel) {
      const m = parseInt(mesSel);
      periodoInicio = new Date(anoAtual, m - 1, 1);
      periodoFim    = new Date(anoAtual, m, 0); // último dia do mês
      if (periodoFim > hoje2) periodoFim = hoje2;
    } else {
      periodoInicio = new Date(anoAtual, 0, 1);
      periodoFim    = hoje2;
    }

    // Registros de doença com datas válidas no período filtrado (área/gestor)
    const todosComArea = allData.filter(d => {
      const aOk = !areaSel || (d.Area && d.Area === areaSel);
      return aOk && d.Nome && String(d.Nome).trim() !== '' && isDoenca(d);
    });

    // Para cada dia do período, verifica se algum registro cobre aquele dia
    const msDia = 24 * 3600 * 1000;
    const totalDiasPeriodo = Math.round((periodoFim - periodoInicio) / msDia) + 1;
    let diasComAfastamento = 0;

    for (let t = periodoInicio.getTime(); t <= periodoFim.getTime(); t += msDia) {
      const dia = new Date(t);
      const temAfast = todosComArea.some(d => {
        if (!d.DtInicioAfast || !d.DtFimAfast) return false;
        const ini = new Date(d.DtInicioAfast); ini.setHours(0,0,0,0);
        const fim = new Date(d.DtFimAfast);    fim.setHours(0,0,0,0);
        return dia >= ini && dia <= fim;
      });
      if (temAfast) diasComAfastamento++;
    }

    const diasCheios  = totalDiasPeriodo - diasComAfastamento;
    const subDiasCheios = `${diasCheios} dias com 100% do quadro`;

    // ── Card 4: Entrada no INSS (≥ 15 dias, doença) ──
    const inssAtual = atual.filter(d => (d.DiasAfastamento || 0) >= 15 && isDoenca(d));
    const inssAnt   = anterior.filter(d => (d.DiasAfastamento || 0) >= 15 && isDoenca(d));
    const varInss   = variacao(inssAtual.length, inssAnt.length);

    // Preenche tooltip INSS — nome + CID + dias
    const inssTooltipList = document.getElementById('inss-tooltip-list');
    if (inssTooltipList) {
      const pessInss = inssAtual
        .map(d => ({ nome: d.Nome, dias: d.DiasAfastamento || 0, cid: d.CID || '' }))
        .sort((a, b) => b.dias - a.dias);
      inssTooltipList.innerHTML = pessInss.length === 0
        ? '<li class="cid-tooltip-empty">Nenhum registro encontrado.</li>'
        : pessInss.map(p =>
            `<li><span>${p.nome}${p.cid ? ` <span style="opacity:.6;font-size:10px">${p.cid}</span>` : ''}</span><span class="cid-code">${p.dias}d</span></li>`
          ).join('');
    }

    // ── Card 5: CIDs Psiquiátricos ──
    const cidsPsiq    = atual.filter(d => d.CID && String(d.CID).trim().toUpperCase().startsWith('F')).length;
    const cidsPsiqAnt = anterior.filter(d => d.CID && String(d.CID).trim().toUpperCase().startsWith('F')).length;
    const varCids     = variacao(cidsPsiq, cidsPsiqAnt);

    // Alimentar tooltip CIDs
    const tooltipList = document.getElementById('cid-tooltip-list');
    if (tooltipList) {
        const pessoas = atual
            .filter(d => d.CID && String(d.CID).trim().toUpperCase().startsWith('F') && d.Nome)
            .map(d => ({ nome: d.Nome, cid: String(d.CID).trim().toUpperCase() }))
            .sort((a, b) => a.nome.localeCompare(b.nome));
        tooltipList.innerHTML = pessoas.length === 0
            ? '<li class="cid-tooltip-empty">Nenhum registro encontrado.</li>'
            : pessoas.map(p => `<li><span>${p.nome}</span><span class="cid-code">${p.cid}</span></li>`).join('');
    }

    // ── Card 6: Impacto salarial — SOMENTE doença (col J) ──
    const impactoSalarial = atual
        .filter(d => isDoenca(d))
        .reduce((total, d) => {
            const salario = Number(d['Salário'] || 0);
            const dias    = d.DiasAfastamento || 0;
            return total + (salario / 30) * dias;
        }, 0);
    const impactoAnt = anterior
        .filter(d => isDoenca(d))
        .reduce((t,d) => t + (Number(d['Salário']||0)/30)*(d.DiasAfastamento||0), 0);
    const varImpacto = variacao(impactoSalarial, impactoAnt);

    // Ordem física dos cards no grid de atestados:
    // pos1=kpi1, pos2=kpi7(afastados), pos3=kpi2, pos4=kpi3, pos5=kpi4, pos6=kpi5, pos7=kpi6
    // Preenchemos kpi1-6 normalmente + kpi7 separado
    const kpiAtestados = {
      kpi1: { label: 'Total de atestados',      value: totalAtestados,        var: varTotal.texto, dir: varTotal.dir },
      kpi7: { label: 'Afastados no momento',    value: afastadosAgora.length, var: '', dir: 0 },
      kpi2: { label: 'CIDs Psiquiátricos',      value: cidsPsiq,              var: varCids.texto, dir: varCids.dir },
      kpi3: { label: 'Colaboradores afastados', value: colaboradoresAfastados,var: varColab.texto, dir: varColab.dir },
      kpi4: { label: 'Total de dias afastados', value: totalDiasAtual, sub: subDiasCheios, var: varDias.texto, dir: varDias.dir },
      kpi5: { label: 'Entrada no INSS',         value: inssAtual.length, sub: '≥ 15 dias · doença', var: varInss.texto, dir: varInss.dir },
      kpi6: { label: 'Impacto salarial (doença)', value: impactoSalarial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), var: varImpacto.texto, dir: varImpacto.dir },
    };

    // Preenche diretamente por ID em vez de usar array posicional
    Object.entries(kpiAtestados).forEach(([slot, k]) => {
      const n = slot.replace('kpi','');
      const lblEl = document.getElementById('label-kpi' + n);
      const valEl = document.getElementById('kpi-v' + n);
      const subEl = document.getElementById('sub-kpi' + n);
      const varEl = document.getElementById('var-kpi' + n);
      if (lblEl) lblEl.textContent = k.label;
      if (valEl) valEl.textContent = k.value;
      if (subEl) subEl.textContent = k.sub || '';
      if (varEl) {
        if (k.dir > 0) { varEl.innerHTML = `▲ ${k.var}`; varEl.className = 'kpi-variation delta-up'; }
        else if (k.dir < 0) { varEl.innerHTML = `▼ ${k.var}`; varEl.className = 'kpi-variation delta-down'; }
        else { varEl.innerHTML = k.var || ''; varEl.className = 'kpi-variation delta-neutral'; }
      }
    });

    return []; // renderKPIs não precisa iterar — preenchemos diretamente acima
  }
    case 'recrutamento': {
      const rec = data.filter(d => d.Tipo === 'Recrutamento' || d.Tipo === 'Admissão');
      return [
        { label:'Candidatos',          value: fmtN(rec.length),        var:'', dir:0 },
        { label:'Admissões',           value: fmtN(count('Admissão')), var:'', dir:0 },
        { label:'Áreas recrutando',    value: fmtN(uniq(d=>d.Area)),   var:'', dir:0 },
        { label:'Tipos de processo',   value: fmtN(uniq(d=>d.Tipo)),   var:'', dir:0 },
        { label:'Meses com dados',     value: fmtN(uniq(d=>d.Mes)),    var:'', dir:0 },
        { label:'Total de registros',  value: fmtN(data.length),       var:'', dir:0 },
      ];
    }
    case 'offboarding': {
      const dem = data.filter(d => d.Tipo === 'Demissão');
      return [
        { label:'Desligamentos',       value: fmtN(dem.length),        var:'', dir:0 },
        { label:'Colaboradores',       value: fmtN(uniq(d=>d.Nome)),   var:'', dir:0 },
        { label:'Áreas afetadas',      value: fmtN(uniq(d=>d.Area)),   var:'', dir:0 },
        { label:'Movimentações total', value: fmtN(data.length),       var:'', dir:0 },
        { label:'Meses com dados',     value: fmtN(uniq(d=>d.Mes)),    var:'', dir:0 },
        { label:'Total de registros',  value: fmtN(data.length),       var:'', dir:0 },
      ];
    }
    default: {
      const mesSel = document.getElementById('month-select').value;
      const mesAnt = mesSel ? getMesAnterior(mesSel) : null;

      // ── Headcount: média de linha 4 (todos meses) ou valor do mês selecionado ──
      let headcountAtual = null, headcountAnterior = null;
      if (headcountData.length) {
        if (mesSel) {
          const reg = headcountData.find(d => d.mes === mesSel);
          headcountAtual = reg ? Math.ceil(reg.valor) : 0;
          if (mesAnt) {
            const regAnt = headcountData.find(d => d.mes === mesAnt);
            headcountAnterior = regAnt ? Math.ceil(regAnt.valor) : null;
          }
        } else {
          const vals = headcountData.map(d => d.valor).filter(v => v > 0);
          headcountAtual = vals.length ? Math.ceil(vals.reduce((s,v)=>s+v,0) / vals.length) : 0;
        }
      }

      // ── Admissões: conta col A preenchida, filtra col F = mês ──
      const filtrarAdm = (mes) => mes
        ? admissoesData.filter(d => d.mes === mes)
        : admissoesData;
      const admAtual    = filtrarAdm(mesSel).length;
      const admAnterior = mesAnt ? filtrarAdm(mesAnt).length : null;

      // ── Demissões (Offboarding): conta col A preenchida, filtra col E = mês ──
      const filtrarOff = (mes) => mes
        ? offboardingData.filter(d => d.mes === mes)
        : offboardingData;
      const offAtual    = filtrarOff(mesSel).length;
      const offAnterior = mesAnt ? filtrarOff(mesAnt).length : null;

      // ── Variação ──
      const variacao = (atual, anterior, invertColor = false) => {
        if (anterior === null || anterior === 0) return { texto: '', dir: 0, invertColor };
        const pct = ((atual - anterior) / anterior) * 100;
        return {
          texto: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs mês ant.`,
          dir: pct > 0 ? 1 : pct < 0 ? -1 : 0,
          invertColor
        };
      };

      const varHC  = variacao(headcountAtual,  headcountAnterior,  false);
      const varAdm = variacao(admAtual,         admAnterior,        false);
      const varOff = variacao(offAtual,         offAnterior,        true); // aumento demissão = ruim

      const hcLabel = mesSel ? `Total de Colaboradores` : 'Total de Colaboradores';
      const hcSub   = !mesSel && headcountData.length ? `Média dos meses registrados` : '';

      return [
        {
          label: hcLabel,
          value: headcountAtual !== null ? fmtN(headcountAtual) : '—',
          sub:   hcSub,
          var: varHC.texto, dir: varHC.dir, invertColor: false
        },
        {
          label: 'Admissões',
          value: fmtN(admAtual),
          var: varAdm.texto, dir: varAdm.dir, invertColor: false
        },
        {
          label: 'Demissões',
          value: fmtN(offAtual),
          var: varOff.texto, dir: varOff.dir, invertColor: true
        },
        { label: '', value: '', var: '', dir: 0 },
        { label: '', value: '', var: '', dir: 0 },
        { label: '', value: '', var: '', dir: 0 },
      ];
    }
  }
}

/* ── Sparklines ─────────────────────────────── */
function renderSparklines(cat) {
  const MESES = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const sparkColors = [C.blue, C.purple, C.teal, C.green, C.orange, C.pink];

  // Série mensal real para cada card, por categoria
  let series = [];

  if (cat === 'dashboard' || !cat) {
    // spark1: Headcount por mês
    const hcSeries = MESES.map(m => {
      const r = headcountData.find(d => d.mes === m);
      return r ? r.valor : null;
    });
    // spark2: Admissões por mês
    const admSeries = MESES.map(m => admissoesData.filter(d => d.mes === m).length || null);
    // spark3: Demissões por mês
    const offSeries = MESES.map(m => offboardingData.filter(d => d.mes === m).length || null);

    series = [hcSeries, admSeries, offSeries, null, null, null];

  } else if (cat === 'clima') {
    // spark1: Áreas críticas por mês | spark2: Banco de horas por mês | spark3: Pessoas mapeadas
    const mesesList = [...new Set(climaData.map(d => d.mes))].sort();
    const criticasSeries = MESES.map(m => {
      const mesNum = String(mesesList.indexOf(m) + 1).padStart(2,'0');
      return climaData.filter(d => d.mes === m && d.criticidade === 'Alto').length || null;
    });
    const horasSeries = MESES.map(m =>
      climaData.filter(d => d.mes === m).reduce((s, d) => s + (d.bancohoras || 0), 0) || null
    );
    const pessoasSeries = MESES.map(m =>
      climaData.filter(d => d.mes === m).reduce((s, d) => s + (d.pessoas || 0), 0) || null
    );
    series = [criticasSeries, horasSeries, pessoasSeries, null, null, null];

  } else if (cat === 'offboarding') {
    const offTotSeries  = MESES.map(m => offboardingData.filter(d => d.mes === m).length || null);
    const offVolSeries  = MESES.map(m => offboardingData.filter(d => d.mes === m && (String(d.tipo||'').toLowerCase().includes('vol'))).length || null);
    const offInvSeries  = MESES.map(m => offboardingData.filter(d => d.mes === m && (String(d.tipo||'').toLowerCase().includes('inv'))).length || null);
    series = [offTotSeries, offVolSeries, offInvSeries, null, null, null];

  } else if (cat === 'admissoes') {
    const admTotSeries = MESES.map(m => admissoesData.filter(d => d.mes === m).length || null);
    series = [admTotSeries, null, null, null, null, null];

  } else if (cat === 'atestados') {
    const base = hasRealData ? getFiltered() : [];
    const atestSeries = MESES.map(m => base.filter(d => String(d.Mes).padStart(2,'0') === m).length || null);
    series = [atestSeries, null, null, null, null, null];

  } else {
    // fallback genérico
    const base = hasRealData ? getFiltered() : [];
    const counts = MESES.map(m => base.filter(d => String(d.Mes).padStart(2,'0') === m).length || null);
    series = [counts, counts, counts, counts, counts, counts];
  }

  for (let i = 1; i <= 6; i++) {
    const ctx = document.getElementById('spark' + i);
    if (!ctx) continue;
    if (charts['spark'+i]) { charts['spark'+i].destroy(); }

    const data = series[i-1];
    // Se sem dados reais, não renderiza
    const hasAnyData = data && data.some(v => v !== null && v > 0);
    if (!hasAnyData) {
      // Limpa o canvas
      const c2 = ctx.getContext('2d');
      if (c2) c2.clearRect(0, 0, ctx.width, ctx.height);
      continue;
    }

    charts['spark'+i] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: MESES,
        datasets: [{
          data,
          borderColor: sparkColors[i-1],
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.4,
          fill: false,
          spanGaps: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  }
}

/* ═══════════════════════════════════════════
   GRÁFICOS
═══════════════════════════════════════════ */
function destroyCharts() {
  Object.keys(charts).forEach(k => {
    try { if (charts[k]) charts[k].destroy(); } catch(e) {}
    delete charts[k];
  });
}

function isDark() { return document.body.classList.contains('dark-mode'); }

function chartTheme() {
  const dark = isDark();
  return {
    grid:  dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)',
    tick:  dark ? '#94a3b8' : '#64748b',
    text:  dark ? '#f1f5f9' : '#1a1a2e',
    bg:    dark ? 'rgba(30,37,53,.95)' : 'rgba(255,255,255,.95)',
  };
}

// Formata número decimal de horas em HH:mm (ex: 8.5 → "8:30", -2.25 → "-2:15")
function fmtHoras(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const neg  = v < 0;
  const abs  = Math.abs(v);
  const h    = Math.floor(abs);
  const m    = Math.round((abs - h) * 60);
  return (neg ? '-' : '') + h + 'h' + (m > 0 ? String(m).padStart(2,'0') : '');
}

function baseOptions(extra = {}) {
  const t = chartTheme();
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: t.tick,
          font: { size: 11, family: "'Segoe UI', sans-serif" },
          padding: 14,
          usePointStyle: true,
          boxWidth: 8,
        }
      },
      tooltip: {
        backgroundColor: t.bg,
        titleColor: t.text,
        bodyColor: t.tick,
        borderColor: isDark() ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)',
        borderWidth: 1,
        padding: 10,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
      }
    },
    scales: {
      x: {
        ticks: { color: t.tick, font: { size: 11 } },
        grid:  { color: t.grid },
        border:{ display: false },
      },
      y: {
        ticks: { color: t.tick, font: { size: 11 } },
        grid:  { color: t.grid },
        border:{ display: false },
        beginAtZero: true,
      }
    },
    ...extra
  };
}

function mkChart(id, type, labels, datasets, extraOpts = {}) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: baseOptions(extraOpts),
  });
}

/* Dados reais agregados */
function countBy(data, key) {
  const m = {};
  data.forEach(d => { const v = d[key]||'N/A'; m[v] = (m[v]||0) + 1; });
  return Object.entries(m).sort((a,b) => b[1]-a[1]);
}

/* ═══════════════════════════════════════════
   RENDER ATIVOS (Folha + Experiência + Gráficos)
═══════════════════════════════════════════ */
function openOffExitModal(key) {
  const lists = window._offExitLists;
  if (!lists || !lists[key]) return;
  const pessoas = lists[key];

  const titles = {
    '3m': 'Saíram em até 3 meses',
    '6m': 'Saíram em até 6 meses',
    '1a': 'Saíram antes de 1 ano'
  };
  const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const title = document.getElementById('expModalTitle');
  const body  = document.getElementById('expModalBody');
  const overlay = document.getElementById('expModalOverlay');
  if (!title || !body || !overlay) return;

  title.textContent = `${titles[key] || 'Colaboradores'} — ${pessoas.length} colaboradores`;

  if (!pessoas.length) {
    body.innerHTML = '<div class="exp-list-empty">Nenhum colaborador neste período.</div>';
  } else {
    const ord = [...pessoas].sort((a, b) => (a.diasTrabalhados||0) - (b.diasTrabalhados||0));
    const tcLabel = key === '3m' ? 'Tempo de casa (dias)' : 'Tempo de casa (meses)';
    body.innerHTML = `
      <table class="exp-list-table">
        <thead><tr><th>Nome</th><th>Área</th><th>Classificação</th><th>${tcLabel}</th><th>Mês desligamento</th></tr></thead>
        <tbody>` +
      ord.map(d => {
        const mesLbl = d.mes ? (MESES_LABEL[parseInt(d.mes)-1] || d.mes) : '—';
        let tc = '—';
        if (d.diasTrabalhados !== null) {
          if (key === '3m') {
            tc = `${d.diasTrabalhados} dias`;
          } else {
            const meses = Math.round(d.diasTrabalhados / 30);
            tc = `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
          }
        }
        return `<tr>
          <td>${d.nome}</td>
          <td>${d.area||'—'}</td>
          <td>${d.classificacao||'—'}</td>
          <td>${tc}</td>
          <td>${mesLbl}</td>
        </tr>`;
      }).join('') +
      `</tbody></table>`;
  }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function openExpModal(tipo) {
  const overlay = document.getElementById('expModalOverlay');
  const title   = document.getElementById('expModalTitle');
  const body    = document.getElementById('expModalBody');
  if (!overlay || !title || !body) return;

  const bodyId = tipo === '45' ? 'exp45ListBody' : 'exp90ListBody';
  const src = document.getElementById(bodyId);
  title.textContent = tipo === '45'
    ? `Exp. até 45 dias — ${document.getElementById('ativosExp45').textContent} colaboradores`
    : `Exp. 45 a 90 dias — ${document.getElementById('ativosExp90').textContent} colaboradores`;
  body.innerHTML = src ? src.innerHTML : '';
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeExpModal(e) {
  if (e && e.target !== document.getElementById('expModalOverlay')) return;
  const overlay = document.getElementById('expModalOverlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Fecha com Esc
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeExpModal(); closePeDetail(); } });

function renderAtivos() {
  const panel = document.getElementById('ativosPanel');
  if (!ativosData.length) {
    if (panel) panel.style.display = 'none';
    const fallback = document.getElementById('semaforoGridFallback');
    if (fallback) fallback.style.display = '';
    return;
  }
  panel.style.display = 'block';
  const fallback = document.getElementById('semaforoGridFallback');
  if (fallback) fallback.style.display = 'none';

  const areaFiltro   = document.getElementById('ativosFilterArea')?.value   || '';
  const gestorFiltro = document.getElementById('ativosFilterGestor')?.value || '';

  // Repopula selects sempre (preserva seleção atual)
  const selArea   = document.getElementById('ativosFilterArea');
  const selGestor = document.getElementById('ativosFilterGestor');
  if (selArea) {
    const curArea = selArea.value;
    selArea.innerHTML = '<option value="">Todas</option>';
    [...new Set(ativosData.map(d => d.area).filter(Boolean))].sort()
      .forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; selArea.appendChild(o); });
    selArea.value = curArea;
  }
  if (selGestor) {
    const curGestor = selGestor.value;
    selGestor.innerHTML = '<option value="">Todos</option>';
    // Gestores filtrados pela área selecionada (se houver)
    const gestoresFiltrados = [...new Set(
      ativosData.filter(d => !areaFiltro || d.area === areaFiltro).map(d => d.gestor).filter(Boolean)
    )].sort();
    gestoresFiltrados.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; selGestor.appendChild(o); });
    selGestor.value = curGestor;
  }

  const filtered = ativosData.filter(d =>
    (!areaFiltro   || d.area   === areaFiltro) &&
    (!gestorFiltro || d.gestor === gestorFiltro)
  );

  // ── 1. Headcount: gráfico (sem mês) OU cards início/fim (com mês) ──
  const mesSel = document.getElementById('month-select').value;
  const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const t = chartTheme();
  const chartWrap = document.getElementById('ativosChartWrap');
  const mesCards  = document.getElementById('ativosMesCards');
  const evolTitle = document.getElementById('ativosEvolTitle');

  if (mesSel && headcountData.length) {
    // Mês selecionado: esconde gráfico, mostra dois cards
    if (chartWrap) chartWrap.style.display = 'none';
    if (mesCards)  mesCards.style.display  = 'flex';
    if (charts['chartMovement']) { charts['chartMovement'].destroy(); delete charts['chartMovement']; }

    const reg = headcountData.find(d => d.mes === mesSel);
    const nomeMes = MESES_LABEL[parseInt(mesSel) - 1];
    if (evolTitle) evolTitle.textContent = `Headcount — ${nomeMes}`;
    document.getElementById('ativosMesInicio').textContent = reg?.inicio != null ? Math.ceil(reg.inicio) : '—';
    document.getElementById('ativosMesFim').textContent    = reg?.fim    != null ? Math.ceil(reg.fim)    : '—';

  } else {
    // Sem mês: mostra gráfico, esconde cards
    if (chartWrap) chartWrap.style.display = '';
    if (mesCards)  mesCards.style.display  = 'none';
    if (evolTitle) evolTitle.textContent = 'Evolução de Colaboradores — Últimos 12 Meses';

    let labels = [], valoresHC = [], valoresAdm = [], valoresOff = [];
    if (headcountData.length) {
      const ord = [...headcountData].sort((a,b) => a.mes.localeCompare(b.mes));
      labels     = ord.map(d => MESES_LABEL[parseInt(d.mes)-1]);
      valoresHC  = ord.map(d => d.valor);
      valoresAdm = ord.map(d => admissoesData.filter(a => a.mes === d.mes).length || null);
      valoresOff = ord.map(d => offboardingData.filter(o => o.mes === d.mes).length || null);
    } else {
      labels = MESES_LABEL;
      valoresHC = new Array(12).fill(null);
      valoresAdm = new Array(12).fill(null);
      valoresOff = new Array(12).fill(null);
    }
    if (charts['chartMovement']) charts['chartMovement'].destroy();
    const ctxM = document.getElementById('chartMovement');
    if (ctxM) {
      charts['chartMovement'] = new Chart(ctxM, {
        type: 'line',
        data: { labels, datasets: [
          { label: 'Headcount', data: valoresHC, borderColor: C.blue, backgroundColor: 'rgba(0,120,212,.08)', borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: C.blue, spanGaps: true, type: 'line' },
          { label: 'Admissões', data: valoresAdm, backgroundColor: 'rgba(16,124,16,.75)', borderColor: C.green, borderWidth: 1, borderRadius: 3, spanGaps: true, type: 'bar' },
          { label: 'Demissões', data: valoresOff, backgroundColor: 'rgba(231,76,60,.75)', borderColor: C.red, borderWidth: 1, borderRadius: 3, spanGaps: true, type: 'bar' },
        ]},
        options: baseOptions({ plugins: { legend: { display: true } }, scales: { y: { min: 0, ticks: { stepSize: 25 } } } })
      });
    }
  }

  // ── 2. Folha de pagamento ──
  const totalFolha = filtered.reduce((s, d) => s + (d.salario || 0), 0);
  const fmtMoeda = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  document.getElementById('ativosFolha').textContent     = fmtMoeda(totalFolha);
  document.getElementById('ativosFolhaSub').textContent  = `${filtered.length} colaboradores`;

  // ── 3. Tempo médio de casa ──
  const hoje = new Date();
  const comAdm = filtered.filter(d => d.dtAdm instanceof Date && !isNaN(d.dtAdm));
  let tempoCasaMedia = '—';
  if (comAdm.length) {
    const somaAnos = comAdm.reduce((s, d) => s + (hoje - d.dtAdm) / (365.25 * 24 * 3600 * 1000), 0);
    const mediaAnos = somaAnos / comAdm.length;
    const anos = Math.floor(mediaAnos);
    const meses = Math.round((mediaAnos - anos) * 12);
    if (anos === 0) tempoCasaMedia = `${meses}m`;
    else if (meses === 0) tempoCasaMedia = `${anos}a`;
    else tempoCasaMedia = `${anos}a ${meses}m`;
  }
  document.getElementById('ativosTempoCasa').textContent = tempoCasaMedia;

  // ── 4. Períodos de experiência (respeita filtro de área/gestor) ──
  const exp45 = filtered.filter(d => {
    if (!d.dtAdm) return false;
    const dias = (hoje - d.dtAdm) / (24 * 3600 * 1000);
    return dias >= 0 && dias <= 45;
  });
  const exp90 = filtered.filter(d => {
    if (!d.dtAdm) return false;
    const dias = (hoje - d.dtAdm) / (24 * 3600 * 1000);
    return dias > 45 && dias <= 90;
  });
  document.getElementById('ativosExp45').textContent = exp45.length;
  document.getElementById('ativosExp90').textContent = exp90.length;

  // Tooltips: construção do HTML (exibição via CSS hover no .ativos-exp-card)
  const buildTooltip = (id, pessoas) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!pessoas.length) {
      el.innerHTML = '<div class="ativos-exp-empty">Nenhum colaborador neste período.</div>';
      return;
    }
    const fmtData = d => d instanceof Date ? d.toLocaleDateString('pt-BR') : '—';
    const ord = [...pessoas].sort((a,b) => a.nome.localeCompare(b.nome));
    el.innerHTML =
      `<div class="ativos-exp-tooltip-title">Colaboradores (${ord.length})</div>` +
      ord.map(d => {
        const dias = d.dtAdm ? Math.floor((hoje - d.dtAdm) / (24*3600*1000)) : null;
        return `<div class="ativos-exp-tooltip-item">
          <span class="exp-nome">${d.nome}</span>
          <span class="exp-data">${dias !== null ? dias + ' dias' : '—'} · Adm: ${fmtData(d.dtAdm)}</span>
        </div>`;
      }).join('');
  };
  buildTooltip('ativosExp45Tooltip', exp45);
  buildTooltip('ativosExp90Tooltip', exp90);

  // ── 5. Gráficos ──

  // Sexo
  const sexMap = {};
  filtered.forEach(d => { const s = (d.sexo||'').trim()||'Não informado'; sexMap[s] = (sexMap[s]||0)+1; });
  const sexLabels = Object.keys(sexMap);
  if (charts['chartAtivosGenero']) charts['chartAtivosGenero'].destroy();
  const ctxG = document.getElementById('chartAtivosGenero');
  if (ctxG) {
    charts['chartAtivosGenero'] = new Chart(ctxG, {
      type: 'doughnut',
      data: { labels: sexLabels, datasets: [{ data: Object.values(sexMap), backgroundColor: ['#0078d4','#d83b81','#7030a0','#00b7c3','#ff8c00'].slice(0, sexLabels.length), borderWidth: 2, borderColor: isDark() ? '#1e2535' : '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: t.tick, font: { size: 11 }, padding: 12, usePointStyle: true, boxWidth: 8 } }, tooltip: { backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick, borderWidth: 1, borderColor: isDark() ? 'rgba(255,255,255,.1)':'rgba(0,0,0,.08)' } } }
    });
  }

  // Classificação — ordem de senioridade com valores exatos da planilha
  const SENIORITY_ORDER_ATIVOS = [
    'CEO', 'Diretor', 'Head', 'Gerente', 'Coordenador',
    'Especialista', 'Analista', 'Assistente', 'Estagiário', 'Estagiario', 'Jovem Aprendiz'
  ];
  const clasMap = {};
  filtered.forEach(d => { const c = d.classificacao || 'Não informado'; clasMap[c] = (clasMap[c]||0)+1; });
  const normAtivos = s => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normMapAtivos = SENIORITY_ORDER_ATIVOS.reduce((m, v, i) => { m[normAtivos(v)] = i; return m; }, {});
  const rankOfAtivos = label => { const r = normMapAtivos[normAtivos(label)]; return r !== undefined ? r : 999; };
  const clasEntries = Object.entries(clasMap).sort((a, b) => rankOfAtivos(a[0]) - rankOfAtivos(b[0]));
  if (charts['chartAtivosClassificacao']) charts['chartAtivosClassificacao'].destroy();
  const ctxC = document.getElementById('chartAtivosClassificacao');
  if (ctxC) {
    const clasColors = clasEntries.map((_, i) => {
      const palette = ['#2d3748','#4a5568','#553c9a','#7030a0','#0078d4','#0097a7','#107c10','#ff8c00','#e65c00','#d83b81','#a31515'];
      return palette[i % palette.length];
    });
    charts['chartAtivosClassificacao'] = new Chart(ctxC, {
      type: 'bar',
      data: { labels: clasEntries.map(e=>e[0]), datasets: [{ label: 'Colaboradores', data: clasEntries.map(e=>e[1]), backgroundColor: clasColors, borderRadius: 5, borderSkipped: false }] },
      options: { ...baseOptions({ plugins: { legend: { display: false } }, scales: { x: { ticks: { color: t.tick, font: { size: 10 }, maxRotation: 35 } }, y: { beginAtZero: true, ticks: { color: t.tick, stepSize: 1 } } } }), responsive: true, maintainAspectRatio: false }
    });
  }

  // Liderança vs Não-Liderança
  const LIDERANCAS    = ['ceo','diretor','head','gerente','coordenador'];
  const NAO_LIDERANCAS = ['especialista','analista','assistente','auxiliar','estagiário','estagiario','jovem aprendiz'];
  let cntLider = 0, cntNaoLider = 0, cntOther = 0;
  filtered.forEach(d => {
    const c = (d.classificacao||'').toLowerCase().trim();
    if (LIDERANCAS.some(l => c.includes(l)))         cntLider++;
    else if (NAO_LIDERANCAS.some(l => c.includes(l))) cntNaoLider++;
    else cntOther++;
  });
  const liderLabels = ['Liderança','Não Liderança', ...(cntOther ? ['Outros'] : [])];
  const liderData   = [cntLider, cntNaoLider, ...(cntOther ? [cntOther] : [])];
  if (charts['chartAtivosLideranca']) charts['chartAtivosLideranca'].destroy();
  const ctxL = document.getElementById('chartAtivosLideranca');
  if (ctxL) {
    charts['chartAtivosLideranca'] = new Chart(ctxL, {
      type: 'doughnut',
      data: { labels: liderLabels, datasets: [{ data: liderData, backgroundColor: ['#7030a0','#0078d4','#9ca3af'], borderWidth: 2, borderColor: isDark() ? '#1e2535' : '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: t.tick, font: { size: 11 }, padding: 12, usePointStyle: true, boxWidth: 8 } }, tooltip: { backgroundColor: t.bg, titleColor: t.text, bodyColor: t.tick, borderWidth: 1, borderColor: isDark() ? 'rgba(255,255,255,.1)':'rgba(0,0,0,.08)' } } }
    });
  }

  // Estado
  const estMap = {};
  filtered.forEach(d => { const e = (d.estado||'N/I').trim()||'N/I'; estMap[e] = (estMap[e]||0)+1; });
  const estEntries = Object.entries(estMap).sort((a,b) => b[1]-a[1]);
  if (charts['chartAtivosEstado']) charts['chartAtivosEstado'].destroy();
  const ctxE = document.getElementById('chartAtivosEstado');
  if (ctxE) {
    charts['chartAtivosEstado'] = new Chart(ctxE, {
      type: 'bar',
      data: { labels: estEntries.map(e=>e[0]), datasets: [{ label: 'Colaboradores', data: estEntries.map(e=>e[1]), backgroundColor: C.teal, borderRadius: 5, borderSkipped: false }] },
      options: { ...baseOptions({ plugins: { legend: { display: false } }, scales: { x: { ticks: { color: t.tick, font: { size: 11 } } }, y: { beginAtZero: true, ticks: { color: t.tick, stepSize: 1 } } } }), responsive: true, maintainAspectRatio: false }
    });
  }

  // ── 6. Dados das listas (ocultos, usados pelo modal) ──
  const buildExpList = (bodyId, pessoas) => {
    const el = document.getElementById(bodyId);
    if (!el) return;
    if (!pessoas.length) {
      el.innerHTML = '<div class="exp-list-empty">Nenhum colaborador neste período.</div>';
      return;
    }
    const fmtData = d => d instanceof Date ? d.toLocaleDateString('pt-BR') : '—';
    // Ordena por dtAdm descendente (admissão mais recente primeiro)
    const ord = [...pessoas].sort((a, b) => {
      if (!a.dtAdm && !b.dtAdm) return 0;
      if (!a.dtAdm) return 1;
      if (!b.dtAdm) return -1;
      return b.dtAdm - a.dtAdm;
    });
    el.innerHTML = `
      <table class="exp-list-table">
        <thead><tr><th>Nome</th><th>Área</th><th>Cargo</th><th>Dias</th><th>Admissão</th></tr></thead>
        <tbody>` +
      ord.map(d => {
        const dias = d.dtAdm ? Math.floor((hoje - d.dtAdm) / (24*3600*1000)) : null;
        return `<tr>
          <td>${d.nome}</td>
          <td>${d.area||'—'}</td>
          <td>${d.cargo||'—'}</td>
          <td>${dias !== null ? dias : '—'}</td>
          <td>${fmtData(d.dtAdm)}</td>
        </tr>`;
      }).join('') +
      `</tbody></table>`;
  };
  buildExpList('exp45ListBody', exp45);
  buildExpList('exp90ListBody', exp90);
}

function renderCharts(cat) {
  const data = hasRealData ? getFiltered() : [];
  const hasD = data.length > 0;

  // Esconde botão "Ver mais" do Turnover em abas que não são offboarding
  const btnVerMais = document.getElementById('turnoverVerMais');
  if (btnVerMais) btnVerMais.style.display = cat === 'offboarding' ? 'inline-flex' : 'none';

  const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MESES_NUM   = ['01','02','03','04','05','06','07','08','09','10','11','12'];

  switch(cat) {

    /* ── VISÃO GERAL ── */
    case 'dashboard': {
      renderSemaforo();
      renderAtivos();
      break;
    }

   /* ── ATESTADOS ── */
case 'atestados': {

    const monthSelecionado =
        document.getElementById('month-select').value;

    const areaSelecionada =
        document.getElementById('area-select').value;

    const dadosAtestados =
        allData.filter(d => {
            const mesOk  = !monthSelecionado || getMesReferencia(d) === monthSelecionado;
            const areaOk = !areaSelecionada  || (d.Area && d.Area === areaSelecionada);
            return mesOk && areaOk && d.Nome && String(d.Nome).trim() !== '';
        });

    const showAtestados = dadosAtestados.length > 0;
    document.getElementById('emptyAtestados').style.display  = showAtestados ? 'none' : 'flex';
    document.getElementById('chartsAtestados').style.display = showAtestados ? 'grid' : 'none';

    if (!showAtestados) {
        break;
    }

    /* ========= GRÁFICO ÁREA ========= */
    const porArea = {};
    dadosAtestados.forEach(d => {
        const area = d.Area && String(d.Area).trim();
        if (!area) return; // ignora linha sem área preenchida
        porArea[area] = (porArea[area] || 0) + 1;
    });

    mkChart(
        'chartAtestadosArea',
        'bar',
        Object.keys(porArea),
        [{
            label:'Atestados',
            data:Object.values(porArea),
            backgroundColor:C.orange,
            borderRadius:4
        }],
        {
            plugins:{
                legend:{ display:false }
            },
            scales:{
                x:{ ticks:{ font:{ size:9 }, maxRotation:35 } }
            }
        }
    );

    /* ========= EVOLUÇÃO ========= */

    if (!monthSelecionado) {

        const atestadosMes = [];
        const pessoasMes = [];

        MESES_NUM.forEach(mes => {

            const registros =
    allData.filter(d => {

        const mesOk =
            getMesReferencia(d) === mes;

        const areaOk =
            !areaSelecionada ||
            d.Area === areaSelecionada;

        return mesOk && areaOk;
    });

            atestadosMes.push(
                registros.length
            );

            pessoasMes.push(
                new Set(
                    registros.map(
                        d => d.Nome
                    )
                ).size
            );
        });

        mkChart(
            'chartAtestadosEvolution',
            'line',
            MESES_LABEL,
            [
                {
                    label:'Atestados',
                    data:atestadosMes,
                    borderColor:C.orange,
                    backgroundColor:'rgba(255,140,0,.1)',
                    borderWidth:3,
                    tension:.3
                },
                {
                    label:'Pessoas distintas',
                    data:pessoasMes,
                    borderColor:C.blue,
                    backgroundColor:'rgba(0,120,212,.1)',
                    borderWidth:3,
                    tension:.3
                }
            ]
        );

    } else {

        // Gera todos os dias do mês selecionado (01 até último dia)
        const mesNum  = parseInt(monthSelecionado);
        const anoNum  = new Date().getFullYear();
        const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
        const todosOsDias = Array.from({ length: ultimoDia }, (_, i) =>
            String(i + 1).padStart(2, '0')
        );

        const diasMap = {};
        todosOsDias.forEach(d => { diasMap[d] = 0; });

        dadosAtestados.forEach(d => {
            const raw = d.DtInicioAfast || d['DATA INÍCIO AFASTAMENTO'] || d['DATA INICIO AFASTAMENTO'];
            if (!raw) return;
            const dataIni = raw instanceof Date ? raw : excelDateToJS(raw);
            if (!dataIni || isNaN(dataIni)) return;
            const dia = String(dataIni.getDate()).padStart(2, '0');
            if (diasMap[dia] !== undefined) diasMap[dia]++;
        });

        mkChart(
            'chartAtestadosEvolution',
            'line',
            todosOsDias,
            [{
                label:'Atestados',
                data: todosOsDias.map(d => diasMap[d]),
                borderColor:C.orange,
                backgroundColor:'rgba(255,140,0,.1)',
                borderWidth:3,
                tension:.3,
                fill: true,
            }],
            {
                scales:{
                    x:{ ticks:{ font:{ size:9 }, maxRotation:0 } }
                }
            }
        );
    }

    /* ========= GRÁFICO CLASSIFICAÇÃO ========= */
    const porClassificacao = {};
    dadosAtestados.forEach(d => {
        const cls = (d['CLASSIFICAÇÃO'] || d['CLASSIFICACAO'] || '').trim();
        if (!cls) return;
        porClassificacao[cls] = (porClassificacao[cls] || 0) + 1;
    });

    if (Object.keys(porClassificacao).length > 0) {
        // Lista do mais júnior (topo do array = topo do gráfico horizontal) ao mais sênior (base)
        const SENIORITY_ORDER = [
            'Jovem Aprendiz', 'Estagiário', 'Estagiario',
            'Assistente',
            'Analista Júnior', 'Analista Junior',
            'Analista Pleno',
            'Analista Sênior', 'Analista Senior',
            'Especialista',
            'Supervisor',
            'Coordenador',
            'Gerente',
            'Head',
            'Diretor',
            'CEO'
        ];
        const norm = s => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normMap = SENIORITY_ORDER.reduce((m, v, i) => { m[norm(v)] = i; return m; }, {});
        const rankOf = label => { const r = normMap[norm(label)]; return r !== undefined ? r : 500; };

        // Ordena: CEO (rank alto) no fim do array → topo do gráfico horizontal (renderiza de baixo para cima)
        const clsLabels = Object.keys(porClassificacao).sort((a, b) => rankOf(a) - rankOf(b));
        const clsValues = clsLabels.map(k => porClassificacao[k]);
        const clsColors = clsLabels.map((_, i) => PALETTE[i % PALETTE.length]);

        mkChart(
            'chartAtestadosClassificacao',
            'bar',
            clsLabels,
            [{
                label: 'Atestados',
                data: clsValues,
                backgroundColor: clsColors,
                borderRadius: 5,
                borderSkipped: false
            }],
            {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { ticks: { font: { size: 11 } } }
                }
            }
        );
    }

    break;
}
    /* ── CLIMA ── */
    case 'clima': {
      const temClima = climaData.length > 0;
      document.getElementById('emptyClima').style.display    = temClima ? 'none' : 'flex';
      document.getElementById('chartsClima').style.display   = temClima ? 'block' : 'none';
      if (!temClima) break;

      const mesSel      = document.getElementById('month-select').value;
      const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const MESES_NUM   = ['01','02','03','04','05','06','07','08','09','10','11','12'];
      const t = chartTheme();

      // Banco de horas = saldo corrente. Sem mês → mês atual do calendário.
      const mesAtual  = String(new Date().getMonth() + 1).padStart(2, '0');
      const mesRef    = mesSel || mesAtual;
      const mesAntRef = mesRef ? getMesAnterior(mesRef) : null;
      const mesRefLabel = mesRef ? MESES_LABEL[parseInt(mesRef)-1] : '—';

      const CD    = mesRef    ? climaData.filter(r => r.mes === mesRef)    : [];
      const CDAnt = mesAntRef ? climaData.filter(r => r.mes === mesAntRef) : [];
      const todasAreas = [...new Set(climaData.map(r => r.area))];

      const CRIT_COLOR = { 'Alto':'#e81123','Médio':'#ff8c00','Medio':'#ff8c00','Baixo':'#107c10','':'#94a3b8' };

      // ── KPI CARDS GLOBAIS (4) ──
      const criticas      = CD.filter(r => r.criticidade === 'Alto').length;
      const criticasAnt   = CDAnt.filter(r => r.criticidade === 'Alto').length;
      const totalHoras    = CD.filter(r => r.bancohoras !== null).reduce((s,r)=>s+(r.bancohoras||0),0);
      const totalHorasAnt = CDAnt.filter(r => r.bancohoras !== null).reduce((s,r)=>s+(r.bancohoras||0),0);
      const totalPessoas    = CD.filter(r=>r.pessoas>0).reduce((s,r)=>s+r.pessoas,0);
      const totalPessoasAnt = CDAnt.filter(r=>r.pessoas>0).reduce((s,r)=>s+r.pessoas,0);
      const hppRows    = CD.filter(r=>r.horasPorPessoa!==null);
      const hppMedia   = hppRows.length ? hppRows.reduce((s,r)=>s+r.horasPorPessoa,0)/hppRows.length : null;
      const hppRowsAnt = CDAnt.filter(r=>r.horasPorPessoa!==null);
      const hppMediaAnt= hppRowsAnt.length ? hppRowsAnt.reduce((s,r)=>s+r.horasPorPessoa,0)/hppRowsAnt.length : null;

      const kpiClima = [
        { id:'kpi-v1', lbl:'Áreas em Alerta (Alto)',              val: criticas||'0',       varV: criticas-criticasAnt,          ant: criticasAnt,    inv:true  },
        { id:'kpi-v2', lbl:`Banco de Horas Total — ${mesRefLabel}`, val: fmtHoras(totalHoras), varV: totalHoras-totalHorasAnt, ant: totalHorasAnt, inv:true },
        { id:'kpi-v3', lbl:`Pessoas Mapeadas — ${mesRefLabel}`,   val: totalPessoas||'—',   varV: totalPessoas-totalPessoasAnt,  ant: totalPessoasAnt, inv:false },
        { id:'kpi-v4', lbl:`Média Horas/Pessoa — ${mesRefLabel}`, val: fmtHoras(hppMedia), varV: hppMedia&&hppMediaAnt?hppMedia-hppMediaAnt:null, ant:hppMediaAnt, inv:true },
        { id:'kpi-v5', lbl:'', val:'', varV:null, ant:null, inv:false },
        { id:'kpi-v6', lbl:'', val:'', varV:null, ant:null, inv:false },
      ];
      document.querySelectorAll('.kpi-card').forEach((c,i)=>{ c.style.display=i<4?'':'none'; });
      const kpiContainer = document.querySelector('.kpi-container');
      if (kpiContainer) kpiContainer.style.gridTemplateColumns='repeat(4,1fr)';
      const svgUp = '<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,1 9,8 1,8"/></svg>';
      const svgDn = '<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,9 9,2 1,2"/></svg>';
      kpiClima.forEach(k => {
        const valEl=document.getElementById(k.id), lblEl=document.getElementById(k.id.replace('kpi-v','label-kpi')), varEl=document.getElementById(k.id.replace('kpi-v','var-kpi'));
        if(valEl) valEl.textContent=k.val;
        if(lblEl) lblEl.textContent=k.lbl;
        if(varEl){
          if(k.varV!==null && k.ant!==null && k.ant!==0){
            const pct=(k.varV/k.ant*100).toFixed(1), dir=k.varV>0?1:k.varV<0?-1:0, cor=k.inv?-dir:dir;
            varEl.innerHTML=`${dir>0?svgUp:dir<0?svgDn:''} ${k.varV>0?'+':''}${pct}% vs mês ant.`;
            varEl.className=`kpi-variation ${cor>0?'delta-up':cor<0?'delta-down':'delta-neutral'}`;
          } else { varEl.innerHTML=''; varEl.className='kpi-variation delta-neutral'; }
        }
      });

      // ── CARDS DE ÁREA (horizontal scroll, todas as áreas ordenadas por criticidade) ──
      const areaCardsEl = document.getElementById('climaAreaCards');
      if (areaCardsEl) {
        const CRIT_ORDER = {'Alto':0,'Médio':1,'Medio':1,'Baixo':2,'':3};
        const areasSorted = todasAreas
          .filter(a => CD.some(r=>r.area===a))
          .sort((a,b)=>{
            const ca=CRIT_ORDER[CD.find(r=>r.area===a)?.criticidade||'']??3;
            const cb=CRIT_ORDER[CD.find(r=>r.area===b)?.criticidade||'']??3;
            return ca-cb || a.localeCompare(b,'pt-BR');
          });

        areaCardsEl.innerHTML = areasSorted.map(area => {
          const cur = CD.find(r=>r.area===area)||{};
          const ant = CDAnt.find(r=>r.area===area)||{};
          const crit   = cur.criticidade || '';
          const cor    = CRIT_COLOR[crit]||'#94a3b8';
          const horas  = cur.bancohoras !== null && cur.bancohoras !== undefined ? cur.bancohoras : null;
          const hAnt   = ant.bancohoras !== null && ant.bancohoras !== undefined ? ant.bancohoras : null;
          const pessoas= cur.pessoas  || null;
          const hpp    = cur.horasPorPessoa !== null && cur.horasPorPessoa !== undefined ? cur.horasPorPessoa : null;
          const hppA   = ant.horasPorPessoa !== null && ant.horasPorPessoa !== undefined ? ant.horasPorPessoa : null;

          const varBadge = (v, a, inv=false) => {
            if(v===null||a===null||a===0) return '';
            const diff=v-a, pct=(diff/a*100).toFixed(1), dir=diff>0?1:diff<0?-1:0, cor2=inv?-dir:dir;
            const arrow=dir>0?'▲':dir<0?'▼':'';
            const cls=cor2>0?'clima-var-up':cor2<0?'clima-var-down':'clima-var-neu';
            return `<span class="${cls}">${arrow} ${diff>0?'+':''}${pct}%</span>`;
          };

          const critLabel = crit ? `<span class="clima-card-crit" style="background:${cor}22;color:${cor};border-color:${cor}44">${crit}</span>` : '';

          return `<div class="clima-area-card" style="border-top:3px solid ${cor}">
            <div class="clima-card-top">
              <div class="clima-card-nome">${area}</div>
              ${critLabel}
            </div>
            <div class="clima-card-metrics">
              <div class="clima-card-metric">
                <div class="clima-metric-label">Pessoas</div>
                <div class="clima-metric-value">${pessoas!==null?pessoas:'—'}</div>
              </div>
              <div class="clima-card-metric">
                <div class="clima-metric-label">Banco de Horas</div>
                <div class="clima-metric-value">${fmtHoras(horas)} ${varBadge(horas,hAnt,true)}</div>
              </div>
              <div class="clima-card-metric">
                <div class="clima-metric-label">Horas/Pessoa</div>
                <div class="clima-metric-value">${fmtHoras(hpp)} ${varBadge(hpp,hppA,true)}</div>
              </div>
            </div>
          </div>`;
        }).join('');
      }

      // ── FILTRO DE ÁREA (multi-select via checkboxes) ──
      const climaAreasSel = () => {
        const checks = document.querySelectorAll('.clima-area-check:checked');
        return checks.length ? [...checks].map(c=>c.value) : null; // null = todas
      };
      // Popular dropdown de filtro se ainda não tem as opções
      const filterList = document.getElementById('climaFilterList');
      if (filterList && filterList.children.length === 0) {
        todasAreas.sort().forEach(a => {
          const li = document.createElement('label');
          li.className = 'clima-filter-opt';
          li.innerHTML = `<input type="checkbox" class="clima-area-check" value="${a}" onchange="renderCharts('clima')"> ${a}`;
          filterList.appendChild(li);
        });
      }

      // ── GRÁFICO: EVOLUÇÃO BANCO DE HORAS (áreas filtradas) ──
      const FPAL = ['#0078d4','#107c10','#b4a0ff','#ff8c00','#00b7c3','#e81123','#ffd700','#a0c4ff','#f87171','#4ade80','#60a5fa','#fb923c'];
      const hex2rgba = (hex, al) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${al})`; };

      const areasSel = climaAreasSel();
      const evolAreas = (areasSel || todasAreas.filter(a=>climaData.some(r=>r.area===a && r.bancohoras!==null)));
      const evolDs = evolAreas.map((area, fi) => ({
        label: area,
        data: MESES_NUM.map(m => climaData.find(r=>r.area===area&&r.mes===m)?.bancohoras??null),
        borderColor: FPAL[fi%FPAL.length],
        backgroundColor: hex2rgba(FPAL[fi%FPAL.length], 0.08),
        borderWidth: 2.5, tension: 0.3, fill: false, spanGaps: true,
        pointRadius: 4, pointHoverRadius: 6,
        pointBackgroundColor: FPAL[fi%FPAL.length],
        pointBorderColor: isDark()?'#1e2535':'#fff', pointBorderWidth: 2,
      }));

      if (charts['chartClimaEvol']) charts['chartClimaEvol'].destroy();
      const ctxEvol = document.getElementById('chartClimaEvol');
      if (ctxEvol) {
        charts['chartClimaEvol'] = new Chart(ctxEvol, {
          type: 'line',
          data: { labels: MESES_LABEL, datasets: evolDs },
          options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
              legend: { display: true, position: 'bottom', labels: { color:t.tick, usePointStyle:true, boxWidth:8, padding:12, font:{size:10} } },
              tooltip: { backgroundColor:t.bg, titleColor:t.text, bodyColor:t.tick, borderColor:isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:10,
                callbacks:{ label: ctx=>`  ${ctx.dataset.label}: ${fmtHoras(ctx.parsed.y)}` }
              }
            },
            scales: {
              x: { ticks:{color:t.tick,font:{size:11}}, grid:{color:t.grid}, border:{display:false} },
              y: { beginAtZero:false, ticks:{color:t.tick,font:{size:11}}, grid:{color:t.grid}, border:{display:false} }
            }
          }
        });
      }

      // Atualiza label do filtro
      const filterBtn = document.getElementById('climaFilterBtn');
      if (filterBtn) filterBtn.textContent = areasSel ? `${areasSel.length} área${areasSel.length>1?'s':''} selecionada${areasSel.length>1?'s':''}` : 'Selecionar áreas';

      break;
    }

    /* ── COTAS ── */
    case 'cotas': {
      console.log('[COTAS] cotasPcdData:', cotasPcdData);
      console.log('[COTAS] cotasJaData:', cotasJaData);
      console.log('[COTAS] hasRealData:', hasRealData);
      const temDados = cotasPcdData.length > 0 || cotasJaData.length > 0;
      document.getElementById('emptyCotas').style.display  = temDados ? 'none'  : 'flex';
      document.getElementById('chartsCotas').style.display = temDados ? 'block' : 'none';
      if (!temDados) break;

      const mesSel = document.getElementById('month-select').value;
      const pcdOrd = [...cotasPcdData].sort((a,b) => a.mes.localeCompare(b.mes));
      const jaOrd  = [...cotasJaData].sort((a,b)  => a.mes.localeCompare(b.mes));

      // ── CARDS PRINCIPAIS (média ou valor do mês) ──
      const avg = arr => arr.length ? (arr.reduce((s,v)=>s+v,0)/arr.length) : 0;

      // helpers de formatação
      const fmtColabs  = v => Math.ceil(v);                           // colaboradores: sempre arredonda para cima
      const fmtCotaMin = v => Number(v).toFixed(1).replace('.', ','); // cota mínima: 1 decimal, vírgula

      if (mesSel) {
        const pcdReg = cotasPcdData.find(d => d.mes === mesSel);
        const jaReg  = cotasJaData.find(d  => d.mes === mesSel);
        document.getElementById('cotasPcdContratar').textContent = pcdReg != null ? fmtColabs(pcdReg.contratar) : '—';
        document.getElementById('cotasPcdSub').textContent       = pcdReg ? `Mês: ${MESES_LABEL[parseInt(mesSel)-1]}` : 'Sem dados para este mês';
        document.getElementById('cotasJaContratar').textContent  = jaReg  != null ? fmtColabs(jaReg.contratar)  : '—';
        document.getElementById('cotasJaSub').textContent        = jaReg  ? `Mês: ${MESES_LABEL[parseInt(mesSel)-1]}` : 'Sem dados para este mês';
      } else {
        const mediaPcd = avg(pcdOrd.map(d => d.contratar));
        const mediaJa  = avg(jaOrd.map(d  => d.contratar));
        document.getElementById('cotasPcdContratar').textContent = fmtColabs(mediaPcd);
        document.getElementById('cotasPcdSub').textContent       = 'Média de todos os meses';
        document.getElementById('cotasJaContratar').textContent  = fmtColabs(mediaJa);
        document.getElementById('cotasJaSub').textContent        = 'Média de todos os meses';
      }

      // ── MODO: GRÁFICOS (sem mês) ou CARDS DETALHE (com mês) ──
      const graficos = document.getElementById('cotasGraficos');
      const detalhe  = document.getElementById('cotasDetalhe');

      if (mesSel) {
        graficos.style.display = 'none';
        detalhe.style.display  = 'block';

        const pcdReg = cotasPcdData.find(d => d.mes === mesSel);
        const jaReg  = cotasJaData.find(d  => d.mes === mesSel);

        document.getElementById('detPcdMin').textContent       = pcdReg ? fmtCotaMin(pcdReg.cotaMin)   : '—';
        document.getElementById('detPcdAtual').textContent     = pcdReg ? fmtColabs(pcdReg.cotaAtual)  : '—';
        document.getElementById('detPcdContratar').textContent  = pcdReg ? fmtColabs(pcdReg.contratar)  : '—';
        document.getElementById('detJaMin').textContent        = jaReg  ? fmtCotaMin(jaReg.cotaMin)    : '—';
        document.getElementById('detJaAtual').textContent      = jaReg  ? fmtColabs(jaReg.cotaAtual)   : '—';
        document.getElementById('detJaContratar').textContent   = jaReg  ? fmtColabs(jaReg.contratar)   : '—';

      } else {
        graficos.style.display = 'grid';
        detalhe.style.display  = 'none';

        // Gráfico PCD
        mkChart('chartCotasPcd', 'line',
          pcdOrd.map(d => MESES_LABEL[parseInt(d.mes)-1]),
          [
            {
              label: 'Cota Mínima',
              data: pcdOrd.map(d => d.cotaMin),
              borderColor: C.red, backgroundColor: 'transparent',
              borderWidth: 2, borderDash: [6,4], tension: 0, pointRadius: 3,
            },
            {
              label: 'Cota Atual',
              data: pcdOrd.map(d => d.cotaAtual),
              borderColor: C.purple, backgroundColor: 'rgba(112,48,160,.08)',
              borderWidth: 2.5, tension: 0.3, fill: true, pointRadius: 3,
            },
            {
              label: 'A Contratar',
              data: pcdOrd.map(d => d.contratar),
              borderColor: C.orange, backgroundColor: 'transparent',
              borderWidth: 2, tension: 0.3, pointRadius: 4,
              pointBackgroundColor: C.orange,
            },
          ],
          { plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
        );

        // Gráfico JA
        mkChart('chartCotasJa', 'line',
          jaOrd.map(d => MESES_LABEL[parseInt(d.mes)-1]),
          [
            {
              label: 'Cota Mínima',
              data: jaOrd.map(d => d.cotaMin),
              borderColor: C.red, backgroundColor: 'transparent',
              borderWidth: 2, borderDash: [6,4], tension: 0, pointRadius: 3,
            },
            {
              label: 'Cota Atual',
              data: jaOrd.map(d => d.cotaAtual),
              borderColor: C.blue, backgroundColor: 'rgba(0,120,212,.08)',
              borderWidth: 2.5, tension: 0.3, fill: true, pointRadius: 3,
            },
            {
              label: 'A Contratar',
              data: jaOrd.map(d => d.contratar),
              borderColor: C.orange, backgroundColor: 'transparent',
              borderWidth: 2, tension: 0.3, pointRadius: 4,
              pointBackgroundColor: C.orange,
            },
          ],
          { plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
        );
      }

      break;
    }

    /* ── MOVIMENTAÇÕES ── */
    case 'movimentacoes': {
      const temMov = movimentData.length > 0;
      document.getElementById('emptyMovimentacoes').style.display    = temMov ? 'none'  : 'flex';
      document.getElementById('chartsMovimentacoes').style.display   = temMov ? 'block' : 'none';
      if (!temMov) break;

      const mesSel = document.getElementById('month-select').value;
      const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const MESES_NUM   = ['01','02','03','04','05','06','07','08','09','10','11','12'];
      const t = chartTheme();
      const FPAL = ['#0078d4','#107c10','#b4a0ff','#ff8c00','#00b7c3','#e81123','#ffd700','#a0c4ff','#f87171','#4ade80'];
      const hex2rgba = (hex, a) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; };
      const svgUp = '<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,1 9,8 1,8"/></svg>';
      const svgDn = '<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,9 9,2 1,2"/></svg>';

      // Sem mês → totais acumulados (sem comparativo); com mês → filtra
      const MD    = mesSel ? movimentData.filter(r => r.mes === mesSel) : movimentData;
      const MDAnt = mesSel ? movimentData.filter(r => r.mes === getMesAnterior(mesSel)) : [];

      // ── KPIs ──
      const total        = MD.length;
      const totalAnt     = MDAnt.length;
      const proms        = MD.filter(r=>r.motivoGeral==='Promoção').length;
      const promsAnt     = MDAnt.filter(r=>r.motivoGeral==='Promoção').length;
      const meritos      = MD.filter(r=>r.motivoGeral==='Mérito').length;
      const meritosAnt   = MDAnt.filter(r=>r.motivoGeral==='Mérito').length;
      const reestru      = MD.filter(r=>r.motivoGeral==='Reestruturação').length;
      const reestruAnt   = MDAnt.filter(r=>r.motivoGeral==='Reestruturação').length;
      const mesLabel     = mesSel ? MESES_LABEL[parseInt(mesSel)-1] : 'Total';

      const varBadge = (v, a, inv=false, elId) => {
        const el = document.getElementById(elId); if (!el) return;
        if (!a || a===0) { el.innerHTML=''; el.className='kpi-variation delta-neutral'; return; }
        const diff=v-a, pct=(diff/a*100).toFixed(1), dir=diff>0?1:diff<0?-1:0, cor=inv?-dir:dir;
        el.innerHTML=`${dir>0?svgUp:dir<0?svgDn:''} ${diff>0?'+':''}${pct}% vs mês ant.`;
        el.className=`kpi-variation ${cor>0?'delta-up':cor<0?'delta-down':'delta-neutral'}`;
      };

      const kpis = [
        { id:'kpi-v1', lbl:`Total${mesSel?' — '+mesLabel:''}`,          val: total   },
        { id:'kpi-v2', lbl:`Promoções${mesSel?' — '+mesLabel:''}`,      val: proms   },
        { id:'kpi-v3', lbl:`Méritos${mesSel?' — '+mesLabel:''}`,        val: meritos },
        { id:'kpi-v4', lbl:`Reestruturações${mesSel?' — '+mesLabel:''}`,val: reestru },
        { id:'kpi-v5', lbl:'', val:'' },
        { id:'kpi-v6', lbl:'', val:'' },
      ];
      document.querySelectorAll('.kpi-card').forEach((c,i)=>{ c.style.display=i<4?'':'none'; });
      const kpiCont=document.querySelector('.kpi-container');
      if(kpiCont) kpiCont.style.gridTemplateColumns='repeat(4,1fr)';
      kpis.forEach(k=>{
        const v=document.getElementById(k.id), l=document.getElementById(k.id.replace('kpi-v','label-kpi'));
        if(v) v.textContent=k.val; if(l) l.textContent=k.lbl;
      });
      varBadge(total,   totalAnt,   false, 'var-kpi1');
      varBadge(proms,   promsAnt,   false, 'var-kpi2');
      varBadge(meritos, meritosAnt, false, 'var-kpi3');
      varBadge(reestru, reestruAnt, false, 'var-kpi4');
      ['var-kpi5','var-kpi6'].forEach(id=>{ const el=document.getElementById(id); if(el){el.innerHTML='';el.className='kpi-variation';} });

      // ── GRÁFICO 1: Volume mensal (linha) ──
      const motivosGerais = [...new Set(movimentData.map(r=>r.motivoGeral).filter(Boolean))].sort();
      const evolDs = motivosGerais.map((mg, fi) => ({
        label: mg,
        data: MESES_NUM.map(m => movimentData.filter(r=>r.mes===m&&r.motivoGeral===mg).length),
        borderColor: FPAL[fi%FPAL.length],
        backgroundColor: hex2rgba(FPAL[fi%FPAL.length], 0.08),
        borderWidth: 2.5, tension: 0.3, fill: false, spanGaps: true,
        pointRadius: 4, pointHoverRadius: 6,
        pointBackgroundColor: FPAL[fi%FPAL.length],
        pointBorderColor: isDark()?'#1e2535':'#fff', pointBorderWidth: 2,
      }));
      if (charts['chartMovimEvol']) charts['chartMovimEvol'].destroy();
      const ctxEvol = document.getElementById('chartMovimEvol');
      if (ctxEvol) charts['chartMovimEvol'] = new Chart(ctxEvol, {
        type:'line', data:{ labels:MESES_LABEL, datasets:evolDs },
        options:{
          responsive:true, maintainAspectRatio:true,
          plugins:{
            legend:{ display:true, position:'top', labels:{color:t.tick,usePointStyle:true,boxWidth:8,padding:14,font:{size:11}} },
            tooltip:{ backgroundColor:t.bg, titleColor:t.text, bodyColor:t.tick, borderColor:isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)', borderWidth:1, padding:10 }
          },
          scales:{
            x:{ ticks:{color:t.tick,font:{size:11}}, grid:{color:t.grid}, border:{display:false} },
            y:{ beginAtZero:true, ticks:{color:t.tick,font:{size:11},stepSize:1}, grid:{color:t.grid}, border:{display:false} }
          }
        }
      });

      // ── TABELA DE COLABORADORES ──
      const tabelaEl = document.getElementById('movimTabela');
      if (tabelaEl) {
        const sorted = [...MD].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
        tabelaEl.innerHTML = sorted.length ? sorted.map(r=>`
          <tr>
            <td>${r.nome}</td>
            <td>${r.areaAtual||'—'}</td>
            <td>${r.areaNova||'—'}</td>
            <td><span class="movim-motivo-badge movim-${(r.motivoGeral||'').toLowerCase().replace(/[^a-z]/g,'-')}">${r.motivoGeral||'—'}</span></td>
            <td>${r.gestorAtual||'—'}</td>
            <td>${r.gestorNovo||'—'}</td>
          </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">Sem movimentações neste mês</td></tr>';
      }

      break;
    }

    /* ── OFFBOARDING ── */
    case 'offboarding': {
      const temOff = offboardingData.length > 0;
      document.getElementById('emptyOffboarding').style.display    = temOff ? 'none'  : 'flex';
      document.getElementById('chartsOffboarding').style.display   = temOff ? 'block' : 'none';
      if (!temOff) break;

      const mesSel     = document.getElementById('month-select').value;
      const MESES_LABEL= ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const MESES_NUM  = ['01','02','03','04','05','06','07','08','09','10','11','12'];
      const t = chartTheme();
      const FPAL = ['#e81123','#ff8c00','#0078d4','#b4a0ff','#107c10','#00b7c3','#ffd700','#f87171'];
      const hex2rgba = (hex,a)=>{ const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; };
      const svgUp = '<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,1 9,8 1,8"/></svg>';
      const svgDn = '<svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><polygon points="5,9 9,2 1,2"/></svg>';

      // Sem mês → totais; com mês → filtra
      const OD    = mesSel ? offboardingData.filter(r=>r.mes===mesSel) : offboardingData;
      const ODAnt = mesSel ? offboardingData.filter(r=>r.mes===getMesAnterior(mesSel)) : [];
      const mesLabel = mesSel ? MESES_LABEL[parseInt(mesSel)-1] : 'Total';

      // ── TURNOVER ──
      // Média do headcount: todos os meses ou só o mês selecionado
      const hcVals = mesSel
        ? headcountData.filter(h=>h.mes===mesSel).map(h=>h.valor).filter(v=>v>0)
        : headcountData.map(h=>h.valor).filter(v=>v>0);
      const hcMedia = hcVals.length ? hcVals.reduce((s,v)=>s+v,0)/hcVals.length : null;
      const turnover = hcMedia ? ((OD.length / hcMedia)*100).toFixed(1) : null;

      const hcValsAnt = mesSel
        ? headcountData.filter(h=>h.mes===getMesAnterior(mesSel)).map(h=>h.valor).filter(v=>v>0)
        : [];
      const hcMediaAnt = hcValsAnt.length ? hcValsAnt.reduce((s,v)=>s+v,0)/hcValsAnt.length : null;
      const turnoverAnt = hcMediaAnt ? ((ODAnt.length/hcMediaAnt)*100).toFixed(1) : null;

      // ── KPIs ──
      const total    = OD.length,    totalAnt    = ODAnt.length;
      const vols     = OD.filter(r=>{ const t=String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); return t.includes('volunt')&&!t.includes('involunt'); }).length;
      const volsAnt  = ODAnt.filter(r=>{ const t=String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); return t.includes('volunt')&&!t.includes('involunt'); }).length;
      const invols   = OD.filter(r=>String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('involunt')).length;
      const involsAnt= ODAnt.filter(r=>String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('involunt')).length;
      const exps     = OD.filter(r=>String(r.periodo).toLowerCase().includes('experi')).length;
      const expsAnt  = ODAnt.filter(r=>String(r.periodo).toLowerCase().includes('experi')).length;
      const tcRows   = OD.filter(r=>r.tempoCasa!==null);
      const tcMedia  = tcRows.length ? (tcRows.reduce((s,r)=>s+r.tempoCasa,0)/tcRows.length).toFixed(1) : null;
      const tcRowsAnt= ODAnt.filter(r=>r.tempoCasa!==null);
      const tcMediaAnt= tcRowsAnt.length ? (tcRowsAnt.reduce((s,r)=>s+r.tempoCasa,0)/tcRowsAnt.length).toFixed(1) : null;
      // % de desligados com tempo de casa igual ou maior que a média
      const tcPctAcimaMedia = (tcRows.length && tcMedia !== null)
        ? Math.round((tcRows.filter(r => r.tempoCasa >= parseFloat(tcMedia)).length / tcRows.length) * 100)
        : null;

      const varBadge = (v, a, inv=false, elId) => {
        const el=document.getElementById(elId); if(!el) return;
        if(a===null||a===0){el.innerHTML='';el.className='kpi-variation delta-neutral';return;}
        const diff=Number(v)-Number(a), pct=(diff/Number(a)*100).toFixed(1);
        const dir=diff>0?1:diff<0?-1:0, cor=inv?-dir:dir;
        el.innerHTML=`${dir>0?svgUp:dir<0?svgDn:''} ${diff>0?'+':''}${pct}% vs mês ant.`;
        el.className=`kpi-variation ${cor>0?'delta-up':cor<0?'delta-down':'delta-neutral'}`;
      };

      // ── Motivo principal ──
      const motivoMapKpi={}; OD.forEach(r=>{ const m=r.motivo||'Não inf.'; motivoMapKpi[m]=(motivoMapKpi[m]||0)+1; });
      const motivoEntries=Object.entries(motivoMapKpi).sort((a,b)=>b[1]-a[1]);
      const motivoPrincipal=motivoEntries.length?motivoEntries[0][0]:null;
      const motivoPct=motivoPrincipal&&OD.length?Math.round(motivoEntries[0][1]/OD.length*100):null;
      const motivoMapAntKpi={}; ODAnt.forEach(r=>{ const m=r.motivo||'Não inf.'; motivoMapAntKpi[m]=(motivoMapAntKpi[m]||0)+1; });
      const motivoPctAnt=motivoPrincipal&&ODAnt.length&&motivoMapAntKpi[motivoPrincipal]
        ?Math.round(motivoMapAntKpi[motivoPrincipal]/ODAnt.length*100):null;

      // ── Tempo de casa: saídas precoces (via Dias Trabalhados) ──
      // 3 meses: 0-90 dias | 6 meses: 91-180 dias (4 a 6 meses) | 1 ano: 181-365 dias (7 a 12 meses)
      const ate3m    = OD.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados<=90).length;
      const ate3mAnt = ODAnt.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados<=90).length;
      const ate6m    = OD.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados>90&&r.diasTrabalhados<=180).length;
      const ate6mAnt = ODAnt.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados>90&&r.diasTrabalhados<=180).length;
      const ate1a    = OD.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados>180&&r.diasTrabalhados<=365).length;
      const ate1aAnt = ODAnt.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados>180&&r.diasTrabalhados<=365).length;

      // ── Botão "Ver mais" no card Turnover ──
      const btnVerMais = document.getElementById('turnoverVerMais');
      if (btnVerMais) btnVerMais.style.display = 'inline-flex';

      // Armazena dados para o modal
      window._turnoverBreakdown = {
        mesSel, mesLabel, hcMedia,
        total, vols, invols,
        OD, turnover
      };

      // ── KPIs globais: linha 1 — 4 cards ──
      const kpis=[
        {id:'kpi-v1',lbl:`Total${mesSel?' — '+mesLabel:''}`,        val:total,         varV:total-totalAnt,                ant:totalAnt,      inv:true},
        {id:'kpi-v2',lbl:`Voluntários${mesSel?' — '+mesLabel:''}`,  val:vols,          varV:vols-volsAnt,                  ant:volsAnt,       inv:true},
        {id:'kpi-v3',lbl:`Involuntários${mesSel?' — '+mesLabel:''}`,val:invols,        varV:invols-involsAnt,              ant:involsAnt,     inv:true},
        {id:'kpi-v4',lbl:`Turnover${mesSel?' — '+mesLabel:''}`,     val:turnover!==null?turnover+'%':'—', varV:turnover&&turnoverAnt?turnover-turnoverAnt:null, ant:turnoverAnt, inv:true},
        {id:'kpi-v5',lbl:'',val:'',varV:null,ant:null,inv:false},
        {id:'kpi-v6',lbl:'',val:'',varV:null,ant:null,inv:false},
      ];
      document.querySelectorAll('.kpi-card').forEach((c,i)=>{c.style.display=i<4?'':'none';});
      const kpiCont=document.querySelector('.kpi-container');
      if(kpiCont) kpiCont.style.gridTemplateColumns='repeat(4,1fr)';
      kpis.forEach(k=>{
        const v=document.getElementById(k.id),l=document.getElementById(k.id.replace('kpi-v','label-kpi')),vr=document.getElementById(k.id.replace('kpi-v','var-kpi'));
        if(v) v.textContent=k.val; if(l) l.textContent=k.lbl;
        if(vr){
          if(k.varV!==null&&k.ant!==null&&k.ant!==0){
            const diff=k.varV,pct=(diff/k.ant*100).toFixed(1),dir=diff>0?1:diff<0?-1:0,cor=k.inv?-dir:dir;
            vr.innerHTML=`${dir>0?svgUp:dir<0?svgDn:''} ${diff>0?'+':''}${pct}% vs mês ant.`;
            vr.className=`kpi-variation ${cor>0?'delta-up':cor<0?'delta-down':'delta-neutral'}`;
          } else {vr.innerHTML='';vr.className='kpi-variation delta-neutral';}
        }
      });

      // ── Cards próprios de offboarding (linha 2) — renderizados inline ──
      const offCardsEl=document.getElementById('offKpiRow2');
      if(offCardsEl){
        const pct3m  = total?Math.round(ate3m/total*100):0;
        const pct6m  = total?Math.round(ate6m/total*100):0;
        const pct1a  = total?Math.round(ate1a/total*100):0;
        const tcVal  = tcMedia!==null?tcMedia+' anos':'—';
        const tcSub  = tcPctAcimaMedia !== null ? `${tcPctAcimaMedia}% têm esse tempo ou mais` : null;
        const motVal = motivoPrincipal&&motivoPct!==null?`${motivoPrincipal} · ${motivoPct}%`:'—';

        const offCard = (icon,cor,label,val,sub,varV,ant,inv,btnKey) => {
          let varHtml='';
          if(varV!==null&&ant!==null&&ant!==0){
            const diff=varV,pct=(diff/ant*100).toFixed(1),dir=diff>0?1:diff<0?-1:0,cor2=inv?-dir:dir;
            const arrow=dir>0?svgUp:dir<0?svgDn:'';
            const cls=cor2>0?'delta-up':cor2<0?'delta-down':'delta-neutral';
            varHtml=`<div class="off-kpi-var ${cls}">${arrow} ${diff>0?'+':''}${pct}% vs mês ant.</div>`;
          }
          const btnHtml = btnKey ? `<button class="exp-list-btn" style="color:${cor};border-color:${cor}" onclick="openOffExitModal('${btnKey}')">Ver colaboradores</button>` : '';
          return `<div class="off-kpi-card" style="border-top:3px solid ${cor}">
            <div class="off-kpi-icon" style="color:${cor};background:${cor}18">${icon}</div>
            <div class="off-kpi-body">
              <div class="off-kpi-label">${label}</div>
              <div class="off-kpi-value">${val}</div>
              ${sub?`<div class="off-kpi-sub">${sub}</div>`:''}
              ${varHtml}
              ${btnHtml}
            </div>
          </div>`;
        };

        offCardsEl.innerHTML =
          offCard('⏱','#ff8c00', 'Saíram em até 3 meses',  ate3m,  `${pct3m}% do total`,  ate3m-ate3mAnt,  ate3mAnt,  true, '3m') +
          offCard('📅','#e81123', 'Saíram em até 6 meses',  ate6m,  `${pct6m}% do total`,  ate6m-ate6mAnt,  ate6mAnt,  true, '6m') +
          offCard('📆','#7030a0', 'Saíram antes de 1 ano',  ate1a,  `${pct1a}% do total`,  ate1a-ate1aAnt,  ate1aAnt,  true, '1a') +
          offCard('🕐','#0078d4', 'Tempo Médio de Casa',    tcVal,  tcSub,                  tcMedia&&tcMediaAnt?parseFloat(tcMedia)-parseFloat(tcMediaAnt):null, tcMediaAnt?parseFloat(tcMediaAnt):null, false, null) +
          offCard('📊','#107c10', 'Principal Motivo',       motivoPrincipal||'—', motivoPct!==null?motivoPct+'% das saídas':null, motivoPct&&motivoPctAnt?motivoPct-motivoPctAnt:null, motivoPctAnt, false, null);

        // Armazena listas para os modais de "Ver colaboradores"
        window._offExitLists = {
          '3m': OD.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados<=90),
          '6m': OD.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados>90&&r.diasTrabalhados<=180),
          '1a': OD.filter(r=>r.diasTrabalhados!==null&&r.diasTrabalhados>180&&r.diasTrabalhados<=365),
        };
      }

      // ── GRÁFICO 1: Volume mensal por tipo (linha) ──
      const tipos = [...new Set(offboardingData.map(r=>r.tipo).filter(Boolean))].sort();
      const evolDs = tipos.map((tipo,fi)=>({
        label: tipo,
        data: MESES_NUM.map(m=>offboardingData.filter(r=>r.mes===m&&r.tipo===tipo).length),
        borderColor: FPAL[fi%FPAL.length],
        backgroundColor: hex2rgba(FPAL[fi%FPAL.length],0.08),
        borderWidth:2.5, tension:0.3, fill:false, spanGaps:true,
        pointRadius:4, pointHoverRadius:6,
        pointBackgroundColor:FPAL[fi%FPAL.length],
        pointBorderColor:isDark()?'#1e2535':'#fff', pointBorderWidth:2,
      }));
      // Linha total
      evolDs.unshift({
        label:'Total',
        data: MESES_NUM.map(m=>offboardingData.filter(r=>r.mes===m).length),
        borderColor:'#94a3b8', backgroundColor:'rgba(148,163,184,.06)',
        borderWidth:2, tension:0.3, fill:false, spanGaps:true,
        borderDash:[4,3], pointRadius:3, pointHoverRadius:5,
        pointBackgroundColor:'#94a3b8',
      });
      if(charts['chartOffEvol']) charts['chartOffEvol'].destroy();
      const ctxEvol=document.getElementById('chartOffEvol');
      if(ctxEvol) charts['chartOffEvol']=new Chart(ctxEvol,{
        type:'line', data:{labels:MESES_LABEL,datasets:evolDs},
        options:{
          responsive:true, maintainAspectRatio:true,
          plugins:{
            legend:{display:true,position:'top',labels:{color:t.tick,usePointStyle:true,boxWidth:8,padding:14,font:{size:11}}},
            tooltip:{backgroundColor:t.bg,titleColor:t.text,bodyColor:t.tick,borderColor:isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)',borderWidth:1,padding:10}
          },
          scales:{
            x:{ticks:{color:t.tick,font:{size:11}},grid:{color:t.grid},border:{display:false}},
            y:{beginAtZero:true,ticks:{color:t.tick,font:{size:11},stepSize:1},grid:{color:t.grid},border:{display:false}}
          }
        }
      });

      // ── GRÁFICO 2: Motivos por mês (linhas, mesmo layout do vol mensal) ──
      const todosMotivos=[...new Set(offboardingData.map(r=>r.motivo).filter(Boolean))].sort();
      const motDs=todosMotivos.map((mot,fi)=>({
        label:mot,
        data:MESES_NUM.map(m=>offboardingData.filter(r=>r.mes===m&&r.motivo===mot).length),
        borderColor:FPAL[fi%FPAL.length],
        backgroundColor:hex2rgba(FPAL[fi%FPAL.length],0.08),
        borderWidth:2.5,tension:0.3,fill:false,spanGaps:true,
        pointRadius:4,pointHoverRadius:6,
        pointBackgroundColor:FPAL[fi%FPAL.length],
        pointBorderColor:isDark()?'#1e2535':'#fff',pointBorderWidth:2,
      }));
      if(charts['chartOffMotivo']) charts['chartOffMotivo'].destroy();
      const ctxMot=document.getElementById('chartOffMotivo');
      if(ctxMot) charts['chartOffMotivo']=new Chart(ctxMot,{
        type:'line',data:{labels:MESES_LABEL,datasets:motDs},
        options:{
          responsive:true,maintainAspectRatio:true,
          plugins:{
            legend:{display:true,position:'top',labels:{color:t.tick,usePointStyle:true,boxWidth:8,padding:14,font:{size:11}}},
            tooltip:{backgroundColor:t.bg,titleColor:t.text,bodyColor:t.tick,borderColor:isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)',borderWidth:1,padding:10}
          },
          scales:{
            x:{ticks:{color:t.tick,font:{size:11}},grid:{color:t.grid},border:{display:false}},
            y:{beginAtZero:true,ticks:{color:t.tick,font:{size:11},stepSize:1},grid:{color:t.grid},border:{display:false}}
          }
        }
      });

      // ── GRÁFICO 3: Por Área — Vol vs Invol ──
      const allAreas=[...new Set(OD.map(r=>r.area).filter(Boolean))].sort((a,b)=>{
        const tot=(r,x)=>OD.filter(d=>d.area===x).length;
        return tot(OD,b)-tot(OD,a);
      }).slice(0,12);
      const areaVols  =allAreas.map(a=>OD.filter(r=>r.area===a&&(t=>t.includes('volunt')&&!t.includes('involunt'))(String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())).length);
      const areaInvols=allAreas.map(a=>OD.filter(r=>r.area===a&&String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('involunt')).length);
      if(charts['chartOffArea']) charts['chartOffArea'].destroy();
      const ctxArea=document.getElementById('chartOffArea');
      if(ctxArea) charts['chartOffArea']=new Chart(ctxArea,{
        type:'bar',
        data:{labels:allAreas,datasets:[
          {label:'Voluntário',  data:areaVols,  backgroundColor:'rgba(255,140,0,.78)',borderColor:'#ff8c00',borderWidth:1,borderRadius:3,borderSkipped:false},
          {label:'Involuntário',data:areaInvols,backgroundColor:'rgba(232,17,35,.75)',borderColor:'#e81123',borderWidth:1,borderRadius:3,borderSkipped:false},
        ]},
        options:{
          indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{display:true,position:'top',labels:{color:t.tick,usePointStyle:true,boxWidth:8,padding:12,font:{size:11}}},
            tooltip:{backgroundColor:t.bg,titleColor:t.text,bodyColor:t.tick,borderColor:isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)',borderWidth:1,padding:10}
          },
          scales:{
            x:{beginAtZero:true,stacked:false,ticks:{color:t.tick,font:{size:11},stepSize:1},grid:{color:t.grid},border:{display:false}},
            y:{stacked:false,ticks:{color:t.tick,font:{size:11}},grid:{color:'transparent'},border:{display:false}}
          }
        }
      });

      // ── GRÁFICO 4: Por Gestor — Vol vs Invol ──
      const allGests=[...new Set(OD.map(r=>r.gestor).filter(Boolean))].sort((a,b)=>{
        return OD.filter(d=>d.gestor===b).length - OD.filter(d=>d.gestor===a).length;
      }).slice(0,10);
      const gestVols  =allGests.map(g=>OD.filter(r=>r.gestor===g&&(t=>t.includes('volunt')&&!t.includes('involunt'))(String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())).length);
      const gestInvols=allGests.map(g=>OD.filter(r=>r.gestor===g&&String(r.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('involunt')).length);
      if(charts['chartOffGestor']) charts['chartOffGestor'].destroy();
      const ctxGest=document.getElementById('chartOffGestor');
      if(ctxGest&&allGests.length) charts['chartOffGestor']=new Chart(ctxGest,{
        type:'bar',
        data:{labels:allGests,datasets:[
          {label:'Voluntário',  data:gestVols,  backgroundColor:'rgba(255,140,0,.78)',borderColor:'#ff8c00',borderWidth:1,borderRadius:3,borderSkipped:false},
          {label:'Involuntário',data:gestInvols,backgroundColor:'rgba(232,17,35,.75)',borderColor:'#e81123',borderWidth:1,borderRadius:3,borderSkipped:false},
        ]},
        options:{
          indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{display:true,position:'top',labels:{color:t.tick,usePointStyle:true,boxWidth:8,padding:12,font:{size:11}}},
            tooltip:{backgroundColor:t.bg,titleColor:t.text,bodyColor:t.tick,borderColor:isDark()?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)',borderWidth:1,padding:10}
          },
          scales:{
            x:{beginAtZero:true,stacked:false,ticks:{color:t.tick,font:{size:11},stepSize:1},grid:{color:t.grid},border:{display:false}},
            y:{stacked:false,ticks:{color:t.tick,font:{size:11}},grid:{color:'transparent'},border:{display:false}}
          }
        }
      });

      // ── TABELA ──
      const offTabelaEl=document.getElementById('offTabela');
      if(offTabelaEl){
        const sorted=[...OD].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
        offTabelaEl.innerHTML=sorted.length?sorted.map(r=>`
          <tr>
            <td>${r.nome}</td>
            <td>${r.cargo||'—'}</td>
            <td>${r.classificacao||'—'}</td>
            <td>${r.area||'—'}</td>
            <td>${r.tipo||'—'}</td>
            <td>${r.motivo||'—'}</td>
            <td>${r.tempoCasa!==null?r.tempoCasa+' anos':'—'}</td>
            <td>${r.mes?MESES_LABEL[parseInt(r.mes)-1]:'—'}</td>
          </tr>`).join('')
          :'<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">Sem desligamentos neste período</td></tr>';
      }

      break;
    }

    /* ── RECRUTAMENTO ── */
    case 'recrutamento': {
      // R&S tem planilha própria — não mexer no display aqui
      // renderRS() é chamado pelo switchCategory e pelos filtros
      break;
    }
  }
}

/* Dados mínimos para a Visão Geral funcionar sem planilha */
function demoData() { return []; }

/* ═══════════════════════════════════════════
   EXPORTAR
═══════════════════════════════════════════ */
function exportData() {
  if (!allData.length) { toast('Importe uma planilha antes de exportar.','info'); return; }
  const data = getFiltered();
  if (!data.length) { toast('Nenhum dado com os filtros atuais.','error'); return; }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Dados');
  XLSX.writeFile(wb, `Dashboard_PC_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Dados exportados com sucesso!','success');
}

/* ═══════════════════════════════════════════
   DOWNLOAD MODELO
═══════════════════════════════════════════ */
function downloadTemplate() {
  const link = document.createElement('a');
  link.href = './Modelo Excel.xlsx';
  link.download = 'Modelo Excel.xlsx';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast('Modelo baixado com sucesso!', 'success');
}
/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}