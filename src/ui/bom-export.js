/**
 * UTILITÁRIOS DE EXPORTAÇÃO BOM
 */

export function exportToCSV(categories) {
    let csv = "\uFEFF"; // UTF-8 BOM for Excel
    csv += "Categoria;Item;Descrição;Unidade;Qtd;Referência;Preço Unit.;Subtotal;Em Estoque\n";
    
    categories.forEach(cat => {
        cat.items.forEach(item => {
            const subtotal = (item.unitPrice || 0) * item.qty;
            const line = [
                cat.name,
                item.id,
                item.description,
                item.unit,
                item.qty,
                item.reference,
                item.unitPrice || 0,
                subtotal.toFixed(2),
                item.inStock ? "Sim" : "Não"
            ].join(";");
            csv += line + "\n";
        });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `BOM_Projeto_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function exportToPDF(categories, metadata) {
    // Generate a print-friendly HTML
    const printWindow = window.open('', '_blank');
    const totalGeral = categories.reduce((sum, cat) => 
        sum + cat.items.reduce((s, i) => s + (i.unitPrice || 0) * i.qty, 0), 0);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lista de Materiais - ${metadata.name || 'Projeto'}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
                .header { border-bottom: 2px solid #3b82f6; margin-bottom: 30px; padding-bottom: 10px; }
                h1 { margin: 0; color: #1e3a8a; }
                .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { text-align: left; background: #f3f4f6; padding: 10px; border-bottom: 2px solid #e5e7eb; }
                td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
                .cat-title { background: #eff6ff; font-weight: bold; padding: 10px; color: #2563eb; }
                .total { text-align: right; font-size: 20px; font-weight: bold; color: #1e3a8a; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>LISTA DE MATERIAIS (BOM)</h1>
                <p>${metadata.company || 'CFTV Planner Pro'}</p>
            </div>
            
            <div class="meta">
                <div>
                    <strong>Projeto:</strong> ${metadata.name}<br>
                    <strong>Cliente:</strong> ${metadata.client || 'N/A'}<br>
                    <strong>Endereço:</strong> ${metadata.address || 'N/A'}
                </div>
                <div style="text-align: right">
                    <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}<br>
                    <strong>Contato:</strong> ${metadata.contact || ''}
                </div>
            </div>

            ${categories.map(cat => `
                <table>
                    <thead>
                        <tr><th colspan="5" class="cat-title">${cat.name}</th></tr>
                        <tr>
                            <th>Descrição</th>
                            <th>Qtd</th>
                            <th>Unid</th>
                            <th>Preço Un.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cat.items.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td>${item.qty}</td>
                                <td>${item.unit}</td>
                                <td>R$ ${(item.unitPrice || 0).toFixed(2)}</td>
                                <td>R$ ${((item.unitPrice || 0) * item.qty).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `).join('')}

            <div class="total">
                VALOR TOTAL ESTIMADO: R$ ${totalGeral.toFixed(2)}
            </div>

            <p style="font-size: 10px; color: #999; margin-top: 50px; text-align: center;">
                Gerado por CFTV Planner Pro - marques823@gmail.com
            </p>

            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}
