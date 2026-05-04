import { supabase } from './supabaseService';

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  static async sendNotification(notification: EmailNotification): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: notification,
      });

      if (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Email sending failed:', data);
        return { success: false, error: data.error || 'Unknown error' };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      to,
      subject: 'Test Email - Plateforme d\'évaluation de projets',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test de Notification</h2>
          <p>Bonjour,</p>
          <p>Ceci est un email de test envoyé depuis votre plateforme d'évaluation de projets.</p>
          <p>Si vous recevez ce message, cela signifie que le système d'envoi d'emails fonctionne correctement.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
          </p>
        </div>
      `,
    });
  }

  static async sendProjectSubmittedNotification(
    to: string,
    projectName: string,
    submitterName: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      to,
      subject: `Nouveau projet soumis : ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nouveau Projet Soumis</h2>
          <p>Bonjour,</p>
          <p>Un nouveau projet a été soumis sur la plateforme :</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nom du projet :</strong> ${projectName}</p>
            <p><strong>Soumis par :</strong> ${submitterName}</p>
          </div>
          <p>Vous pouvez consulter ce projet dans votre tableau de bord.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
          </p>
        </div>
      `,
    });
  }

  static async sendProjectEvaluatedNotification(
    to: string,
    projectName: string,
    status: string,
    evaluatorName: string
  ): Promise<{ success: boolean; error?: string }> {
    const statusMessages: Record<string, { title: string; color: string; message: string }> = {
      approved: {
        title: 'Projet Approuvé',
        color: '#10b981',
        message: 'Félicitations ! Votre projet a été approuvé.',
      },
      rejected: {
        title: 'Projet Rejeté',
        color: '#ef4444',
        message: 'Malheureusement, votre projet n\'a pas été retenu.',
      },
      pending: {
        title: 'Projet En Attente',
        color: '#f59e0b',
        message: 'Votre projet nécessite des informations complémentaires.',
      },
    };

    const statusInfo = statusMessages[status] || statusMessages.pending;

    return this.sendNotification({
      to,
      subject: `${statusInfo.title} : ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusInfo.color};">${statusInfo.title}</h2>
          <p>Bonjour,</p>
          <p>${statusInfo.message}</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nom du projet :</strong> ${projectName}</p>
            <p><strong>Évalué par :</strong> ${evaluatorName}</p>
            <p><strong>Statut :</strong> ${status}</p>
          </div>
          <p>Vous pouvez consulter les détails de l'évaluation dans votre espace.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
          </p>
        </div>
      `,
    });
  }

  static async sendUserAccountCreatedNotification(
    to: string,
    name: string,
    role: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      to,
      subject: 'Bienvenue sur la plateforme d\'évaluation de projets',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Bienvenue !</h2>
          <p>Bonjour ${name},</p>
          <p>Votre compte a été créé avec succès sur la plateforme d'évaluation de projets.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email :</strong> ${to}</p>
            <p><strong>Rôle :</strong> ${role}</p>
          </div>
          <p>Vous pouvez maintenant vous connecter et accéder à votre espace.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
          </p>
        </div>
      `,
    });
  }

  static async sendDocumentRequestNotification(
    to: string,
    submitterName: string,
    projectName: string,
    documentName: string,
    documentType: string,
    description: string,
    dueDate?: string
  ): Promise<{ success: boolean; error?: string }> {
    const dueDateText = dueDate
      ? `<p><strong>Date limite :</strong> ${new Date(dueDate).toLocaleDateString('fr-FR')}</p>`
      : '';

    return this.sendNotification({
      to,
      subject: `Demande de document : ${documentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nouvelle demande de document</h2>
          <p>Bonjour ${submitterName},</p>
          <p>Une nouvelle demande de document a été créée pour votre projet.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Projet :</strong> ${projectName}</p>
            <p><strong>Document demandé :</strong> ${documentName}</p>
            <p><strong>Type :</strong> ${documentType}</p>
            <p><strong>Description :</strong> ${description}</p>
            ${dueDateText}
          </div>
          <p>Veuillez vous connecter à votre espace pour soumettre le document demandé.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
          </p>
        </div>
      `,
    });
  }
}
