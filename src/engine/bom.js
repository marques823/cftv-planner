/**
 * MOTOR DE CÁLCULO BOM (Bill of Materials)
 * Deriva materiais a partir dos dados do projeto no canvas.
 */
export function generateBOM(project) {
    const cameras = project.cameras || [];
    const cables = project.drawings.filter(d => d.type === 'cable') || [];
    const racks = project.obstacles.filter(o => o.isRack) || [];
    
    const categories = [
        { name: "Câmeras e Óptica", items: [] },
        { name: "Fixação e Infraestrutura", items: [] },
        { name: "Cabeamento", items: [] },
        { name: "Alimentação", items: [] },
        { name: "Gravação e Armazenamento", items: [] },
        { name: "Rack e Conectividade", items: [] }
    ];

    const ipCams = cameras.filter(c => c.type && c.type.toLowerCase().includes('ip'));
    const analogCams = cameras.filter(c => !c.type || !c.type.toLowerCase().includes('ip'));
    
    // 1. CÂMERAS
    cameras.forEach(cam => {
        addItem(categories[0], {
            description: `${cam.brand} ${cam.modelName}`,
            unit: "un",
            qty: 1,
            reference: cam.id || "CAM-REF",
            notes: "Câmera posicionada no projeto"
        });

        const isExternal = cam.type && cam.type.toLowerCase().includes('bullet');
        if (isExternal) {
            addItem(categories[0], {
                description: "Protetor Solar / Housing para Câmera Externa",
                unit: "un",
                qty: 1,
                reference: "EXT-PROT",
                notes: "Inferido por tipo de câmera (Bullet)"
            });
        }
    });

    // 2. FIXAÇÃO POR CÂMERA
    if (cameras.length > 0) {
        addItem(categories[1], {
            description: "Bucha de Nylon S10",
            unit: "un",
            qty: cameras.length * 4,
            reference: "S10",
            notes: "4 unidades por câmera"
        });
        addItem(categories[1], {
            description: "Parafuso M6 x 40mm",
            unit: "un",
            qty: cameras.length * 4,
            reference: "M6-40",
            notes: "4 unidades por câmera"
        });
        
        const extCount = cameras.filter(c => c.type && c.type.toLowerCase().includes('bullet')).length;
        if (extCount > 0) {
            addItem(categories[1], {
                description: "Caixa de Passagem VDI/CFTV (Sobrepor)",
                unit: "un",
                qty: extCount,
                reference: "CP-EXT",
                notes: "1 por câmera externa"
            });
        }

        addItem(categories[1], {
            description: "Condulete 3/4\"",
            unit: "un",
            qty: cameras.length,
            reference: "COND-34",
            notes: "1 por câmera"
        });
    }

    // 3. CABEAMENTO
    let totalCableMeters = cables.reduce((sum, c) => sum + c.getLength(), 0);
    totalCableMeters = totalCableMeters * 1.15; // +15% margem

    if (ipCams.length > 0) {
        addItem(categories[2], {
            description: "Cabo de Rede UTP Cat5e/Cat6",
            unit: "m",
            qty: Math.ceil(totalCableMeters),
            reference: "CABLE-UTP",
            notes: "Distância traçada no canvas + 15% margem"
        });
        addItem(categories[2], {
            description: "Conector RJ45",
            unit: "un",
            qty: ipCams.length * 2,
            reference: "RJ45",
            notes: "2 por câmera IP"
        });
    }

    if (analogCams.length > 0) {
        addItem(categories[2], {
            description: "Cabo Coaxial RG59 Flex 95%",
            unit: "m",
            qty: Math.ceil(totalCableMeters),
            reference: "CABLE-COAX",
            notes: "Distância traçada no canvas + 15% margem"
        });
        addItem(categories[2], {
            description: "Conector BNC Mola",
            unit: "un",
            qty: analogCams.length * 2,
            reference: "BNC-M",
            notes: "2 por câmera analógica"
        });
    }

    addItem(categories[2], {
        description: "Cabo de Alimentação 2x0.75mm²",
        unit: "m",
        qty: Math.ceil(totalCableMeters),
        reference: "CABLE-PWR",
        notes: "Mesmo comprimento do cabo de sinal"
    });

    // 4. ALIMENTAÇÃO
    if (cameras.length > 0) {
        const sourceCount = Math.ceil(cameras.length / 8);
        const totalAmps = cameras.length * 0.5; // Estimativa 0.5A/cam
        const ampPerSource = Math.ceil((totalAmps / sourceCount) * 1.25); // +25% folga
        
        addItem(categories[3], {
            description: `Fonte de Alimentação 12V ${ampPerSource}A`,
            unit: "un",
            qty: sourceCount,
            reference: `PWR-12V-${ampPerSource}A`,
            notes: "1 fonte para cada 8 câmeras"
        });
        addItem(categories[3], {
            description: "P4 Macho com Borne",
            unit: "un",
            qty: cameras.length,
            reference: "P4-M",
            notes: "1 por câmera"
        });
    }

    // 5. GRAVAÇÃO
    if (cameras.length > 0) {
        const isIPProject = ipCams.length > analogCams.length;
        const channels = [4, 8, 16, 32].find(c => c >= cameras.length) || 64;
        
        addItem(categories[4], {
            description: `${isIPProject ? 'NVR' : 'DVR'} ${channels} Canais`,
            unit: "un",
            qty: 1,
            reference: `${isIPProject ? 'NVR' : 'DVR'}-${channels}`,
            notes: "Baseado no número de câmeras"
        });

        // HDD Calc: (0.05GB/h * cams * 24h * 30 dias) -> approx 36GB per cam per 30 days
        const retentionDays = 30;
        const bitrateGBh = 0.05; // 1.2 Mbps approx
        const hddNeeded = bitrateGBh * cameras.length * 24 * retentionDays;
        const hddSize = [1, 2, 4, 6, 8, 10, 12].find(s => s >= hddNeeded/1000) || 16;
        
        addItem(categories[4], {
            description: `HD SkyHawk ${hddSize}TB para Vigilância`,
            unit: "un",
            qty: 1,
            reference: `HD-${hddSize}TB`,
            notes: `Calculado para ${retentionDays} dias de retenção`
        });
    }

    // 6. RACK E CONECTIVIDADE
    if (ipCams.length > 0) {
        const ports = [8, 16, 24].find(p => p >= ipCams.length + 2) || 48;
        addItem(categories[5], {
            description: `Switch PoE Gigabit ${ports} Portas`,
            unit: "un",
            qty: 1,
            reference: `SW-POE-${ports}`,
            notes: "Basedo em câmeras IP + folga"
        });
    }

    if (racks.length > 0) {
        racks.forEach(r => {
            addItem(categories[5], {
                description: `Mini Rack de Parede ${r.uSize}U`,
                unit: "un",
                qty: 1,
                reference: `RACK-${r.uSize}U`,
                notes: "Posicionado no canvas"
            });
            
            addItem(categories[5], {
                description: "PDU Régua de Tomadas 08 Tomadas",
                unit: "un",
                qty: 1,
                reference: "PDU-08",
                notes: "1 por rack"
            });
        });
    }

    return categories;
}

function addItem(category, item) {
    const existing = category.items.find(i => i.description === item.description);
    if (existing) {
        existing.qty += item.qty;
    } else {
        category.items.push({
            id: Math.random().toString(36).substr(2, 9),
            inStock: false,
            unitPrice: null,
            ...item
        });
    }
}
