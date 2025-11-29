const express = require('express');
const duckdb = require('@duckdb/node-api');
const path = require('path');

const app = express();
const porta = 3000;

async function inicializarBancoDeDados() {
    const instancia = await duckdb.DuckDBInstance.create(':memory:');
    const conexao = await instancia.connect();

    const caminhoOrders = path.join(__dirname, 'dados', 'olist_orders_dataset.csv');
    const caminhoCustomers = path.join(__dirname, 'dados', 'olist_customers_dataset.csv');
    const caminhoPayments = path.join(__dirname, 'dados', 'olist_order_payments_dataset.csv');
    const caminhoOrderItems = path.join(__dirname, 'dados', 'olist_order_items_dataset.csv');
    const caminhoProducts = path.join(__dirname, 'dados', 'olist_products_dataset.csv');

    await conexao.run(`
            CREATE TABLE orders AS SELECT * FROM read_csv_auto('${caminhoOrders}');
            CREATE TABLE customers AS SELECT * FROM read_csv_auto('${caminhoCustomers}');
            CREATE TABLE payments AS SELECT * FROM read_csv_auto('${caminhoPayments}');
            CREATE TABLE order_items AS SELECT * FROM read_csv_auto('${caminhoOrderItems}');
            CREATE TABLE products AS SELECT * FROM read_csv_auto('${caminhoProducts}');
        `);
    console.log('Dados carregados com sucesso no DuckDB.');
    return conexao;
}

async function main() {
    try {
        const conexao = await inicializarBancoDeDados();

        app.use(express.static('public'));

        // Endpoint for top product categories
        app.get('/api/top-categories', async (req, res) => {
            try {
                let whereClause = buildWhereClause(req);
                whereClause = whereClause.replace(/order_purchase_timestamp/g, 'o.order_purchase_timestamp');
                const resultado = await conexao.runAndReadAll(`
                    SELECT
                        p.product_category_name,
                        COUNT(*) as count
                    FROM orders o
                    JOIN order_items oi ON o.order_id = oi.order_id
                    JOIN products p ON oi.product_id = p.product_id
                    JOIN customers c ON o.customer_id = c.customer_id
                    ${whereClause}
                    AND p.product_category_name IS NOT NULL
                    GROUP BY p.product_category_name
                    ORDER BY count DESC
                    LIMIT 10
                `);
                const linhas = resultado.getRows().map(linha => ({
                    product_category_name: linha[0],
                    count: Number(linha[1])
                }));
                res.json(linhas);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: error.message });
            }
        });

        // Helper to build WHERE clause
        function buildWhereClause(req) {
            const { year, month, months, startDate, endDate, state } = req.query;
            let conditions = ["order_purchase_timestamp IS NOT NULL"];
            
            if (startDate && endDate) {
                conditions.push(`order_purchase_timestamp >= '${startDate} 00:00:00' AND order_purchase_timestamp <= '${endDate} 23:59:59'`);
            } else {
                if (year) {
                    conditions.push(`STRFTIME(order_purchase_timestamp, '%Y') = '${year}'`);
                }
                
                if (month) {
                    // month is expected to be '01', '02', etc.
                    conditions.push(`STRFTIME(order_purchase_timestamp, '%m') = '${month}'`);
                } else if (months) {
                    // months is expected to be a JSON string of month numbers e.g. "['01','02']"
                    try {
                        const monthList = JSON.parse(months);
                        if (Array.isArray(monthList) && monthList.length > 0) {
                            const monthStr = monthList.map(m => `'${m}'`).join(',');
                            conditions.push(`STRFTIME(order_purchase_timestamp, '%m') IN (${monthStr})`);
                        }
                    } catch (e) {
                        console.error("Error parsing months:", e);
                    }
                }
            }

            if (state) {
                conditions.push(`customer_state = '${state}'`);
            }
            
            return "WHERE " + conditions.join(" AND ");
        }

        // Endpoint: Available Data (Years and Months)
        app.get('/api/available-data', async (req, res) => {
            try {
                const resultado = await conexao.runAndReadAll(`
                    SELECT DISTINCT 
                        STRFTIME(order_purchase_timestamp, '%Y') as year, 
                        STRFTIME(order_purchase_timestamp, '%m') as month 
                    FROM orders 
                    WHERE order_purchase_timestamp IS NOT NULL
                    ORDER BY year, month;
                `);
                
                const dados = {};
                resultado.getRows().forEach(linha => {
                    const ano = linha[0];
                    const mes = linha[1];
                    if (!dados[ano]) {
                        dados[ano] = [];
                    }
                    dados[ano].push(mes);
                });
                
                res.json(dados);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: err.message });
            }
        });

        // Endpoint 1: Orders over time (Temporal)
        app.get('/api/orders-by-time', async (req, res) => {
            try {
                const whereClause = buildWhereClause(req);
                const { month, startDate, endDate } = req.query;
                
                // Default to monthly grouping
                let groupBy = "STRFTIME(order_purchase_timestamp, '%Y-%m')";
                
                // If filtering by month or specific dates, group by day
                if (month || (startDate && endDate)) {
                    groupBy = "STRFTIME(order_purchase_timestamp, '%Y-%m-%d')";
                }

                const resultado = await conexao.runAndReadAll(`
                    SELECT 
                        ${groupBy} as time_period,
                        COUNT(*) as order_count
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.customer_id
                    ${whereClause.replace(/order_purchase_timestamp/g, 'o.order_purchase_timestamp')}
                    GROUP BY time_period
                    ORDER BY time_period;
                `);
                const linhas = resultado.getRows().map(linha => ({
                    time_period: linha[0],
                    order_count: Number(linha[1])
                }));
                res.json(linhas);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: err.message });
            }
        });

        // Endpoint 2: Orders by State (Spatial)
        app.get('/api/orders-by-state', async (req, res) => {
            try {
                const whereClause = buildWhereClause(req).replace(/order_purchase_timestamp/g, 'o.order_purchase_timestamp');
                const resultado = await conexao.runAndReadAll(`
                    SELECT 
                        c.customer_state,
                        COUNT(*) as order_count
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.customer_id
                    ${whereClause}
                    GROUP BY c.customer_state
                    ORDER BY order_count DESC;
                `);
                const linhas = resultado.getRows().map(linha => ({
                    state: linha[0],
                    order_count: Number(linha[1])
                }));
                res.json(linhas);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: err.message });
            }
        });

        // Endpoint 3: Payment Methods (Composition)
        app.get('/api/payment-methods', async (req, res) => {
            try {
                // We need to join with orders to filter by time
                const whereClause = buildWhereClause(req).replace(/order_purchase_timestamp/g, 'o.order_purchase_timestamp');
                const resultado = await conexao.runAndReadAll(`
                    SELECT 
                        p.payment_type,
                        COUNT(*) as count
                    FROM payments p
                    JOIN orders o ON p.order_id = o.order_id
                    JOIN customers c ON o.customer_id = c.customer_id
                    ${whereClause}
                    GROUP BY p.payment_type
                    ORDER BY count DESC;
                `);
                const linhas = resultado.getRows().map(linha => ({
                    payment_type: linha[0],
                    count: Number(linha[1])
                }));
                res.json(linhas);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: err.message });
            }
        });

        app.listen(porta, () => {
            console.log(`Servidor rodando em http://localhost:${porta}`);
        });

    } catch (err) {
        console.error("Falha ao inicializar a aplicação:", err);
    }
}

main();
