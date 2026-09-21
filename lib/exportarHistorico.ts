import {
  formatarData,
  labelTipo,
  labelAtendimento,
  type TipoCard,
  type TipoAtendimento,
} from "@/lib/utils";

export type CardExport = {
  id: string;
  tipo: TipoCard;
  tipoAtendimento: TipoAtendimento;
  data: string;
  horario: string;
  cliente: string;
  equipamento: string;
  veiculo?: string | null;
  local: string;
  motorista?: string | null;
  ajudante?: string | null;
  acessorios?: string | null;
  obs?: string | null;
  cancelado: boolean;
  createdBy?: { name: string } | null;
};

const SEM_VEICULO = "Sem veículo";

// Excel: máx. 31 caracteres, sem [ ] : * ? / \ e sem repetir nome de aba.
function nomeAbaUnico(base: string, usados: Set<string>): string {
  const limpo = base.replace(/[\[\]:*?/\\]/g, "-").trim().slice(0, 31) || SEM_VEICULO;
  let nome = limpo;
  let n = 2;
  while (usados.has(nome.toLowerCase())) {
    const sufixo = ` (${n++})`;
    nome = limpo.slice(0, 31 - sufixo.length) + sufixo;
  }
  usados.add(nome.toLowerCase());
  return nome;
}

// Gera um .xlsx com uma aba por veículo; dentro de cada aba, linhas em ordem
// cronológica (data + horário).
export async function exportarHistoricoExcel(cards: CardExport[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  const porVeiculo = new Map<string, CardExport[]>();
  for (const c of cards) {
    const chave = c.veiculo?.trim() || SEM_VEICULO;
    const lista = porVeiculo.get(chave) ?? [];
    lista.push(c);
    porVeiculo.set(chave, lista);
  }

  const veiculos = Array.from(porVeiculo.keys()).sort((a, b) => {
    if (a === SEM_VEICULO) return 1;
    if (b === SEM_VEICULO) return -1;
    return a.localeCompare(b, "pt-BR", { numeric: true });
  });

  const usados = new Set<string>();

  for (const veiculo of veiculos) {
    const ws = wb.addWorksheet(nomeAbaUnico(veiculo, usados));
    ws.columns = [
      { header: "Data", key: "data", width: 12 },
      { header: "Horário", key: "horario", width: 16 },
      { header: "Tipo", key: "tipo", width: 24 },
      { header: "Atendimento", key: "atend", width: 14 },
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Equipamento", key: "equip", width: 24 },
      { header: "Local", key: "local", width: 28 },
      { header: "Motorista", key: "motorista", width: 20 },
      { header: "Ajudante", key: "ajudante", width: 20 },
      { header: "Acessórios", key: "acess", width: 30 },
      { header: "Obs", key: "obs", width: 30 },
      { header: "Cancelado", key: "cancelado", width: 11 },
      { header: "Criado por", key: "criado", width: 18 },
    ];

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const ordenados = [...(porVeiculo.get(veiculo) ?? [])].sort(
      (a, b) =>
        a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario)
    );

    for (const c of ordenados) {
      ws.addRow({
        data: formatarData(c.data),
        horario: c.horario,
        tipo: labelTipo(c.tipo),
        atend: labelAtendimento(c.tipoAtendimento),
        cliente: c.cliente,
        equip: c.equipamento,
        local: c.local,
        motorista: c.motorista ?? "",
        ajudante: c.ajudante ?? "",
        acess: c.acessorios ?? "",
        obs: c.obs ?? "",
        cancelado: c.cancelado ? "Sim" : "Não",
        criado: c.createdBy?.name ?? "",
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
