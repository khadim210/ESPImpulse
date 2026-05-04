import { Project } from '../stores/projectStore';
import { Program, Partner } from '../stores/programStore';
import type { AIEvaluationResponse } from '../services/aiEvaluationService';
import { formatCurrency } from './currency';
import logoUrl from '../assets/Logo_senegal-ucad.png';

const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generateEvaluationReport = async (
  project: Project,
  program: Program,
  partner: Partner | null
): Promise<void> => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addJustifiedText = (text: string, y: number, fontSize: number = 10, lineHeight: number = 1.4) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);

    lines.forEach((line: string, index: number) => {
      if (yPosition + fontSize * lineHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition, { align: 'left', maxWidth: maxWidth });
      yPosition += fontSize * lineHeight * 0.35;
    });

    return yPosition;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const logoBase64 = await loadLogoAsBase64();

  // Header
  pdf.setFillColor(0, 51, 102);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', margin, 8, 20, 20);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RAPPORT D\'ÉVALUATION DE PROJET', pageWidth / 2 + 15, 20, { align: 'center' });

  pdf.setFontSize(10);
  pdf.text('Woluma-Flow - Plateforme d\'Évaluation et de Financement', pageWidth / 2, 32, { align: 'center' });

  yPosition = 55;
  pdf.setTextColor(0, 0, 0);

  // Project Information Section
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMATIONS DU PROJET', margin, yPosition);
  yPosition += 12;

  // Project details table
  autoTable(pdf, {
    startY: yPosition,
    head: [],
    body: [
      ['Titre', project.title],
      ['Durée', project.timeline],
      ['Programme', program.name],
      ...(partner ? [['Partenaire', partner.name]] : [])
    ],
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: maxWidth - 40 }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  // Project Description
  checkPageBreak(40);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESCRIPTION DU PROJET', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  yPosition = addJustifiedText(project.projectDescription || project.description, yPosition, 10);
  yPosition += 10;

  // Tags
  if (project.tags.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MOTS-CLÉS:', margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    yPosition = addJustifiedText(project.tags.join(', '), yPosition, 10);
    yPosition += 10;
  }

  // Evaluation Results
  if (project.evaluationScores && project.totalEvaluationScore !== undefined) {
    checkPageBreak(40);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RÉSULTATS DE L\'ÉVALUATION', margin, yPosition);
    yPosition += 15;

    // Overall Score Box
    pdf.setFillColor(240, 248, 255);
    pdf.rect(margin, yPosition - 8, maxWidth, 20, 'F');
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition - 8, maxWidth, 20);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SCORE TOTAL PONDÉRÉ:', margin + 5, yPosition + 5);

    pdf.setFontSize(16);
    pdf.setTextColor(59, 130, 246);
    pdf.text(`${project.totalEvaluationScore}%`, pageWidth - margin - 25, yPosition + 5);
    pdf.setTextColor(0, 0, 0);

    yPosition += 25;

    // Detailed Scores Table
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DÉTAIL PAR CRITÈRE', margin, yPosition);
    yPosition += 10;

    const criteriaData = program.evaluationCriteria.map((criterion, index) => {
      const score = project.evaluationScores![criterion.id] || 0;
      const comment = project.evaluationComments?.[criterion.id] || 'Aucun commentaire';
      const percentage = ((score / criterion.maxScore) * 100).toFixed(0);

      return [
        `${index + 1}. ${criterion.name}`,
        `${criterion.weight}%`,
        `${score}/${criterion.maxScore}`,
        `${percentage}%`,
        comment
      ];
    });

    autoTable(pdf, {
      startY: yPosition,
      head: [['Critère', 'Poids', 'Score', '%', 'Commentaire']],
      body: criteriaData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 50, halign: 'left' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: maxWidth - 100, halign: 'left' }
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.cellPadding = { top: 2, right: 2, bottom: 2, left: 2 };
        }
      }
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 15;

    // Evaluation Notes
    if (project.evaluationNotes) {
      checkPageBreak(30);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SYNTHÈSE DE L\'ÉVALUATION', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      yPosition = addJustifiedText(project.evaluationNotes, yPosition, 10);
      yPosition += 10;
    }

    // Recommendation
    if (project.recommendedStatus) {
      checkPageBreak(25);
      const recommendations = {
        'selected': { text: 'SÉLECTIONNÉ', color: [34, 197, 94] },
        'pre_selected': { text: 'PRÉSÉLECTIONNÉ', color: [251, 191, 36] },
        'rejected': { text: 'REJETÉ', color: [239, 68, 68] }
      };

      const rec = recommendations[project.recommendedStatus as keyof typeof recommendations];
      if (rec) {
        pdf.setFillColor(rec.color[0], rec.color[1], rec.color[2], 0.1);
        pdf.rect(margin, yPosition - 5, maxWidth, 15, 'F');

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RECOMMANDATION:', margin + 5, yPosition + 5);

        pdf.setTextColor(rec.color[0], rec.color[1], rec.color[2]);
        pdf.text(rec.text, margin + 70, yPosition + 5);
        pdf.setTextColor(0, 0, 0);
        yPosition += 20;
      }
    }
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
    pdf.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), margin, pageHeight - 12);
    pdf.text('Woluma-Flow', pageWidth - margin - 20, pageHeight - 12);
    pdf.setTextColor(0, 0, 0);
  }

  const fileName = `Rapport_Evaluation_${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

export const generateWolumaEvaluationReport = async (
  project: Project,
  program: Program,
  partner: Partner | null,
  evaluatorName?: string,
  aiAnalysis?: AIEvaluationResponse
): Promise<void> => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addJustifiedText = (text: string, y: number, fontSize: number = 10, lineHeight: number = 1.4) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);

    lines.forEach((line: string) => {
      if (yPosition + fontSize * lineHeight > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition, { align: 'left', maxWidth: maxWidth });
      yPosition += fontSize * lineHeight * 0.35;
    });

    return yPosition;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin - 20) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const addSection = (title: string) => {
    checkPageBreak(20);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 10;
  };

  const logoBase64 = await loadLogoAsBase64();

  // HEADER with logo
  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', margin, yPosition - 10, 22, 22);
  }

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RAPPORT D\'ÉVALUATION DE PROJET', pageWidth / 2 + 12, yPosition, { align: 'center' });
  yPosition += 12;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bolditalic');
  pdf.text('Plateforme Woluma', pageWidth / 2 + 12, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.text('Solution d\'evaluation et de financement intelligent des PME africaines', pageWidth / 2 + 12, yPosition, { align: 'center' });
  yPosition += 20;

  // 1. INFORMATIONS GÉNÉRALES
  addSection('1. Informations Générales du Projet');

  autoTable(pdf, {
    startY: yPosition,
    head: [],
    body: [
      ['Titre du projet', project.title],
      ['Durée d\'existence', project.timeline],
      ['Programme de rattachement', program.name],
      ['Partenaire d\'exécution', partner?.name || 'N/A'],
      ['Date d\'évaluation', new Date().toLocaleDateString('fr-FR')],
      ['Évaluateur', evaluatorName || 'Système automatique']
    ],
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, halign: 'left' },
      1: { cellWidth: maxWidth - 55, halign: 'left' }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  // 2. PRÉSENTATION DU PROJET
  addSection('2. Présentation Synthétique du Projet');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  yPosition = addJustifiedText(project.projectDescription || project.description, yPosition, 10);
  yPosition += 12;

  // 3. OBJECTIF
  addSection('3. Objectif de l\'Évaluation');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const objectives = [
    'Mesurer la pertinence, la faisabilité et la viabilité économique du projet ;',
    'Identifier les risques et les leviers de succès ;',
    'Formuler des recommandations pour la décision de financement.'
  ];
  objectives.forEach(obj => {
    checkPageBreak(8);
    yPosition = addJustifiedText('• ' + obj, yPosition, 10);
  });
  yPosition += 10;

  // 4. MÉTHODOLOGIE
  addSection('4. Méthodologie');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const methodology = [
    'Analyse documentaire et validation des données financières ;',
    'Évaluation selon les critères de la plateforme Woluma-Flow : pertinence, faisabilité, impact, durabilité, innovation et gouvernance ;',
    'Scoring automatique et revue experte (modèle hybride IA + analyse humaine).'
  ];
  methodology.forEach(method => {
    checkPageBreak(8);
    yPosition = addJustifiedText('• ' + method, yPosition, 10);
  });
  yPosition += 12;

  // 5. RÉSULTATS
  checkPageBreak(40);
  addSection('5. Résultats de l\'Évaluation');

  const totalScore = program.evaluationCriteria.reduce((total, criterion) => {
    const score = project.evaluationScores?.[criterion.id] || 0;
    return total + (score / criterion.maxScore) * criterion.weight;
  }, 0);

  const maxTotalScore = program.evaluationCriteria.reduce((total, criterion) => {
    return total + criterion.weight;
  }, 0);

  // Tableau des scores avec autoTable
  const scoresData = program.evaluationCriteria.map(criterion => {
    const score = project.evaluationScores?.[criterion.id] || 0;
    const observation = aiAnalysis?.detailedAnalysis?.observations?.[criterion.name] ||
                       project.evaluationComments?.[criterion.id] ||
                       'Conforme aux attentes';

    return [
      criterion.name,
      `${criterion.weight}%`,
      score.toFixed(1),
      observation
    ];
  });

  autoTable(pdf, {
    startY: yPosition,
    head: [['Critère', 'Pondération', 'Score', 'Observation']],
    body: scoresData,
    foot: [[
      { content: `Score global / ${maxTotalScore.toFixed(0)}`, colSpan: 2, styles: { fontStyle: 'bold', halign: 'left' } },
      { content: `${totalScore.toFixed(1)} (${Math.round((totalScore / maxTotalScore) * 100)}%)`, styles: { fontStyle: 'bold', halign: 'center' } },
      {
        content: totalScore >= maxTotalScore * 0.8 ? 'Recommandé' : totalScore >= maxTotalScore * 0.6 ? 'À considérer' : 'Non recommandé',
        styles: { fontStyle: 'bold', halign: 'left' }
      }
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [220, 220, 220],
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 45, halign: 'left' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: maxWidth - 85, halign: 'left' }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  // 6. ANALYSE
  checkPageBreak(30);
  addSection('6. Analyse et Interprétation');

  if (aiAnalysis?.detailedAnalysis) {
    const analysis = aiAnalysis.detailedAnalysis;

    // Forces
    if (analysis.strengths?.length > 0) {
      checkPageBreak(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Forces identifiées', margin, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      analysis.strengths.forEach(strength => {
        checkPageBreak(10);
        yPosition = addJustifiedText('• ' + strength, yPosition, 9);
      });
      yPosition += 8;
    }

    // Faiblesses
    if (analysis.weaknesses?.length > 0) {
      checkPageBreak(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Faiblesses identifiées', margin, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      analysis.weaknesses.forEach(weakness => {
        checkPageBreak(10);
        yPosition = addJustifiedText('• ' + weakness, yPosition, 9);
      });
      yPosition += 8;
    }

    // Opportunités
    if (analysis.opportunities?.length > 0) {
      checkPageBreak(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Opportunités', margin, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      analysis.opportunities.forEach(opportunity => {
        checkPageBreak(10);
        yPosition = addJustifiedText('• ' + opportunity, yPosition, 9);
      });
      yPosition += 8;
    }

    // Risques
    if (analysis.risks?.length > 0) {
      checkPageBreak(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Risques identifiés', margin, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      analysis.risks.forEach(risk => {
        checkPageBreak(10);
        yPosition = addJustifiedText('• ' + risk, yPosition, 9);
      });
      yPosition += 8;
    }
  }

  // Synthèse globale
  if (project.evaluationNotes || aiAnalysis?.notes) {
    checkPageBreak(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Synthèse globale', margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const notes = aiAnalysis?.notes || project.evaluationNotes || '';
    yPosition = addJustifiedText(notes, yPosition, 10);
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('Woluma Platform - Rapport d\'évaluation', margin, pageHeight - 10);
    pdf.text(new Date().toLocaleDateString('fr-FR'), pageWidth - margin - 25, pageHeight - 10);
    pdf.setTextColor(0, 0, 0);
  }

  const fileName = `Rapport_Woluma_${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

export const generateEligibilityReport = async (
  project: Project,
  program: Program,
  partner: Partner | null,
  sectorName?: string
): Promise<void> => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin - 20) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const addSection = (title: string) => {
    checkPageBreak(20);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPosition);
    yPosition += 10;
  };

  const logoBase64 = await loadLogoAsBase64();

  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', margin, yPosition - 10, 22, 22);
  }

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RAPPORT D\'ELIGIBILITE', pageWidth / 2 + 12, yPosition, { align: 'center' });
  yPosition += 12;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bolditalic');
  pdf.text('Plateforme Woluma', pageWidth / 2 + 12, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.text('Solution d\'evaluation et de financement intelligent des PME africaines', pageWidth / 2 + 12, yPosition, { align: 'center' });
  yPosition += 20;

  addSection('1. Informations du Porteur');

  autoTable(pdf, {
    startY: yPosition,
    head: [],
    body: [
      ['Nom du porteur', project.submitterName || 'N/A'],
      ['Email', project.submitterEmail || 'N/A'],
      ['Telephone', project.submitterPhone || 'N/A'],
      ['Secteur d\'activite', sectorName || 'N/A']
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: maxWidth - 55 }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  addSection('2. Informations du Projet');

  autoTable(pdf, {
    startY: yPosition,
    head: [],
    body: [
      ['Titre du projet', project.title],
      ['Programme', program.name],
      ['Partenaire', partner?.name || 'N/A'],
      ['Statut', project.status],
      ['Date de soumission', project.submittedAt ? new Date(project.submittedAt).toLocaleDateString('fr-FR') : 'N/A']
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: maxWidth - 55 }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 15;

  if (project.projectDescription || project.description) {
    addSection('3. Description du Projet');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(project.projectDescription || project.description, maxWidth);
    lines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 10;
  }

  if (project.eligibilityStatus) {
    addSection('4. Statut d\'Eligibilite');

    const statusLabels: Record<string, string> = {
      'eligible': 'Eligible',
      'non_eligible': 'Non Eligible',
      'pending': 'En attente',
      'under_review': 'En cours d\'analyse'
    };

    autoTable(pdf, {
      startY: yPosition,
      head: [],
      body: [
        ['Statut d\'eligibilite', statusLabels[project.eligibilityStatus] || project.eligibilityStatus],
        ['Score d\'eligibilite', project.eligibilityScore !== undefined ? `${project.eligibilityScore}%` : 'N/A']
      ],
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { cellWidth: maxWidth - 55 }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 15;
  }

  if (project.eligibilityNotes) {
    addSection('5. Notes d\'Eligibilite');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(project.eligibilityNotes, maxWidth);
    lines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    });
  }

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('Woluma Platform - Rapport d\'eligibilite', margin, pageHeight - 10);
    pdf.text(new Date().toLocaleDateString('fr-FR'), pageWidth - margin - 25, pageHeight - 10);
    pdf.setTextColor(0, 0, 0);
  }

  const fileName = `Rapport_Eligibilite_${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
