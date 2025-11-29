let dadosDisponiveis = {};
let anoSelecionado = null;
let mesSelecionado = null;
let estacaoSelecionada = null;
let feriadoSelecionado = null;
let estadoSelecionado = null;

const nomesMeses = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

// Southern Hemisphere Seasons
const estacoes = {
    'Verão': ['12', '01', '02'],
    'Outono': ['03', '04', '05'],
    'Inverno': ['06', '07', '08'],
    'Primavera': ['09', '10', '11']
};

const ordemMeses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

// List of Brazilian States
const estadosBR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

document.addEventListener("DOMContentLoaded", inicializarApp);

function mostrarLoading(mostrar) {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        overlay.style.display = mostrar ? "flex" : "none";
    }
}

async function inicializarApp() {
    try {
        mostrarLoading(true);
        const response = await fetch('/api/available-data');
        dadosDisponiveis = await response.json();
        
        // Select the most recent year by default
        const anos = Object.keys(dadosDisponiveis).sort();
        if (anos.length > 0) {
            anoSelecionado = anos[anos.length - 1];
        }

        criarBotoesAno();
        criarBotoesMes();
        criarBotoesEstacao();
        criarBotoesFeriado();
        inicializarSeletorEstado();
        await carregarDadosEAtualizarGraficos();
    } catch (error) {
        console.error('Falha ao inicializar a aplicação:', error);
    } finally {
        mostrarLoading(false);
    }
}

function criarBotoesAno() {
    const container = document.getElementById('year-buttons');
    container.innerHTML = '';
    const anos = Object.keys(dadosDisponiveis).sort();

    anos.forEach(ano => {
        const button = document.createElement('button');
        button.textContent = ano;
        if (ano === anoSelecionado) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            anoSelecionado = ano;
            mesSelecionado = null;
            estacaoSelecionada = null;
            feriadoSelecionado = null;
            criarBotoesAno(); 
            criarBotoesMes();
            criarBotoesEstacao();
            criarBotoesFeriado();
            carregarDadosEAtualizarGraficos();
        });
        container.appendChild(button);
    });
}

function criarBotoesMes() {
    const container = document.getElementById('month-buttons');
    container.innerHTML = '';
    if (!anoSelecionado || !dadosDisponiveis[anoSelecionado]) return;

    const meses = dadosDisponiveis[anoSelecionado].sort();
    meses.forEach(mes => {
        const button = document.createElement('button');
        button.textContent = nomesMeses[mes];
        if (mes === mesSelecionado) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            if (mesSelecionado === mes) {
                mesSelecionado = null;
            } else {
                mesSelecionado = mes;
                estacaoSelecionada = null;
                feriadoSelecionado = null;
            }
            criarBotoesMes();
            criarBotoesEstacao();
            criarBotoesFeriado();
            carregarDadosEAtualizarGraficos();
        });
        container.appendChild(button);
    });
}

function criarBotoesEstacao() {
    const container = document.getElementById('season-buttons');
    container.innerHTML = '';
    const nomesEstacoes = Object.keys(estacoes);

    nomesEstacoes.forEach(nome => {
        const button = document.createElement('button');
        button.textContent = nome;
        if (nome === estacaoSelecionada) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            if (estacaoSelecionada === nome) {
                estacaoSelecionada = null;
            } else {
                estacaoSelecionada = nome;
                mesSelecionado = null; 
                feriadoSelecionado = null;
            }
            criarBotoesEstacao();
            criarBotoesMes();
            criarBotoesFeriado();
            carregarDadosEAtualizarGraficos();
        });
        container.appendChild(button);
    });
}

function getEasterDate(year) {
    const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);

    return new Date(year, month - 1, day);
}

function getHolidays(year) {
    const holidays = {};
    const y = parseInt(year);

    // Fixed Dates
    holidays['Natal'] = `${y}-12-25`;
    holidays['Dia das Crianças'] = `${y}-10-12`;
    holidays['Dia dos Namorados'] = `${y}-06-12`;
    holidays['Tiradentes'] = `${y}-04-21`;
    holidays['Independência'] = `${y}-09-07`;
    holidays['Finados'] = `${y}-11-02`;
    holidays['Proclamação da República'] = `${y}-11-15`;

    // Variable Dates
    const easter = getEasterDate(y);
    holidays['Páscoa'] = easter.toISOString().split('T')[0];

    // Mother's Day: 2nd Sunday of May
    const may = new Date(y, 4, 1);
    const mothersDay = new Date(y, 4, 1 + (7 - may.getDay()) % 7 + 7);
    holidays['Dia das Mães'] = mothersDay.toISOString().split('T')[0];

    // Father's Day: 2nd Sunday of August
    const aug = new Date(y, 7, 1);
    const fathersDay = new Date(y, 7, 1 + (7 - aug.getDay()) % 7 + 7);
    holidays['Dia dos Pais'] = fathersDay.toISOString().split('T')[0];

    // Black Friday: 4th Friday of November
    const nov = new Date(y, 10, 1);
    // Find first Friday
    let firstFriday = 1 + (5 - nov.getDay() + 7) % 7;
    const blackFriday = new Date(y, 10, firstFriday + 21);
    holidays['Black Friday'] = blackFriday.toISOString().split('T')[0];

    // Cyber Monday: Monday after Black Friday
    const cyberMonday = new Date(blackFriday);
    cyberMonday.setDate(blackFriday.getDate() + 3);
    holidays['Cyber Monday'] = cyberMonday.toISOString().split('T')[0];

    return holidays;
}

function criarBotoesFeriado() {
    const container = document.getElementById('holiday-buttons');
    container.innerHTML = '';
    if (!anoSelecionado) return;

    const holidays = getHolidays(anoSelecionado);
    const holidayNames = Object.keys(holidays);

    holidayNames.forEach(nome => {
        const button = document.createElement('button');
        button.textContent = nome;
        if (feriadoSelecionado && feriadoSelecionado.nome === nome) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            if (feriadoSelecionado && feriadoSelecionado.nome === nome) {
                feriadoSelecionado = null;
            } else {
                feriadoSelecionado = { nome: nome, date: holidays[nome] };
                mesSelecionado = null;
                estacaoSelecionada = null;
            }
            criarBotoesFeriado();
            criarBotoesMes();
            criarBotoesEstacao();
            carregarDadosEAtualizarGraficos();
        });
        container.appendChild(button);
    });
}

function inicializarSeletorEstado() {
    const selector = document.getElementById('state-select');
    
    estadosBR.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado;
        option.textContent = estado;
        selector.appendChild(option);
    });

    selector.addEventListener('change', (e) => {
        estadoSelecionado = e.target.value;
        carregarDadosEAtualizarGraficos();
    });
}

async function carregarDadosEAtualizarGraficos() {
    if (!anoSelecionado) return;

    mostrarLoading(true);

    let titulo = `Análise de Pedidos do Olist - ${anoSelecionado}`;
    if (mesSelecionado) {
        titulo += ` - ${nomesMeses[mesSelecionado]}`;
    } else if (estacaoSelecionada) {
        titulo += ` - ${estacaoSelecionada}`;
    } else if (feriadoSelecionado) {
        titulo += ` - ${feriadoSelecionado.nome} (${feriadoSelecionado.date})`;
    }
    document.getElementById('main-title').textContent = titulo;

    let queryParams = `?year=${anoSelecionado}`;
    if (mesSelecionado) {
        queryParams += `&month=${mesSelecionado}`;
    } else if (estacaoSelecionada) {
        const mesesDaEstacao = estacoes[estacaoSelecionada];
        queryParams += `&months=${JSON.stringify(mesesDaEstacao)}`;
    } else if (feriadoSelecionado) {
        // Filter for the specific day
        queryParams += `&startDate=${feriadoSelecionado.date}&endDate=${feriadoSelecionado.date}`;
    }

    if (estadoSelecionado) {
        queryParams += `&state=${estadoSelecionado}`;
        titulo += ` - ${estadoSelecionado}`;
        document.getElementById('main-title').textContent = titulo;
    }

    try {
        const [ordersByTime, ordersByState, paymentMethods, topCategories] = await Promise.all([
            fetch(`/api/orders-by-time${queryParams}`).then(res => res.json()),
            fetch(`/api/orders-by-state${queryParams}`).then(res => res.json()),
            fetch(`/api/payment-methods${queryParams}`).then(res => res.json()),
            fetch(`/api/top-categories${queryParams}`).then(res => res.json())
        ]);

        renderOrdersByTime(ordersByTime);
        renderOrdersByState(ordersByState);
        renderPaymentMethods(paymentMethods);
        renderTopCategories(topCategories);

    } catch (error) {
        console.error('Falha ao carregar dados:', error);
    } finally {
        mostrarLoading(false);
    }
}

function createChart(containerId, data, xAccessor, yAccessor, xLabel, yLabel, margin = { top: 20, right: 30, bottom: 40, left: 60 }) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous chart
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
  
    const svg = d3
      .select(`#${containerId}`)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3
      .scaleBand()
      .domain(data.map(xAccessor))
      .range([0, width])
      .padding(0.1);
  
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, yAccessor)])
      .nice()
      .range([height, 0]);
  
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
  
    svg.append("g").call(d3.axisLeft(y));
  
    svg
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(xAccessor(d)))
      .attr("y", (d) => y(yAccessor(d)))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(yAccessor(d)));
      
      // Add X axis label
      svg.append("text")
          .attr("class", "axis-label")
          .attr("text-anchor", "end")
          .attr("x", width)
          .attr("y", height + margin.bottom - 5)
          .text(xLabel);
  
      // Add Y axis label
      svg.append("text")
          .attr("class", "axis-label")
          .attr("text-anchor", "end")
          .attr("y", 6)
          .attr("dy", ".75em")
          .attr("transform", "rotate(-90)")
          .text(yLabel);
}

function renderOrdersByTime(data) {
    data.sort((a, b) => d3.ascending(a.time_period, b.time_period));
    
    // Determine if data is daily or monthly based on string length (YYYY-MM vs YYYY-MM-DD)
    const isDaily = data.length > 0 && data[0].time_period.length > 7;
    const xLabel = isDaily ? "Dia" : "Mês/Ano";
    
    createChart("orders-by-time", data, d => d.time_period, d => d.order_count, xLabel, "Quantidade de Pedidos");
}
  
function renderOrdersByState(data) {
    createChart("orders-by-state", data, d => d.state, d => d.order_count, "Estado", "Quantidade de Pedidos");
}
  
function renderPaymentMethods(data) {
    const containerId = "payment-methods";
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous chart

    const largura = 700;
    const altura = 500;
    const raio = Math.min(largura, altura) / 2;
    const tamanhoRetanguloLegenda = 18;
    const espacamentoLegenda = 4;

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', largura)
        .attr('height', altura)
        .append('g')
        .attr('transform', `translate(${raio}, ${altura / 2})`);

    const cor = d3.scaleOrdinal()
        .domain(data.map(d => d.payment_type))
        .range(d3.schemeTableau10);

    const pizza = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arco = d3.arc()
        .innerRadius(0)
        .outerRadius(raio);

    const arcos = svg.selectAll('.arc')
        .data(pizza(data))
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcos.append('path')
        .attr('d', arco)
        .attr('fill', d => cor(d.data.payment_type))
        .append('title')
        .text(d => `${d.data.payment_type}: ${d.data.count.toLocaleString()}`);

    const legenda = svg.selectAll('.legend')
        .data(cor.domain())
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => {
            const height = tamanhoRetanguloLegenda + espacamentoLegenda;
            const offset = height * cor.domain().length / 2;
            const horz = raio + 40;
            const vert = i * height - offset;
            return `translate(${horz},${vert})`;
        });

    legenda.append('rect')
        .attr('width', tamanhoRetanguloLegenda)
        .attr('height', tamanhoRetanguloLegenda)
        .style('fill', cor);

    legenda.append('text')
        .attr('x', tamanhoRetanguloLegenda + espacamentoLegenda)
        .attr('y', tamanhoRetanguloLegenda - espacamentoLegenda)
        .text(d => d);
}

function renderTopCategories(data) {
    // Horizontal bar chart
    const containerId = "top-categories";
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous chart

    const margin = { top: 20, right: 30, bottom: 40, left: 150 }; // Increased left margin for category names
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([0, width]);
    
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Y axis
    const y = d3.scaleBand()
        .range([0, height])
        .domain(data.map(d => d.product_category_name))
        .padding(.1);
    
    svg.append("g")
        .call(d3.axisLeft(y));

    // Bars
    svg.selectAll("myRect")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", x(0))
        .attr("y", d => y(d.product_category_name))
        .attr("width", d => x(d.count))
        .attr("height", y.bandwidth());
        
    // Add labels to bars
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.count) + 5)
        .attr("y", d => y(d.product_category_name) + y.bandwidth() / 2)
        .attr("dy", ".35em")
        .text(d => d.count.toLocaleString());
}
