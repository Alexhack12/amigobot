import jsPDF from "jspdf";

const getRiskLabel = (risk) => {
  if (risk === "high") return "Riesgo alto";
  if (risk === "medium") return "Riesgo medio";
  return "Riesgo bajo";
};

export const generatePatientReportPDF = ({ summary, psychologistName }) => {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  const addTitle = (text) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(text, margin, y);
    y += 10;
  };

  const addSection = (title, content) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(content || "Sin información.", pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 8;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFillColor(2, 6, 23);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AmigoBot", margin, 20);

  doc.setFontSize(10);
  doc.text("Informe inteligente de seguimiento conductual", margin, 27);

  doc.setTextColor(0, 0, 0);
  y = 45;

  addTitle("Informe del paciente");

  addSection(
    "Datos generales",
    `Paciente: ${summary.patient?.name || "Paciente sin nombre"}
Correo: ${summary.patient?.email || "Correo no disponible"}
Psicólogo: ${psychologistName || "Psicólogo"}
Fecha de generación: ${new Date(summary.generatedAt).toLocaleString("es-MX")}`
  );

  addSection(
    "Estado actual",
    `Emoción predominante: ${summary.dominantEmotion?.label || "Sin información"}
Riesgo máximo registrado: ${getRiskLabel(summary.highestRisk)}
Sesiones analizadas: ${summary.totalSessions}`
  );

  addSection(
    "Tendencia",
    `${summary.trendStatus?.label || "Sin tendencia"}: ${
      summary.trendStatus?.description || "Sin descripción."
    }`
  );

  addSection("Resumen generado", summary.narrative);

  addSection(
    "Factores repetidos",
    summary.repeatedFactors?.length
      ? summary.repeatedFactors.map((factor) => `• ${factor.label} (${factor.count})`).join("\n")
      : "No se detectaron factores repetidos."
  );

  addSection(
    "Factores emergentes",
    summary.emergingFactors?.length
      ? summary.emergingFactors.map((factor) => `• ${factor.label}`).join("\n")
      : "No se detectaron factores emergentes."
  );

  addSection(
    "Conductas observadas",
    summary.behaviorSignals?.length
      ? summary.behaviorSignals.map((signal) => `• ${signal.label} (${signal.count})`).join("\n")
      : "No se detectaron conductas repetidas suficientes."
  );

  addSection(
    "Tareas",
    `Total: ${summary.taskStats?.total || 0}
Completadas: ${summary.taskStats?.completed || 0}
Pendientes: ${summary.taskStats?.pending || 0}
Porcentaje de cumplimiento: ${summary.taskStats?.completionRate || 0}%`
  );

  addSection(
    "Aviso",
    "Este informe fue generado automáticamente por AmigoBot. No constituye diagnóstico psicológico, médico ni psiquiátrico. Debe ser interpretado únicamente como apoyo para un profesional de la salud mental."
  );

  doc.save(`Informe_AmigoBot_${summary.patient?.name || "paciente"}.pdf`);
};