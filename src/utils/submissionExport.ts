import type { Project } from '../stores/projectStore';
import type { Program } from '../stores/programStore';
import type { User } from '../stores/userManagementStore';
import type { ActivitySector } from '../stores/activitySectorStore';

interface SubmissionExportData {
  projects: Project[];
  program: Program;
  users?: User[];
  sectors?: ActivitySector[];
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    submitted: 'Soumis',
    under_review: 'En revue',
    eligible: 'Eligible',
    ineligible: 'Non eligible',
    pre_selected: 'Preselectionne',
    selected: 'Selectionne',
    formalization: 'Formalisation',
    financed: 'Finance',
    monitoring: 'Suivi',
    closed: 'Cloture',
    rejected: 'Rejete'
  };
  return labels[status] || status;
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

const prepareExportData = (projects: Project[], users?: User[], sectors?: ActivitySector[]) => {
  return projects.map(project => {
    const submitter = users?.find(u => u.id === project.submitterId);
    const sector = sectors?.find(s => s.id === project.activitySectorId);

    const baseData: Record<string, unknown> = {
      'Titre': project.title,
      'Description': project.description,
      'Nom du porteur': project.submitterName || submitter?.name || 'N/A',
      'Email du porteur': submitter?.email || 'N/A',
      'Telephone du porteur': project.submitterPhone || 'N/A',
      'Secteur d\'activite': sector?.name || 'N/A',
      'Statut': getStatusLabel(project.status),
      'Budget': project.budget,
      'Duree': project.timeline,
      'Date de soumission': project.submissionDate
        ? project.submissionDate.toLocaleDateString('fr-FR')
        : 'Non soumis',
      'Date de creation': project.createdAt.toLocaleDateString('fr-FR'),
      'Tags': project.tags.join(', ')
    };

    if (project.evaluationScores) {
      baseData['Score evaluation'] = project.totalEvaluationScore || 'N/A';
      baseData['Evalue par'] = project.evaluatedBy || 'N/A';
      baseData['Date evaluation'] = project.evaluationDate
        ? new Date(project.evaluationDate).toLocaleDateString('fr-FR')
        : 'N/A';
      baseData['Statut recommande'] = project.recommendedStatus
        ? getStatusLabel(project.recommendedStatus as string)
        : 'N/A';
    }

    if (project.eligibilityNotes) {
      baseData['Notes eligibilite'] = project.eligibilityNotes;
      baseData['Verifie par'] = project.eligibilityCheckedBy || 'N/A';
      baseData['Date verification'] = project.eligibilityCheckedAt
        ? new Date(project.eligibilityCheckedAt).toLocaleDateString('fr-FR')
        : 'N/A';
    }

    return baseData;
  });
};

const prepareFormDataExport = (projects: Project[]) => {
  return projects.map(project => {
    const formExportData: Record<string, unknown> = {
      'Titre du projet': project.title
    };

    if (project.formData) {
      Object.entries(project.formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'object' && value[0].name) {
              formExportData[key] = value.map((f: { name: string }) => f.name).join(', ');
            } else {
              formExportData[key] = value.join(', ');
            }
          } else if (typeof value === 'object') {
            if (value.name) {
              formExportData[key] = value.name;
            } else {
              formExportData[key] = JSON.stringify(value);
            }
          } else {
            formExportData[key] = value;
          }
        }
      });
    }

    return formExportData;
  });
};

export const exportSubmissionsToExcel = async (data: SubmissionExportData): Promise<void> => {
  const { projects, program, users, sectors } = data;

  if (projects.length === 0) {
    alert('Aucune soumission a exporter pour ce programme');
    return;
  }

  const XLSX = await import('xlsx');
  const exportData = prepareExportData(projects, users, sectors);
  const formData = prepareFormDataExport(projects);

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Soumissions');

  const maxWidth = 50;
  const colWidths = Object.keys(exportData[0]).map(key => ({
    wch: Math.min(Math.max(key.length, 15), maxWidth)
  }));
  worksheet['!cols'] = colWidths;

  if (formData.length > 0) {
    const allKeys = new Set<string>();
    formData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));

    const formDataWithAllKeys = formData.map(row => {
      const newRow: Record<string, unknown> = {};
      allKeys.forEach(key => {
        newRow[key] = row[key] ?? '';
      });
      return newRow;
    });

    const formWorksheet = XLSX.utils.json_to_sheet(formDataWithAllKeys);
    XLSX.utils.book_append_sheet(workbook, formWorksheet, 'Formulaires');

    const formColWidths = Array.from(allKeys).map(key => ({
      wch: Math.min(Math.max(key.length, 15), maxWidth)
    }));
    formWorksheet['!cols'] = formColWidths;
  }

  const fileName = `Soumissions_${program.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const exportSubmissionsToPDF = async (data: SubmissionExportData): Promise<void> => {
  const { projects, program, users, sectors } = data;

  if (projects.length === 0) {
    alert('Aucune soumission a exporter pour ce programme');
    return;
  }

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const allColumns = new Set<string>();
  const processedData = projects.map(project => {
    const submitter = users?.find(u => u.id === project.submitterId);
    const sector = sectors?.find(s => s.id === project.activitySectorId);

    const rowData: Record<string, string> = {
      'Titre': project.title,
      'Porteur': project.submitterName || submitter?.name || 'N/A',
      'Email': submitter?.email || 'N/A',
      'Telephone': project.submitterPhone || 'N/A',
      'Secteur': sector?.name || 'N/A',
      'Statut': getStatusLabel(project.status),
      'Budget': project.budget.toLocaleString('fr-FR'),
      'Soumis le': project.submissionDate
        ? project.submissionDate.toLocaleDateString('fr-FR')
        : 'Non soumis'
    };

    if (project.evaluationScores) {
      rowData['Score'] = project.totalEvaluationScore ? `${project.totalEvaluationScore}%` : 'N/A';
      rowData['Recommandation'] = project.recommendedStatus
        ? getStatusLabel(project.recommendedStatus as string)
        : 'N/A';
    }

    Object.keys(rowData).forEach(key => allColumns.add(key));
    return rowData;
  });

  const columns = Array.from(allColumns);
  const columnCount = columns.length;

  let pageFormat: 'a4' | 'a3' | [number, number] = 'a4';
  const orientation: 'landscape' = 'landscape';

  if (columnCount > 12) {
    const estimatedWidth = columnCount * 30;
    const a3Width = 420;
    const a2Width = 594;

    if (estimatedWidth > a3Width) {
      pageFormat = [a2Width, 420];
    } else if (estimatedWidth > 297) {
      pageFormat = 'a3';
    }
  } else if (columnCount > 8) {
    pageFormat = 'a3';
  }

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageFormat
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  doc.setFontSize(16);
  doc.text(`Soumissions - ${program.name}`, margin, 15);

  doc.setFontSize(10);
  doc.text(`Exporte le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, margin, 22);
  doc.text(`Total: ${projects.length} soumission(s)`, margin, 27);

  const tableData = processedData.map(row =>
    columns.map(col => row[col] || '')
  );

  const columnWidth = Math.max((pageWidth - (2 * margin)) / columnCount, 20);

  autoTable(doc, {
    head: [columns],
    body: tableData,
    startY: 32,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    columnStyles: columns.reduce((acc, _col, index) => {
      acc[index] = {
        cellWidth: columnWidth,
        halign: 'left',
        valign: 'top'
      };
      return acc;
    }, {} as Record<number, { cellWidth: number; halign: string; valign: string }>),
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    tableWidth: 'auto',
    theme: 'grid'
  });

  const fileName = `Soumissions_${program.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const exportProjectsListToPDF = async (
  projects: Project[],
  programs: Program[],
  title: string
): Promise<void> => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF('l', 'mm', 'a4');

  doc.setFontSize(18);
  doc.text(title, 14, 15);

  doc.setFontSize(10);
  doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, 14, 22);
  doc.text(`Total: ${projects.length} projet(s)`, 14, 28);

  const tableData = projects.map(project => {
    const program = programs.find(p => p.id === project.programId);
    return [
      project.title.length > 30 ? project.title.substring(0, 27) + '...' : project.title,
      program?.name || 'N/A',
      getStatusLabel(project.status),
      project.budget.toLocaleString('fr-FR'),
      project.submissionDate ? project.submissionDate.toLocaleDateString('fr-FR') : 'N/A'
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['Titre', 'Programme', 'Statut', 'Budget', 'Date Soumission']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 40 },
      4: { cellWidth: 35 }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} sur ${pageCount}`,
        doc.internal.pageSize.width / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportProjectsListToExcel = async (
  projects: Project[],
  programs: Program[],
  fileName: string
): Promise<void> => {
  const XLSX = await import('xlsx');

  const exportData = projects.map(project => {
    const program = programs.find(p => p.id === project.programId);
    return {
      'Titre': project.title,
      'Programme': program?.name || 'N/A',
      'Statut': getStatusLabel(project.status),
      'Budget': project.budget,
      'Date Soumission': project.submissionDate
        ? project.submissionDate.toLocaleDateString('fr-FR')
        : 'N/A',
      'Score': project.totalEvaluationScore || 'N/A',
      'Tags': project.tags.join(', ')
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projets');

  const colWidths = [
    { wch: 40 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 30 }
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${fileName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
