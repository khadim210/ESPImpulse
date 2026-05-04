import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { FileText, Download, Loader2, Camera, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import logoUrl from '../../assets/Logo_senegal-ucad.png';

interface ManualSection {
  title: string;
  subsections: {
    title: string;
    content: string[];
    steps?: string[];
    imagePlaceholder?: string;
  }[];
}

interface CaptureState {
  isCapturing: boolean;
  currentIndex: number;
  pages: Array<{ key: string; path: string; name: string }>;
  captures: { [key: string]: string };
}

const CAPTURE_STORAGE_KEY = 'manual_screenshot_capture';

const UserManualPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<{ [key: string]: string }>({});
  const [captureStatus, setCaptureStatus] = useState<string>('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const manualContent: ManualSection[] = [
    {
      title: "1. INTRODUCTION",
      subsections: [
        {
          title: "1.1 À propos de l'application",
          content: [
            "Cette application est une plateforme complète de gestion de projets et de programmes de financement.",
            "Elle permet aux organisations de soumettre des projets, aux évaluateurs de les analyser, et aux administrateurs de gérer l'ensemble du processus."
          ]
        },
        {
          title: "1.2 Rôles utilisateurs",
          content: [
            "• ADMIN : Gestion complète de la plateforme (utilisateurs, partenaires, programmes)",
            "• MANAGER : Gestion des modèles de formulaires et des évaluations",
            "• PARTNER : Soumission et suivi de projets pour son organisation",
            "• SUBMITTER : Soumission de projets individuels"
          ]
        },
        {
          title: "1.3 Prérequis techniques",
          content: [
            "• Navigateur web moderne (Chrome, Firefox, Safari, Edge)",
            "• Connexion Internet stable",
            "• Adresse email valide pour la création de compte"
          ]
        }
      ]
    },
    {
      title: "2. CONNEXION ET INSCRIPTION",
      subsections: [
        {
          title: "2.1 Page de connexion",
          content: [
            "La page de connexion est le point d'entrée de l'application.",
            "Elle offre une interface claire et sécurisée pour accéder à votre compte."
          ],
          imagePlaceholder: "login"
        },
        {
          title: "2.2 Création de compte",
          content: [
            "La création de compte se fait via la page d'inscription accessible depuis la page de connexion."
          ],
          steps: [
            "Cliquer sur 'S'inscrire' sur la page de connexion",
            "Remplir le formulaire avec vos informations :",
            "  - Nom complet",
            "  - Email professionnel",
            "  - Organisation (optionnel)",
            "  - Mot de passe sécurisé (min. 8 caractères)",
            "Accepter les conditions d'utilisation",
            "Cliquer sur 'Créer un compte'",
            "Un administrateur validera votre compte sous 24-48h"
          ],
          imagePlaceholder: "register"
        },
        {
          title: "2.3 Connexion à l'application",
          content: [
            "Une fois votre compte activé, vous pouvez vous connecter."
          ],
          steps: [
            "Ouvrir l'application dans votre navigateur",
            "Saisir votre email et mot de passe",
            "Cliquer sur 'Se connecter'",
            "Vous êtes redirigé vers le tableau de bord"
          ]
        }
      ]
    },
    {
      title: "3. TABLEAU DE BORD",
      subsections: [
        {
          title: "3.1 Vue d'ensemble du tableau de bord",
          content: [
            "Le tableau de bord affiche une vue synthétique de vos activités :",
            "• Nombre total de projets",
            "• Projets par statut (en cours, approuvés, rejetés)",
            "• Activité récente",
            "• Notifications importantes"
          ],
          imagePlaceholder: "dashboard"
        },
        {
          title: "3.2 Navigation",
          content: [
            "Le menu latéral gauche donne accès à toutes les fonctionnalités selon votre rôle :",
            "• Tableau de bord : Vue d'ensemble",
            "• Projets : Liste et gestion des projets",
            "• Éligibilité : Vérification d'éligibilité",
            "• Évaluation : Évaluation des projets (Manager)",
            "• Formalisation : Gestion des projets approuvés",
            "• Suivi : Monitoring des projets",
            "• Statistiques : Rapports et analyses",
            "• Administration : Gestion de la plateforme (Admin)"
          ]
        }
      ]
    },
    {
      title: "4. SOUMISSION DE PROJETS",
      subsections: [
        {
          title: "4.1 Liste des projets",
          content: [
            "La page des projets affiche tous vos projets soumis avec leurs statuts actuels.",
            "Vous pouvez filtrer, rechercher et gérer vos projets depuis cette interface."
          ],
          imagePlaceholder: "projects"
        },
        {
          title: "4.2 Créer un nouveau projet",
          content: [
            "La soumission de projet se fait en plusieurs étapes."
          ],
          steps: [
            "Aller dans 'Projets' > 'Nouveau projet'",
            "Sélectionner un programme de financement",
            "Remplir les informations du projet :",
            "  - Titre du projet",
            "  - Description détaillée",
            "  - Objectifs",
            "  - Bénéficiaires",
            "  - Budget prévisionnel",
            "  - Durée du projet",
            "Joindre les documents requis :",
            "  - Document de projet (PDF/Word)",
            "  - Budget détaillé (Excel)",
            "  - Documents justificatifs",
            "Vérifier toutes les informations",
            "Cliquer sur 'Soumettre le projet'",
            "Vous recevrez un email de confirmation"
          ],
          imagePlaceholder: "create-project"
        },
        {
          title: "4.3 Vérification d'éligibilité",
          content: [
            "Avant de soumettre, vérifiez l'éligibilité de votre projet."
          ],
          steps: [
            "Aller dans 'Éligibilité'",
            "Sélectionner le programme qui vous intéresse",
            "Remplir le questionnaire d'éligibilité",
            "Le système analyse automatiquement vos réponses",
            "Vous obtenez un score d'éligibilité",
            "Si éligible : vous pouvez soumettre votre projet",
            "Si non éligible : le système explique pourquoi"
          ],
          imagePlaceholder: "eligibility"
        },
        {
          title: "4.4 Documents requis",
          content: [
            "Documents généralement demandés :",
            "• Document de présentation du projet (PDF/Word)",
            "• Budget détaillé avec justification (Excel)",
            "• Statuts de l'organisation",
            "• CV des responsables du projet",
            "• Lettres de recommandation (si applicable)",
            "• Preuve d'existence légale",
            "",
            "Format acceptés : PDF, Word (.doc, .docx), Excel (.xls, .xlsx)",
            "Taille maximale : 10 MB par fichier"
          ]
        }
      ]
    },
    {
      title: "5. SUIVI DE PROJETS",
      subsections: [
        {
          title: "5.1 Détails d'un projet",
          content: [
            "La page de détails affiche toutes les informations d'un projet.",
            "Vous y trouvez les documents, commentaires, historique et actions possibles."
          ],
          imagePlaceholder: "project-detail"
        },
        {
          title: "5.2 Statuts des projets",
          content: [
            "Les projets passent par différents statuts :",
            "",
            "• DRAFT : Brouillon, non soumis",
            "• SUBMITTED : Soumis, en attente d'examen",
            "• UNDER_REVIEW : En cours d'évaluation",
            "• EVALUATION_COMPLETED : Évaluation terminée",
            "• APPROVED : Approuvé pour financement",
            "• FORMALIZATION : En cours de formalisation",
            "• DISBURSEMENT : En cours de décaissement",
            "• ACTIVE : Projet actif en cours",
            "• MONITORING : Suivi et monitoring",
            "• COMPLETED : Projet terminé",
            "• REJECTED : Projet rejeté",
            "• CANCELLED : Projet annulé"
          ]
        }
      ]
    },
    {
      title: "6. ÉVALUATION (MANAGERS)",
      subsections: [
        {
          title: "6.1 Interface d'évaluation",
          content: [
            "En tant que Manager, vous pouvez évaluer les projets soumis.",
            "L'interface d'évaluation présente le projet et une grille de notation complète."
          ],
          imagePlaceholder: "evaluation"
        },
        {
          title: "6.2 Processus d'évaluation",
          content: [
            "L'évaluation se fait selon des critères prédéfinis."
          ],
          steps: [
            "Ouvrir le projet à évaluer",
            "Consulter tous les documents joints",
            "Remplir la grille d'évaluation :",
            "  - Pertinence du projet",
            "  - Qualité du dossier",
            "  - Faisabilité",
            "  - Budget réaliste",
            "  - Impact attendu",
            "  - Durabilité",
            "Attribuer un score à chaque critère",
            "Ajouter des commentaires détaillés",
            "Recommandation finale : Approuver / Rejeter / Réviser",
            "Soumettre l'évaluation"
          ]
        }
      ]
    },
    {
      title: "7. FORMALISATION",
      subsections: [
        {
          title: "7.1 Gestion de la formalisation",
          content: [
            "Une fois un projet approuvé, il passe en phase de formalisation.",
            "Cette interface permet de gérer les documents, décaissements et accompagnement."
          ],
          imagePlaceholder: "formalization"
        },
        {
          title: "7.2 Demande de documents",
          content: [
            "Demander des documents complémentaires au porteur de projet."
          ],
          steps: [
            "Ouvrir le projet en formalisation",
            "Cliquer sur 'Demander des documents'",
            "Lister les documents requis",
            "Fixer une date limite",
            "Envoyer la demande",
            "Le porteur reçoit un email avec la liste",
            "Suivre la réception des documents"
          ]
        }
      ]
    },
    {
      title: "8. SUIVI ET MONITORING",
      subsections: [
        {
          title: "8.1 Interface de monitoring",
          content: [
            "Une fois les fonds décaissés, suivre l'avancement du projet.",
            "Le tableau de monitoring affiche tous les projets actifs et leurs indicateurs."
          ],
          imagePlaceholder: "monitoring"
        }
      ]
    },
    {
      title: "9. STATISTIQUES ET RAPPORTS",
      subsections: [
        {
          title: "9.1 Tableaux de bord statistiques",
          content: [
            "Visualiser les données agrégées de tous les projets avec des graphiques interactifs.",
            "Les statistiques permettent d'analyser les tendances et performances."
          ],
          imagePlaceholder: "statistics"
        }
      ]
    },
    {
      title: "10. ADMINISTRATION",
      subsections: [
        {
          title: "10.1 Gestion des utilisateurs",
          content: [
            "Interface de gestion complète des utilisateurs de la plateforme.",
            "Permet de créer, modifier et gérer tous les comptes utilisateurs."
          ],
          imagePlaceholder: "users"
        },
        {
          title: "10.2 Gestion des programmes",
          content: [
            "Interface de création et gestion des programmes de financement.",
            "Configurez les critères d'éligibilité, budgets et périodes."
          ],
          imagePlaceholder: "programs"
        },
        {
          title: "10.3 Paramètres de l'application",
          content: [
            "Configuration générale de la plateforme incluant les paramètres d'IA.",
            "Personnalisez le comportement de l'application selon vos besoins."
          ],
          imagePlaceholder: "parameters"
        }
      ]
    },
    {
      title: "11. BONNES PRATIQUES",
      subsections: [
        {
          title: "11.1 Sécurité",
          content: [
            "• Utilisez un mot de passe fort et unique",
            "• Ne partagez jamais vos identifiants",
            "• Déconnectez-vous après chaque session",
            "• Vérifiez toujours l'URL de l'application",
            "• Signalez toute activité suspecte à un administrateur"
          ]
        },
        {
          title: "11.2 Soumission de projets",
          content: [
            "• Lisez attentivement les critères d'éligibilité",
            "• Préparez tous les documents avant de commencer",
            "• Enregistrez régulièrement votre brouillon",
            "• Relisez tout avant de soumettre",
            "• Respectez les formats et tailles de fichiers",
            "• Soumettez avant la date limite"
          ]
        }
      ]
    },
    {
      title: "12. AIDE ET SUPPORT",
      subsections: [
        {
          title: "12.1 Obtenir de l'aide",
          content: [
            "En cas de problème ou de question :",
            "",
            "• Consultez d'abord ce manuel utilisateur",
            "• Contactez le support technique : support@woluma.com",
            "• Joignez des captures d'écran du problème",
            "• Indiquez votre rôle et l'action que vous tentiez",
            "• Le support répond sous 24-48h ouvrées"
          ]
        },
        {
          title: "12.2 Contact",
          content: [
            "Support technique : support@woluma.com",
            "Questions générales : info@woluma.com",
            "Site web : www.woluma.com",
            "",
            "Horaires d'ouverture :",
            "Lundi - Vendredi : 8h00 - 17h00",
            "Week-end et jours fériés : Fermé"
          ]
        }
      ]
    }
  ];

  useEffect(() => {
    const savedImages = localStorage.getItem('manual_captured_images');
    if (savedImages) {
      try {
        const images = JSON.parse(savedImages);
        setCapturedImages(images);
      } catch (error) {
        console.error('Erreur lors du chargement des images:', error);
      }
    }
  }, []);

  useEffect(() => {
    const captureStateStr = localStorage.getItem(CAPTURE_STORAGE_KEY);
    if (!captureStateStr) return;

    try {
      const captureState: CaptureState = JSON.parse(captureStateStr);

      if (!captureState.isCapturing) return;

      const currentPage = captureState.pages.find(p => p.path === location.pathname);
      if (!currentPage) return;

      setIsCapturing(true);
      setCaptureStatus(`Capture de: ${currentPage.name} (${captureState.currentIndex + 1}/${captureState.pages.length})`);

      const performCapture = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
          const element = document.querySelector('main');
          if (element) {
            const canvas = await html2canvas(element as HTMLElement, {
              scale: 2,
              logging: false,
              useCORS: true,
              backgroundColor: '#ffffff'
            });

            const screenshot = canvas.toDataURL('image/png');
            captureState.captures[currentPage.key] = screenshot;
          }
        } catch (error) {
          console.error('Erreur lors de la capture:', error);
        }

        const nextIndex = captureState.currentIndex + 1;

        if (nextIndex < captureState.pages.length) {
          captureState.currentIndex = nextIndex;
          localStorage.setItem(CAPTURE_STORAGE_KEY, JSON.stringify(captureState));
          navigate(captureState.pages[nextIndex].path);
        } else {
          localStorage.setItem('manual_captured_images', JSON.stringify(captureState.captures));
          localStorage.removeItem(CAPTURE_STORAGE_KEY);
          navigate('/dashboard/user-manual');
        }
      };

      performCapture();
    } catch (error) {
      console.error('Erreur dans le processus de capture:', error);
      localStorage.removeItem(CAPTURE_STORAGE_KEY);
      setIsCapturing(false);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === '/dashboard/user-manual') {
      const captureStateStr = localStorage.getItem(CAPTURE_STORAGE_KEY);
      if (captureStateStr) {
        return;
      }

      const wasCapturing = isCapturing;
      setIsCapturing(false);
      setCaptureStatus('');

      const savedImages = localStorage.getItem('manual_captured_images');
      if (savedImages) {
        try {
          const images = JSON.parse(savedImages);
          if (Object.keys(images).length > 0) {
            const previousCount = Object.keys(capturedImages).length;
            const newCount = Object.keys(images).length;

            setCapturedImages(images);

            if (wasCapturing && newCount > previousCount) {
              setShowSuccessMessage(true);
              setTimeout(() => setShowSuccessMessage(false), 5000);
            }
          }
        } catch (error) {
          console.error('Erreur:', error);
        }
      }
    }
  }, [location.pathname]);

  const captureScreenshots = () => {
    const pagesToCapture = [
      { key: 'dashboard', path: '/dashboard', name: 'Tableau de bord' },
      { key: 'projects', path: '/dashboard/projects', name: 'Liste des projets' },
      { key: 'eligibility', path: '/dashboard/eligibility', name: 'Éligibilité' },
      { key: 'evaluation', path: '/dashboard/evaluation', name: 'Évaluation' },
      { key: 'formalization', path: '/dashboard/formalization', name: 'Formalisation' },
      { key: 'monitoring', path: '/dashboard/monitoring', name: 'Monitoring' },
      { key: 'statistics', path: '/dashboard/statistics', name: 'Statistiques' },
      { key: 'users', path: '/dashboard/users', name: 'Utilisateurs' },
      { key: 'programs', path: '/dashboard/programs', name: 'Programmes' },
      { key: 'parameters', path: '/dashboard/parameters', name: 'Paramètres' }
    ];

    const captureState: CaptureState = {
      isCapturing: true,
      currentIndex: 0,
      pages: pagesToCapture,
      captures: {}
    };

    localStorage.setItem(CAPTURE_STORAGE_KEY, JSON.stringify(captureState));
    setIsCapturing(true);
    setCaptureStatus(`Démarrage de la capture... (1/${pagesToCapture.length})`);

    navigate(pagesToCapture[0].path);
  };

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;

      let logoBase64: string | null = null;
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch { /* ignore */ }

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', (pageWidth - 50) / 2, 30, 50, 50);
      }

      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('MANUEL UTILISATEUR', pageWidth / 2, 100, { align: 'center' });

      doc.setFontSize(20);
      doc.text('Plateforme de Gestion de Projets', pageWidth / 2, 120, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Version 1.0', pageWidth / 2, 140, { align: 'center' });
      doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth / 2, 150, { align: 'center' });

      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('WOLUMA', pageWidth / 2, 180, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      doc.addPage();
      yPosition = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TABLE DES MATIÈRES', margin, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      manualContent.forEach((section) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${section.title}`, margin, yPosition);
        yPosition += 6;
      });

      manualContent.forEach((section) => {
        doc.addPage();
        yPosition = 20;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(section.title, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 12;

        section.subsections.forEach((subsection) => {
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(subsection.title, margin, yPosition);
          yPosition += 8;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          subsection.content.forEach((paragraph) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }

            const lines = doc.splitTextToSize(paragraph, maxWidth);
            lines.forEach((line: string) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              doc.text(line, margin, yPosition);
              yPosition += 5;
            });
            yPosition += 2;
          });

          if (subsection.imagePlaceholder && capturedImages[subsection.imagePlaceholder]) {
            if (yPosition > pageHeight - 120) {
              doc.addPage();
              yPosition = 20;
            }

            yPosition += 5;
            try {
              const imgWidth = maxWidth;
              const imgHeight = 100;
              doc.addImage(capturedImages[subsection.imagePlaceholder], 'PNG', margin, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 5;

              doc.setFontSize(8);
              doc.setTextColor(128, 128, 128);
              doc.text(`Capture d'écran : ${subsection.title}`, margin, yPosition);
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(10);
              yPosition += 8;
            } catch (error) {
              console.error('Erreur lors de l\'ajout de l\'image:', error);
            }
          } else if (subsection.imagePlaceholder) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = 20;
            }

            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPosition, maxWidth, 30, 'F');
            doc.setFontSize(9);
            doc.setTextColor(128, 128, 128);
            doc.text('[Image : Utilisez le bouton "Capturer les interfaces" pour inclure une capture d\'écran ici]', margin + 5, yPosition + 15);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            yPosition += 35;
          }

          if (subsection.steps) {
            yPosition += 3;
            subsection.steps.forEach((step) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }

              const stepText = step.startsWith('  ')
                ? `    ${step.trim()}`
                : step;

              const lines = doc.splitTextToSize(stepText, maxWidth - 5);
              lines.forEach((line: string) => {
                if (yPosition > pageHeight - 20) {
                  doc.addPage();
                  yPosition = 20;
                }
                doc.text(line, margin + 5, yPosition);
                yPosition += 5;
              });
            });
          }

          yPosition += 8;
        });
      });

      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} / ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          'Manuel Utilisateur - Plateforme de Gestion de Projets',
          margin,
          pageHeight - 10
        );
      }

      doc.save(`Manuel_Utilisateur_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {isCapturing && captureStatus && (
        <div className="fixed top-20 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center space-x-3">
            <Camera className="h-5 w-5 animate-bounce" />
            <div>
              <div className="font-semibold">Capture en cours...</div>
              <div className="text-sm">{captureStatus}</div>
            </div>
          </div>
        </div>
      )}

      {showSuccessMessage && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div className="font-semibold">Captures terminées !</div>
              <div className="text-sm">{Object.keys(capturedImages).length} captures enregistrées avec succès</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manuel Utilisateur</h1>
          <p className="mt-1 text-sm text-gray-500">
            Générez un manuel utilisateur complet au format PDF avec captures d'écran
          </p>
        </div>
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">Captures d'écran des interfaces</h3>
            <p className="text-sm text-blue-800 mb-4">
              Pour un manuel complet avec des images des interfaces, utilisez d'abord la fonction de capture automatique.
              Cela créera des captures d'écran de toutes les pages principales de l'application.
            </p>
            <div className="flex items-center space-x-3">
              <Button
                onClick={captureScreenshots}
                disabled={isCapturing}
                variant="accent"
                size="sm"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Capture en cours...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Capturer les interfaces
                  </>
                )}
              </Button>
              {Object.keys(capturedImages).length > 0 && (
                <>
                  <span className="text-sm text-green-700 font-medium">
                    {Object.keys(capturedImages).length} captures disponibles
                  </span>
                  <Button
                    onClick={() => {
                      localStorage.removeItem('manual_captured_images');
                      setCapturedImages({});
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Réinitialiser
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <FileText className="h-12 w-12 text-blue-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Manuel Utilisateur Complet
            </h2>
            <p className="text-gray-600 mb-4">
              Ce manuel couvre toutes les fonctionnalités de l'application, organisé par rôle utilisateur.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Contenu du manuel :</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Introduction et présentation de l'application</li>
                <li>• Connexion et gestion du compte</li>
                <li>• Guide complet de soumission de projets</li>
                <li>• Processus d'évaluation (pour les Managers)</li>
                <li>• Formalisation et décaissement</li>
                <li>• Suivi et monitoring des projets</li>
                <li>• Statistiques et rapports</li>
                <li>• Administration de la plateforme (pour les Admins)</li>
                <li>• Bonnes pratiques et conseils</li>
                <li>• Aide et support</li>
                {Object.keys(capturedImages).length > 0 && (
                  <li className="text-green-700 font-medium mt-2">
                    • {Object.keys(capturedImages).length} captures d'écran incluses
                  </li>
                )}
              </ul>
            </div>

            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="inline-flex items-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le Manuel PDF
                </>
              )}
            </Button>

            {isGenerating && (
              <p className="mt-2 text-sm text-gray-500">
                La génération du PDF peut prendre quelques secondes...
              </p>
            )}
          </div>
        </div>
      </Card>

      {Object.keys(capturedImages).length === 0 && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Aucune capture d'écran disponible</h3>
              <p className="text-sm text-amber-800">
                Le manuel sera généré avec des emplacements pour les images. Pour obtenir un manuel complet
                avec des captures d'écran réelles des interfaces, utilisez d'abord le bouton "Capturer les interfaces"
                ci-dessus.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Sections du manuel</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manualContent.map((section, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <h4 className="font-medium text-gray-900 mb-2">{section.title}</h4>
              <p className="text-sm text-gray-600">
                {section.subsections.length} sous-sections
              </p>
              {section.subsections.some(s => s.imagePlaceholder) && (
                <span className="inline-flex items-center text-xs text-blue-600 mt-2">
                  <Camera className="h-3 w-3 mr-1" />
                  Inclut des captures d'écran
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-gray-50">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">À propos de ce manuel</h3>
            <p className="text-sm text-gray-700">
              Ce manuel utilisateur est conçu pour accompagner tous les utilisateurs de la plateforme,
              quel que soit leur niveau technique. Il couvre l'ensemble des fonctionnalités disponibles
              et fournit des instructions étape par étape pour chaque action possible.
            </p>
            <p className="text-sm text-gray-700 mt-2">
              Les captures d'écran permettent d'illustrer visuellement chaque interface et facilitent
              la compréhension des fonctionnalités.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserManualPage;
